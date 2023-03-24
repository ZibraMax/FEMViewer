import * as THREE from "./build/three.module.js";
import { OrbitControls } from "./build/OrbitControls.js";

const LOD_LEVELS = {
	1: "Low (only vertices) (1)",
	2: "Medium (2)",
	3: "High (4)",
	4: "Ultra (8)",
	5: "PC becomes room heater (16)",
};

class ElementView {
	constructor(element, parent, res, container) {
		this.element = element;
		this.container = container;
		this.parent = parent;
		this.res = res || 3;
		this.restartElement();
		this.createView();
		this.init();
	}
	restartElement() {
		this.element.res = this.res;
		this.element.initGeometry();
		this.element.updateCoordinates(
			this.element.Ue,
			this.parent.config_dict["displacements"]
		);
		if (this.parent.solution_as_displacement) {
			this.element.variableAsDisplacement(
				this.parent.variable_as_displacement
			);
		}
		this.element.giveSecondVariableSolution(
			this.parent.config_dict["calculateStrain"]
		);
		this.element.setGeometryCoords(
			this.parent.magnif * this.parent.mult,
			this.parent.norm
		);
		let Cfuntion = undefined;
		if (this.parent.config_dict["C"]) {
			Cfuntion = this.parent.config_dict["C"];
		}
		this.element.setMaxDispNode(
			this.parent.colorOptions,
			this.parent.config_dict["calculateStrain"],
			Cfuntion
		);

		this.parent.updateSpecificBufferGeometry(this.element.index);
	}

	init() {
		const canvas = this.canvas;
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
		});

		const fov = 40;
		const aspect = this.canvas.clientWidth / this.canvas.clientHeight; // the canvas default
		const near = 0.01;
		const far = 200;

		this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		this.camera.position.set(25, 25, 25);
		this.camera.lookAt(0, 0, 0);
		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.target.set(0, 0, 0);
		this.controls.update();

		this.scene = new THREE.Scene();

		const geometry = this.element.geometry;

		this.contour = new THREE.LineSegments(
			this.element.line_geometry,
			this.parent.line_material
		);
		this.mesh = new THREE.Mesh(geometry, this.parent.material);
		this.scene.add(this.mesh);
		this.scene.add(this.contour);
		this.render();
		this.updateGeometry();
		this.zoomExtents();
		this.animationFrameID = requestAnimationFrame(this.update.bind(this));
	}
	updateGeometry() {
		for (let j = 0; j < this.element.domain.length; j++) {
			let disp = this.element.colors[j];
			const color = this.parent.lut.getColor(disp);
			this.element.geometry.attributes.color.setXYZ(
				j,
				color.r,
				color.g,
				color.b
			);
		}
		this.contour.geometry = this.element.line_geometry;
		this.contour.material = this.parent.line_material;
		this.mesh.geometry = this.element.geometry;
		this.mesh.material = this.parent.material;
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
		this.scene.clear();
		this.renderer.dispose();
		this.renderer.forceContextLoss();
		this.res = this.parent.resolution;
		this.restartElement();
	}
	close() {
		this.dispose();
		this.root.remove();
	}
	createView() {
		let root = document.createElement("div");
		root.setAttribute("id", "element-view-container-" + this.element.index);
		root.setAttribute("class", "mini-box resizable");
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
		header.setAttribute(
			"class",
			"header-element-viewer noselect draggable"
		);
		header.innerHTML =
			"<i class='fa-regular fa-solid fa-up-down-left-right'></i> Element " +
			this.element.index +
			" | LOD: " +
			LOD_LEVELS[this.res];
		this.closeButton = document.createElement("i");
		//canvas.setAttribute("id", "element-view-" + this.element.index);
		this.closeButton.setAttribute("class", "closeButton fa-solid fa-xmark");
		this.closeButton.setAttribute(
			"style",
			"position:absolute;top: 4px;right: 8px;z-index:100"
		);
		this.closeButton.addEventListener("click", () => {
			this.parent.destroy_element_view(this);
		});
		root.appendChild(this.closeButton);

		let slider = document.createElement("input");
		slider.setAttribute("type", "range");
		slider.setAttribute("min", "1");
		slider.setAttribute("max", "5");
		slider.setAttribute("step", "1");
		slider.setAttribute("value", this.res);
		slider.setAttribute("class", "slider");
		slider.addEventListener("input", () => {
			this.res = slider.value;
			header.innerHTML =
				"<i class='fa-regular fa-solid fa-up-down-left-right'></i> Element " +
				this.element.index +
				" | LOD: " +
				LOD_LEVELS[this.res];
			root.appendChild(this.closeButton);
			this.restartElement();
			this.updateGeometry();
			this.render();
			this.parent.updateSpecificBufferGeometry(this.element.index);
			this.parent.updateColorValues();
			this.parent.updateGeometry();
		});

		let footer = document.createElement("div");
		footer.setAttribute("class", "notification-container-ev noselect");

		let footer2 = document.createElement("div");
		footer2.setAttribute("class", "notification-bottom-ev");
		this.infoText = document.createElement("p");
		this.infoText.setAttribute("class", "notification-button-ev noselect");
		this.infoText.innerHTML = "X = -, Y = -, Z = -, Value = -";
		footer2.appendChild(this.infoText);
		footer.appendChild(slider);
		footer.appendChild(footer2);

		root.appendChild(header);
		root.appendChild(this.canvas);
		root.appendChild(footer);
		this.container.appendChild(root);
		this.root = root;

		interact(".draggable").draggable({
			modifiers: [
				interact.modifiers.restrictRect({
					restriction: this.container,
				}),
			],
			listeners: {
				move: dragMoveListener,
			},
		});

		function dragMoveListener(event) {
			var target = event.target.parentElement;
			var x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
			var y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

			// translate the element
			target.style.transform = "translate(" + x + "px, " + y + "px)";

			// update the posiion attributes
			target.setAttribute("data-x", x);
			target.setAttribute("data-y", y);
		}

		interact(".resizable")
			.resizable({
				preserveAspectRatio: false,
				edges: { left: false, right: true, bottom: true, top: false },
			})
			.on("resizemove", function (event) {
				var target = event.target,
					x = parseFloat(target.getAttribute("data-x")) || 0,
					y = parseFloat(target.getAttribute("data-y")) || 0;
				target.style.width = event.rect.width + "px";
				target.style.height = event.rect.height + "px";
				x += event.deltaRect.left;
				y += event.deltaRect.top;
				target.style.webkitTransform = target.style.transform =
					"translate(" + x + "px," + y + "px)";
				target.setAttribute("data-x", x);
				target.setAttribute("data-y", y);
			});
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
		cameraOffs.multiplyScalar(-FL * 1.15);
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
			let Cfuntion = undefined;
			if (this.parent.config_dict["C"]) {
				Cfuntion = this.parent.config_dict["C"];
			}
			let value = this.element.giveSolutionPoint(
				z,
				this.parent.colorOptions,
				this.parent.config_dict["calculateStrain"],
				Cfuntion
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
export { ElementView };
