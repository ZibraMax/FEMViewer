import * as THREE from "./build/three.module.js";
import { ElementView } from "./ElementView.js";
import { ResourceTracker } from "./ResourceTracker.js";
import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.17/+esm";
import { OrbitControls } from "./build/OrbitControls.js";
import * as BufferGeometryUtils from "./build/BufferGeometryUtils.js";
import { AxisGridHelper } from "./build/minigui.js";
import { Lut } from "./build/Lut.js";
import { CONFIG_DICT } from "./ConfigDicts.js";
import { Geometree, Quadrant3D } from "./Octree.js";
import {
	LineRegion,
	RectangularPlaneRegion,
	TriangularPlaneRegion,
} from "./Regions.js";
import {
	Brick,
	BrickO2,
	Tetrahedral,
	TetrahedralO2,
	Lineal,
	Triangular,
	TriangularO2,
	Quadrilateral,
	Serendipity,
	LinealO2,
} from "./Elements.js";
import {
	max,
	min,
	transpose,
	multiplyScalar,
	squared_distance,
} from "./math.js";
import { NotificationBar } from "./NotificationBar.js";
import { Modal } from "./ModalManager.js";
function allowUpdate() {
	return new Promise((f) => {
		setTimeout(f, 0);
	});
}

var style = getComputedStyle(document.body);
var TEXT_COLOR = style.getPropertyValue("--gui-text-color").trim();
var BACKGROUND_COLOR = style.getPropertyValue("--gui-background-color").trim();
var TITLE_BACKGROUND_COLOR = style
	.getPropertyValue("--gui-title-background-color")
	.trim();
var PLOT_GRID_COLOR = style.getPropertyValue("--plot-grid-color").trim();
var FONT_FAMILY = style.getPropertyValue("--font-family").trim();
var FOCUS_COLOR = style.getPropertyValue("--focus-color").trim();
var LINES_COLOR = style.getPropertyValue("--gui-text-color").trim();

var PLOT_STYLE = {
	margin: { t: 0 },
	paper_bgcolor: BACKGROUND_COLOR,
	plot_bgcolor: BACKGROUND_COLOR,
	font: {
		color: TEXT_COLOR,
		family: FONT_FAMILY,
	},
	xaxis: {
		gridcolor: PLOT_GRID_COLOR,
	},
	yaxis: {
		gridcolor: PLOT_GRID_COLOR,
	},
};

const types = {
	B1V: Brick,
	B2V: BrickO2,
	TE1V: Tetrahedral,
	TE2V: TetrahedralO2,
	L1V: Lineal,
	T1V: Triangular,
	T2V: TriangularO2,
	C1V: Quadrilateral,
	C2V: Serendipity,
	L2V: LinealO2,
};

const themes = {
	Default: {},
	"Transparent background": {
		...{
			"--gui-background-color": "#f6f6f6",
			"--gui-text-color": "#3d3d3d",
			"--gui-title-background-color": "#efefef",
			"--gui-title-text-color": "#3d3d3d",
			"--gui-widget-color": "#eaeaea",
			"--gui-hover-color": "#f0f0f0",
			"--gui-focus-color": "#fafafa",
			"--gui-number-color": "#07aacf",
			"--gui-string-color": "#8da300",
			"--focus-color": "#dc2c41",
		},
		"--backbround-color": "transparent",
		emmisive: true,
	},
	Light: {
		"--gui-background-color": "#f6f6f6",
		"--gui-text-color": "#3d3d3d",
		"--gui-title-background-color": "#efefef",
		"--gui-title-text-color": "#3d3d3d",
		"--gui-widget-color": "#eaeaea",
		"--gui-hover-color": "#f0f0f0",
		"--gui-focus-color": "#fafafa",
		"--gui-number-color": "#07aacf",
		"--gui-string-color": "#8da300",
		"--focus-color": "#dc2c41",
		emmisive: true,
	},
	Dark: {
		"--gui-background-color": "#1f1f1f",
		"--gui-text-color": "#ebebeb",
		"--gui-title-background-color": "#111111",
		"--gui-title-text-color": "#ebebeb",
		"--gui-widget-color": "#424242",
		"--gui-hover-color": "#4f4f4f",
		"--gui-focus-color": "#595959",
		"--gui-number-color": "#2cc9ff",
		"--gui-string-color": "#a2db3c",
		"--focus-color": "var(--gui-focus-color)",
		"--plot-grid-color": "#616161",
	},
	"Solarized Light": {
		"--gui-background-color": "#fdf6e3",
		"--gui-text-color": "#657b83",
		"--gui-title-background-color": "#f5efdc",
		"--gui-title-text-color": "#657b83",
		"--gui-widget-color": "#eee8d5",
		"--gui-hover-color": "#e7e1cf",
		"--gui-focus-color": "#e6ddc7",
		"--gui-number-color": "#2aa0f3",
		"--gui-string-color": "#97ad00",
		"--focus-color": "var(--gui-focus-color)",
	},
	"Solarized Dark": {
		"--gui-background-color": "#002b36",
		"--gui-text-color": "#b2c2c2",
		"--gui-title-background-color": "#001f27",
		"--gui-title-text-color": "#b2c2c2",
		"--gui-widget-color": "#094e5f",
		"--gui-hover-color": "#0a6277",
		"--gui-focus-color": "#0b6c84",
		"--gui-number-color": "#2aa0f2",
		"--gui-string-color": "#97ad00",
		"--focus-color": "var(--gui-focus-color)",
		"--plot-grid-color": "#616161",
	},
	Tennis: {
		"--gui-background-color": "#32405e",
		"--gui-text-color": "#ebe193",
		"--gui-title-background-color": "#713154",
		"--gui-title-text-color": "#ffffff",
		"--gui-widget-color": "#057170",
		"--gui-hover-color": "#057170",
		"--gui-focus-color": "#b74f88",
		"--gui-number-color": "#ddfcff",
		"--gui-string-color": "#ffbf00",
		"--focus-color": "var(--gui-focus-color)",
		"--plot-grid-color": "#616161",
	},
};

const styleElement = document.createElement("style");
document.body.appendChild(styleElement);

var GOBAL_DRAG = false;

Dropzone.autoDiscover = false;

