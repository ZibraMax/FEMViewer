import * as THREE from "./build/three.module.js";
import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.17/+esm";
import { OrbitControls } from "./build/OrbitControls.js";
import * as BufferGeometryUtils from "./build/BufferGeometryUtils.js";
import { AxisGridHelper } from "./build/minigui.js";
import { Lut } from "./build/Lut.js";
import { CONFIG_DICT } from "./build/ConfigDicts.js";
import { Geometree, Quadrant3D } from "./build/Octree.js";
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
} from "./build/Elements.js";

function dragElement(elmnt) {
	var pos1 = 0,
		pos2 = 0,
		pos3 = 0,
		pos4 = 0;
	if (document.getElementById(elmnt.id + "header")) {
		// if present, the header is where you move the DIV from:
		document.getElementById(elmnt.id + "header").onmousedown =
			dragMouseDown;
	} else {
		// otherwise, move the DIV from anywhere inside the DIV:
		elmnt.onmousedown = dragMouseDown;
	}

	function dragMouseDown(e) {
		e = e || window.event;
		e.preventDefault();
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.onmouseup = closeDragElement;
		// call a function whenever the cursor moves:
		document.onmousemove = elementDrag;
	}

	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		// calculate the new cursor position:
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;
		// set the element's new position:
		elmnt.style.top = elmnt.offsetTop - pos2 + "px";
		elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
	}

	function closeDragElement() {
		// stop moving when mouse button is released:
		document.onmouseup = null;
		document.onmousemove = null;
	}
}

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

class ElementView {
	static parent = document.getElementById("models-container");
	constructor(element, parent) {
		this.element = element;
		this.parent = parent;
		this.createView();
		this.init();
	}

