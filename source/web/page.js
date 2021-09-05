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
	}
};

function toast(inf, t) {
	let ele = document.importNode(page.templates.toast.firstElementChild, true);
	ele.addEventListener("click", (e) => { clearToast(ele); });
	ele.firstElementChild.textContent = inf;
	page.masks.toast.appendChild(ele);
	window.setTimeout(() => { clearToast(ele); }, t || 2000);
	return ele;
}

function clearToast(ele) {
	ele.classList.add("toast-clear");
	window.setTimeout(() => { ele.parentElement && ele.remove(); }, 300);
}

function openDialog(n) {
	let dlg = document.getElementById("dialog-" + n), ele;
	if (dlg != null) {
		ele = dlg.parentElement;
	} else {
		ele = document.importNode(page.templates.dialog.firstElementChild, true);
		dlg = ele.firstElementChild;
		ele.classList.add("block-dynamic");
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
	dlg.querySelector(".dialog> h2").textContent = tt || "提示";
	dlg.querySelector(".dialog> p").textContent = inf;
	blk && dlg.querySelector(".dialog> .dialog-close").remove();
	return dlg;
}

function updateDialog(dlg, inf) {
	dlg = dlg instanceof Element ? dlg : document.getElementById("dialog-" + dlg);
	if (dlg != null)
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

(function () {
	let eles = document.getElementsByTagName("template");
	while (eles.length > 0) {
		eles[0].remove();
	}
	document.getElementById("nav-search").addEventListener("click", (e) => { openDialog("search"); });
	document.getElementById("nav-file").addEventListener("click", (e) => { openDialog("file"); });
	document.getElementById("dialog-file-pool").addEventListener("change", function (e) {
		if (this.files.length != 1)
			return;
		this.previousElementSibling.value = this.files[0].name;
		let dlg = alertDialog("加载中", "请稍等……", true);
		loadPool(this.files[0], function (dat) {
			closeDialog(dlg);
			let cnt = dat.artists.length + dat.albums.length + dat.songs.length;
			toast(`成功加载了 ${cnt} 条索引，包含 ${dat.songs.length} 首音乐索引。`, 3000);
		}, function () {
			closeDialog(dlg);
			alertDialog("错误", "加载失败。");
		}, (str) => { updateDialog(dlg, "请稍等……" + str); });
	});
	if (navigator.userAgent.match(/\b(?:Mobile|[Aa]ndroid|iPhone|iPad)\b/))
		toast("正在使用移动设备访问，加载可能会较缓慢或导致内存不足。", 3000);
})();
