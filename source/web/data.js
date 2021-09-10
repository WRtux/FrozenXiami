"use strict";

var data = {
	pool: {file: null, indices: null, cache: null},
	user: null
};

var readerURL = URL.createObjectURL(new Blob([String.raw
`"use strict";

function readEntryIndex(buf, off) {
	let vw = new DataView(buf), dec = new TextDecoder();
	let cnt, len;
	let en = {indexSize: off};
	en.offset = vw.getUint32(off), off += 4;
	en.length = vw.getUint32(off), off += 4;
	en.id = vw.getUint32(off), off += 4;
	if (en.id == 0xFFFFFFFF)
		en.id = null;
	len = vw.getUint16(off), off += 2;
	en.sid = dec.decode(buf.slice(off, off + len)), off += len;
	len = vw.getUint16(off), off += 2;
	en.name = dec.decode(buf.slice(off, off + len)), off += len;
	cnt = vw.getUint16(off), off += 2;
	en.keywords = new Array();
	for (let i = 0; i < cnt; i++) {
		len = vw.getUint16(off), off += 2;
		let str = dec.decode(buf.slice(off, off + len));
		off += len;
		str && en.keywords.push(str);
	}
	en.indexSize = off - en.indexSize;
	return en;
}

function readPoolIndices(buf) {
	try {
		let vw = new DataView(buf);
		let off = 0, cnt = 0;
		let ins = {artists: new Array(), albums: new Array(), songs: new Array()};
L1:		while (true) {
			let typ = vw.getUint8(off++);
			let dest = null;
			switch (typ) {
			case 0x10:
				dest = ins.artists;
				break;
			case 0x11:
				dest = ins.albums;
				break;
			case 0x12:
				dest = ins.songs;
				break;
			case 0x00:
				break L1;
			default:
				self.postMessage({event: "error", code: typ});
				return;
			}
			let en = readEntryIndex(buf, off);
			off += en.indexSize;
			dest.push(en);
			++cnt % 100 == 0 && self.postMessage({event: "progress", count: cnt});
		}
		self.postMessage({event: "progress", count: cnt});
		self.postMessage({event: "load", data: ins});
	} catch (err) {
		self.postMessage({event: "error", code: -1, message: err.message});
		console.error(err);
	}
}

self.addEventListener("message", (e) => { readPoolIndices(e.data); });
`]));

function loadPoolIndices(f, onload, onerror, onprogress) {
	let fr = new FileReader();
	fr.readAsArrayBuffer(f);
	fr.addEventListener("load", function (e) {
		let wkr = new Worker(readerURL);
		let cnt = 0;
		let hndl = onprogress && window.setInterval(() => { onprogress(cnt); }, 200);
		wkr.addEventListener("message", function (e) {
			switch (e.data.event) {
			case "progress":
				cnt = e.data.count;
				break;
			case "load":
				data.pool.indices = e.data.data;
				hndl && window.clearInterval(hndl);
				onload(e.data.data);
				break;
			case "error":
				let typ = e.data.code;
				hndl && window.clearInterval(hndl);
				if (typ != -1) {
					toast("未知索引类型：" + typ.toString(16).padStart(2, '0').toUpperCase());
				} else {
					toast("读取索引时发生意外错误。");
				}
				onerror && onerror();
				break;
			}
		});
		wkr.postMessage(e.target.result, [e.target.result]);
	});
	fr.addEventListener("error", function (e) {
		toast("读取索引失败。");
		onerror && onerror();
	});
}

function loadPool(f, onload, onerror, onprogress) {
	if (f.size <= 16) {
		toast("文件大小错误。");
		onerror && onerror();
		return;
	}
	let fr = new FileReader();
	fr.readAsArrayBuffer(f.slice(0, 8));
	fr.addEventListener("load", function (e) {
		let vw = new DataView(e.target.result);
		let i = vw.getUint32(0), len = vw.getUint32(4);
		if (i != 0xFE581A4D) {
			toast("文件头错误：" + i.toString(16).padStart(8, '0').toUpperCase());
			onerror && onerror();
		} else if (f.size < 16 + len) {
			toast("文件大小错误。");
			onerror && onerror();
		} else {
			loadPoolIndices(f.slice(8, 8 + len), function (dat) {
				data.pool.file = f.slice(16 + len);
				data.pool.cache = new Map();
				onload(dat);
			}, onerror, onprogress);
			onprogress && onprogress("Ready");
		}
	});
	fr.addEventListener("error", function (e) {
		toast("读取文件头失败。");
		onerror && onerror();
	});
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