	init() {
		const canvas = this.canvas;
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
		});

		const fov = 40;
		const aspect = 2; // the canvas default
		const near = 0.01;
		const far = 200;

		this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		this.camera.position.z = 2;
		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.target.set(0, 0, 0);
		this.controls.update();

		this.scene = new THREE.Scene();

		const geometry = this.element.geometry;

		this.material = new THREE.MeshBasicMaterial({
			vertexColors: true,
		});
		this.line_material = new THREE.LineBasicMaterial({
			color: "black",
			linewidth: 3,
		});
		this.contour = new THREE.LineSegments(
			this.element.line_geometry,
			this.line_material
		);
		this.mesh = new THREE.Mesh(geometry, this.material);
		this.scene.add(this.mesh);
		this.scene.add(this.contour);
		this.render();
		this.updateGeometry();
		this.zoomExtents();
		this.animationFrameID = requestAnimationFrame(this.update.bind(this));
	}
	updateGeometry() {
		for (let j = 0; j < this.element.order.length; j++) {
			let disp = this.element.colors[j];
			const color = this.parent.lut.getColor(disp);
			this.element.geometry.attributes.color.setXYZ(
				j,
				color.r,
				color.g,
				color.b
			);
		}
		this.mesh.geometry = this.element.geometry;
		this.mesh.material = this.material;
		if (this.parent.colorOptions == "nocolor") {
			const material = new THREE.MeshLambertMaterial({
				color: "#dc2c41",
				emissive: "#dc2c41",
			});
			this.mesh.material = material;
		}
		this.mesh.material.needsUpdate = true;
		this.scene.children[0].geometry.attributes.color.needsUpdate = true;
		let msg = `X = -, Y = -, Z = -, Value = -`;
		this.infoText.innerHTML = msg;
	}
	dispose() {
		cancelAnimationFrame(this.animationFrameID);
		this.scene.remove.apply(this.scene, this.scene.children);
		this.mesh.geometry.dispose();
		this.controls.dispose();
		this.mesh.material.dispose();
		this.contour.geometry.dispose();
		this.contour.material.dispose();
		this.material.dispose();
		this.line_material.dispose();
		this.scene.clear();
		this.renderer.dispose();
	}
	close() {
		this.dispose();
		this.root.remove();
	}
	createView() {
		let root = document.createElement("div");
		root.setAttribute("id", "element-view-container-" + this.element.index);
		root.setAttribute("class", "mini-box");
		this.canvas = document.createElement("canvas");
		this.canvas.setAttribute("id", "element-view-" + this.element.index);
		this.canvas.setAttribute("class", "box side-pane");
		this.canvas.addEventListener("mousemove", (e) => {
			this.onDocumentMouseDown(e);
		});

		let header = document.createElement("div");
		header.setAttribute(
			"id",
			"element-view-container-" + this.element.index + "header"
		);
		header.setAttribute("class", "header-element-viewer noselect");
		header.innerHTML =
			"<i class='fa-regular fa-solid fa-up-down-left-right'></i> Element " +
			this.element.index;
		let closeButton = document.createElement("i");
		//canvas.setAttribute("id", "element-view-" + this.element.index);
		closeButton.setAttribute("class", "fa-solid fa-xmark");
		closeButton.setAttribute("style", "position:absolute;right: 10px;");
		closeButton.addEventListener("click", () => {
			this.parent.destroy_element_view(this);
		});
		header.appendChild(closeButton);

		let footer = document.createElement("div");
		footer.setAttribute("class", "notification-container-ev noselect");

		let footer2 = document.createElement("div");
		footer2.setAttribute("class", "notification-bottom-ev");
		this.infoText = document.createElement("p");
		this.infoText.setAttribute("class", "notification-button-ev noselect");
		this.infoText.innerHTML = "X = -, Y = -, Z = -, Value = -";
		footer2.appendChild(this.infoText);
		footer.appendChild(footer2);

		root.appendChild(header);
		root.appendChild(this.canvas);
		root.appendChild(footer);
		ElementView.parent.appendChild(root);
		dragElement(root);
		this.root = root;
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
		cameraOffs.multiplyScalar(-FL);
		let newCameraPos = bsWorld.clone().add(cameraOffs);

		this.camera.position.copy(newCameraPos);
		this.camera.lookAt(bsWorld);
		this.controls.target.copy(bsWorld);

		this.controls.update();
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
	render(delta) {
		if (this.resizeRendererToDisplaySize()) {
			const canvas = this.renderer.domElement;
			const aspect = canvas.clientWidth / canvas.clientHeight;
			this.camera.aspect = aspect;
			this.camera.updateProjectionMatrix();
		}
		this.renderer.render(this.scene, this.camera);
	}
	update() {
		this.render(0);
		this.animationFrameID = requestAnimationFrame(this.update.bind(this));
	}
	onDocumentMouseDown(event) {
		event.preventDefault();
		const mouse3D = new THREE.Vector2(
			(event.offsetX / this.canvas.width) * 2 - 1,
			-(event.offsetY / this.canvas.height) * 2 + 1
		);
		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse3D, this.camera);
		const intersects = raycaster.intersectObject(this.scene.children[0]);
		for (const i of intersects) {
			const punto = [
				i.point.x / this.parent.norm,
				i.point.y / this.parent.norm,
				i.point.z / this.parent.norm,
			];

			const z = this.element.inverseMapping(punto);
			let value = this.element.giveSolutionPoint(
				z,
				this.parent.colorOptions,
				this.parent.config_dict["calculateStrain"]
			);
			if (Math.abs(value).toFixed(4) == "0.0000") {
				value = value.toExponential(4);
			} else {
				value = value.toFixed(4);
			}
			let msg = `X = ${punto[0].toFixed(4)}, Y = ${punto[1].toFixed(
				4
			)}, Z = ${punto[2].toFixed(4)}, Value = ${value}`;
			this.infoText.innerHTML = msg;
		}
	}
}

