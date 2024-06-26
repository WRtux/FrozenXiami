/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
"use strict";

var data = {
	pool: {file: null, indices: null, cache: null},
	user: null,
	workers: {loadURL: "web/worker-load.js", searchURL: "web/worker-search.js", progress: null}
};

class DataPool {
	index = new DataPoolIndex();
	dataBlobs = [];
	_cache = new WeakMap();
}

class DataPoolIndex {
	artistMap = new Map();
	albumMap  = new Map();
	songMap   = new Map();
	miscMap   = new Map();
}

// TODO: Adjust event assigning
class DataPoolLoader extends H.Messenger {

	_readConcurrency = 1;
	_loadConcurrency = 4;

	async _scanHeaderAndBlocks(f) {
		const HEADER_SIZE = 6, BLOCK_SIZE = 12;
		let off = 0;
		let vw, dat;

		if (f.size <= HEADER_SIZE)
			throw new Error('Invalid file.');
		vw = await H.fileReadToDataView(f, off, off += HEADER_SIZE);
		dat = {
			identifier: vw.getUint32(0),
			version: vw.getUint16(4)
		};
		if (dat.identifier !== 0xDEAD4453)
			throw new Error(`Incorrect file identifier: ${H.formatHexadec(dat.identifier, 8)}`);
		if (dat.version !== 0x0100)
			throw new Error(`Unsupported format version: ${H.formatHexadec(dat.version, 4)}}`);

		this._postMessage(['info', 'Iterating blocks...']);
		let blks = [];
		while (true) {
			if (off + BLOCK_SIZE > f.size)
				throw new Error('Incorrect file size.');
			vw = await H.fileReadToDataView(f, off, off += BLOCK_SIZE);
			dat = {
				identifier: vw.getUint32(0),
				size: vw.getUint32(4) * 2 ** 32 + vw.getUint32(8)
			};
			if (dat.size >= 0x1_0000_0000_0000)
				throw new Error('Corrupt block info.');
			if (off + dat.size > f.size)
				throw new Error('Incorrect file size.');
			let blk = {
				identifier: dat.identifier, type: undefined,
				blob: H.fileSlice(f, off, off += dat.size)
			};
			blk.type = (
				dat.identifier === 0x00000100 ? 'end' :
				dat.identifier === 0x584D0001 ? 'xiami-data-main' :
				dat.identifier === 0x584D1001 ? 'xiami-index-main' :
				dat.identifier === 0x584D1201 ? 'xiami-index-stringpool' : 'unknown'
			);
			if (blk.type === 'unknown')
				this._postMessage(['warning', `Unknown block detected: ${H.formatHexadec(dat.identifier, 8)}`]);
			blks.push(blk);
			if (blk.type === 'end')
				break;
		}
		return blks;
	}

	async _readIndex(blks) {
		let bufIdx = {segments: [], stringPools: []};
		let tskCnt = 0, tskPool = new Map();
		let aborter = new AbortController(), signal = aborter.signal;
		for (let blk of blks) {
			let tsk;
			switch (blk.type) {
			 case 'xiami-index-main':
				tsk = H.fileReadArrayBuffer(blk.blob, null, null, signal)
					.then((buf) => void bufIdx.segments.push(buf));
				break;
			 case 'xiami-index-stringpool':
				tsk = H.fileReadString(blk.blob, null, null, 'UTF-16LE', signal)
					.then((str) => void bufIdx.stringPools.push(str));
				break;
			 default:
				continue;
			}
			let id = tskCnt++;
			tsk = tsk.finally(() => tskPool.delete(id));
			tsk = tsk.catch((err) => {
				aborter.abort();
				throw err;
			});
			tskPool.set(id, tsk);
			if (tskPool.size >= this._readConcurrency)
				await Promise.race(tskPool.values());
		}
		await Promise.all(tskPool.values());
		return bufIdx;
	}

	async _loadIndex(bufIdx) {
		let idxRecs = [];
		let tskCnt = 0, tskPool = new Map();
		let aborter = new AbortController(), signal = aborter.signal;
		for (let seg of bufIdx.segments) {
			let wkr = H.workerBuildAbortable(URL.local['loader'], signal);
			wkr.postMessage(['data', seg], [seg]);
			let tsk = H.eventResolveMap(wkr, {
				'message': ({data: msg}) => {
					switch (msg[0]) {
					 case 'progress':
						msg[1].forEach((en) => idxRecs.push(en));
						this._postMessage(['progress', idxRecs.length]);
						return false;
					 case 'load':
						return true;
					 case 'error':
						aborter.abort();
						throw new Error(`Corrupt index block: ${msg[1]} @${H.formatHexadec(msg[2])}`);
					}
				},
				'abort': (e) => true,
				'error': ({message: msg}) => {
					throw new Error(`Failed to load index: ${msg}`);
				}
			});
			let id = tskCnt++;
			tsk = tsk.finally(() => tskPool.delete(id));
			tsk = tsk.catch((err) => {
				aborter.abort();
				throw err;
			});
			tskPool.set(id, tsk);
			if (tskPool.size >= this._loadConcurrency)
				await Promise.race(tskPool.values());
		}
		await Promise.all(tskPool.values());
		return idxRecs;
	}

