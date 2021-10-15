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
	buildElement(typ, attrs, txt) {
		let ele = document.createElement(typ);
		for (let n in attrs) {
			ele.setAttribute(n, attrs[n]);
		}
		if (txt != null)
			ele.textContent = txt;
		return ele;
	},
	buildInfoRow(tt, infs) {
		let dfrg = document.createDocumentFragment();
		dfrg.appendChild(this.buildElement("dt", null, tt));
		for (let inf of infs != null ? infs : "") {
			dfrg.appendChild(this.buildElement("dd", null, inf));
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
