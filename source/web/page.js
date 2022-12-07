/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
"use strict";

var page = {
	
	main: document.getElementById("main"),
	masks: {
		toast: document.getElementById("mask-toast"),
		dialog: document.getElementById("mask-dialog")
	},
	templates: {
		main: document.getElementById("main-template").content,
		toast: document.getElementById("toast-template").content,
		dialog: document.getElementById("dialog-template").content
	},
	
	selectMenu(i, j) {
		if (i != null) {
			let ele = document.querySelector("#nav> .nav-item.block-active");
			ele != null && ele.classList.remove("block-active");
			ele = document.querySelectorAll("#nav> .nav-item")[i];
			ele != null && ele.classList.add("block-active");
		}
		if (j != null) {
			let cont = this.main.querySelector("#main> .main-sidebar .main-menu");
			if (cont != null) {
				let ele = cont.getElementsByClassName("block-active")[0];
				ele != null && ele.classList.remove("block-active");
				ele = cont.children[j];
				ele != null && ele.classList.add("block-active");
			}
		}
	}
	
};

function toast(inf, t) {
	let ele = document.importNode(page.templates.toast.firstElementChild, true);
	ele.addEventListener("click", (e) => { clearToast(ele); });
	ele.firstElementChild.textContent = inf;
	page.masks.toast.appendChild(ele);
	window.setTimeout(() => { clearToast(ele); }, t != null ? t : 2000);
	return ele;
}

function clearToast(ele) {
	ele.classList.add("toast-clear");
	window.setTimeout(() => { ele.parentElement != null && ele.remove(); }, 300);
}

function openDialog(n) {
	let dlg = document.getElementById("dialog-" + n), ele;
	if (dlg != null) {
		ele = dlg.parentElement;
	} else {
		ele = document.importNode(page.templates.dialog.firstElementChild, true);
		dlg = ele.firstElementChild;
		dlg.id = "dialog-" + n;
	}
	ele.classList.add("block-active");
	dlg.querySelector(".dialog> .dialog-close").addEventListener("click", (e) => { closeDialog(dlg); });
	page.masks.dialog.appendChild(ele);
	return dlg;
}
function alertDialog(tt, inf, blk) {
	let n = Math.floor(Math.random() * 36 ** 5).toString(36).padStart(5, '0');
	let dlg = openDialog(n);
	dlg.querySelector(".dialog> h2").textContent = (tt != null) ? tt : "提示";
	dlg.querySelector(".dialog> p").textContent = inf;
	blk && dlg.querySelector(".dialog> .dialog-close").remove();
	return dlg;
}

function updateDialog(dlg, inf) {
	dlg = dlg instanceof Element ? dlg : document.getElementById("dialog-" + dlg);
	if (dlg != null && inf != null)
		dlg.querySelector(".dialog> p").textContent = inf;
}

function closeDialog(dlg) {
	dlg = dlg instanceof Element ? dlg : document.getElementById("dialog-" + dlg);
	if (dlg != null) {
		let ele = dlg.parentElement;
		!ele.classList.contains("block-dynamic") ? ele.classList.remove("block-active") : ele.remove();
	}
	return dlg;
}

H.callOnReadyP(function (e) {
	let eles = document.getElementsByTagName("template");
	while (eles.length > 0) {
		eles[0].remove();
	}
	document.getElementById("nav-search").addEventListener("click", (e) => { openDialog("search"); });
	document.getElementById("nav-file").addEventListener("click", (e) => { openDialog("file"); });
	document.getElementById("dialog-file-pool").addEventListener("change", function (e) {
		if (this.files.length != 1)
			return;
		let f = this.files[0];
		this.previousElementSibling.value = f.name;
		let inf = "请稍等……";
		let dlg = alertDialog("加载中", inf, true);
		let hndl = window.setInterval(function () {
			if (data.workers.progress != null && data.workers.progress != inf)
				updateDialog(dlg, inf = data.workers.progress);
		}, 100);
		loadPoolP(f).finally(function () {
			window.clearInterval(hndl);
			closeDialog(dlg);
		}).then(function (dat) {
			let cnt = dat.reduce((cnt, en) => cnt + (en.type == "song"), 0);
			toast(`成功加载了 ${dat.length} 条索引，包含 ${cnt} 首音乐索引。`, 3000);
			scene.switch("home");
		}, (str) => { alertDialog("加载失败", str); });
	});
	scene.main = page.main;
	if (navigator.userAgent.match(/\b(?:Mobile|[Aa]ndroid|iPhone|iPad)\b/))
		toast("正在使用移动设备访问，加载可能会较缓慢或导致内存不足。", 3000);
});
