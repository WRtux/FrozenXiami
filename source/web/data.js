"use strict";

var data = {
	pool: {file: null, indices: null}
};

function loadPoolHead(f, onload, onerror) {
	if (f.size < 8) {
		onerror && onerror(null);
		return;
	}
	let fr = new FileReader();
	fr.readAsArrayBuffer(f);
	fr.addEventListener("load", function (e) {
		let vw = new DataView(this.result);
		let i = vw.getUint32(0);
		if (i == 0xFE581A4D) {
			onload(vw.getUint32(4));
		} else {
			toast("文件头错误：" + i.toString(16).padStart(8, '0').toUpperCase());
			onerror && onerror(i);
		}
	});
	fr.addEventListener("error", function (e) {
		toast("读取文件头失败。");
		onerror && onerror(null);
	});
}

function loadPoolIndices(f, onload, onerror, onprogress) {
	if (f.size < 1) {
		onerror && onerror(null);
		return;
	}
	let fr = new FileReader();
	fr.readAsArrayBuffer(f);
	fr.addEventListener("load", function (e) {
		let buf = this.result, vw = new DataView(buf);
		let off = 0;
		let ins = {artists: new Array(), albums: new Array(), songs: new Array()};
		let hndl = window.setTimeout(function () {
			onprogress && onprogress(ins.artists.length + ins.albums.length + ins.songs.length);
		}, 200);
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
				toast("未知索引类型：" + typ.toString(16).padStart(2, '0').toUpperCase());
				onerror && onerror(typ);
				return;
			}
			let en = readEntryIndex(buf, off);
			off += en.indexSize;
			dest.push(en);
		}
		window.clearTimeout(hndl);
		data.pool.indices = ins;
		onload();
	});
	fr.addEventListener("error", function (e) {
		toast("读取索引失败。");
		onerror && onerror(null);
	});
}

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

function loadPool(f, onload, onerror, onprogress) {
	loadPoolHead(f.slice(0, 8), function (len) {
		loadPoolIndices(f.slice(8, 8 + len), function () {
			data.pool.file = f.slice(16 + len);
			onload(data.pool.indices);
		}, (o) => { onerror && onerror(o); }, (o) => { onprogress && onprogress(o); });
	}, (o) => { onerror && onerror(o); });
}
