"use strict";

var scene = {
	current: "load", list: new Object(), helper: new Object()
};

scene.activateMenu = function (i, j) {
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

scene.switch = function (n) {
	let sce = this.list[n];
	let dfrg = sce && sce.createMain(page.templates.main);
	if (dfrg == null)
		return null;
	H.removeChildren(page.main);
	page.main.appendChild(dfrg);
	this.activateMenu(...sce.menuConfig);
	this.current = n;
	return dfrg;
};

scene.display = function (o) {
	let sce = this.list[this.current];
	return sce && H.filterFunction(sce.display) ?
		Promise.resolve(sce.display(page.main.children, o)) : null;
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
	display: function (eles, o) {
		let cont = eles[0].getElementsByClassName("main-cover-artist")[0];
		H.removeChildren(cont);
		cont.appendChild(H.buildElement("img", {src: o.logoURL}));
		cont = eles[0].getElementsByClassName("block-content")[0];
		cont.children[0].textContent = "艺人介绍";
		cont.children[1].textContent = (o.info != null) ? o.info : "";
		eles[1].getElementsByClassName("main-title")[0].textContent = o.name;
		cont = eles[1].getElementsByClassName("main-infolist")[0];
		H.removeChildren(cont);
		o.gender && cont.appendChild(H.buildInfoRow("性别", [o.gender]));
		o.birthday && cont.appendChild(H.buildInfoRow("生日", [o.birthday]));
		o.area && cont.appendChild(H.buildInfoRow("地区", [o.area]));
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
	display: async function (eles, o) {
		let cont = eles[0].getElementsByClassName("main-cover-album")[0];
		H.removeChildren(cont);
		cont.appendChild(H.buildElement("img", {src: o.logoURL}));
		cont.appendChild(H.buildElement("span", {class: "icon-play"}, o.playCount));
		cont = eles[0].getElementsByClassName("block-content")[0];
		cont.children[0].textContent = "专辑介绍";
		cont.children[1].textContent = (o.info != null) ? o.info : "";
		eles[1].getElementsByClassName("main-title")[0].textContent = o.name;
		cont = eles[1].getElementsByClassName("main-user")[0];
		H.removeChildren(cont);
		for (let ren of o.artists != null ? o.artists : "") {
			let en = await queryEntryP("artist", ren.id, ren.sid);
			cont.appendChild(H.buildElement("img", {src: en.logoURL}));
			cont.appendChild(H.buildElement("span", null, en.name));
		}
		cont = eles[1].getElementsByClassName("main-infolist")[0];
		H.removeChildren(cont);
		o.discCount && cont.appendChild(H.buildInfoRow("碟片数", [o.discCount]));
		o.songCount && cont.appendChild(H.buildInfoRow("曲目数", [o.songCount]));
		o.publishTime && cont.appendChild(H.buildInfoRow("发行时间", [o.publishTime]));
		o.language && cont.appendChild(H.buildInfoRow("语言", [o.language]));
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
		let en = await queryEntryP("album", o.album.id, o.album.sid);
		let cont = eles[0].getElementsByClassName("main-cover-song")[0];
		H.removeChildren(cont);
		cont.appendChild(H.buildElement("img", {src: en.logoURL}));
		cont.appendChild(H.buildElement("span", {class: "icon-play"}, o.playCount));
		cont = eles[0].getElementsByClassName("main-infolist")[0];
		H.removeChildren(cont);
		cont.appendChild(H.buildInfoRow("专辑", [o.album.name]));
		eles[1].getElementsByClassName("main-title")[0].textContent = o.name;
		en = await queryEntryP("artist", o.artist.id, o.artist.sid);
		cont = eles[1].getElementsByClassName("main-user")[0];
		H.removeChildren(cont);
		cont.appendChild(H.buildElement("img", {src: en.logoURL}));
		cont.appendChild(H.buildElement("span", null, en.name));
		cont = eles[1].getElementsByClassName("main-infolist")[0];
		H.removeChildren(cont);
		o.translation && cont.appendChild(H.buildInfoRow("译名", [o.translation]));
		o.disc && cont.appendChild(H.buildInfoRow("碟片 #", [o.disc]));
		o.track && cont.appendChild(H.buildInfoRow("曲目 #", [o.track]));
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
