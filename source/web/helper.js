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
	}
};
