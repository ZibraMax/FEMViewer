import { FEMViewer, themes } from "./FEMViewer.js";
let magnif = 0;
let rot = false;
let mode = 0;
let axis = 6;
let zoom = 1;
let lines = true;

let path_str = "2D_I_SHAPE";
let queryString = window.location.search;
let vis_param = 0;
let theme = "Default";
let theme_param = "Default";
let animation = "off";
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
	let anim_param = parametros.get("animation");
	theme_param = parametros.get("theme");
	if (theme_param) {
		theme = theme_param;
	}
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
	if (anim_param) {
		animation = anim_param;
	}
}

let path = `./resources/${path_str}.json`;
if (path_str.startsWith("https://")) {
	path = path_str;
} else if (path_str.startsWith("ex:")) {
	path =
		"https://raw.githubusercontent.com/ZibraMax/FEM/master/Examples/Mesh_tests/" +
		path_str.split(":")[1];
	console.log(path);
}

const container = document.getElementById("models-container");

const O = new FEMViewer(container, magnif, rot, axis == 1, zoom);
O.theme = themes[theme] || {};
O.after_load();

if (vis_param == 1) {
	O.menuCerrado = false;
	O.updateMenuCerrado();
}
O.updateStylesheet();
O.updateColors();
O.updateMaterial();
O.draw_lines = lines;
await O.loadJSON(path);
O.step = mode;
await O.init();

console.log(O);
O.after_load();

if (animation == "off") {
	O.animate = false;
	console.log("Animation: " + animation);
} else if (animation == "solutions") {
	O.animationType = "Solutions timeline";
}
async function getFiles(paths) {
	const file_paths = [];
	const d = {};
	for (const path of paths) {
		const response = await fetch(path);
		const jsondata = await response.json();
		const tree = jsondata["tree"];
		let repo = path.split("/")[4] + "/" + path.split("/")[5];
		let rama = path.split("/")[8].split("?")[0];
		for (const file of tree) {
			if (
				!file["path"].includes("vscode") &&
				file["path"].includes(".json")
			) {
				file_paths.push(
					"https://raw.githubusercontent.com/" +
						repo +
						"/" +
						rama +
						"/" +
						file["path"]
				);
				d[file["path"]] =
					"https://raw.githubusercontent.com/" +
					repo +
					"/" +
					rama +
					"/" +
					file["path"];
			}
		}
	}
	O.addExamples(d);
}
getFiles([
	"https://api.github.com/repos/ZibraMax/FEM/git/trees/master?recursive=1",
	"https://api.github.com/repos/ZibraMax/FEMViewer/git/trees/main?recursive=1",
]);
