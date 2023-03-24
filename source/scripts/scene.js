/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
"use strict";

var scene = {
	main: null, current: "load", list: new Object(), helper: new Object()
};

scene.switch = function (n, o) {
	let sce = this.list[n];
	let dfrg = sce && sce.createMain(page.templates.main);
	if (dfrg == null)
		return null;
	H.removeChildren(page.main);
	page.main.appendChild(dfrg);
	this.current = n;
	page.selectMenu(...sce.menuConfig);
	if (o != null)
		this.display(o);
	return page.main.childNodes;
};

scene.display = function (o) {
	let sce = this.list[this.current];
	if (sce == null || !H.filterFunction(sce.display))
		return null;
	async function displayP(o) {
		this.main.classList.add("block-busy");
		await H.sleepP(300);
		let dfrg = document.createDocumentFragment();
		for (let ele of Array.from(this.main.childNodes)) {
			dfrg.appendChild(ele);
		}
		await sce.display(dfrg, o);
		this.main.appendChild(dfrg);
		this.main.classList.remove("block-busy");
		return this.main.childNodes;
	}
	return displayP.call(this, o);
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
		H.replaceChildrenClass(dfrg.children[0], "main-cover-list", "main-cover-artist");
		dfrg.children[1].getElementsByClassName("main-user")[0].remove();
		return dfrg;
	},
	display: async function (dfrg, o) {
		if (o instanceof Array)
			o = await queryEntryP("artist", o[0], o[1]);
//		o = (o.type == null) ? o : await inflateEntryP(o);
		let cont = dfrg.querySelector("#main-listbar> .main-cover-artist");
		H.removeChildren(cont);
		cont.appendChild(H.buildElement("img", {src: o.logoURL}));
		cont = dfrg.querySelector("#main-listbar> .block-content");
		H.removeChildren(cont);
		if (o.info != null) {
			cont.appendChild(H.buildElement("h3", null, "艺人介绍"));
			cont.appendChild(H.buildElement("p", null, o.info));
		} else {
			cont.appendChild(H.buildElement("h3", null, "暂无介绍"));
		}
		dfrg.querySelector("#main-list> .main-title").textContent = (o.name != null ? o.name : "暂无名称");
		cont = dfrg.querySelector("#main-list> .main-infolist");
		H.removeChildren(cont);
		if (typeof o.gender != "undefined")
			cont.appendChild(H.buildInfoRow("性别", [o.gender]));
		if (typeof o.birthday != "undefined")
			cont.appendChild(H.buildInfoRow("生日", [o.birthday]));
		if (typeof o.area != "undefined")
			cont.appendChild(H.buildInfoRow("地区", [o.area]));
	}
};

scene.list["album"] = {
	menuConfig: [null, -1],
	createMain: function (tmpl) {
		let dfrg = document.createDocumentFragment();
		dfrg.appendChild(document.importNode(tmpl.getElementById("main-listbar"), true));
		dfrg.appendChild(document.importNode(tmpl.getElementById("main-list"), true));
		H.replaceChildrenClass(dfrg.children[0], "main-cover-list", "main-cover-album");
		return dfrg;
	},
	display: async function (dfrg, o) {
		if (o instanceof Array)
			o = await queryEntryP("album", o[0], o[1]);
//		o = (o.type == null) ? o : await inflateEntryP(o);
		let cont = dfrg.querySelector("#main-listbar> .main-cover-album");
		H.removeChildren(cont);
		cont.appendChild(H.buildElement("img", {src: o.logoURL}));
		cont.appendChild(H.buildElement("span", {class: "icon-play"}, o.playCount));
		cont = dfrg.querySelector("#main-listbar> .block-content");
		H.removeChildren(cont);
		if (o.info != null) {
			cont.appendChild(H.buildElement("h3", null, "专辑介绍"));
			cont.appendChild(H.buildElement("p", null, o.info));
		} else {
			cont.appendChild(H.buildElement("h3", null, "暂无介绍"));
		}
		dfrg.querySelector("#main-list> .main-title").textContent = (o.name != null ? o.name : "暂无名称");
		cont = dfrg.querySelector("#main-list> .main-user");
		H.removeChildren(cont);
		for (let ren of o.artists != null ? o.artists : "") {
			let en = queryEntryIndex("artist", ren.id, ren.sid);
			cont.appendChild(H.buildElement("img", {src: en.keywords[1].string}));
			cont.appendChild(H.buildElement("span", null, en.name != null ? en.name : "暂无名称"));
		}
		cont = dfrg.querySelector("#main-list> .main-infolist");
		H.removeChildren(cont);
		if (typeof o.discCount != "undefined")
			cont.appendChild(H.buildInfoRow("碟片数", [o.discCount]));
		if (typeof o.songCount != "undefined")
			cont.appendChild(H.buildInfoRow("曲目数", [o.songCount]));
		if (typeof o.publishTime != "undefined")
			cont.appendChild(H.buildInfoRow("发行时间", [o.publishTime]));
		if (typeof o.language != "undefined")
			cont.appendChild(H.buildInfoRow("语言", [o.language]));
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
	display: async function (dfrg, o) {
		if (o instanceof Array)
			o = await queryEntryP("song", o[0], o[1]);
//		o = (o.type == null) ? o : await inflateEntryP(o);
		let en = queryEntryIndex("album", o.album.id, o.album.sid);
		let cont = dfrg.querySelector("#main-songbar> .main-cover-song");
		H.removeChildren(cont);
		cont.appendChild(H.buildElement("img", {src: en.keywords[1].string}));
		cont.appendChild(H.buildElement("span", {class: "icon-play"}, o.playCount));
		cont = dfrg.querySelector("#main-songbar> .main-infolist");
		H.removeChildren(cont);
		if (en != null && typeof en.name != "undefined")
			cont.appendChild(H.buildInfoRow("专辑", [en.name]));
		dfrg.querySelector("#main-song> .main-title").textContent = (o.name != null ? o.name : "暂无名称");
		en = queryEntryIndex("artist", o.artist.id, o.artist.sid);
		cont = dfrg.querySelector("#main-song> .main-user");
		H.removeChildren(cont);
		if (en != null) {
			cont.appendChild(H.buildElement("img", {src: en.keywords[1].string}));
			cont.appendChild(H.buildElement("span", null, en.name != null ? en.name : "暂无名称"));
		}
		cont = dfrg.querySelector("#main-song> .main-infolist");
		H.removeChildren(cont);
		if (typeof o.translation != "undefined")
			cont.appendChild(H.buildInfoRow("译名", [o.translation]));
		if (typeof o.disc != "undefined")
			cont.appendChild(H.buildInfoRow("碟片 #", [o.disc]));
		if (typeof o.track != "undefined")
			cont.appendChild(H.buildInfoRow("曲目 #", [o.track]));
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
