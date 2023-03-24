/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
"use strict";

var H = {
	buildHexadecimal(i, len) {
		i = Number.parseInt(i);
		return !Number.isNaN(i) ? "0x" + i.toString(16).padStart(len, '0').toUpperCase() : null;
	},
	filterFunction(func) {
		return typeof(func) == "function" ? func : null;
	},
	filterGetFunction(func) {
		return typeof(func) == "function" ? func : () => {};
	},
	readFileP(f) {
		return new Promise(function (resolve, reject) {
			let fr = new FileReader();
			fr.readAsArrayBuffer(f);
			fr.addEventListener("load", (e) => { resolve(e.target.result); });
			fr.addEventListener("error", (e) => { reject(); });
		});
	},
	restP() {
		return new Promise((resolve, reject) => { window.setTimeout(resolve, 0); });
	},
	sleepP(t) {
		return new Promise((resolve, reject) => { window.setTimeout(resolve, t); });
	},
	callOnReadyP(func) {
		return new Promise(function (resolve, reject) {
			if (document.readyState != "loading") {
				resolve(func(null));
				return;
			}
			function callback(e) {
				document.removeEventListener("DOMContentLoaded", callback);
				try {
					resolve(func(e));
				} catch (err) {
					reject(err);
				}
			}
			document.addEventListener("DOMContentLoaded", callback);
		});
	},
	buildElement(typ, attrs, txt) {
		let ele = document.createElement(typ);
		for (let n in attrs) {
			if (attrs[n] != null)
				ele.setAttribute(n, attrs[n]);
		}
		if (txt != null)
			ele.textContent = txt;
		return ele;
	},
	buildInfoRow(tt, infs) {
		let dfrg = document.createDocumentFragment();
		dfrg.appendChild(this.buildElement("dt", null, tt));
		if (infs != null && !(infs.length == 1 && infs[0] == null)) {
			for (let inf of infs) {
				dfrg.appendChild(this.buildElement("dd", null, inf));
			}
		} else {
			dfrg.appendChild(this.buildElement("dd", {class: "main-infolist-null"}, "无"));
		}
		return dfrg;
	},
	replaceChildrenClass(cont, src, dest) {
		for (let ele of cont.getElementsByClassName(src)) {
			ele.classList.replace(src, dest);
		}
	},
	removeChildren(cont) {
		while (cont.hasChildNodes()) {
			cont.removeChild(cont.firstChild);
		}
	}
};