//SOURCE https://r105.threejsfundamentals.org/threejs/lessons/threejs-cleanup.html
class ResourceTracker {
	constructor() {
		this.resources = new Set();
	}
	track(resource) {
		if (!resource) {
			return resource;
		}

		// handle children and when material is an array of materials or
		// uniform is array of textures
		if (Array.isArray(resource)) {
			resource.forEach((resource) => this.track(resource));
			return resource;
		}

		if (resource.dispose || resource instanceof THREE.Object3D) {
			this.resources.add(resource);
		}
		if (resource instanceof THREE.Object3D) {
			this.track(resource.geometry);
			this.track(resource.material);
			this.track(resource.children);
		} else if (resource instanceof THREE.Material) {
			// We have to check if there are any textures on the material
			for (const value of Object.values(resource)) {
				if (value instanceof THREE.Texture) {
					this.track(value);
				}
			}
			// We also have to check if any uniforms reference textures or arrays of textures
			if (resource.uniforms) {
				for (const value of Object.values(resource.uniforms)) {
					if (value) {
						const uniformValue = value.value;
						if (
							uniformValue instanceof THREE.Texture ||
							Array.isArray(uniformValue)
						) {
							this.track(uniformValue);
						}
					}
				}
			}
		}
		return resource;
	}
	untrack(resource) {
		this.resources.delete(resource);
	}
	dispose() {
		for (const resource of this.resources) {
			if (resource instanceof THREE.Object3D) {
				if (resource.parent) {
					resource.parent.remove(resource);
				}
			}
			if (resource.dispose) {
				resource.dispose();
			}
		}
		this.resources.clear();
	}
}

const DIV = document.getElementById("status-bar");

function allowUpdate() {
	return new Promise((f) => {
		setTimeout(f, 0);
	});
}