	async _buildPool(idxRecs, blks) {
		let pool = new DataPool(), idx = pool.index;
		for (let rec of idxRecs) {
			let trg = (
				rec.type === 'artist' ? idx.artistMap :
				rec.type === 'album'  ? idx.albumMap :
				rec.type === 'song'   ? idx.songMap : idx.miscMap
			);
			trg.set(rec.id, rec);
		}
		pool.dataBlobs = blks.filter((blk) => blk.type === 'xiami-data-main')
			.map((blk) => blk.blob);
		return pool;
	}

	async load(f) {
		try {
			this._postMessage(['info', `Loading data pool: ${f.name}`]);
			this._postMessage(['info', 'Reading header...']);
			let blks    = await this._scanHeaderAndBlocks(f);
			this._postMessage(['info', 'Reading index...']);
			let bufIdx  = await this._readIndex(blks);
			this._postMessage(['info', 'Loading index...']);
			let idxRecs = await this._loadIndex(bufIdx);
			this._postMessage(['info', 'Building data pool...']);
			let pool    = await this._buildPool(idxRecs, blks);
			this._postMessage(['success', `Successfully loaded: ${f.name}`]);
			return pool;
		} catch (err) {
			this._postMessage(['error', err.message]);
			throw err;
		}
	}

}

async function loadPoolIndicesP(f) {
	let dat = null;
	data.workers.progress = "读取索引……";
	try {
		dat = await H.readFileP(f);
	} catch (err) {
		throw "读取索引失败。";
	}
	data.workers.progress = "加载索引……";
	let notify = null, notifyError = null;
	let wkr = new Worker(/* data.workers.loadURL */ URL.local['loader']);
	let buf = new Array();
	wkr.addEventListener("message", function (e) {
		let msg = e.data;
		switch (msg.event) {
		case "progress":
			for (let en of msg.data) {
				buf.push(en);
			}
			data.workers.progress = "加载索引……" + buf.length;
			break;
		case "load":
			notify();
			break;
		case "error":
			notifyError("加载索引错误：" + msg.message +
				(msg.code != null ? " @" + H.buildHexadecimal(msg.code, 2) : ""));
			break;
		}
	});
	wkr.postMessage(dat, [dat]);
	await new Promise((resolve, reject) => { [notify, notifyError] = [resolve, reject]; });
	wkr.terminate();
	return buf;
}

async function loadPoolP(f) {
	let dat = null;
	data.workers.progress = "读取文件头……";
	try {
		if (f.size <= 16)
			throw undefined;
		dat = await H.readFileP(f.slice(0, 16));
	} catch (err) {
		throw "读取文件头失败。";
	}
	let vw = new DataView(dat);
	if (vw.getUint32(0) != 0xDEAD494A)
		throw "文件头错误：" + H.buildHexadecimal(vw.getUint32(0), 8);
	if (vw.getUint32(4) != 0x584D00F0)
		throw "文件头错误：" + H.buildHexadecimal(vw.getUint32(4), 8);
	let len = vw.getUint32(8) * 2 ** 32 + vw.getUint32(12);
	if (f.size < 28 + len)
		throw "文件大小错误。";
	let ens = await loadPoolIndicesP(f.slice(16, 16 + len));
	data.workers.progress = "完成索引……";
	await H.restP();
	dat = data.pool.indices = {artists: new Array(), albums: new Array(), songs: new Array(), unknown: new Array()};
	for (let en of ens) {
		en != null ? en.type == "artist" ? dat.artists.push(en) :
			en.type == "album" ? dat.albums.push(en) :
			en.type == "song" ? dat.songs.push(en) : dat.unknown.push(en)
		: undefined;
	}
	data.pool.file = f.slice(28 + len);
	data.pool.cache = new Map();
	data.workers.progress = null;
	return ens;
}

function getIndices(typ) {
	return typ == "artist" ? data.pool.indices.artists :
		typ == "album" ? data.pool.indices.albums :
		typ == "song" ? data.pool.indices.songs :
		typ == "unknown" ? data.pool.indices.unknown : null;
}

