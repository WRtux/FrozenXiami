/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
"use strict";

var page = {
	
	main: document.getElementById("main"),
	masks: {
		toast: document.getElementById("overlay-toast"),
		dialog: document.getElementById("overlay-dialog")
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
	window.setTimeout(() => { clearToast(ele); }, t != null ? t : 3000);
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
	dlg.querySelector(".dialog> .dialog-close").addEventListener("click", (e) => void closeDialog(dlg), {once: true});
	page.masks.dialog.appendChild(ele);
	return dlg;
}
function alertDialog(tt, inf, blk) {
	let n = Math.floor(Math.random() * 36 ** 5).toString(36).padStart(5, '0');
	let dlg = openDialog(n);
	dlg.querySelector(".dialog> h2").textContent = (tt != null) ? tt : "提示";
	dlg.querySelector(".dialog> .block-content> p").textContent = inf;
	blk && dlg.querySelector(".dialog> .dialog-close").remove();
	return dlg;
}

function updateDialog(dlg, inf) {
	dlg = dlg instanceof Element ? dlg : document.getElementById("dialog-" + dlg);
	if (dlg != null && inf != null)
		dlg.querySelector(".dialog> .block-content> p").textContent = inf;
}

function closeDialog(dlg) {
	dlg = dlg instanceof Element ? dlg : document.getElementById("dialog-" + dlg);
	if (dlg != null) {
		let ele = dlg.parentElement;
		!ele.classList.contains("block-dynamic") ? ele.classList.remove("block-active") : ele.remove();
	}
	return dlg;
}

// TODO: DOM binding
H.callOnReadyP(function () {
	let eles = document.getElementsByTagName("template");
	while (eles.length > 0) {
		eles[0].remove();
	}
	document.getElementById("nav-search").addEventListener("click", (e) => void openDialog("search"));
	document.getElementById("nav-file").addEventListener("click", (e) => void openDialog("file"));
	document.getElementById("dialog-file-pool").addEventListener("click", async function (e) {
		let fhndl;
		try {
			[fhndl] = await window.showOpenFilePicker({
				id: 'pool',
				multiple: false,
				types: [
					{accpet: {'application/octet-stream': ['.ijsom']}}
				]
			});
		} catch (err) {
			return;
		}
		let f = await fhndl.getFile();
/*
		let inf = '请稍等……';
		let dlg = alertDialog('加载中', inf, true);
		let updateInfo = (info) => updateDialog(dlg, inf = info);
		let updateProgress = H.throttled((prog) => updateDialog(dlg, inf + ' ' + prog), 200);
		let ldr = new DataPoolLoader();
		let stub = ldr.load(f);
		H.eventResolve(ldr, 'message', ({data: msg}) => {
			switch (msg[0]) {
			 case 'info':
				console.log(msg[1]);
				updateInfo(msg[1]);
				return false;
			 case 'progress':
				updateProgress(msg[1]);
				return false;
			 case 'success':
				console.info(msg[1]);
				return true;
			 case 'warning':
				console.warn(msg[1]);
				return false;
			 case 'error':
				console.error(msg[1]);
				return true;
			}
		});
		await stub;
 */
		this.previousElementSibling.value = f.name;
		let inf = "请稍等……";
		let dlg = alertDialog("加载中", inf, true);
		let hndl = window.setInterval(function () {
			if (data.workers.progress != null && data.workers.progress != inf)
				updateDialog(dlg, inf = data.workers.progress);
		}, 200);
		try {
			let dat = await loadPoolP(f);
			let cnt = dat.reduce((cnt, en) => cnt + (en.type == "song"), 0);
			toast(`成功加载了 ${dat.length} 条索引，包含 ${cnt} 首音乐索引。`, 5000);
			scene.switch("home");
		} catch (err) {
			alertDialog("加载失败", str);
		} finally {
			window.clearInterval(hndl);
			closeDialog(dlg);
		}
	});
	scene.main = page.main;
	if (navigator.userAgent.match(/\b(?:Mobile|Android|iPhone|iPad)\b/i))
		toast("正在移动设备上访问，加载可能会较缓慢或导致内存不足。", 5000);
});
