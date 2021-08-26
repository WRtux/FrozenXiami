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

function inflateEntry(en, onload, onerror) {
	if (data.pool.file.size < en.offset + en.length) {
		toast("文件大小错误。");
		onerror && onerror();
		return;
	}
	let fr = new FileReader();
	fr.readAsArrayBuffer(data.pool.file.slice(en.offset, en.offset + en.length));
	fr.addEventListener("load", function (e) {
		try {
			let str = new TextDecoder().decode(e.target.result);
			onload(JSON.parse(str));
		} catch (err) {
			console.error(err);
			toast(en.name + " 存在数据错误。");
			onerror && onerror();
		}
	});
	fr.addEventListener("error", function (e) {
		toast("读取 " + en.name + " 数据失败。");
		onerror && onerror();
	});
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

function queryEntry(typ, id, sid, onload, onerror) {
	return inflateEntry(queryEntryIndex(typ, id, sid), onload, onerror);
}

function searchEntryIndices(typ, ns) {
	ns = ns.map((n) => n.toLowerCase());
	let buf = getIndices(typ).filter(function (en) {
		let strs = Array.from(en.keywords);
		strs.push(en.name);
		strs = strs.map((str) => str.toLowerCase());
		return ns.every((n) => strs.some((str) => str.indexOf(n) != -1));
	});
	return buf.sort(function (a, b) {
		let func = (en, n) => en.name.toLowerCase().indexOf(n) != -1;
		return ns.filter(func.bind(null, b)).length - ns.filter(func.bind(null, a)).length;
	});
}

function searchEntries(typ, ns, onload, onerror, off, lim) {
	let ens = searchEntryIndices(typ, ns), buf = new Array();
	let cnt = 0;
	let func = () => buf.sort(function (a, b) {
		let func = (en, n) => en.name.toLowerCase().indexOf(n) != -1;
		return ns.filter(func.bind(null, b)).length - ns.filter(func.bind(null, a)).length;
	});
	if (off)
		ens = ens.slice(off, off + lim);
	for (let en of ens) {
		inflateEntry(en, function (en) {
			buf.push(en);
			++cnt == ens.length && onload(func());
		}, function () {
			onerror && onerror();
			++cnt == ens.length && onload(func());
		});
	}
}
