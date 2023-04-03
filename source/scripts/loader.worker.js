/* This file has no copyright assigned and is placed in the Public Domain.
 *
 * This file is a template. Implementation is needed to load index files.
 */
"use strict";

function readEntryIndex(typ, dat, off) {
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
				self.postMessage(['progress', buf]);
				break;
			} else {
				self.postMessage(['error', 'Unknown index type', typ]);
				return;
			}
			let en = readEntryIndex(typ, dat, off);
			off += len;
			buf.push(en);
			if (buf.length >= 400) {
				self.postMessage(['progress', buf]);
				buf = new Array();
			}
		}
		self.postMessage(['load']);
	} catch (err) {
		self.postMessage(['error', err.message, null]);
		console.warn('Error in worker', err);
	}
}

self.addEventListener('message', (e) => void readPoolIndices(e.data));