class FEMViewer {
	json_path;
	nodes;
	nvn;
	dictionary;
	types;
	solutions;
	U;
	step;
	max_disp;
	size;
	elements;
	canvas;
	camera;
	scene;
	controls;
	constructor(canvas, magnif, rot, axis = false, iz = 1.05) {
		if (!magnif) {
			magnif = 0;
		}
		// FEM
		this.element_views = new Set();
		this.refreshing = true;
		this.corriendo = false;
		this.animationFrameID = undefined;
		this.min_search_radius = -Infinity;
		this.not_draw_elements = [];
		this.max_color_value = 0;
		this.min_color_value = 0;
		this.initial_zoom = iz;
		this.solution_as_displacement = false;
		this.axis = axis;
		this.canvas = canvas;
		this.max_color_value_slider = undefined;
		this.min_color_value_slider = undefined;
		this.resource_tracker = new ResourceTracker();

		this.before_load = () => {};
		this.after_load = () => {};
		this.rot = rot;
		this.nodes = [];
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
		this.histogram = document.getElementById("histogram");

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
		this.invisibleModel = new THREE.Object3D();
		this.colors = false;
		this.animate = true;
		this.magnif = magnif;
		this.mult = 1.0;
		this.side = 1.0;
		this.max_disp = 0.0;
		this.draw_lines = true;
		this.colormap = "rainbow";

		this.lut = new Lut(this.colormap);
		this.filename = "";

		this.gui = new GUI({ title: "Settings" });
		this.gui.close();
		this.loaded = false;
		this.colorOptions = "nocolor";
		this.settings();
		this.clickMode = "Inspect element";
	}
	updateRefresh() {
		const playButton = document.getElementById("play-button");
		this.controls.enabled = this.refreshing;
		if (this.refreshing) {
			playButton.setAttribute("class", "fa fa-pause notification-action");
		} else {
			playButton.setAttribute("class", "fa fa-play notification-action");
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
		activateModal("myModal");
		this.gui.close();
	}
	modalManager2() {
		activateModal("myModal2");
		this.createHistogram();
		this.gui.close();
	}
	modalManager3() {
		activateModal("myModal2");
		this.createHistogram2();
		this.gui.close();
	}
	createHistogram() {
		let data = [];
		for (const p of Object.keys(this.element_properties)) {
			let trace = {
				x: this.element_properties[p],
				type: "histogram",
				name: p,
			};
			data.push(trace);
		}
		Plotly.newPlot(this.histogram, data, {
			margin: { t: 0 },
		});
	}
	createHistogram2() {
		let data = [];
		let trace = {
			x: this.elements.map((e) => {
				return e.sJ;
			}),
			type: "histogram",
			name: "Scaled Jacobian",
		};
		data.push(trace);
		Plotly.newPlot(this.histogram, data, {
			margin: { t: 0 },
		});
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

	async createOctree() {
		DIV.innerHTML = "Creating Oct Tree... ⌛";
		let bounding = new Quadrant3D(this.center, this.dimens);
		this.OctTree = new Geometree(bounding);
		let times = 0;
		for (let i = 0; i < this.elements.length; i++) {
			let p = { _xcenter: this.elements[i]._xcenter.slice(), id: i };
			this.OctTree.add_point(p);
			let percentage = (i / this.elements.length) * 100;
			if (percentage > times) {
				times += 10;
				DIV.innerHTML =
					"Creating Oct Tree  " +
					'<progress value="' +
					percentage +
					'" max="100"> any% </progress>';
				await allowUpdate();
			}
		}
	}
	async detectBorderElements2() {
		await this.createOctree();
		this.calculate_border_elements_worker();
	}

	async detectBorderElements() {
		await this.createOctree();
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
		DIV.innerHTML = "Loading model..." + "⌛";
		this.json_path = json_path;
		this.filename = json_path;
		const response = await fetch(this.json_path);
		const jsondata = await response.json();
		if (be != undefined) {
			jsondata["border_elements"] = be;
		}
		this.parseJSON(jsondata);
		DIV.innerHTML = "Ready!";
	}
	reset() {
		this.corriendo = false;
		const track = this.resource_tracker.track.bind(this.resource_tracker);

		track(this.model);
		track(this.invisibleModel);

		this.animate = false;
		this.colorOptions = "nocolor";
		for (let i = 0; i < this.elements.length; i++) {
			this.elements[i].geometry.dispose();
			this.bufferGeometries.pop().dispose();
			this.bufferLines.pop().dispose();
		}
		this.mergedGeometry.dispose();
		this.mergedLineGeometry.dispose();
		this.renderer.renderLists.dispose();
		this.material.dispose();

		this.destroy_element_views();
		this.element_views = new Set();

		this.resource_tracker.dispose();

		this.config_dict = CONFIG_DICT["GENERAL"];
		this.solution_as_displacement = false;
		this.bufferGeometries = [];
		this.bufferLines = [];
		this.variable_as_displacement = 2;

		this.nodes = [];
		this.dictionary = [];
		this.solutions = [];
		this.solutions_info = [];
		this.step = 0;
		this.U = undefined;
		this.elements = [];
		this.types = [];
		this.magnif = 0.0;
		this.max_abs_disp = undefined;
		this.border_elements = [];
		this.scene.remove(this.model);
		this.scene.remove(this.invisibleModel);
		delete this.mergedGeometry;
		delete this.mergedLineGeometry;
		this.resource_tracker.untrack(this.model);
		this.resource_tracker.untrack(this.invisibleModel);
	}

	settings() {
		THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);
		// Scene settings
		this.scene = new THREE.Scene();
		// Camera settings
		const fov = 40;
		const aspect = 2; // the canvas default
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
		this.guiSettingsBasic();
	}
	guiSettingsBasic() {
		this.gui
			.add(this, "filename")
			.name("Filename")
			.listen()
			.onChange(this.reload.bind(this));
		this.gui.add(this, "modalManager").name("Load JSON File");
		this.gui.add(this, "modalManager2").name("Show properties histogram");
		this.gui
			.add(this, "modalManager3")
			.name("Show scaled jacobian histogram");
		this.gui
			.add(this, "detectBorderElements2")
			.name("Detect border elements");
		this.gui.add(this, "downloadAsJson").name("Donwload JSON file");
		this.gui.add(this.gh, "visible").name("Axis");
		this.gui.add(this, "rot").name("Rotation").listen();

		this.gui
			.add(this, "draw_lines")
			.onChange(this.updateLines.bind(this))
			.name("Draw lines");
		this.sadguib = this.gui
			.add(this, "solution_as_displacement")
			.listen()
			.name("Solution as disp")
			.onFinishChange(this.toogleSolutionAsDisp.bind(this));
		this.gui
			.add(this, "clickMode", ["Inspect element", "Delete element"])
			.listen()
			.name("Click mode");
	}
	toogleSolutionAsDisp() {
		this.config_dict["displacements"] = this.solution_as_displacement;
		this.guiSettings();
		this.updateVariableAsSolution();
		if (!this.solution_as_displacement) {
			this.magnifSlider.setValue(0.0);
		}
	}
	updateVariableAsSolution() {
		this.animate = false;
		this.mult = 1;
		this.updateSolution();
		this.magnifSlider.setValue(0.4 / this.max_abs_disp);
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
					DIV.innerHTML = "Animation running!";
					if (!this.animate) {
						this.mult = 1.0;
						this.updateMeshCoords();
						this.updateGeometry();
						DIV.innerHTML = "Ready!";
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

	reload() {
		cancelAnimationFrame(this.animationFrameID);

		this.animate = false;
		this.reset();
		this.before_load();
		DIV.innerHTML = "Reloading model..." + "⌛";
		const resp = this.loadJSON(this.filename);
		resp.then(() => {
			DIV.innerHTML = "Ready!";
			this.init(false);
			this.after_load();
		});
	}

	updateBorderElements(be) {
		this.reset();
		this.before_load();
		DIV.innerHTML = "Reloading model..." + "⌛";
		const resp = this.loadJSON(this.filename, be);
		resp.then(() => {
			DIV.innerHTML = "Ready!";
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
		this.updateMeshCoords();
		this.updateGeometry();
	}
	updateColorVariable() {
		const co = this.colorOptions;
		if (co != "nocolor") {
			this.colors = true;
		} else {
			this.colors = false;
		}
		for (const e of this.elements) {
			e.setMaxDispNode(
				this.colorOptions,
				this.config_dict["calculateStrain"]
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
		this.updateLut();
	}
	updateCamera() {
		this.camera.updateProjectionMatrix();
	}
	async renderMath() {
		function f() {
			renderMathInElement(document.body, {
				throwOnError: false,
			});
		}
		setTimeout(f, 100);
	}

	updateMaterial() {
		if (this.colors) {
			this.material = new THREE.MeshBasicMaterial({
				vertexColors: true,
			});
			this.light2.intensity = 1.0;
			this.light.intensity = 0.0;
		} else {
			this.material = new THREE.MeshLambertMaterial({
				color: "#dc2c41",
				emissive: "#dc2c41",
			});
			this.light2.intensity = 0.0;
			this.light.intensity = 1.0;
		}
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
			const Ue = [];
			if (this.solution_as_displacement) {
				for (let j = Ue.length; j < 3; j++) {
					if (j == this.variable_as_displacement) {
						for (const ue of e.Ue) {
							Ue.push(ue);
						}
					} else {
						Ue.push(Array(e.coords.length).fill(0.0));
					}
				}
			} else {
				for (const ue of e.Ue) {
					Ue.push(ue);
				}
				for (let j = Ue.length; j < 3; j++) {
					Ue.push(Array(e.coords.length).fill(0.0));
				}
			}

			if (this.draw_lines) {
				e.setGeometryCoords(
					Ue,
					this.magnif * this.mult,
					this.norm,
					this.bufferGeometries[i],
					this.bufferLines[i]
				);
			} else {
				e.setGeometryCoords(
					Ue,
					this.magnif * this.mult,
					this.norm,
					this.bufferGeometries[i]
				);
			}
		}
		if (this.colors) {
			this.updateColorValues();
		}
	}

	updateColorValues() {
		for (let i = 0; i < this.elements.length; i++) {
			const e = this.elements[i];
			const colors = this.bufferGeometries[i].attributes.color;
			for (let j = 0; j < e.order.length; j++) {
				let disp = e.colors[j];
				const color = this.lut.getColor(disp);
				colors.setXYZ(j, color.r, color.g, color.b);
			}
		}
	}

	updateGeometry() {
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
		}
		this.renderer.render(this.scene, this.camera);
		if (this.colors) {
			this.renderer.render(this.uiScene, this.orthoCamera);
		}
	}

	createElementView(e) {
		let element_view = new ElementView(e, this);
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
			this.destroy_element_view(ev);
		}
	}
	destroy_element_view(ev) {
		ev.close();
		this.element_views.delete(ev);
	}

	addExamples(file_paths, b, a) {
		this.before_load = b;
		this.after_load = a;
		this.gui
			.add(this, "filename", file_paths)
			.name("Examples")
			.listen()
			.onChange(this.changeExample.bind(this));
	}
	changeExample() {
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
	}

	async init(animate = true) {
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
		DIV.innerHTML = "Creating materials..." + "⌛";
		await allowUpdate();
		this.updateMaterial();
		const line_material = new THREE.LineBasicMaterial({
			color: "black",
			linewidth: 3,
		});
		this.mergedLineGeometry = BufferGeometryUtils.mergeBufferGeometries(
			this.bufferLines,
			true
		);
		this.contour = new THREE.LineSegments(
			this.mergedLineGeometry,
			line_material
		);
		// this.model.add(this.contour);

		this.mesh = new THREE.Mesh(this.mergedGeometry, this.material);
		DIV.innerHTML = "Adding mesh..." + "⌛";
		await allowUpdate();
		this.updateU();
		this.model.add(this.mesh);

		this.scene.add(this.model);
		this.scene.add(this.invisibleModel);
		this.scene.add(this.model);
		this.renderer.render(this.scene, this.camera);
		this.zoomExtents();
		this.updateLines();
		window.addEventListener("resize", this.render.bind(this));
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

		DIV.innerHTML = "Drawing model..." + "⌛";
		await allowUpdate();
		DIV.innerHTML = "Done!";
		await allowUpdate();
		this.calculate_jacobians_worker();
	}
	calculate_jacobians_worker() {
		DIV.innerHTML = "Calculating jacobians..." + "⌛";
		let OBJ = this;
		const myWorker = new Worker("./js/worker_jacobianos.js", {
			type: "module",
		});
		myWorker.postMessage([...OBJ.elements]);

		myWorker.onmessage = function (msg) {
			if (msg.data[0] == "MSG") {
				DIV.innerHTML =
					"Calculating jacobians " +
					'<progress value="' +
					msg.data[1] +
					'" max="100"> any% </progress>';
			} else {
				for (let i = 0; i < OBJ.elements.length; i++) {
					OBJ.elements[i].scaledJacobian = msg.data[i];
				}
				DIV.innerHTML = "Jacobians calculated successfully!";

				setTimeout(() => {
					DIV.innerHTML = "Ready!";
				}, 1500);
			}
		};
	}

	async downloadAsJson() {
		const response = await fetch(this.json_path);
		const jsondata = await response.json();
		jsondata["border_elements"] = this.border_elements;
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
			for (const controller of this.gui.controllers) {
				if (controller.property == "detectBorderElements2") {
					e = controller.$name;
				}
			}
			e.innerHTML = e.innerHTML + "⌛";
			DIV.innerHTML = "Border elements started..." + "⌛";
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
					DIV.innerHTML = msg.data[1];
				} else {
					const be = msg.data;
					OBJ.updateBorderElements(be);
					const original = "Detect border elements";
					e.innerHTML = original;
					DIV.innerHTML = "Border elements finished!";
					setTimeout(() => {
						DIV.innerHTML = "Ready!";
					}, 1500);
				}
			};
		} else {
			DIV.innerHTML =
				"Border element detection only avaliable in 3D geometry";
			setTimeout(() => {
				DIV.innerHTML = "Ready!";
			}, 5000);
		}
	}
	setStep(step) {
		this.step = step;
		this.updateU();
		this.updateMeshCoords();
		this.updateGeometry();
	}

	parseJSON(jsondata) {
		this.norm = 1.0 / math.max(jsondata["nodes"].flat());
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
		const solutions_info_str = [];
		for (let i = 0; i < this.solutions_info.length; i++) {
			solutions_info_str.push(i);
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
				this.config_dict =
					CONFIG_DICT[jsondata["properties"]["problem"]];
			}
		}
		this.element_properties = {};
		for (const p of this.config_dict["props"]) {
			this.element_properties[p] = jsondata["properties"][p];
		}
		if (this.config_dict["displacements"]) {
			this.sadguib.disable();
		} else {
			this.sadguib.enable();
		}

		this.guiSettings();
		if (this.loaded) {
			this.guifolder.destroy();
		}
		let dict = this.config_dict["dict"];
		this.guifolder = this.gui.addFolder("Solutions");
		this.guifolder
			.add(this, "colorOptions", {
				"No color": "nocolor",
				"\\(|U|\\)": "dispmag",
				"Scaled Jacobian": "scaled_jac",
				...dict,
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
			.add(this, "step", solutions_info_str)
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
		this.loaded = true;
		this.info = Object.keys(this.solutions_info[this.step])[0];
		this.infoDetail = this.solutions_info[this.step][this.info];

		const secon_coords = this.nodes[0].map((_, colIndex) =>
			this.nodes.map((row) => row[colIndex])
		);

		let sizex =
			math.max(secon_coords[0].flat()) - math.min(secon_coords[0].flat());
		let sizey =
			math.max(secon_coords[1].flat()) - math.min(secon_coords[1].flat());
		let sizez =
			math.max(secon_coords[2].flat()) - math.min(secon_coords[2].flat());

		let centerx =
			(math.max(secon_coords[0]) + math.min(secon_coords[0])) / 2;
		let centery =
			(math.max(secon_coords[1]) + math.min(secon_coords[1])) / 2;
		let centerz =
			(math.max(secon_coords[2]) + math.min(secon_coords[2])) / 2;
		this.center = [centerx, centery, centerz];
		this.dimens = [sizex, sizey, sizez];
		for (let i = 0; i < this.nodes.length; i++) {
			this.nodes[i][0] -= sizex / 2;
			this.nodes[i][1] -= sizey / 2;
			this.nodes[i][2] -= sizez / 2;
		}
		this.size = math.max(this.nodes.flat()) - math.min(this.nodes.flat());
	}
	updateSolutionInfo() {
		this.infoDetail = this.solutions_info[this.step][this.info];
	}

	updateU() {
		this.U = this.solutions[this.step].flat();
		const max_disp = math.max(this.U);
		const min_disp = math.min(this.U);
		this.max_abs_disp =
			Math.max(Math.abs(max_disp), Math.abs(min_disp)) * this.norm;
		if (this.config_dict["displacements"]) {
			this.magnifSlider.min(-0.4 / this.max_abs_disp);
			this.magnifSlider.max(0.4 / this.max_abs_disp);
		}

		for (const e of this.elements) {
			e.setUe(this.U, this.config_dict["calculateStrain"]);
		}
		this.updateColorVariable();
	}

	nextSolution() {
		this.step += 1 * (this.step < this.solutions.length - 1);
		this.updateSolution();
	}
	updateSolution() {
		this.updateU();
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

			this.elements[i].geometry.setAttribute(
				"color",
				new THREE.Float32BufferAttribute(colors, 3)
			);
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
				DIV.innerHTML =
					"Loading model " +
					'<progress value="' +
					percentage +
					'" max="100"> any% </progress>';
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
	onDocumentMouseDown(event) {
		if (this.loaded) {
			if (this.clickMode != "Nothing") {
				this.updateColorValues();
				event.preventDefault();
				const mouse3D = new THREE.Vector2(
					(event.clientX / window.innerWidth) * 2 - 1,
					-(event.clientY / window.innerHeight) * 2 + 1
				);
				const raycaster = new THREE.Raycaster();
				raycaster.setFromCamera(mouse3D, this.camera);
				const intersects = raycaster.intersectObjects(
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
					}
					this.updateGeometry();
				}
			}
		}
	}
}
export { FEMViewer };
