import { FEMViewer, themes } from "./FEMViewer.js";
let theme = "Default";
let queryString = window.location.search;
const container = document.getElementById("models-container");
const O = new FEMViewer(container);
await O.loadJSON("./resources/2D_I_SHAPE.json");
await O.init();
console.log(O);
O.after_load();

const expand_btn = document.querySelector(".expand-btn");

let activeIndex;

expand_btn.addEventListener("click", () => {
	document.body.classList.toggle("collapsed");
});

const current = window.location.href;

const allLinks = document.querySelectorAll(".sidebar-links a");

allLinks.forEach((elem) => {
	elem.addEventListener("click", function () {
		const hrefLinkClick = elem.href;

		allLinks.forEach((link) => {
			if (link.href == hrefLinkClick) {
				link.classList.add("active");
			} else {
				link.classList.remove("active");
			}
		});
	});
});

const searchInput = document.querySelector(".search__wrapper input");

searchInput.addEventListener("focus", (e) => {
	document.body.classList.remove("collapsed");
});

const expandBtn = document.getElementById("expandBtn");

const acc = document.getElementsByClassName("accordion");
for (let i = 0; i < acc.length; i++) {
	acc[i].addEventListener("click", function () {
		this.classList.toggle("active");
		var panel = this.nextElementSibling;
		if (panel.style.maxHeight) {
			panel.style.maxHeight = null;
		} else {
			panel.style.maxHeight = panel.scrollHeight + "px";

			if (document.body.classList.contains("collapsed")) {
				document.body.classList.remove("collapsed");
			}
		}
	});
}
function collapseAllAcordion() {
	for (let i = 0; i < acc.length; i++) {
		acc[i].classList.remove("active");
		var panel = acc[i].nextElementSibling;
		panel.style.maxHeight = null;
	}
}

expandBtn.addEventListener("click", collapseAllAcordion);
