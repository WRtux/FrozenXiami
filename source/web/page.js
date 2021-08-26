"use strict";

function toast(inf, t) {
	let tmpl = document.getElementById("toast-template").content;
	let ele = document.importNode(tmpl.firstElementChild, true);
	ele.addEventListener("click", (e) => { clearToast(ele); });
	ele.firstElementChild.textContent = inf;
	document.getElementById("mask-toast").appendChild(ele);
	window.setTimeout(() => { clearToast(ele); }, t || 2000);
	return ele;
}

function clearToast(ele) {
	ele.classList.add("toast-clear");
	window.setTimeout(() => { ele.parentElement && ele.parentElement.removeChild(ele); }, 300);
}

function openDialog(n) {
	let dlg = document.getElementById("dialog-" + n), ele;
	if (dlg != null) {
		ele = dlg.parentElement;
	} else {
		let tmpl = document.getElementById("dialog-template").content;
		ele = document.importNode(tmpl.firstElementChild, true);
		dlg = ele.firstElementChild;
		ele.classList.add("block-dynamic");
		dlg.id = "dialog-" + n;
	}
	ele.classList.add("block-active");
	dlg.querySelector(".dialog> .dialog-close").addEventListener("click", (e) => { closeDialog(dlg); });
	document.getElementById("mask-dialog").appendChild(ele);
	return dlg;
}
function alertDialog(tt, inf, blk) {
	let n = Math.floor(Math.random() * 36 ** 5).toString(36).padStart(5, '0');
	let dlg = openDialog(n);
	dlg.querySelector(".dialog> h2").textContent = tt || "提示";
	dlg.querySelector(".dialog> p").textContent = inf;
	if (blk) {
		let ele = dlg.querySelector(".dialog> .dialog-close");
		ele.parentElement.removeChild(ele);
	}
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
		if (!ele.classList.contains("block-dynamic")) {
			ele.classList.remove("block-active");
		} else {
			ele.parentElement.removeChild(ele);
		}
	}
	return dlg;
}

(function () {
	document.getElementById("nav-more").addEventListener("click", (e) => { openDialog("file"); });
	document.getElementById("dialog-file-pool").addEventListener("change", function (e) {
		if (this.files.length != 1)
			return;
		this.previousElementSibling.value = this.files[0].name;
		let dlg = alertDialog("加载中", "请稍等……", true);
		loadPool(this.files[0], function (dat) {
			closeDialog(dlg);
			let cnts = [dat.artists.length, dat.albums.length, dat.songs.length];
			toast(`成功加载了 ${cnts[0]} 个艺人，${cnts[1]} 张专辑，${cnts[2]} 首音乐索引。`, 3000);
		}, function () {
			closeDialog(dlg);
			alertDialog("错误", "加载失败。");
		}, (str) => { updateDialog(dlg, "请稍等……" + str); });
	});
	if (navigator.userAgent.match(/\b(?:Mobile|[Aa]ndroid|iPhone|iPad)\b/))
		toast("正在使用移动设备访问，加载可能会较缓慢或导致内存不足。", 3000);
})();