class FEMViewer {
	constructor(container, magnif, rot, axis = false, iz = 1.05) {
		if (!magnif) {
			magnif = 0;
		}
		// FEM

		this.selectedNodes = [];
		this.regions = [];
		this.nodeSearchRadius = 0.01;

		this.container = container;
		let canvas = document.createElement("canvas");
		canvas.setAttribute("class", "box side-pane");
		canvas.setAttribute("willReadFrequently", "true");
		this.container.appendChild(canvas);
		this.canvas = canvas;

		this.loaderIcon = document.createElement("div");
		this.loaderIcon.setAttribute("class", "loaderIcon");
		this.container.appendChild(this.loaderIcon);

		this.theme = themes["Default"];
		this.element_views = new Set();
		this.refreshing = true;
		this.wireframe = false;
		this.corriendo = false;
		this.animationFrameID = undefined;
		this.min_search_radius = -Infinity;
		this.not_draw_elements = [];
		this.max_color_value = 0;
		this.min_color_value = 0;
		this.initial_zoom = iz;
		this.solution_as_displacement = false;
		this.axis = axis;
		this.max_color_value_slider = undefined;
		this.min_color_value_slider = undefined;
		this.resource_tracker = new ResourceTracker();
		this.raycaster = new THREE.Raycaster();
		this.notiBar = new NotificationBar(this.container);

		this.before_load = () => {
			this.loaderIcon.style.display = "";
		};
		this.after_load = () => {
			this.loaderIcon.style.display = "none";
		};
		this.rot = rot;
		this.resolution = 1;
		this.nodes = [];
		this.selectedNodesMesh = {};
		this.nvn = -1;
		this.dictionary = [];
		this.types = [];
		this.solutions = [];
		this.solutions_info = [];
		this.U = [];
		this.step = 0;
		this.max_disp = 0.0;
		this.size = 0.0;
		this.elements = [];
		this.info = "";
		this.infoDetail = "";
		this.ndim = -1;
		this.border_elements = [];
		this.config_dict = CONFIG_DICT["GENERAL"];
		this.dimensions = ["x", "y", "z"];

		// THREE JS
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
		});
		this.renderer.autoClear = false;

		this.not_draw_elements = [];
		this.delta = 0;
		this.interval = 1 / 60;
		this.clock = new THREE.Clock();
		this.bufferGeometries = [];
		this.bufferLines = [];
		this.model = new THREE.Object3D();

		this.regionModel = new THREE.Object3D();
		this.regionModelContours = new THREE.Object3D();
		this.regionModelGeometries = new THREE.Object3D();
		this.invisibleModel = new THREE.Object3D();
		this.colors = false;
		this.animate = true;
		this.magnif = magnif;
		this.mult = 1.0;
		this.side = 1.0;
		this.max_disp = 0.0;
		this.draw_lines = true;
		this.colormap = "rainbow";
		this.show_model = true;
		this.octreeMesh = undefined;
		this.showOctree = false;
		this.regionModel.visible = false;

		this.menuCerrado = true;

		this.lut = new Lut(this.colormap);
		this.filename = "";

		this.gui = new GUI({ title: "Menu", container: this.container });
		this.gui.close();
		this.loaded = false;
		this.colorOptions = "nocolor";
		this.clickMode = "Inspect element";
		this.createModals();
		this.histogram = document.getElementById("histogram");

		this.settings();
		this.createListeners();
	}
	createModals() {
		this.JSONModal = new Modal(this.container, "File input");
		let content = document.createElement("div");
		content.innerHTML =
			'<div class="dropzone-container"><form id="json-file-input" class="dropzone" action="/" method="post"></form></div>';
		this.JSONModal.addContent(content);

		this.histogramModal = new Modal(this.container, "Histogram view");
		this.histogramModal.content.innerHTML =
			'<div id="histogram" style="width: 100%; height: 85%"></div>';

		this.borderConditionModal = new Modal(
			this.container,
			"Border condition"
		);
		let contentt = document.createElement("div");
		let input = document.createElement("input");
		let cbncbe = document.createElement("select");
		let a1 = document.createElement("option");
		a1.innerHTML = "Essential";
		cbncbe.append(a1);
		let a2 = document.createElement("option");
		a2.innerHTML = "Natural";
		cbncbe.append(a2);
		let nvn = document.createElement("select");
		for (let i = 0; i < 3; i++) {
			let n1 = document.createElement("option");
			n1.innerHTML = i + 1;
			nvn.append(n1);
		}

		contentt.appendChild(input);
		contentt.appendChild(cbncbe);
		contentt.appendChild(nvn);
		this.borderConditionModal.addContent(contentt);
	}

	onDocumentKeyDown(event) {
		const keyCode = event.which;
		if (keyCode == 39) {
			this.nextSolution();
		} else if (keyCode == 37) {
			this.prevSolution();
		} else if (keyCode == 27) {
			this.destroy_element_views();
			this.unselectAllNodes();
		} else if (keyCode == 77) {
			this.menuCerrado = !this.menuCerrado;
			this.updateMenuCerrado();
		}
	}

	createListeners() {
		document.addEventListener(
			"keydown",
			this.onDocumentKeyDown.bind(this),
			false
		);

		window.addEventListener("resize", this.render.bind(this));

		document.addEventListener("visibilitychange", (e) =>
			this.handleVisibilityChange(e)
		);

		this.notiBar.addButton("fa fa-refresh", this.reload.bind(this));
		this.playButton = this.notiBar.addButton(
			"fa fa-pause",
			this.toogleRefresh.bind(this)
		);

		this.canvas.addEventListener("mousedown", () => (GOBAL_DRAG = false));
		this.canvas.addEventListener("mousemove", (e) => {
			GOBAL_DRAG = true;
			this.onDocumentMouseMove(e);
		});
		this.canvas.addEventListener("mouseup", (e) => {
			GOBAL_DRAG ? "drag" : this.onDocumentMouseDown(e);
		});
	}

	updateMenuCerrado() {
		this.gui.show(this.menuCerrado);
		if (this.menuCerrado) {
			document
				.getElementById("notification-container")
				.setAttribute("style", "");
		} else {
			document
				.getElementById("notification-container")
				.setAttribute("style", "visibility: hidden");
		}
	}

	updateStylesheet() {
		let style = "";
		const stylesheet = this.theme;
		for (let prop in stylesheet) {
			const value = stylesheet[prop];
			style += `\t${prop}: ${value};\n`;
		}
		if (style) {
			style = ":root {\n" + style + "}";
			styleElement.innerHTML = style;
		} else {
			styleElement.innerHTML = "";
		}
	}

	updateColors() {
		style = getComputedStyle(document.body);
		TEXT_COLOR = style.getPropertyValue("--gui-text-color").trim();
		BACKGROUND_COLOR = style
			.getPropertyValue("--gui-background-color")
			.trim();
		TITLE_BACKGROUND_COLOR = style
			.getPropertyValue("--gui-title-background-color")
			.trim();
		PLOT_GRID_COLOR = style.getPropertyValue("--plot-grid-color").trim();
		FONT_FAMILY = style.getPropertyValue("--font-family").trim();
		FOCUS_COLOR = style.getPropertyValue("--focus-color").trim();
		LINES_COLOR = style.getPropertyValue("--gui-text-color").trim();

		PLOT_STYLE = {
			margin: { t: 0 },
			paper_bgcolor: BACKGROUND_COLOR,
			plot_bgcolor: BACKGROUND_COLOR,
			font: {
				color: TEXT_COLOR,
				family: FONT_FAMILY,
			},
			xaxis: {
				gridcolor: PLOT_GRID_COLOR,
			},
			yaxis: {
				gridcolor: PLOT_GRID_COLOR,
			},
		};
	}

	updateTheme() {
		this.updateStylesheet();
		this.updateColors();
		this.updateMaterial();
		this.updateGeometry();
		this.updateGraphs();
	}
	updateGraphs() {
		Plotly.relayout(this.histogram, PLOT_STYLE);
		Plotly.restyle(this.histogram, { "marker.color": FOCUS_COLOR });
	}

	updateResolution() {
		for (const e of this.elements) {
			e.res = this.resolution;
			e.initGeometry();
			this.updateSpecificBufferGeometry(e.index);
		}
		this.updateSolution();
	}
	updateRefresh() {
		this.controls.enabled = this.refreshing;
		if (this.refreshing) {
			this.playButton.setAttribute(
				"class",
				"fa fa-pause notification-action"
			);
		} else {
			this.playButton.setAttribute(
				"class",
				"fa fa-play notification-action"
			);
		}
	}
	toogleRefresh() {
		this.refreshing = !this.refreshing;
		this.updateRefresh();
		if (this.refreshing) {
			this.animationFrameID = requestAnimationFrame(
				this.update.bind(this)
			);
		} else {
			cancelAnimationFrame(this.animationFrameID);
		}

		return this.refreshing;
	}
	modalManager() {
		this.JSONModal.show();
		this.gui.close();
	}
	modalManager2() {
		this.histogramModal.show();
		this.createHistogram();
		this.gui.close();
	}
	modalManager3() {
		this.histogramModal.show();
		this.createHistogram2();
		this.gui.close();
	}
	modalManager4() {
		this.borderConditionModal.show();
		this.gui.close();
	}
	createHistogram() {
		let data = [];
		for (const p of Object.keys(this.prop_dict)) {
			let trace = {
				x: this.prop_dict[p][1],
				type: "histogram",
				name: p,
			};
			data.push(trace);
		}
		Plotly.newPlot(this.histogram, data, PLOT_STYLE, { responsive: true });
	}
	createHistogram2() {
		let data = [];
		let trace = {
			x: this.elements.map((e) => {
				return e.sJ;
			}),
			type: "histogram",
			name: "Scaled Jacobian",
			marker: {
				color: FOCUS_COLOR,
			},
		};
		data.push(trace);
		Plotly.newPlot(this.histogram, data, PLOT_STYLE, { responsive: true });
	}

	testNeighborg(ide1, ide2) {
		const e1 = this.elements[ide1];
		const e2 = this.elements[ide2];
		let MIN_VERTICES = 3;
		let en_comun = 0;
		for (const c1 of e1.coords) {
			for (const c2 of e2.coords) {
				if (c2 == c1) {
					en_comun += 1;
					if (en_comun >= MIN_VERTICES) {
						return true;
					}
					break;
				}
			}
		}
		return false;
	}

	isBorder(e) {
		let nfaces = this.elements[e["id"]].nfaces;
		let neighbors = 0;
		let potential = this.OctTree.query_range_point_radius(
			e["_xcenter"],
			this.min_search_radius
		);
		let nb = [];
		for (const ie2 of potential) {
			if (e["id"] != ie2["id"]) {
				if (this.testNeighborg(e["id"], ie2["id"])) {
					neighbors += 1;
					nb.push(ie2);
					if (neighbors == nfaces) {
						break;
					}
				}
			}
		}
		if (neighbors < nfaces) {
			return [true, nb];
		}
		return [false, potential];
	}
	createOctree() {
		this.notiBar.setMessage("Creating Oct Tree... ⌛");
		let nnodes = this._nodes.map((x) => {
			return x["_xcenter"];
		});
		let nodes = transpose(nnodes);
		let centerx = (max(nodes[0]) + min(nodes[0])) / 2;
		let sizex = (max(nodes[0]) - min(nodes[0])) / 2;
		let centery = (max(nodes[1]) + min(nodes[1])) / 2;
		let sizey = (max(nodes[1]) - min(nodes[1])) / 2;
		let centerz = (max(nodes[2]) + min(nodes[2])) / 2;
		let sizez = (max(nodes[2]) - min(nodes[2])) / 2;

		let FF = 1.01;
		let dimension = [sizex * FF, sizey * FF, sizez * FF];
		let bounding = new Quadrant3D([centerx, centery, centerz], dimension);
		this.OctTree = new Geometree(bounding, 10);
		for (let i = 0; i < this._nodes.length; i++) {
			let p = {
				_xcenter: this._nodes[i]["_xcenter"].slice(),
				id: this._nodes[i]["id"],
			};
			this.OctTree.add_point(p);
			this.notiBar.sendMessage("Octree created!");
		}
		const geo_list = this.OctTree.giveContours(this.norm);
		const geo = BufferGeometryUtils.mergeBufferGeometries(geo_list, true);
		this.octreeMesh = new THREE.LineSegments(geo, this.line_material);
	}

	async createOctreeBorderDetect() {
		this.notiBar.setMessage("Creating Oct Tree... ⌛");
		let bounding = new Quadrant3D(this.center, this.dimens);
		this.OctTree = new Geometree(bounding);
		let times = 0;
		for (let i = 0; i < this.elements.length; i++) {
			let p = { _xcenter: this.elements[i]._xcenter.slice(), id: i };
			this.OctTree.add_point(p);
			let percentage = (i / this.elements.length) * 100;
			if (percentage > times) {
				times += 10;
				this.notiBar.setProgressBar("Creating Oct Tree", percentage);
				await allowUpdate();
			}
			this.notiBar.sendMessage("Octree created!");
		}
		const geo_list = this.OctTree.giveContours(this.norm);
		const geo = BufferGeometryUtils.mergeBufferGeometries(geo_list, true);
		this.octreeMesh = new THREE.LineSegments(geo, this.line_material);
	}
	async detectBorderElements2() {
		this.createOctreeBorderDetect();
		this.calculate_border_elements_worker();
	}

	async detectBorderElements() {
		this.createOctreeBorderDetect();
		this.before_load();
		this.visited = new Array(this.elements.length).fill(false);
		console.log("Encontrando elementos de borde");
		const e = this.OctTree.query_first_point_set()[0];
		let [res, vecinos] = this._detectBorderElementsIterative(e);
		this.visited = new Array(this.elements.length).fill(false);
		console.log("Se encontraron " + res.length + " elementos de borde");
		let be = [];
		for (const b of res) {
			be.push(b["id"]);
		}
		this.updateBorderElements(be);
		return res;
	}

	_detectBorderElementsIterative(e) {
		let i = 0;
		let le = [e];
		let vecinos = [];
		this.visited[e["id"]] = true;
		let [isBorder, neighbors] = this.isBorder(e);
		vecinos.push(neighbors);
		while (i < le.length) {
			let ele_index = le[i]["id"];
			e = { _xcenter: this.elements[ele_index]._xcenter, id: ele_index };
			neighbors = vecinos[i];
			for (const nb of neighbors) {
				if (!this.visited[nb["id"]]) {
					this.visited[nb["id"]] = true;
					let [ib, nbn] = this.isBorder(nb);
					if (ib) {
						le.push(nb);
						vecinos.push(nbn);
					}
				}
			}
			i += 1;
			console.log("Encontrados " + le.length + " elementos de borde");
		}
		return [le, vecinos];
	}

	async loadJSON(json_path, be) {
		this.notiBar.setMessage("Loading model..." + "⌛", true);
		this.json_path = json_path;
		this.filename = json_path;
		const response = await fetch(this.json_path);
		const jsondata = await response.json();
		if (be != undefined) {
			jsondata["border_elements"] = be;
		}
		this.parseJSON(jsondata);
		this.notiBar.resetMessage();
	}

	async updateShowOctree() {
		if (this.showOctree) {
			if (!this.octreeMesh) {
				await this.createOctree();
			}
			this.model.add(this.octreeMesh);
		} else {
			this.model.remove(this.octreeMesh);
		}
		this.updateShowModel();
	}

	reset() {
		this.solution_as_displacement = false;
		this.variable_as_displacement = 2;
		this.toogleSolutionAsDisp(); // THIS TOOGLE DISPLACEMENTS!!!
		const track = this.resource_tracker.track.bind(this.resource_tracker);

		track(this.model);
		track(this.invisibleModel);

		for (let i = 0; i < this.elements.length; i++) {
			this.elements[i].geometry.dispose();
			this.bufferGeometries.pop().dispose();
			this.bufferLines.pop().dispose();
		}
		this.mergedGeometry.dispose();
		this.mergedLineGeometry.dispose();
		this.renderer.renderLists.dispose();
		this.material.dispose();
		this.line_material.dispose();

		this.destroy_element_views();
		this.resource_tracker.dispose();

		if (this.octreeMesh) {
			track(this.octreeMesh);
		}

		for (const sn of this.selectedNodes) {
			for (const smm of this.selectedNodesMesh[sn]) {
				this.model.remove(smm);
				smm.material.dispose();
				smm.geometry.dispose();
			}
		}
		for (let i = 0; i < this.regions.length; i++) {
			let reg = this.regions[i];
			this.regionModelGeometries.remove(reg.mesh);
			this.regionModelContours.remove(reg.edges);
			reg.mesh.material.dispose();
			reg.mesh.geometry.dispose();
			reg.edges.material.dispose();
			reg.edges.geometry.dispose();
		}
		this.regions = [];
		this.selectedNodes = [];
		this.selectedNodesMesh = {};

		this.show_model = true;
		this.showOctree = false;

		this.element_views = new Set();
		this.wireframe = false;
		this.corriendo = false;
		this.animationFrameID = undefined;
		this.animate = false;
		this.colorOptions = "nocolor";
		this.config_dict = CONFIG_DICT["GENERAL"];
		this.min_search_radius = -Infinity;
		this.not_draw_elements = []; // quitar
		this.bufferGeometries = [];
		this.bufferLines = [];

		this.nodes = [];
		this.dictionary = [];
		this.solutions = [];
		this.solutions_info = [];
		this.U = [];
		this.step = 0;
		this.elements = [];
		this.types = [];
		this.magnif = 0.0;
		this.max_abs_disp = undefined;
		this.border_elements = [];
		this.scene.remove(this.model);
		this.regionModel.remove(this.regionModelContours);
		this.regionModel.remove(this.regionModelGeometries);
		this.scene.remove(this.regionModel);
		this.scene.remove(this.invisibleModel);
		delete this.mergedGeometry;
		delete this.mergedLineGeometry;
		this.resource_tracker.untrack(this.model);
		this.resource_tracker.untrack(this.invisibleModel);
		if (this.octreeMesh) {
			this.resource_tracker.untrack(this.octreeMesh);
		}
		this.octreeMesh = undefined;
	}

	settings() {
		THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);
		// Scene settings
		this.scene = new THREE.Scene();
		// Camera settings
		const fov = 40;
		const aspect = window.innerWidth / window.innerHeight; // the canvas default
		const near = 0.01;
		const far = 200;
		this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		this.camera.position.set(25, 25, 25);
		this.camera.lookAt(0, 0, 0);
		this.scene.add(this.camera);

		// Controls
		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.target.set(0, 0, 0);
		this.controls.update();

		// Lights
		this.light2 = new THREE.AmbientLight(0xffffff, 0.0);
		const color = 0xffffff;
		const intensity = 0.8;
		this.light = new THREE.PointLight(color, intensity);
		this.camera.add(this.light);
		this.scene.add(this.light2);

		this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2);
		this.orthoCamera.position.set(-0.9, 0, 1);
		this.uiScene = new THREE.Scene();
		this.sprite = new THREE.Sprite(
			new THREE.SpriteMaterial({
				map: new THREE.CanvasTexture(this.lut.createCanvas()),
			})
		);
		this.sprite.scale.x = 0.125;
		this.uiScene.add(this.sprite);

		this.gh = new AxisGridHelper(this.scene, 0);
		this.gh.visible = this.axis;

		let O = this;
		this.dropzone = new Dropzone("form#json-file-input", {
			paramName: "file",
			maxFilesize: 50,
			autoQueue: false,
			acceptedFiles: ".json",
			dictDefaultMessage:
				"Drop JSON file here! (click to select from storage)",
			accept: function (file, done) {
				var reader = new FileReader();
				reader.addEventListener("loadend", function (event) {
					const json_txt = event.target.result;
					const jsondata = JSON.parse(json_txt);
					O.reset();
					O.parseJSON(jsondata);
					O.init(false);
					O.after_load();
					O.dropzone.emit("success", file, "success", null);
					O.dropzone.emit("complete", file);
					O.dropzone.removeAllFiles();
				});
				reader.readAsText(file);
				done();
				document.getElementById("myModal").style.display = "none";
			},
		});
		//this.guiSettingsBasic();
	}

	async updateShowModel() {
		this.mesh.visible = this.show_model;
		this.contour.visible = this.show_model;
		this.regionModel.visible = this.show_model;
		this.draw_lines = this.show_model;
		this.gh.visible = true;
		for (const ch of this.model.children) {
			if (ch.visible) {
				this.gh.visible = false;
				break;
			}
		}
	}
	_createRegionCoords(selectedNodes, id) {
		let region;
		if (selectedNodes.length == 2) {
			let p1 = selectedNodes[0];
			let p2 = selectedNodes[1];
			region = new LineRegion(p1, p2);
		} else if (selectedNodes.length == 3) {
			let p1 = selectedNodes[0];
			let p2 = selectedNodes[1];
			let p3 = selectedNodes[2];
			region = new TriangularPlaneRegion(p1, p2, p3);
		} else if (selectedNodes.length == 4) {
			let p1 = selectedNodes[0];
			let p2 = selectedNodes[1];
			let p3 = selectedNodes[2];
			let p4 = selectedNodes[3];
			region = new RectangularPlaneRegion(p1, p2, p3, p4);
		} else {
			this.notiBar.sendMessage(
				"Regions can only be created with at least 2 nodes"
			);
		}
		if (region) {
			this.deselectAllNodes();
			region.setNodesOfRegionOctree(this.OctTree);
			for (const node of region.nodes) {
				this.selectNode(node["index"]);
			}
			region.geometry = region.giveGeometry(
				this.norm,
				this.size,
				this.ndim,
				this.nodeSearchRadius
			);
			region.mesh = new THREE.Mesh(region.geometry, this.material);
			region.mesh.userData = { id: id };
			region.edges = new THREE.LineSegments(
				new THREE.EdgesGeometry(region.geometry),
				this.line_material
			);
			region.edges.userData = { id: id };
			this.regionModelGeometries.add(region.mesh);
			this.regionModelContours.add(region.edges);
			this.regions.push(region);
		}
	}
	_createRegion(selectedNodes, id) {
		let coords = [];
		for (const co of selectedNodes) {
			coords.push(this.nodes[co]);
		}
		this._createRegionCoords(coords, id);
	}

	createRegion() {
		let id = this.regions.length;
		this._createRegion(this.selectedNodes, id);
	}

	deselectAllNodes() {
		for (const i of this.selectedNodes) {
			for (const smm of this.selectedNodesMesh[i]) {
				this.model.remove(smm);
				smm.material.dispose();
				smm.geometry.dispose();
			}
			delete this.selectedNodesMesh[i];
		}
		this.selectedNodes = [];
	}

	guiSettingsBasic() {
		if (this.settingsFolder) {
			this.settingsFolder.destroy();
		}
		this.settingsFolder = this.gui.addFolder("Settings");
		this.settingsFolder.add(this, "modalManager").name("Load JSON File");
		this.settingsFolder
			.add(this, "modalManager2")
			.name("Show properties histogram");
		this.settingsFolder
			.add(this, "modalManager3")
			.name("Show scaled jacobian histogram");
		this.settingsFolder
			.add(this, "detectBorderElements2")
			.name("Detect border elements");
		this.settingsFolder
			.add(this, "downloadAsJson")
			.name("Donwload JSON file");
		this.settingsFolder.add(this, "createRegion").name("Create Region");
		this.settingsFolder.add(this, "modalManager4").name("Assign BC");

		this.settingsFolder.add(this.gh, "visible").listen().name("Axis");
		this.settingsFolder.add(this, "rot").name("Rotation").listen();

		this.settingsFolder
			.add(this, "wireframe")
			.listen()
			.onChange(() => {
				this.updateMaterial();
				this.updateGeometry();
			})
			.name("Wireframe");
		this.settingsFolder
			.add(this, "draw_lines")
			.onChange(this.updateLines.bind(this))
			.name("Draw lines")
			.listen();

		this.settingsFolder
			.add(this, "showOctree")
			.onChange(this.updateShowOctree.bind(this))
			.listen()
			.name("Show Octree");
		this.settingsFolder
			.add(this, "show_model")
			.name("Show model")
			.onChange(this.updateShowModel.bind(this))
			.listen();
		this.settingsFolder
			.add(this.regionModel, "visible")
			.name("Show regions")
			.listen();

		if (this.config_dict["displacements"]) {
		} else {
			if (this.ndim != 3) {
				this.settingsFolder
					.add(this, "solution_as_displacement")
					.listen()
					.name("Solution as disp")
					.onFinishChange(this.toogleSolutionAsDisp.bind(this));
			}
		}

		this.settingsFolder
			.add(this, "clickMode", [
				"Inspect element",
				"Delete element",
				"Detect nodes",
				"Detect region",
			])
			.listen()
			.name("Click mode");
		this.settingsFolder
			.add(this, "resolution", {
				"Low (only vertices) (1)": 1,
				"Medium (2)": 2,
				"High (4)": 3,
				"Ultra (8)": 4,
				"PC becomes room heater (16)": 5,
			})
			.listen()
			.onChange(this.updateResolution.bind(this))
			.name("LOD ⚠️ (expensive)");
		this.settingsFolder
			.add(this, "theme", themes, "Default")
			.name("Theme")
			.listen()
			.onChange(this.updateTheme.bind(this));
		if (this.example_file_paths) {
			this.settingsFolder
				.add(this, "filename", this.example_file_paths)
				.name("Examples")
				.listen()
				.onChange(this.changeExample.bind(this));
		}
	}
	toogleSolutionAsDisp() {
		this.config_dict["displacements"] = this.solution_as_displacement;
		this.guiSettings();
		if (!this.solution_as_displacement) {
			this.magnif = 0.0;
			this.updateSolutionAsDisplacement();
		} else {
			this.updateVariableAsSolution();
		}
	}
	updateVariableAsSolution() {
		this.animate = false;
		this.mult = 1;
		this.magnif = 0.4 / this.max_abs_disp;
		this.updateDispSlider();
		this.updateSolutionAsDisplacement();
	}
	guiSettings() {
		// GUI
		if (this.disp_gui_sol_disp_folder) {
			this.disp_gui_sol_disp_folder.destroy();
		}
		if (this.solution_as_displacement) {
			this.disp_gui_sol_disp_folder = this.gui.addFolder(
				"Solution as displacement"
			);
			this.disp_gui_sol_disp_folder
				.add(this, "variable_as_displacement", {
					x: 0,
					y: 1,
					z: 2,
				})
				.listen()

				.name("Variabe")
				.onChange(this.updateVariableAsSolution.bind(this));
			this.variable_as_displacement = 2;
		}

		if (this.disp_gui_disp_folder) {
			this.disp_gui_disp_folder.destroy();
		}
		if (this.config_dict["displacements"]) {
			this.disp_gui_disp_folder = this.gui.addFolder("Displacements");
			this.disp_gui_disp_folder
				.add(this, "animate")
				.name("Animation")
				.listen()
				.onChange(() => {
					this.notiBar.setMessage("Animation running!");

					if (!this.animate) {
						this.mult = 1.0;
						this.updateMeshCoords();
						this.updateGeometry();
						this.notiBar.resetMessage();
					}
				});
			this.magnifSlider = this.disp_gui_disp_folder
				.add(this, "magnif", 0, 1)
				.name("Disp multiplier")
				.listen()
				.onChange(() => {
					this.updateMeshCoords();
					this.updateGeometry();
				});
		}
	}

	async reload() {
		cancelAnimationFrame(this.animationFrameID);

		this.animate = false;
		this.reset();
		this.before_load();
		this.notiBar.setMessage("Reloading model..." + "⌛");
		await this.loadJSON(this.filename);
		this.notiBar.resetMessage();
		await this.init(false);
		this.after_load();
	}

	updateBorderElements(be) {
		this.reset();
		this.before_load();
		this.notiBar.setMessage("Reloading model..." + "⌛");
		const resp = this.loadJSON(this.filename, be);
		resp.then(() => {
			this.notiBar.resetMessage();
			this.init(false);
			this.after_load();
		});
	}

	updateLut() {
		this.lut.setColorMap(this.colormap);
		const map = this.sprite.material.map;
		this.lut.updateCanvas(map.image);
		map.needsUpdate = true;
		this.lut.setMax(this.max_color_value);
		this.lut.setMin(this.min_color_value);
		this.updateMaterial();
		this.updateColorValues();
		this.updateGeometry();
	}
	updateColorVariable() {
		let msg = "";
		const co = this.colorOptions;
		if (co != "nocolor") {
			this.colors = true;
			msg =
				"Showing " +
				this.color_select_option.$select.value +
				" as color.";
		} else {
			this.colors = false;
			msg = "Showing geometry.";
		}
		let Cfuntion = undefined;
		if (this.config_dict["C"]) {
			Cfuntion = this.config_dict["C"];
		}
		for (const e of this.elements) {
			e.setMaxDispNode(
				this.colorOptions,
				this.config_dict["calculateStrain"],
				Cfuntion
			);
		}

		let max_disp = -Infinity;
		let min_disp = Infinity;
		for (const e of this.elements) {
			const variable = e.colors;
			max_disp = Math.max(max_disp, ...variable);
			min_disp = Math.min(min_disp, ...variable);
		}
		let delta = max_disp - min_disp;
		if (delta == 0) {
			delta = 1;
			max_disp += 0.5;
			min_disp -= 0.5;
		}
		this.max_color_value = max_disp;
		this.min_color_value = min_disp;
		this.max_color_value_slider.step(delta / 1000);
		this.min_color_value_slider.step(delta / 1000);

		this.min_color_value_slider.max(max_disp);
		this.min_color_value_slider.min(min_disp);

		this.max_color_value_slider.max(max_disp);
		this.max_color_value_slider.min(min_disp);
		let max_str = this.max_color_value.toFixed(4);
		let min_str = this.min_color_value.toFixed(4);
		if (Math.abs(max_str) == "0.0000") {
			max_str = this.max_color_value.toExponential(4);
		}
		if (Math.abs(min_str) == "0.0000") {
			min_str = this.min_color_value.toExponential(4);
		}

		msg += " Max=" + max_str + " Min=" + min_str;
		this.notiBar.setMessage(msg);
		this.updateLut();
	}
	updateCamera() {
		this.camera.updateProjectionMatrix();
	}
	async renderMath() {
		//function f() {
		//	renderMathInElement(document.body, {
		//		throwOnError: false,
		//	});
		//}
		//setTimeout(f, 100);
	}

	updateMaterial() {
		if (this.colors) {
			this.material = new THREE.MeshBasicMaterial({
				vertexColors: true,
				wireframe: this.wireframe,
				side: THREE.DoubleSide,
			});
			this.light2.intensity = 1.0;
			this.light.intensity = 0.0;
		} else {
			if (this.theme["emmisive"]) {
				this.material = new THREE.MeshLambertMaterial({
					color: FOCUS_COLOR,
					emissive: FOCUS_COLOR,
					wireframe: this.wireframe,
					side: THREE.DoubleSide,
				});
				this.light2.intensity = 0.0;
				this.light.intensity = 1.0;
			} else {
				this.material = new THREE.MeshBasicMaterial({
					color: FOCUS_COLOR,
					wireframe: this.wireframe,
					side: THREE.DoubleSide,
				});
				this.light2.intensity = 1.0;
				this.light.intensity = 0.0;
			}
		}
		this.line_material = new THREE.LineBasicMaterial({
			color: LINES_COLOR,
			linewidth: 3,
		});
	}

	handleVisibilityChange(e) {
		if (document.visibilityState === "hidden") {
			this.clock.stop();
		} else {
			this.clock.start();
		}
	}

	update() {
		this.delta += this.clock.getDelta();
		if (this.delta > this.interval) {
			// The draw or time dependent code are here
			this.render(this.delta);

			this.delta = this.delta % this.interval;
		}
		this.animationFrameID = requestAnimationFrame(this.update.bind(this));
		this.refreshing = true;
		this.updateRefresh();
	}

	resizeRendererToDisplaySize() {
		const canvas = this.renderer.domElement;
		const pixelRatio = window.devicePixelRatio;
		const width = (canvas.clientWidth * pixelRatio) | 0;
		const height = (canvas.clientHeight * pixelRatio) | 0;
		const needResize = canvas.width !== width || canvas.height !== height;
		if (needResize) {
			this.renderer.setSize(width, height, false);
		}
		return needResize;
	}
	updateMeshCoords() {
		for (let i = 0; i < this.elements.length; i++) {
			const e = this.elements[i];
			if (this.draw_lines) {
				e.setGeometryCoords(this.magnif * this.mult, this.norm);
			} else {
				e.setGeometryCoords(this.magnif * this.mult, this.norm);
			}
		}
		if (this.colors) {
			this.updateColorValues();
		}
	}

	updateSpecificBufferGeometry(i) {
		this.bufferGeometries[i] = this.elements[i].geometry;
		this.bufferLines[i] = this.elements[i].line_geometry;
		this.invisibleModel.children[i].geometry = this.elements[i].geometry;
	}

	updateColorValues() {
		for (let i = 0; i < this.elements.length; i++) {
			const e = this.elements[i];
			const colors = this.bufferGeometries[i].attributes.color;
			for (let j = 0; j < e.domain.length; j++) {
				let disp = e.colors[j];
				const color = this.lut.getColor(disp);
				colors.setXYZ(j, color.r, color.g, color.b);
			}
		}
	}

	updateGeometry() {
		if (this.octreeMesh) {
			this.octreeMesh.material = this.line_material;
			this.octreeMesh.material.needsUpdate = true;
		}
		for (const sn of this.selectedNodes) {
			for (const smm of this.selectedNodesMesh[sn]) {
				smm.material = this.line_material;
				smm.material.needsUpdate = true;
			}
		}

		for (const reg of this.regions) {
			reg.mesh.material = this.material;
			reg.mesh.material.needsUpdate = true;
			reg.edges.material = this.line_material;
			reg.edges.material.needsUpdate = true;
		}

		this.mergedGeometry.dispose();
		this.mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(
			this.bufferGeometries,
			false
		);
		this.mesh.geometry = this.mergedGeometry;
		this.mesh.material = this.material;
		this.mesh.material.needsUpdate = true;

		if (this.draw_lines) {
			this.mergedLineGeometry.dispose();
			this.mergedLineGeometry = BufferGeometryUtils.mergeBufferGeometries(
				this.bufferLines,
				false
			);
			this.contour.geometry = this.mergedLineGeometry;
			this.contour.material = this.line_material;
			this.contour.material.needsUpdate = true;
		}
		for (const ev of this.element_views) {
			ev.updateGeometry();
		}
	}

	rotateModel() {
		this.model.rotation.z += 0.005;
	}

	async render(time) {
		if (typeof time == "number") {
			time = time || 0;
		} else {
			time = 0.0;
		}
		this.mult += time * this.side;
		if (this.mult > 1) {
			this.side = -1.0;
			this.mult = 1.0;
		} else if (this.mult < -1) {
			this.side = 1.0;
			this.mult = -1.0;
		}
		if (!this.animate) {
			this.mult = 1.0;
		}

		// console.log(this.mult);

		// Specific part of shit
		if (this.rot) {
			this.rotateModel();
		} else {
			if (this.animate) {
				this.updateMeshCoords();
				this.updateGeometry();
			}
		}
		if (this.resizeRendererToDisplaySize()) {
			const canvas = this.renderer.domElement;
			const aspect = canvas.clientWidth / canvas.clientHeight;
			this.camera.aspect = aspect;
			this.camera.updateProjectionMatrix();
			this.zoomExtents();
		}
		this.renderer.render(this.scene, this.camera);
		if (this.colors && this.menuCerrado) {
			this.renderer.render(this.uiScene, this.orthoCamera);
		}
	}

	createElementView(e) {
		if (this.element_views.size >= 3) {
			const values = this.element_views.values();
			const obj = values.next();
			const first = obj.value;
			this.destroy_element_view(first);
		}
		let element_view = new ElementView(
			e,
			this,
			this.resolution,
			this.container
		);
		this.element_views.add(element_view);
		//this.show_element_views();
	}
	show_element_views() {
		for (const ev of this.element_views) {
			ev.show();
		}
	}
	destroy_element_views() {
		for (const ev of this.element_views) {
			this.destroy_element_view(ev, true);
		}
	}
	destroy_element_view(ev, noclose) {
		ev.close();
		this.element_views.delete(ev);
		if (!noclose) {
			this.updateLut();
		}
	}

	addExamples(file_paths) {
		this.example_file_paths = file_paths;
		this.settingsFolder
			.add(this, "filename", this.example_file_paths)
			.name("Examples")
			.listen()
			.onChange(this.changeExample.bind(this));
	}
	changeExample() {
		this.gui.close();
		this.json_path = this.filename;
		this.reload();
	}

	zoomExtents() {
		let vFoV = this.camera.getEffectiveFOV();
		let hFoV = this.camera.fov * this.camera.aspect;

		let FoV = Math.min(vFoV, hFoV);
		let FoV2 = FoV / 2;

		let dir = new THREE.Vector3();
		this.camera.getWorldDirection(dir);

		let bb = this.mesh.geometry.boundingBox;
		let bs = this.mesh.geometry.boundingSphere;
		let bsWorld = bs.center.clone();
		this.mesh.localToWorld(bsWorld);

		let th = (FoV2 * Math.PI) / 180.0;
		let sina = Math.sin(th);
		let R = bs.radius;
		let FL = R / sina;

		let cameraDir = new THREE.Vector3();
		this.camera.getWorldDirection(cameraDir);

		let cameraOffs = cameraDir.clone();
		cameraOffs.multiplyScalar(-FL * this.initial_zoom);
		let newCameraPos = bsWorld.clone().add(cameraOffs);

		this.camera.position.copy(newCameraPos);
		this.camera.lookAt(bsWorld);
		this.controls.target.copy(bsWorld);

		this.controls.update();
	}

	updateLines() {
		if (this.draw_lines) {
			this.model.add(this.contour);
		} else {
			this.model.remove(this.contour);
		}
		this.updateGeometry();
	}
	guiSolutions() {
		if (this.guifolder) {
			this.guifolder.destroy();
		}
		this.guifolder = this.gui.addFolder("Solutions");
		this.color_select_option = this.guifolder
			.add(this, "colorOptions", {
				"No color": "nocolor",
				"|U|": "dispmag",
				"Scaled Jacobian": "scaled_jac",
				...this.config_dict["dict"],
				...this.prop_dict_names,
			})
			.name("Show color")
			.listen()
			.onChange(this.updateColorVariable.bind(this))
			.onFinishChange(this.renderMath.bind(this));
		this.guifolder
			.add(this, "colormap", [
				"rainbow",
				"cooltowarm",
				"blackbody",
				"grayscale",
			])
			.listen()
			.name("Colormap")
			.onChange(this.updateLut.bind(this));
		this.max_color_value_slider = this.guifolder
			.add(this, "max_color_value", 0.0, 1.0)
			.name("Max solution value")
			.listen()
			.onChange(this.updateLut.bind(this));
		this.min_color_value_slider = this.guifolder
			.add(this, "min_color_value", 0.0, 1.0)
			.name("Min solution value")
			.listen()
			.onChange(this.updateLut.bind(this));
		this.guifolder
			.add(this, "step", this.solutions_info_str)
			.onChange(this.updateSolution.bind(this))
			.listen()
			.name("Solution");
		this.guifolder
			.add(this, "info", Object.keys(this.solutions_info[this.step]))
			.listen()
			.onChange(this.updateSolutionInfo.bind(this));
		this.guifolder
			.add(this, "infoDetail", this.infoDetail)
			.listen()
			.disable();
	}
	async init(animate = true) {
		this.guiSettingsBasic();
		this.guiSettings();
		this.guiSolutions();
		this.animate = animate;
		if (!this.config_dict["displacements"]) {
			this.animate = false;
		}
		await this.createElements();
		this.createLines();

		this.mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(
			this.bufferGeometries,
			true
		);
		this.notiBar.setMessage("Creating materials..." + "⌛");
		await allowUpdate();
		this.updateMaterial();
		this.mergedLineGeometry = BufferGeometryUtils.mergeBufferGeometries(
			this.bufferLines,
			true
		);
		this.contour = new THREE.LineSegments(
			this.mergedLineGeometry,
			this.line_material
		);
		// this.model.add(this.contour);

		this.mesh = new THREE.Mesh(this.mergedGeometry, this.material);
		this.notiBar.setMessage("Adding mesh..." + "⌛");
		await allowUpdate();

		this.updateU();
		this.model.add(this.mesh);
		this.regionModel.add(this.regionModelContours);
		this.regionModel.add(this.regionModelGeometries);
		this.model.add(this.regionModel);

		this.scene.add(this.model);
		this.scene.add(this.invisibleModel);
		//this.renderer.render(this.scene, this.camera);
		//this.zoomExtents();
		this.updateLines();
		if (!this.corriendo) {
			this.corriendo = true;
			this.animationFrameID = requestAnimationFrame(
				this.update.bind(this)
			);
			this.refreshing = true;
			this.updateRefresh();
		}
		this.renderer.render(this.scene, this.camera);
		this.zoomExtents();

		this.notiBar.setMessage("Drawing model..." + "⌛");
		await allowUpdate();
		let geo = new THREE.SphereGeometry(this.nodeSearchRadius / 2, 8, 8);
		this.meshSelectedNode = new THREE.LineSegments(
			new THREE.EdgesGeometry(geo),
			this.line_material
		);
		this.meshSelectedNode.visible = false;
		this.model.add(this.meshSelectedNode);
		this.calculate_jacobians_worker();
		this.notiBar.setMessage("Done!");
		await allowUpdate();
	}
	calculate_jacobians_worker() {
		this.notiBar.setMessage("Calculating jacobians..." + "⌛");
		let OBJ = this;
		const myWorker = new Worker("./js/worker_jacobianos.js", {
			type: "module",
		});
		myWorker.postMessage([...OBJ.elements]);

		myWorker.onmessage = function (msg) {
			if (msg.data[0] == "MSG") {
				OBJ.notiBar.setProgressBar(
					"Calculating jacobians",
					msg.data[1]
				);
			} else {
				for (let i = 0; i < OBJ.elements.length; i++) {
					OBJ.elements[i].scaledJacobian = msg.data[i];
				}
				OBJ.notiBar.sendMessage("Jacobians calculated successfully!");
			}
		};
	}

	giveRegionsAsCoords() {
		let r = [];
		for (const reg of this.regions) {
			let region = [];
			for (const cord of reg.coordinates) {
				let coordenada = [];
				for (let i = 0; i < this.ndim; i++) {
					coordenada.push(cord[i] + this.dimens[i]);
				}
				region.push(coordenada);
			}
			r.push(region);
		}
		return r;
	}

	async downloadAsJson() {
		const response = await fetch(this.json_path);
		const jsondata = await response.json();
		jsondata["border_elements"] = this.border_elements;
		jsondata["regions"] = this.giveRegionsAsCoords();
		var dataStr =
			"data:text/json;charset=utf-8," +
			encodeURIComponent(JSON.stringify(jsondata));
		var downloadAnchorNode = document.createElement("a");
		downloadAnchorNode.setAttribute("href", dataStr);
		downloadAnchorNode.setAttribute("download", this.filename + ".json");
		document.body.appendChild(downloadAnchorNode); // required for firefox
		downloadAnchorNode.click();
		downloadAnchorNode.remove();
	}

	calculate_border_elements_worker() {
		if (this.ndim == 3) {
			let e = undefined;
			for (const controller of this.settingsFolder.controllers) {
				if (controller.property == "detectBorderElements2") {
					e = controller.$name;
				}
			}
			e.innerHTML = e.innerHTML + "⌛";
			this.notiBar.setMessage("Border elements started..." + "⌛");
			let OBJ = this;
			const myWorker = new Worker("./js/worker_border_elements.js", {
				type: "module",
			});
			myWorker.postMessage([
				[...OBJ.elements],
				OBJ.OctTree,
				OBJ.min_search_radius,
			]);

			myWorker.onmessage = function (msg) {
				if (msg.data[0] == "MSG") {
					OBJ.notiBar.setMessage(msg.data[1]);
				} else {
					const be = msg.data;
					OBJ.updateBorderElements(be);
					const original = "Detect border elements";
					e.innerHTML = original;
					OBJ.notiBar.sendMessage("Border elements finished!");
				}
			};
		} else {
			this.notiBar.sendMessage(
				"Border element detection only avaliable in 3D geometry"
			);
		}
	}
	setStep(step) {
		this.step = step;
		this.updateU();
		this.updateMeshCoords();
		this.updateGeometry();
	}

	parseJSON(jsondata) {
		this.norm = 1.0 / max(jsondata["nodes"].flat());
		// console.log(norm);
		this.nodes = [];
		this.nodes = jsondata["nodes"];

		// for (let i = 0; i < this.nodes.length; i++) {
		// 	const node = this.nodes[i];
		// 	for (let j = 0; j < node.length; j++) {
		// 		this.nodes[i][j] *= norm;
		// 	}
		// }
		this.nvn = jsondata["nvn"];
		this.ndim = this.nodes[0].length;
		for (let i = 0; i < this.nodes.length; i++) {
			for (let j = this.nodes[i].length; j < 3; j++) {
				this.nodes[i].push(0.0); //Coordinate completition
			}
		}
		this.regiones = jsondata["regions"];
		for (const re of this.regiones) {
			for (const co of re) {
				for (let j = co.length; j < 3; j++) {
					co.push(0.0); //Coordinate completition for regions
				}
			}
		}
		this.dictionary = [];
		this.types = [];
		this.solutions_info = [];
		this.solutions = [];
		this.original_dict = jsondata["dictionary"];
		this.dictionary.push(...this.original_dict);
		this.types = jsondata["types"];
		if (jsondata["border_elements"]) {
			this.border_elements.push(...jsondata["border_elements"]);
			this.dictionary = [];
			for (const be of this.border_elements) {
				this.dictionary.push(this.original_dict[be]);
			}
		}
		if (!jsondata["solutions"]) {
			if (!jsondata["disp_field"] || jsondata["disp_field"].length == 0) {
				this.solutions = [
					Array(this.nodes.length * this.nvn).fill(0.0),
				];
				this.solutions_info = [{ info: "Not solved" }];
			} else {
				this.solutions.push(...jsondata["disp_field"]);
				this.solutions_info = [];
				for (let i = 0; i < this.solutions.length; i++) {
					this.solutions_info.push({
						info: "Not info",
						index: i,
					});
				}
			}
		} else {
			if (jsondata["solutions"].length == 0) {
				this.solutions = [
					Array(this.nodes.length * this.nvn).fill(0.0),
				];
				this.solutions_info = [{ info: "Not solved" }];
			}
			for (let i = 0; i < jsondata["solutions"].length; i++) {
				let solution = jsondata["solutions"][i];

				this.solutions.push(solution["U"]);
				this.solutions_info.push({ ...solution["info"], index: i });
			}
		}
		this.solutions_info_str = [];
		for (let i = 0; i < this.solutions_info.length; i++) {
			this.solutions_info_str.push(i);
		}
		this.config_dict = CONFIG_DICT["GENERAL"];
		let d = {};
		let variables = [
			"U",
			"V",
			"W",
			4,
			5,
			6,
			7,
			8,
			9,
			10,
			11,
			12,
			13,
			14,
			15,
			16,
			17,
			18,
			19,
			20,
		];

		for (let i = 0; i < this.nvn; i++) {
			for (let j = 0; j < this.ndim; j++) {
				d["d" + variables[i] + "/d" + this.dimensions[j]] = [i, j];
			}
		}
		this.config_dict["dict"] = d;
		if (jsondata["properties"]) {
			if (CONFIG_DICT[jsondata["properties"]["problem"]]) {
				this.config_dict = {
					...CONFIG_DICT[jsondata["properties"]["problem"]],
				};
			}
		}
		this.prop_dict = {};
		this.prop_dict_names = {};
		for (const p of this.config_dict["props"]) {
			this.prop_dict[p] = ["PROP", jsondata["properties"][p], p];
			this.prop_dict_names[p] = ["PROP", p];
		}

		this.loaded = true;
		this.info = Object.keys(this.solutions_info[this.step])[0];
		this.infoDetail = this.solutions_info[this.step][this.info];

		const secon_coords = this.nodes[0].map((_, colIndex) =>
			this.nodes.map((row) => row[colIndex])
		);

		let sizex = max(secon_coords[0].flat()) - min(secon_coords[0].flat());
		let sizey = max(secon_coords[1].flat()) - min(secon_coords[1].flat());
		let sizez = max(secon_coords[2].flat()) - min(secon_coords[2].flat());

		let centerx = (max(secon_coords[0]) + min(secon_coords[0])) / 2;
		let centery = (max(secon_coords[1]) + min(secon_coords[1])) / 2;
		let centerz = (max(secon_coords[2]) + min(secon_coords[2])) / 2;
		this.center = [
			centerx - sizex / 2,
			centery - sizey / 2,
			centerz - sizez / 2,
		];
		for (let i = 0; i < this.nodes.length; i++) {
			this.nodes[i][0] -= sizex / 2;
			this.nodes[i][1] -= sizey / 2;
			this.nodes[i][2] -= sizez / 2;
		}

		this.size = max(this.nodes.flat()) - min(this.nodes.flat());
		this.dimens = [sizex / 2, sizey / 2, sizez / 2];
		this._nodes = [];
		for (let kk = 0; kk < this.nodes.length; kk++) {
			this._nodes.push({ _xcenter: this.nodes[kk], id: kk });
		}
		let h = this.size / 20;
		let kk = 0;
		for (const n of this.nodes) {
			if (this.ndim == 1 || this.ndim == 2) {
				let node = [n[0], n[1], n[2] + h];
				this._nodes.push({ _xcenter: node, id: kk });
				if (this.ndim == 1) {
					node = [n[0], n[1] + h, n[2] + h];
					this._nodes.push({ _xcenter: node, id: kk });
					node = [n[0], n[1] + h, n[2]];
					this._nodes.push({ _xcenter: node, id: kk });
				}
			}
			kk++;
		}
		this.createRegions();
	}
	createRegions() {
		console.log("creating octree");
		this.createOctree();
		console.log("Octree created");
		let id_region = 0;
		console.log(this.regiones.length);
		for (const re of this.regiones) {
			for (const co of re) {
				co[0] -= this.dimens[0];
				co[1] -= this.dimens[1];
				co[2] -= this.dimens[2];
			}
			this._createRegionCoords(re, id_region);
			id_region++;
		}
		this.deselectAllNodes();
	}
	updateSolutionInfo() {
		this.infoDetail = this.solutions_info[this.step][this.info];
	}

	updateDispSlider() {
		const max_disp = max(this.U);
		const min_disp = min(this.U);
		this.max_abs_disp =
			Math.max(Math.abs(max_disp), Math.abs(min_disp)) * this.norm;
		if (this.config_dict["displacements"]) {
			this.magnifSlider.min(0.0);
			this.magnifSlider.max(0.4 / this.max_abs_disp);
		}
	}

	updateU() {
		this.U = this.solutions[this.step].flat();

		this.updateDispSlider();

		for (const e of this.elements) {
			e.setUe(
				this.U,
				this.config_dict["calculateStrain"],
				this.config_dict["displacements"]
			);
			if (this.solution_as_displacement) {
				e.variableAsDisplacement(this.variable_as_displacement);
			}
		}
		this.updateMeshCoords();
		this.updateColorVariable();
	}

	nextSolution() {
		this.step += 1 * (this.step < this.solutions.length - 1);
		this.updateSolution();
	}
	updateSolution() {
		this.updateU();
		this.updateGeometry();
		this.updateSolutionInfo();
	}
	updateSolutionAsDisplacement() {
		for (const e of this.elements) {
			if (this.solution_as_displacement) {
				e.variableAsDisplacement(this.variable_as_displacement);
			}
		}
		this.updateMeshCoords();
		this.updateGeometry();
		this.updateSolutionInfo();
	}
	prevSolution() {
		this.step -= 1 * (this.step > 0);
		this.updateSolution();
	}

	async createElements() {
		this.bufferGeometries = [];
		this.elements = new Array(this.dictionary.length).fill(0.0);
		let times = 0;
		for (let i = 0; i < this.dictionary.length; i++) {
			const gdls = this.dictionary[i];
			const egdls = [];
			for (let i = 0; i < this.nvn; i++) {
				const a = [];
				for (const gdl of gdls) {
					a.push(gdl * this.nvn + i);
				}
				egdls.push(a);
			}
			const coords = [];
			for (const node of gdls) {
				coords.push(this.nodes[node]);
			}

			this.elements[i] = new types[this.types[i]](
				coords,
				egdls,
				this.size * this.norm
			);

			let d = 0;
			for (const c of coords) {
				let sx = c[0] - this.elements[i]._xcenter[0];
				let sy = c[1] - this.elements[i]._xcenter[1];
				let sz = c[2] - this.elements[i]._xcenter[2];
				d = Math.max(d, sx ** 2 + sy ** 2 + sz ** 2);
			}

			this.min_search_radius = Math.max(
				this.min_search_radius,
				2 * d ** 0.5
			);
			const colors = [];
			for (
				let j = 0;
				j < this.elements[i].geometry.attributes.position.count;
				++j
			) {
				colors.push(1, 1, 1);
			}
			this.elements[i].index = i;
			const p = {};
			for (const [key, value] of Object.entries(this.prop_dict)) {
				let result = undefined;
				if (value[1] instanceof Array) {
					result = value[1][i];
				} else {
					result = value[1];
				}
				p[key] = result;
			}
			this.elements[i].set_properties(p);
			this.bufferGeometries.push(this.elements[i].geometry);
			const messh = new THREE.Mesh(
				this.elements[i].geometry,
				this.material
			);
			messh.visible = false;
			messh.userData = { elementId: i };
			this.invisibleModel.add(messh);

			let percentage = (i / this.dictionary.length) * 100;
			if (percentage > times) {
				times += 1;
				this.notiBar.setProgressBar("Loading model", percentage);
				await allowUpdate();
			}
		}
	}
	createLines() {
		this.bufferLines = [];
		for (const e of this.elements) {
			this.bufferLines.push(e.line_geometry);
		}
	}
	unselectAllNodes() {
		for (const sn of [...this.selectedNodes]) {
			this.selectNode(sn);
		}
	}
	selectNode(indexx, reselect) {
		let radius = this.nodeSearchRadius / 2;
		if (this.selectedNodes.includes(indexx)) {
			if (!reselect) {
				this.selectedNodes.splice(
					this.selectedNodes.indexOf(indexx),
					1
				);
				for (const smm of this.selectedNodesMesh[indexx]) {
					this.model.remove(smm);
					smm.material.dispose();
					smm.geometry.dispose();
				}
				delete this.selectedNodesMesh[indexx];
			}
		} else {
			this.selectedNodes.push(indexx);
			this.selectedNodesMesh[indexx] = [];
			let p = [...this.nodes[indexx]];
			let possible_coords_index = [];
			possible_coords_index.push(p);
			if (this.ndim == 1) {
				possible_coords_index.push([
					p[0],
					p[1] + this.size / 20,
					p[2] + this.size / 20,
				]);
				possible_coords_index.push([p[0], p[1] + this.size / 20, p[2]]);
				possible_coords_index.push([p[0], p[1], p[2] + this.size / 20]);
			} else if (this.ndim == 2) {
				possible_coords_index.push([p[0], p[1], p[2] + this.size / 20]);
			}

			for (let node = 0; node < possible_coords_index.length; node++) {
				const possible_coord = possible_coords_index[node];
				const p = multiplyScalar(possible_coord, this.norm);
				let geo = new THREE.SphereGeometry(radius, 8, 8);
				let mesh = new THREE.LineSegments(
					new THREE.EdgesGeometry(geo),
					this.line_material
				);
				mesh.translateX(p[0]);
				mesh.translateY(p[1]);
				mesh.translateZ(p[2]);
				this.model.add(mesh);
				this.selectedNodesMesh[indexx].push(mesh);
			}
		}
	}
	onDocumentMouseDown(event) {
		if (this.loaded) {
			if (this.clickMode != "Nothing") {
				event.preventDefault();
				const mouse3D = new THREE.Vector2(
					(event.clientX / window.innerWidth) * 2 - 1,
					-(event.clientY / window.innerHeight) * 2 + 1
				);
				this.raycaster.setFromCamera(mouse3D, this.camera);

				if (this.clickMode == "Detect region") {
					const regionsintersects = this.raycaster.intersectObjects(
						this.regionModelGeometries.children
					);
					if (regionsintersects.length > 0) {
						let index = regionsintersects[0].object.userData["id"];
						let region = this.regions[index];
						region.selected = !region.selected;
						for (const node of region.nodes) {
							this.selectNode(node["index"], region.selected);
						}
					}
				} else {
					const intersects = this.raycaster.intersectObjects(
						this.invisibleModel.children
					);
					if (intersects.length > 0) {
						const i = intersects[0].object.userData.elementId;
						const e = this.elements[i];
						if (this.clickMode == "Delete element") {
							intersects[0].object.geometry.dispose();
							intersects[0].object.material.dispose();
							this.invisibleModel.remove(intersects[0].object);
							this.not_draw_elements.push(i);
							this.bufferGeometries[i].dispose();
							this.bufferLines[i].dispose();
							e.geometry.dispose();
							this.elements.splice(i, 1);
							this.bufferGeometries.splice(i, 1);
							this.bufferLines.splice(i, 1);

							for (
								let i = 0;
								i < this.invisibleModel.children.length;
								i++
							) {
								this.invisibleModel.children[i].userData = {
									elementId: i,
								};
							}
						} else if (this.clickMode == "Inspect element") {
							this.createElementView(e);
						} else if (this.clickMode == "Detect nodes") {
							let vector_point = [...intersects[0].point];
							let possible_coords = [];
							for (let k = 0; k < e.coords.length; k++) {
								let p = [...e.coords[k]];
								possible_coords.push([p]);
							}
							if (this.ndim == 1 || this.ndim == 2) {
								for (let k = 0; k < e.coords.length; k++) {
									let p = [...e.coords[k]];
									p[2] += this.size / 20;
									possible_coords[k].push(p);
								}
								if (this.ndim == 1) {
									for (let k = 0; k < e.coords.length; k++) {
										let p = [...e.coords[k]];
										p[1] += this.size / 20;
										p[2] += this.size / 20;
										possible_coords[k].push(p);
										p = e.coords[k];
										p[1] += this.size / 20;
										possible_coords[k].push(p);
									}
								}
							}
							let encontrado = false;
							let radius = this.nodeSearchRadius / 2;
							for (
								let index = 0;
								index < possible_coords.length;
								index++
							) {
								let possible_coords_index =
									possible_coords[index];
								for (
									let node = 0;
									node < possible_coords_index.length;
									node++
								) {
									const possible_coord =
										possible_coords_index[node];
									const p = multiplyScalar(
										possible_coord,
										this.norm
									);
									let d = squared_distance(p, vector_point);
									if (d <= radius ** 2) {
										encontrado = true;
										break;
									}
								}
								if (encontrado) {
									let indexx = e.gdls[0][index] / this.nvn;
									this.selectNode(indexx);
									break;
								}
							}
						}
						this.updateGeometry();
					}
				}
			}
		}
	}
	onDocumentMouseMove(event) {
		if (this.loaded) {
			if (this.clickMode == "Detect nodes") {
				event.preventDefault();
				const mouse3D = new THREE.Vector2(
					(event.clientX / window.innerWidth) * 2 - 1,
					-(event.clientY / window.innerHeight) * 2 + 1
				);
				this.raycaster.setFromCamera(mouse3D, this.camera);
				const intersects = this.raycaster.intersectObjects(
					this.invisibleModel.children
				);
				if (intersects.length > 0) {
					const i = intersects[0].object.userData.elementId;
					const e = this.elements[i];
					let vector_point = [...intersects[0].point];
					let possible_coords = [];
					for (let k = 0; k < e.coords.length; k++) {
						let p = [...e.coords[k]];
						possible_coords.push([p]);
					}
					if (this.ndim == 1 || this.ndim == 2) {
						for (let k = 0; k < e.coords.length; k++) {
							let p = [...e.coords[k]];
							p[2] += this.size / 20;
							possible_coords[k].push(p);
						}
						if (this.ndim == 1) {
							for (let k = 0; k < e.coords.length; k++) {
								let p = [...e.coords[k]];
								p[1] += this.size / 20;
								p[2] += this.size / 20;
								possible_coords[k].push(p);
								p = e.coords[k];
								p[1] += this.size / 20;
								possible_coords[k].push(p);
							}
						}
					}
					let encontrado = false;
					let radius = this.nodeSearchRadius / 2;
					for (
						let index = 0;
						index < possible_coords.length;
						index++
					) {
						let p;
						let possible_coords_index = possible_coords[index];
						for (
							let node = 0;
							node < possible_coords_index.length;
							node++
						) {
							const possible_coord = possible_coords_index[node];
							p = multiplyScalar(possible_coord, this.norm);
							let d = squared_distance(p, vector_point);
							if (d <= radius ** 2) {
								encontrado = true;
								break;
							}
						}
						if (encontrado) {
							this.meshSelectedNode.translateX(
								p[0] - this.meshSelectedNode.position.x
							);
							this.meshSelectedNode.translateY(
								p[1] - this.meshSelectedNode.position.y
							);
							this.meshSelectedNode.translateZ(
								p[2] - this.meshSelectedNode.position.z
							);
							this.meshSelectedNode.visible = true;
							break;
						}
						this.meshSelectedNode.visible = false;
					}
					this.updateGeometry();
				}
			}
		}
	}
}
export { FEMViewer, themes };
