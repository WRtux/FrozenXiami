"use strict";

function readEntryIndex(dat, off) {
	let vw = new DataView(dat), dec = new TextDecoder();
	let en = new Object();
	//TODO
	return en;
}

function readPoolIndices(dat) {
	try {
		let vw = new DataView(dat);
		let off = 0;
		let buf = new Array();
		while (true) {
			let typ;
			if (typ) {
				//TODO
			} else if (!typ) {
				self.postMessage({event: "progress", data: buf});
				break;
			} else {
				self.postMessage({event: "error", message: "Unknown index type", code: typ});
				return;
			}
			let en = readEntryIndex(dat, off);
			off += len;
			en.type = typ;
			buf.push(en);
			if (buf.length >= 400) {
				self.postMessage({event: "progress", data: buf});
				buf = new Array();
			}
		}
		self.postMessage({event: "load"});
	} catch (err) {
		self.postMessage({event: "error", message: err.message, code: null});
		console.error(err);
	}
}

self.addEventListener("message", (e) => { readPoolIndices(e.data); });
