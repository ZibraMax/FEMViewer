import * as THREE from "./build/three.module.js";
import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.16/+esm";
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
		this.corriendo = false;
		this.min_search_radius = -Infinity;
		this.max_color_value = 0;
		this.min_color_value = 0;
		this.initial_zoom = iz;
		this.solution_as_displacement = false;
		this.axis = axis;
		this.canvas = canvas;
		this.max_color_value_slider = undefined;
		this.min_color_value_slider = undefined;

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

		this.delta = 0;
		this.interval = 1 / 60;
		this.clock = new THREE.Clock();
		this.bufferGeometries = [];
		this.bufferLines = [];
		this.model = new THREE.Object3D();
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

	detectBorderElements() {
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
		this.json_path = json_path;
		this.filename = json_path;
		const response = await fetch(this.json_path);
		const jsondata = await response.json();
		if (be != undefined) {
			jsondata["border_elements"] = be;
		}
		this.parseJSON(jsondata);
	}
	reset() {
		this.animate = false;
		this.colorOptions = "nocolor";
		for (let i = 0; i < this.elements.length; i++) {
			this.elements[i].geometry.dispose();
			this.bufferGeometries.pop().dispose();
			this.bufferLines.pop().dispose();
		}
		this.model.remove(this.mesh);
		this.model.remove(this.contour);
		this.config_dict = CONFIG_DICT["GENERAL"];

		this.solution_as_displacement = false;

		this.mergedGeometry.dispose();
		this.mergedLineGeometry.dispose();
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
		this.contour.geometry.dispose();
		this.contour.material.dispose();

		this.renderer.renderLists.dispose();
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
		delete this.mergedGeometry;
		delete this.mergedLineGeometry;
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
			.add(this, "detectBorderElements")
			.name("Detect border elements");
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
					if (!this.animate) {
						this.mult = 1.0;
						this.updateMeshCoords();
						this.updateGeometry();
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
		this.animate = false;
		this.reset();
		this.before_load();
		console.log("Empezando a cargar!");
		const resp = this.loadJSON(this.filename);
		resp.then(() => {
			console.log("Cargado!");
			this.init(false);
			this.after_load();
		});
	}

	updateBorderElements(be) {
		this.reset();
		this.before_load();
		console.log("Empezando a cargar!");
		const resp = this.loadJSON(this.filename, be);
		resp.then(() => {
			console.log("Cargado!");
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
		this.max_color_value = max_disp;
		this.min_color_value = min_disp;
		this.max_color_value_slider.max(max_disp);
		this.max_color_value_slider.min(min_disp);
		this.max_color_value_slider.step(
			(this.max_color_value - this.min_color_value) / 1000
		);
		this.min_color_value_slider.step(
			(this.max_color_value - this.min_color_value) / 1000
		);

		this.min_color_value_slider.max(max_disp);
		this.min_color_value_slider.min(min_disp);
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
			this.material = new THREE.MeshLambertMaterial({
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
		requestAnimationFrame(this.update.bind(this));
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
			if (this.colors) {
				const colors = this.bufferGeometries[i].attributes.color;
				for (let j = 0; j < e.order.length; j++) {
					let disp = e.colors[j];
					const color = this.lut.getColor(disp);
					colors.setXYZ(j, color.r, color.g, color.b);
				}
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
		this.createElements();
		this.createLines();

		this.mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(
			this.bufferGeometries,
			true
		);
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
		this.updateU();
		this.model.add(this.mesh);

		this.scene.add(this.model);
		this.renderer.render(this.scene, this.camera);
		this.zoomExtents();
		this.updateLines();
		window.addEventListener("resize", this.render.bind(this));
		if (!this.corriendo) {
			this.corriendo = true;
			requestAnimationFrame(this.update.bind(this));
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
		let original_dict = jsondata["dictionary"];
		this.dictionary.push(...original_dict);
		this.types = jsondata["types"];
		if (jsondata["border_elements"]) {
			this.border_elements.push(...jsondata["border_elements"]);
			this.dictionary = [];
			for (const be of this.border_elements) {
				this.dictionary.push(original_dict[be]);
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
		let center = [centerx, centery, centerz];
		let dimens = [sizex, sizey, sizez];
		let bounding = new Quadrant3D(center, dimens);
		this.OctTree = new Geometree(bounding);
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

	createElements() {
		this.bufferGeometries = [];
		this.elements = new Array(this.dictionary.length).fill(0.0);
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

			let p = { _xcenter: this.elements[i]._xcenter.slice(), id: i };
			this.OctTree.add_point(p);
			const colors = [];
			for (
				let j = 0;
				j < this.elements[i].geometry.attributes.position.count;
				++j
			) {
				colors.push(1, 1, 1);
			}

			this.elements[i].geometry.setAttribute(
				"color",
				new THREE.Float32BufferAttribute(colors, 3)
			);
			this.bufferGeometries.push(this.elements[i].geometry);
		}
	}
	createLines() {
		this.bufferLines = [];
		for (const e of this.elements) {
			this.bufferLines.push(e.line_geometry);
		}
	}
	onDocumentMouseDown(event) {
		// event.preventDefault();
		// const mouse3D = new THREE.Vector2(
		// 	(event.clientX / window.innerWidth) * 2 - 1,
		// 	-(event.clientY / window.innerHeight) * 2 + 1
		// );
		// const raycaster = new THREE.Raycaster();
		// raycaster.setFromCamera(mouse3D, this.camera);
		// const intersects = raycaster.intersectObjects(this.model.children);
		// for (const e of intersects) {
		// 	const index = e.object.userData.elementId;
		// 	this.elements[index].colors = this.elements[index].colors.map(
		// 		(x) => 0
		// 	);
		// }
		// if (intersects.length > 0) {
		// 	const keleven = intersects[0].object.userData.elementId;
		// 	console.log(keleven);
		// 	const e = this.elements[keleven];
		// 	console.log(e);
		// }
	}
}
export { FEMViewer };
