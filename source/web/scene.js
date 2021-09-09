"use strict";

var scene = {
	current: "load", list: new Object(), helper: new Object()
};

scene.switch = function (n) {
	let sce = this.list[n];
	let dfrg = null;
	if (sce) {
		sce.$ = this.helper;
		dfrg = sce.createMain(page.templates.main);
		sce.$ = null;
	}
	if (dfrg == null)
		return null;
	this.helper.removeChildren(page.main);
	page.main.appendChild(dfrg);
	this.helper.activateMenu(...sce.menuConfig);
	this.current = n;
	return dfrg;
};

scene.display = function (o) {
	let sce = this.list[this.current];
	if (sce && sce.display) {
		sce.$ = this.helper;
		sce.display(page.main.children, o).finally(() => { sce.$ = null; });
	}
};

scene.helper.buildElement = function (typ, attrs, txt) {
	let ele = document.createElement(typ);
	for (let n in attrs || "") {
		ele.setAttribute(n, attrs[n]);
	}
	if (txt)
		ele.textContent = txt;
	return ele;
};

scene.helper.buildInfoRow = function (tt, infs) {
	let dfrg = document.createDocumentFragment();
	dfrg.appendChild(this.buildElement("dt", null, tt));
	for (let inf of infs || "") {
		dfrg.appendChild(this.buildElement("dd", null, inf));
	}
	return dfrg;
};

scene.helper.replaceChildrenClass = function (cont, src, dest) {
	for (let ele of cont.getElementsByClassName(src)) {
		ele.classList.replace(src, dest);
	}
};

scene.helper.removeChildren = function (cont) {
	while (cont.hasChildNodes()) {
		cont.removeChild(cont.firstChild);
	}
};

scene.helper.activateMenu = function (i, j) {
	if (i != null) {
		let ele = document.querySelector("#nav> .nav-item.block-active");
		ele != null && ele.classList.remove("block-active");
		ele = document.querySelectorAll("#nav> .nav-item")[i];
		ele != null && ele.classList.add("block-active");
	}
	if (j != null) {
		let cont = page.main.querySelector(".main-sidebar .main-menu");
		if (cont != null) {
			let ele = cont.getElementsByClassName("block-active")[0];
			ele != null && ele.classList.remove("block-active");
			ele = cont.children[j];
			ele != null && ele.classList.add("block-active");
		}
	}
};

scene.list["home"] = {
	menuConfig: [0, 0],
	createMain: function (tmpl) {
		let dfrg = document.createDocumentFragment();
		dfrg.appendChild(document.importNode(tmpl.getElementById("main-navbar"), true));
		dfrg.appendChild(document.importNode(tmpl.getElementById("main-home"), true));
		let cont = dfrg.children[0].getElementsByClassName("main-menu")[0];
		cont.children[0].addEventListener("click", (e) => { scene.switch("home"); });
		cont.children[1].addEventListener("click", (e) => { scene.switch("home-playlists"); });
		cont.children[2].addEventListener("click", (e) => { scene.switch("home-artists"); });
		cont.children[3].addEventListener("click", (e) => { scene.switch("home-albums"); });
		cont.children[4].addEventListener("click", (e) => { scene.switch("home-styles"); });
		cont.children[6].addEventListener("click", (e) => { scene.switch("about"); });
		return dfrg;
	},
	display: null
};

scene.list["home-playlists"] = scene.list["home-artists"] = scene.list["home-albums"] = scene.list["home-styles"] = {
	createMain: function (tmpl) {
		toast("页面尚未实现，请等待后续版本。");
		return null;
	}
};

scene.list["user"] = {
	createMain: function (tmpl) {
		toast("页面尚未实现，请等待后续版本。");
		return null;
	}
};

scene.list["retrieval"] = {
	createMain: function (tmpl) {
		toast("页面尚未实现，请等待后续版本。");
		return null;
	}
};

scene.list["artist"] = {
	menuConfig: [null, -1],
	createMain: function (tmpl) {
		let dfrg = document.createDocumentFragment();
		dfrg.appendChild(document.importNode(tmpl.getElementById("main-listbar"), true));
		dfrg.appendChild(document.importNode(tmpl.getElementById("main-list"), true));
		this.$.replaceChildrenClass(dfrg.children[0], "main-cover-list", "main-cover-artist");
		dfrg.children[1].getElementsByClassName("main-user")[0].remove();
		return dfrg;
	},
	display: async function (eles, o) {
		let cont = eles[0].getElementsByClassName("main-cover-artist")[0];
		this.$.removeChildren(cont);
		cont.appendChild(this.$.buildElement("img", {src: o.logoURL}));
		cont = eles[0].getElementsByClassName("block-content")[0];
		cont.children[0].textContent = "艺人介绍";
		cont.children[1].textContent = o.info ? o.info : "";
		eles[1].getElementsByClassName("main-title")[0].textContent = o.name;
		cont = eles[1].getElementsByClassName("main-infolist")[0];
		this.$.removeChildren(cont);
		o.gender && cont.appendChild(this.$.buildInfoRow("性别", [o.gender]));
		o.birthday && cont.appendChild(this.$.buildInfoRow("生日", [o.birthday]));
		o.area && cont.appendChild(this.$.buildInfoRow("地区", [o.area]));
	}
};