async function inflateEntryP(en) {
	if (en.offset + en.length > data.pool.file.size)
		throw "文件大小错误。";
	if (data.pool.cache.has(en.offset))
		return JSON.parse(data.pool.cache.get(en.offset));
	let dat = null;
	try {
		dat = await H.readFileP(data.pool.file.slice(en.offset, en.offset + en.length));
		let str = new TextDecoder().decode(dat);
		data.pool.cache.set(en.offset, str);
		arguments[1] != true && trimPoolCache();
		return JSON.parse(str);
	} catch (err) {
		console.warn("Data error", err, en);
		throw dat != null ? "读取 " + en.name + " 数据失败。" : en.name + " 数据存在错误。";
	}
}
function inflateEntryA(en, onload, onerror) {
	inflateEntryP(en).then(onload, H.filterFunction(onerror) || toast);
}

async function inflateEntriesP(ens) {
	let onerror = arguments[1];
	let tsks = ens.map((en) => inflateEntryP(en, true).catch(function (str) {
		H.filterGetFunction(onerror)(str);
		return null;
	}));
	ens = await Promise.all(tsks);
	trimPoolCache();
	return ens;
}
function inflateEntriesA(ens, onload, oerror) {
	inflateEntriesP(ens, H.filterFunction(onerror) || toast).then(onload);
}

function trimPoolCache(lim) {
	lim = (lim != null) ? lim : 10000;
	if (data.pool.cache.size <= lim)
		return;
	for (let off of data.pool.cache.keys()) {
		data.pool.cache.delete(off);
		if (data.pool.cache.size <= lim)
			break;
	}
}

function queryEntryIndex(typ, id, sid) {
	typ = getIndices(typ);
	let ens = [typ.find((en) => en.id == id), typ.find((en) => en.sid == sid)];
	if (id != null && ens[0] != null) {
		if (sid != null && ens[0].sid != sid)
			console.warn("SID mismatch", sid, ens[0]);
		return ens[0];
	} else if (sid != null && ens[1] != null) {
		if (id != null && ens[1].id != id)
			console.warn("ID mismatch", id, ens[1]);
		return ens[1];
	}
	return null;
}

function queryEntryP(typ, id, sid) {
	let en = queryEntryIndex(typ, id, sid);
	return en != null ? inflateEntryP(en) : null;
}

function searchEntryIndices(typ, ns) {
	ns = ns.map((n) => n.toLowerCase());
	return getIndices(typ).filter(function (en) {
		let strs = en.keywords.filter((k) => k.score >= 0 && k.string);
		strs = strs.map((k) => k.string.toLowerCase());
		return ns.every((n) => strs.some((str) => str.includes(n)));
	});
}
async function searchEntryIndicesP(typ, ns) {
	ns = ns.map((n) => n.toLowerCase());
	let ens = new Array();
	let i = 0, t = performance.now();
	for(let en of getIndices(typ)) {
		let strs = en.keywords.filter((k) => k.score >= 0 && k.string);
		strs = strs.map((k) => k.string.toLowerCase());
		ns.every((n) => strs.some((str) => str.includes(n))) && ens.push(en);
		if (++i >= 400) {
			i = 0;
			if (performance.now() - t >= 100) {
				await H.restP();
				t = performance.now();
			}
		}
	}
	return ens;
}

async function searchEntriesP(typ, ns, sort, off, lim) {
	let ens = await searchEntryIndicesP(typ, ns);
	if (sort)
		ens = sortListEntries(ens, ns);
	if (off != null && lim != null)
		ens = ens.slice(off, off + lim);
	return await inflateEntriesP(ens);
}

function sortListEntries(ens, ns) {
	ns = ns.map((n) => n.toLowerCase());
	let map = ens.map(function (en) {
		let nns = Array.from(ns);
		let filter = function (str) {
			let res = nns.filter((n) => str.includes(n));
			nns = nns.filter((n) => !res.includes(n));
			return res;
		};
		let scr = 0;
		for (let k of en.keywords) {
			if (k.score >= 0 && k.string)
				scr += k.score * filter(k.string.toLowerCase()).length / ns.length;
		}
		if (en.counts[0] >= 1000)
			scr += Math.log10(en.counts[0]) - 3;
		if (en.counts[1] >= 1000)
			scr += (Math.log10(en.counts[1]) - 3) * 0.4;
		return {entry: en, score: scr};
	});
	return map.sort((a, b) => b.score - a.score).map((en) => en.entry);
}
