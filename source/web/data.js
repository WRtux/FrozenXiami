"use strict";

var data = {
	pool: {
		file: null, indices: null, cache: null,
		progress: null,
		loaderURL: "worker-load.js", searcherURL: "worker-search.js"
	},
	user: null
};

data.buildHexadecimal = function (i, len) {
	i = Number.parseInt(i);
	return !Number.isNaN(i) ? "0x" + i.toString(16).padStart(len, '0').toUpperCase() : null;
};

data.readFileP = function (f) {
	return new Promise(function (resolve, reject) {
		let fr = new FileReader();
		fr.readAsArrayBuffer(f);
		fr.addEventListener("load", (e) => { resolve(e.target.result); });
		fr.addEventListener("error", (e) => { reject(); });
	});
};

async function loadPoolIndicesP(f) {
	let dat = null;
	data.pool.progress = "读取索引……";
	try {
		dat = await data.readFileP(f);
	} catch (err) {
		throw "读取索引失败。";
	}
	data.pool.progress = "加载索引……";
	let notify = null, notifyError = null;
	let wkr = new Worker(data.pool.loaderURL);
	let buf = new Array();
	wkr.addEventListener("message", function (e) {
		let msg = e.data;
		switch (msg.event) {
		case "progress":
			for (let en of msg.data) {
				buf.push(en);
			}
			data.pool.progress = "加载索引……" + buf.length;
			break;
		case "load":
			notify();
			break;
		case "error":
			notifyError("加载索引错误：" + msg.message +
				(msg.code != null ? " @" + data.buildHexadecimal(msg.code, 2) : ""));
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
	data.pool.progress = "读取文件头……";
	try {
		if (f.size <= 16)
			throw undefined;
		dat = await data.readFileP(f.slice(0, 16));
	} catch (err) {
		throw "读取文件头失败。";
	}
	let vw = new DataView(dat);
	if (vw.getUint32(0) != 0xDEAD494A)
		throw "文件头错误：" + data.buildHexadecimal(vw.getUint32(0), 8);
	if (vw.getUint32(4) != 0x584D00F0)
		throw "文件头错误：" + data.buildHexadecimal(vw.getUint32(4), 8);
	let len = vw.getUint32(8) * 2 ** 32 + vw.getUint32(12);
	if (f.size < 28 + len)
		throw "文件大小错误。";
	let ens = await loadPoolIndicesP(f.slice(16, 16 + len));
	data.pool.progress = "完成索引……";
	await undefined;
	dat = data.pool.indices = {artists: new Array(), albums: new Array(), songs: new Array(), unknown: new Array()};
	for (let en of ens) {
		en != null ? en.type == "artist" ? dat.artists.push(en) :
			en.type == "album" ? dat.albums.push(en) :
			en.type == "song" ? dat.songs.push(en) : dat.unknown.push(en)
		: undefined;
	}
	data.pool.file = f.slice(28 + len);
	data.pool.cache = new Map();
	data.pool.progress = null;
	return ens;
}

function getIndices(typ) {
	switch (typ) {
	case "artist":
		return data.pool.indices.artists;
	case "album":
		return data.pool.indices.albums;
	case "song":
		return data.pool.indices.songs;
	default:
		return null;
	}
}

function inflateEntryP(en) {
	if (data.pool.file.size < en.offset + en.length) {
		toast("文件大小错误。");
		return null;
	}
	if (data.pool.cache.has(en.offset))
		return Promise.resolve(JSON.parse(data.pool.cache.get(en.offset)));
	return new Promise(function (resolve, reject) {
		let fr = new FileReader();
		fr.readAsArrayBuffer(data.pool.file.slice(en.offset, en.offset + en.length));
		fr.addEventListener("load", function (e) {
			try {
				let str = new TextDecoder().decode(e.target.result);
				data.pool.cache.set(en.offset, str);
				trimPoolCache();
				resolve(JSON.parse(str));
			} catch (err) {
				toast(en.name + " 存在数据错误。");
				reject();
			}
		});
		fr.addEventListener("error", function (e) {
			toast("读取 " + en.name + " 数据失败。");
			reject();
		});
	});
}
function inflateEntryA(en, onload, onerror) {
	let tsk = inflateEntryP(en);
	tsk ? tsk.then(onload, onerror) : onerror && onerror();
}

function inflateEntriesP(ens) {
	let ed = ens.reduce((max, en) => Math.max(en.offset + en.length, max), 0);
	if (data.pool.file.size < ed) {
		toast("文件大小错误。");
		return null;
	}
	let tsks = ens.map((en) => new Promise(function (resolve, reject) {
		if (data.pool.cache.has(en.offset))
			resolve(JSON.parse(data.pool.cache.get(en.offset)));
		let fr = new FileReader();
		fr.readAsArrayBuffer(data.pool.file.slice(en.offset, en.offset + en.length));
		fr.addEventListener("load", function (e) {
			try {
				let str = new TextDecoder().decode(e.target.result);
				data.pool.cache.set(en.offset, str);
				resolve(JSON.parse(str));
			} catch (err) {
				toast(en.name + " 存在数据错误。");
				reject();
				arguments[1] && arguments[1]();
			}
		});
		fr.addEventListener("error", function (e) {
			toast("读取 " + en.name + " 数据失败。");
			reject();
			arguments[1] && arguments[1]();
		});
	}));
	return Promise.allSettled(tsks).then(function (ress) {
		trimPoolCache();
		let ens = new Array();
		for (let res of ress) {
			res.status == "fulfilled" && res.value && ens.push(res.value);
		}
		return ens;
	});
}
function inflateEntriesA(ens, onload, oerror) {
	let tsk = inflateEntriesP(ens, onerror);
	tsk ? tsk.then(onload) : onerror && onerror();
}

function trimPoolCache(lim) {
	lim = lim || 10000;
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
	if (id && ens[0]) {
		if (sid && ens[0].sid != sid)
			toast(ens[0].name + " SID 不匹配。");
		return ens[0];
	} else if (sid && ens[1]) {
		if (id && ens[1].id != id)
			toast(ens[1].name + " ID 不匹配。");
		return ens[1];
	}
	return null;
}

function queryEntryP(typ, id, sid) {
	let en = queryEntryIndex(typ, id, sid);
	return en && inflateEntryP(en);
}
function queryEntryA(typ, id, sid, onload, onerror) {
	let en = queryEntryIndex(typ, id, sid);
	en && inflateEntryA(en, onload, onerror);
}

function searchEntryIndices(typ, ns) {
	ns = ns.map((n) => n.toLowerCase());
	return getIndices(typ).filter(function (en) {
		let strs = Array.from(en.keywords);
		strs.unshift(en.name);
		strs = strs.map((str) => str.toLowerCase());
		return ns.every((n) => strs.some((str) => str.includes(n)));
	});
}
async function searchEntryIndicesP(typ, ns) {
	await null;
	return searchEntryIndices(typ, ns);
}

async function searchEntriesP(typ, ns, sort, off, lim) {
	await null;
	let ens = searchEntryIndices(typ, ns);
	if (sort)
		ens = sortListEntries(ens, ns);
	if (off && lim)
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
		let scr = filter(en.name.toLowerCase()).length * 6 / ns.length;
		if (en.translation)
			scr += filter(en.translation.toLowerCase()).length * 5 / ns.length;
		if (en.subName)
			scr += filter(en.subName.toLowerCase()).length * 3 / ns.length;
		if (en.playCount && en.playCount >= 1000)
			scr += Math.log10(en.playCount) - 3;
		return {entry: en, score: scr};
	});
	return map.sort((a, b) => b.score - a.score).map((en) => en.entry);
}
