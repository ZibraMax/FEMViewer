import { FEMViewer } from "./FEMViewer.js";
let magnif = 600;
let rot = false;
let mode = 6;
let axis = 6;
let zoom = 1;
let lines = true;

let path_str =
	"https://raw.githubusercontent.com/ZibraMax/masters-slides/main/results/SiCube_l3_0_0_500_L_25_884.json";
let queryString = window.location.search;
let vis_param = 0;
if (queryString != "") {
	queryString = queryString.split("?")[1];
	let parametros = new URLSearchParams(queryString);
	let funcion_param = parametros.get("mesh");
	let magnif_param = parametros.get("magnif");
	let rot_param = parametros.get("rot");
	let mode_param = parametros.get("mode");
	let axis_param = parametros.get("axis");
	let zoom_param = parametros.get("zoom");
	let lines_param = parametros.get("lines");
	vis_param = parametros.get("menu");
	if (funcion_param) {
		path_str = funcion_param;
	}
	if (magnif_param) {
		magnif = parseFloat(magnif_param);
	}
	if (rot_param) {
		rot = true;
	}
	if (mode_param) {
		mode = parseFloat(mode_param);
	}
	if (axis_param) {
		axis = parseInt(axis_param);
	}
	if (zoom_param) {
		zoom = 1 + parseFloat(zoom_param);
	} else {
		zoom = 1.05;
	}
	if (lines_param) {
		lines = false;
	}
}

let path = `./resources/${path_str}.json`;
if (path_str.startsWith("https://")) {
	path = path_str;
}

const canvas = document.getElementById("model-view");

const O = new FEMViewer(canvas, magnif, rot, axis == 1, zoom);
O.draw_lines = lines;
await O.loadJSON(path);
O.init();
O.setStep(mode);
document.addEventListener("visibilitychange", (e) =>
	O.handleVisibilityChange(e)
);
const gui = document.querySelector(".root");
if (!vis_param) {
	gui.classList.add("alwaysOpen");
}
const file_input = document.getElementById("json-file-input");

function openFiles(evt) {
	var files = evt.target.files;

	for (var i = 0, len = files.length; i < len; i++) {
		var file = files[i];

		var reader = new FileReader();

		reader.onload = (function (f) {
			return function (e) {
				const json_txt = e.target.result;
				const jsondata = JSON.parse(json_txt);
				O.reset();
				O.step = 0;
				O.parseJSON(jsondata);
				O.init(false);
			};
		})(file);

		reader.readAsText(file);
	}
}
file_input.addEventListener("change", openFiles);
console.log(O);
function showPage() {
	document.getElementById("loader").style.display = "none";
}
function onDocumentKeyDown(event) {
	const keyCode = event.which;
	if (keyCode == 39) {
		O.nextSolution();
	} else if (keyCode == 37) {
		O.prevSolution();
	}
}
showPage();
document.addEventListener("keydown", onDocumentKeyDown, false);
