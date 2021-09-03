"use strict";

var scene = {
	current: "load", list: new Object(), helper: new Object()
};

scene.switch = function (n) {
	let eles = this.list[n] && this.list[n].createMain(page.templates.main);
	if (!eles)
		return null;
	while (page.main.childElementCount > 0) {
		page.main.removeChild(page.main.firstElementChild);
	}
	for (let ele of eles) {
		page.main.appendChild(ele);
	}
	this.current = n;
	return eles;
};

scene.display = function (o) {
	let sce = this.list[this.current];
	sce && sce.display && sce.display.call(this.helper, page.main, o);
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

scene.helper.removeChildren = function (ele) {
	while (ele.hasChildNodes()) {
		ele.removeChild(ele.firstChild);
	}
};

scene.helper.buildInfoRow = function (tt, infs) {
	let dfrg = document.createDocumentFragment();
	dfrg.appendChild(this.buildElement("dt", null, tt));
	for (let inf of infs || "") {
		dfrg.appendChild(this.buildElement("dd", null, inf));
	}
	return dfrg;
}

scene.list["home"] = {
	createMain: function (tmpl) {
		let eles = new Array();
		eles.push(document.importNode(tmpl.getElementById("main-navbar"), true));
		eles.push(document.importNode(tmpl.getElementById("main-home"), true));
		let cont = eles[0].querySelector(".main-sidebar> .main-menu");
		cont.children[0].addEventListener("click", (e) => scene.switch("home"));
		cont.children[1].addEventListener("click", (e) => scene.switch("home-playlists"));
		cont.children[2].addEventListener("click", (e) => scene.switch("home-artists"));
		cont.children[3].addEventListener("click", (e) => scene.switch("home-albums"));
		cont.children[4].addEventListener("click", (e) => scene.switch("home-styles"));
		cont.children[6].addEventListener("click", (e) => scene.switch("about"));
		return eles;
	},
	display: null
};

scene.list["album"] = {
	createMain: function (tmpl) {
		let eles = new Array();
		let cont = document.importNode(tmpl.getElementById("main-listbar"), true);
		cont.getElementsByClassName("main-cover-list")[0].classList.replace("main-cover-list", "main-cover-album");
		eles.push(cont);
		eles.push(document.importNode(tmpl.getElementById("main-list"), true));
		return eles;
	},
	display: async function (trg, o) {
		let cont = trg.querySelector(".main-sidebar> .main-cover-album");
		this.removeChildren(cont);
		cont.appendChild(this.buildElement("img", {src: o.logoURL}));
		cont.appendChild(this.buildElement("span", {class: "icon-play"}, o.playCount));
		trg.querySelector(".main-main> .main-title").textContent = o.name;
		cont = trg.querySelector(".main-main> .main-user");
		this.removeChildren(cont);
		for (let ren of o.artists || "") {
			let en = await queryEntryPromise("artist", ren.id, ren.sid);
			cont.appendChild(this.buildElement("img", {src: en.logoURL}));
			cont.appendChild(this.buildElement("span", null, en.name));
		}
	}
};

scene.list["song"] = {
	createMain: function (tmpl) {
		let eles = new Array();
		eles.push(document.importNode(tmpl.getElementById("main-songbar"), true));
		eles.push(document.importNode(tmpl.getElementById("main-song"), true));
		return eles;
	},
	display: async function (trg, o) {
		let en = await queryEntryPromise("album", o.album.id, o.album.sid);
		let cont = trg.querySelector(".main-sidebar> .main-cover-song");
		this.removeChildren(cont);
		cont.appendChild(this.buildElement("img", {src: en.logoURL}));
		trg.querySelector(".main-main> .main-title").textContent = o.name;
		en = await queryEntryPromise("artist", o.artist.id, o.artist.sid);
		cont = trg.querySelector(".main-main> .main-user");
		this.removeChildren(cont);
		cont.appendChild(this.buildElement("img", {src: en.logoURL}));
		cont.appendChild(this.buildElement("span", null, en.name));
		cont = trg.querySelector(".main-main> .main-infolist");
		this.removeChildren(cont);
		cont.appendChild(this.buildInfoRow("专辑名称", [o.album.name]));
		cont.appendChild(this.buildInfoRow("译名", [o.translation]));
	}
};