scene.list["album"] = {
	menuConfig: [null, -1],
	createMain: function (tmpl) {
		let dfrg = document.createDocumentFragment();
		dfrg.appendChild(document.importNode(tmpl.getElementById("main-listbar"), true));
		dfrg.appendChild(document.importNode(tmpl.getElementById("main-list"), true));
		this.$.replaceChildrenClass(dfrg.children[0], "main-cover-list", "main-cover-album");
		return dfrg;
	},
	display: async function (eles, o) {
		let cont = eles[0].getElementsByClassName("main-cover-album")[0];
		this.$.removeChildren(cont);
		cont.appendChild(this.$.buildElement("img", {src: o.logoURL}));
		cont.appendChild(this.$.buildElement("span", {class: "icon-play"}, o.playCount));
		cont = eles[0].getElementsByClassName("block-content")[0];
		cont.children[0].textContent = "专辑介绍";
		cont.children[1].textContent = o.info ? o.info : "";
		eles[1].getElementsByClassName("main-title")[0].textContent = o.name;
		cont = eles[1].getElementsByClassName("main-user")[0];
		this.$.removeChildren(cont);
		for (let ren of o.artists || "") {
			let en = await queryEntryPromise("artist", ren.id, ren.sid);
			cont.appendChild(this.$.buildElement("img", {src: en.logoURL}));
			cont.appendChild(this.$.buildElement("span", null, en.name));
		}
		cont = eles[1].getElementsByClassName("main-infolist")[0];
		this.$.removeChildren(cont);
		o.discCount && cont.appendChild(this.$.buildInfoRow("碟片数", [o.discCount]));
		o.songCount && cont.appendChild(this.$.buildInfoRow("曲目数", [o.songCount]));
		o.publishTime && cont.appendChild(this.$.buildInfoRow("发行时间", [o.publishTime]));
		o.language && cont.appendChild(this.$.buildInfoRow("语言", [o.language]));
	}
};

scene.list["song"] = {
	menuConfig: [null, -1],
	createMain: function (tmpl) {
		let dfrg = document.createDocumentFragment();
		dfrg.appendChild(document.importNode(tmpl.getElementById("main-songbar"), true));
		dfrg.appendChild(document.importNode(tmpl.getElementById("main-song"), true));
		return dfrg;
	},
	display: async function (eles, o) {
		let en = await queryEntryPromise("album", o.album.id, o.album.sid);
		let cont = eles[0].getElementsByClassName("main-cover-song")[0];
		this.$.removeChildren(cont);
		cont.appendChild(this.$.buildElement("img", {src: en.logoURL}));
		cont.appendChild(this.$.buildElement("span", {class: "icon-play"}, o.playCount));
		cont = eles[0].getElementsByClassName("main-infolist")[0];
		this.$.removeChildren(cont);
		cont.appendChild(this.$.buildInfoRow("专辑", [o.album.name]));
		eles[1].getElementsByClassName("main-title")[0].textContent = o.name;
		en = await queryEntryPromise("artist", o.artist.id, o.artist.sid);
		cont = eles[1].getElementsByClassName("main-user")[0];
		this.$.removeChildren(cont);
		cont.appendChild(this.$.buildElement("img", {src: en.logoURL}));
		cont.appendChild(this.$.buildElement("span", null, en.name));
		cont = eles[1].getElementsByClassName("main-infolist")[0];
		this.$.removeChildren(cont);
		o.translation && cont.appendChild(this.$.buildInfoRow("译名", [o.translation]));
		o.disc && cont.appendChild(this.$.buildInfoRow("碟片 #", [o.disc]));
		o.track && cont.appendChild(this.$.buildInfoRow("曲目 #", [o.track]));
	}
};

scene.list["playlist"] = {
	createMain: function (tmpl) {
		toast("页面尚未实现，请等待后续版本。");
		return null;
	}
};

scene.list["about"] = {
	createMain: function (tmpl) {
		toast("页面尚未实现，请等待后续版本。");
		return null;
	}
};
