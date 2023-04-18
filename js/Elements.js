import * as THREE from "./build/three.module.js";
import { Prism, Tet } from "./TriangularBasedGeometries.js";
import {
	sum,
	det,
	multiplyScalar,
	multiply,
	transpose,
	min,
	max,
	abs,
	add,
	matInverse,
	createVector,
} from "./math.js";
function newPrism(n = 1) {
	const tr = new Prism();
	tr.divide(n - 1);
	const coordinates = tr.giveCoords().flat();
	const vertices = new Float32Array(coordinates);
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
	geometry.computeVertexNormals();
	return geometry;
}
function newTet(n = 1) {
	const tr = new Tet();
	tr.divide(n - 1);
	const coordinates = tr.giveCoords().flat();
	const vertices = new Float32Array(coordinates);
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
	geometry.computeVertexNormals();
	return geometry;
}

class Element {
	coords;
	gdls;
	Ue;
	geometry;
	constructor(coords, gdls) {
		this.coords = coords;
		this.gdls = gdls;
		this.Ue = [];
		this.nvn = gdls.length;
		this.scaledJacobian = undefined;
		this.res = 1;
	}
	get _xcenter() {
		let x = 0;
		let y = 0;
		let z = 0;
		let n = this.coords.length;
		for (let i = 0; i < n; i++) {
			let c = this.coords[i];
			x += c[0];
			y += c[1];
			z += c[2];
		}
		let center = [x / n, y / n, z / n];
		return center;
	}
	setUe(U, svs = true, displacements = false) {
		this.Ue = [];
		for (const v of this.gdls) {
			const u = [];
			for (const d of v) {
				u.push(U[d]);
			}
			this.Ue.push(u);
		}
		this.updateCoordinates(this.Ue, displacements);
		this.giveSecondVariableSolution(svs);
	}

	giveSecondVariableSolution(strain = false) {
		this.dus = [];
		try {
			for (const z of this._domain) {
				const [J, dpz] = this.J(z);
				const _J = matInverse(J);
				const dpx = multiply(_J, dpz);
				this.dus.push(multiply(this.Ue, transpose(dpx)));
			}
		} catch (error) {}
		if (strain) this.calculateStrain();
	}
	updateCoordinates(Ue, displacements) {
		this.X = [];
		this.XLines = [];
		this.U = [];
		this.ULines = [];
		this._U = [];
		this._ULines = [];
		let count = this._domain.length;
		for (let i = 0; i < count; i++) {
			const z = this._domain[i];
			let [XX, P] = this.T(z);
			const X = XX[0];
			const U = multiply(Ue, transpose([P]));
			const _U = [...U];
			for (let j = this.ndim; j < 3; j++) {
				X.push(0.0);
				_U.push(0.0);
			}
			this.X.push(X);
			this.U.push(U);
			this._U.push(_U);
		}
		for (let i = 0; i < this.line_domain.length; i++) {
			const z = this.line_domain[i];
			let [XX, P] = this.T(z);
			const XLines = XX[0];
			const ULines = multiply(Ue, transpose([P]));
			const _ULines = [...ULines];
			for (let j = this.ndim; j < 3; j++) {
				XLines.push(0.0);
				_ULines.push(0.0);
			}
			this.XLines.push(XLines);
			this._ULines.push(_ULines);
			this.ULines.push(ULines);
		}

		if (!displacements) {
			this._U = new Array(this._domain.length).fill([0.0, 0.0, 0.0]);
			this._ULines = new Array(this.line_domain.length).fill([
				0.0, 0.0, 0.0,
			]);
		}
	}
	variableAsDisplacement(variable) {
		this._U = [];
		this._ULines = [];
		for (let i = 0; i < this.U.length; i++) {
			const _U = [];
			for (let j = 0; j < 3; j++) {
				if (j == variable) {
					_U.push(this.U[i][0]);
				} else {
					_U.push(0.0);
				}
			}
			this._U.push(_U);
		}
		for (let i = 0; i < this.ULines.length; i++) {
			const _U = [];
			for (let j = 0; j < 3; j++) {
				if (j == variable) {
					_U.push(this.ULines[i][0]);
				} else {
					_U.push(0.0);
				}
			}
			this._ULines.push(_U);
		}
	}
	setGeometryCoords(mult, norm) {
		if (!mult) {
			if (mult != 0) {
				mult = 1.0;
			}
		}
		if (!norm) {
			if (norm != 0) {
				norm = 1.0;
			}
		}

		const parent_geometry = this.geometry;
		const line_geometry = this.line_geometry;
		let count = this._domain.length;
		for (let i = 0; i < count; i++) {
			const X = this.X[i];
			let U = this._U[i];
			parent_geometry.attributes.position.setX(
				i,
				X[0] * norm + this.modifier[i][0] + U[0] * mult * norm
			);
			parent_geometry.attributes.position.setY(
				i,
				X[1] * norm + this.modifier[i][1] + U[1] * mult * norm
			);
			parent_geometry.attributes.position.setZ(
				i,
				X[2] * norm + this.modifier[i][2] + U[2] * mult * norm
			);
		}
		parent_geometry.attributes.position.needsUpdate = true;
		parent_geometry.computeVertexNormals();
		if (line_geometry) {
			count = this.line_domain.length;
			for (let i = 0; i < count; i++) {
				const X = this.XLines[i];
				let U = this._ULines[i];
				line_geometry.attributes.position.setX(
					i,
					X[0] * norm + this.line_modifier[i][0] + U[0] * mult * norm
				);
				line_geometry.attributes.position.setY(
					i,
					X[1] * norm + this.line_modifier[i][1] + U[1] * mult * norm
				);
				line_geometry.attributes.position.setZ(
					i,
					X[2] * norm + this.line_modifier[i][2] + U[2] * mult * norm
				);
			}
			line_geometry.attributes.position.needsUpdate = true;
			line_geometry.computeVertexNormals();
		}
	}
	J(_z) {
		const dpsis = transpose(this.dpsi(_z));
		const j = multiply(dpsis, this.coords_o);
		return [j, dpsis];
	}
	T(_z) {
		let p = this.psi(_z);
		return [multiply([p], this.coords_o), p];
	}
	async calculateJacobian() {
		return new Promise((resolve) => {
			let max_j = -Infinity;
			let min_j = Infinity;
			for (const z of this.Z) {
				const [J, dpz] = this.J(z);
				const j = det(J);
				max_j = Math.max(max_j, j);
				min_j = Math.min(min_j, j);
			}
			this.scaledJacobian = min_j / Math.abs(max_j);
			resolve("resolved!");
		});
	}
	get sJ() {
		if (this.scaledJacobian) {
			return this.scaledJacobian;
		}
		let max_j = -Infinity;
		let min_j = Infinity;
		for (const z of this.Z) {
			const [J, dpz] = this.J(z);
			const j = det(J);
			max_j = Math.max(max_j, j);
			min_j = Math.min(min_j, j);
		}
		this.scaledJacobian = min_j / Math.abs(max_j);
		return min_j / Math.abs(max_j);
	}
	inverseMapping(xo) {
		const x0 = [];
		for (let i = 0; i < this.ndim; i++) {
			x0.push(xo[i]);
		}
		let p = undefined;
		let zi = new Array(this.ndim).fill(1 / 3);
		let li = -1;
		if (this instanceof Triangular) {
			li = 0;
		}
		for (let i = 0; i < 100; i++) {
			let [puntos, pp] = this.T(zi);
			p = pp;
			let punot = puntos[0];
			let xi = add(x0, multiplyScalar(punot, -1));
			let [J, dpz] = this.J(zi);
			let _J = matInverse(J);
			let dz = multiply(_J, transpose([xi])).flat();
			zi = add(zi, dz);
			if (sum(abs(dz)) < 0.00001) {
				break;
			}
			for (let j = 0; j < zi.length; j++) {
				zi[j] = Math.max(zi[j], li);
				zi[j] = Math.min(zi[j], 1);
			}
		}
		return zi;
	}
	set_properties(p) {
		this.properties = p;
	}
	giveSolutionPoint(z, colorMode, strain, Cfuntion) {
		let solution = Array(this.Ue[0].length).fill(0.0);
		let [x, P] = this.T(z);
		let [J, dpz] = this.J(z);
		const _J = matInverse(J);
		const dpx = multiply(_J, dpz);
		let du = multiply(this.Ue, transpose(dpx));
		let variable = this.Ue;
		let result = 0;
		if (colorMode == "dispmag") {
			for (let i = 0; i < this.Ue[0].length; i++) {
				let color = 0.0;
				for (let j = 0; j < this.nvn; j++) {
					let v = variable[j][i];
					color += v ** 2;
				}
				solution[i] = color ** 0.5;
			}
			for (let i = 0; i < P.length; i++) {
				result += P[i] * solution[i];
			}
		} else if (colorMode == "scaled_jac") {
			result = this.sJ;
		} else if (colorMode[0] == "PROP") {
			let prop_name = colorMode[1];
			result = this.properties[prop_name];
		} else if (strain && colorMode != "nocolor") {
			let C = Cfuntion(this.properties);
			let epsilon = [0, 0, 0, 0, 0, 0];
			if (du.length == 3) {
				const exx = du[0][0];
				const eyy = du[1][1];
				const ezz = du[2][2];

				const exy = du[0][1] + du[1][0];
				const exz = du[0][2] + du[2][0];
				const eyz = du[1][2] + du[2][1];
				epsilon = [exx, eyy, ezz, exz, eyz, exy];
			} else if (du.length == 2) {
				const exx = du[0][0];
				const eyy = du[1][1];
				const exy = du[0][1] + du[1][0];
				epsilon = [exx, eyy, exy];
			}
			let eps = createVector(epsilon);
			let sigmas = multiply(C, eps);
			sigmas = transpose(sigmas)[0];
			epsilon.push(...sigmas);
			if (du.length == 2) {
				let sx = sigmas[0];
				let sy = sigmas[1];
				let txy = sigmas[2];
				let s1 =
					(sx + sy) / 2 + (((sx - sy) / 2) ** 2 + txy ** 2) ** 0.5;
				let s2 =
					(sx + sy) / 2 - (((sx - sy) / 2) ** 2 + txy ** 2) ** 0.5;
				let s3 = (s1 - s2) / 2;
				epsilon.push(s1);
				epsilon.push(s2);
				epsilon.push(s3);
			}
			result = epsilon[colorMode];
		} else if (colorMode != "nocolor") {
			result = du[colorMode[0]][colorMode[1]];
		}
		return result;
	}
	setMaxDispNode(colorMode, strain, Cfuntion) {
		this.colors = Array(this.domain.length).fill(0.0);
		for (let i = 0; i < this._domain.length; i++) {
			const z = this._domain[i];
			this.colors[i] = this.giveSolutionPoint(
				z,
				colorMode,
				strain,
				Cfuntion
			);
		}
	}
}
class Element3D extends Element {
	constructor(coords, gdls) {
		super(coords, gdls);
	}
	isInside(x) {
		return false;
	}
	calculateStrain() {
		this.epsilons = [];
		for (const du of this.dus) {
			if (du.length == 3) {
				const exx = du[0][0];
				const eyy = du[1][1];
				const ezz = du[2][2];

				const exy = du[0][1] + du[1][0];
				const exz = du[0][2] + du[2][0];
				const eyz = du[1][2] + du[2][1];
				const epsilon = [exx, eyy, ezz, exz, eyz, exy];
				this.epsilons.push(epsilon);
			} else if (du.length == 2) {
				const exx = du[0][0];
				const eyy = du[1][1];

				const exy = du[0][1] + du[1][0];
				const epsilon = [exx, eyy, exy];
				this.epsilons.push(epsilon);
			} else {
				this.epsilons = new Array(6).fill(new Array(6).fill(0.0));
			}
		}
	}
}

class Brick extends Element3D {
	order;
	line_order;
	constructor(coords, gdls) {
		super(coords, gdls);
		this.type = "B1V";
		this.nfaces = 6;
		this.coords_o = coords;
		this.ndim = 3;
		this.initGeometry();
		this.Z = [
			[-0.77459667, -0.77459667, -0.77459667],
			[-0.77459667, -0.77459667, 0],
			[-0.77459667, -0.77459667, 0.77459667],
			[-0.77459667, 0, -0.77459667],
			[-0.77459667, 0, 0],
			[-0.77459667, 0, 0.77459667],
			[-0.77459667, 0.77459667, -0.77459667],
			[-0.77459667, 0.77459667, 0],
			[-0.77459667, 0.77459667, 0.77459667],
			[0, -0.77459667, -0.77459667],
			[0, -0.77459667, 0],
			[0, -0.77459667, 0.77459667],
			[0, 0, -0.77459667],
			[0, 0, 0],
			[0, 0, 0.77459667],
			[0, 0.77459667, -0.77459667],
			[0, 0.77459667, 0],
			[0, 0.77459667, 0.77459667],
			[0.77459667, -0.77459667, -0.77459667],
			[0.77459667, -0.77459667, 0],
			[0.77459667, -0.77459667, 0.77459667],
			[0.77459667, 0, -0.77459667],
			[0.77459667, 0, 0],
			[0.77459667, 0, 0.77459667],
			[0.77459667, 0.77459667, -0.77459667],
			[0.77459667, 0.77459667, 0],
			[0.77459667, 0.77459667, 0.77459667],
		];
		this.W = [
			0.17146776, 0.27434842, 0.17146776, 0.27434842, 0.43895748,
			0.27434842, 0.17146776, 0.27434842, 0.17146776, 0.27434842,
			0.43895748, 0.27434842, 0.43895748, 0.70233196, 0.43895748,
			0.27434842, 0.43895748, 0.27434842, 0.17146776, 0.27434842,
			0.17146776, 0.27434842, 0.43895748, 0.27434842, 0.17146776,
			0.27434842, 0.17146776,
		];
	}
	psi(_z) {
		const z = _z[0];
		const n = _z[1];
		const g = _z[2];
		return [
			(1.0 / 8.0) * (1 - z) * (1 - n) * (1 - g),
			(1.0 / 8.0) * (1 + z) * (1 - n) * (1 - g),
			(1.0 / 8.0) * (1 + z) * (1 + n) * (1 - g),
			(1.0 / 8.0) * (1 - z) * (1 + n) * (1 - g),
			(1.0 / 8.0) * (1 - z) * (1 - n) * (1 + g),
			(1.0 / 8.0) * (1 + z) * (1 - n) * (1 + g),
			(1.0 / 8.0) * (1 + z) * (1 + n) * (1 + g),
			(1.0 / 8.0) * (1 - z) * (1 + n) * (1 + g),
		];
	}
	dpsi(_z) {
		const x = _z[0];
		const y = _z[1];
		const z = _z[2];
		return [
			[
				0.125 * (1 - z) * (y - 1),
				0.125 * (1 - z) * (x - 1),
				-0.125 * (1 - x) * (1 - y),
			],
			[
				0.125 * (1 - y) * (1 - z),
				0.125 * (1 - z) * (-x - 1),
				-0.125 * (1 - y) * (x + 1),
			],
			[
				0.125 * (1 - z) * (y + 1),
				0.125 * (1 - z) * (x + 1),
				-0.125 * (x + 1) * (y + 1),
			],
			[
				0.125 * (1 - z) * (-y - 1),
				0.125 * (1 - x) * (1 - z),
				-0.125 * (1 - x) * (y + 1),
			],
			[
				0.125 * (1 - y) * (-z - 1),
				-0.125 * (1 - x) * (z + 1),
				0.125 * (1 - x) * (1 - y),
			],
			[
				0.125 * (1 - y) * (z + 1),
				-0.125 * (x + 1) * (z + 1),
				0.125 * (1 - y) * (x + 1),
			],
			[
				0.125 * (y + 1) * (z + 1),
				0.125 * (x + 1) * (z + 1),
				0.125 * (x + 1) * (y + 1),
			],
			[
				-0.125 * (y + 1) * (z + 1),
				0.125 * (1 - x) * (z + 1),
				0.125 * (1 - x) * (y + 1),
			],
		];
	}
	transformation(geo) {
		const Z = [];
		this.line_domain = [];
		this.line_modifier = [];
		this.modifier = [];
		for (let i = 0; i < geo.attributes.position.count; i++) {
			const x = geo.attributes.position.getX(i);
			const y = geo.attributes.position.getY(i);
			const z = geo.attributes.position.getZ(i);
			Z.push([x * 2, y * 2, z * 2]);
			this.modifier.push([0.0, 0.0, 0.0]);
		}
		for (let i = 0; i < this.line_geometry.attributes.position.count; i++) {
			const x = this.line_geometry.attributes.position.getX(i);
			const y = this.line_geometry.attributes.position.getY(i);
			const z = this.line_geometry.attributes.position.getZ(i);
			this.line_domain.push([2 * x, 2 * y, 2 * z]);
			this.line_modifier.push([0.0, 0.0, 0.0]);
		}
		return Z;
	}
	initGeometry() {
		this.geometry = new THREE.BoxGeometry(
			1,
			1,
			1,
			2 ** (this.res - 1),
			2 ** (this.res - 1),
			2 ** (this.res - 1)
		);
		this.line_geometry = new THREE.EdgesGeometry(this.geometry);
		this.domain = this.transformation(this.geometry);
		this._domain = this.domain;
		this.modifier_lineas = new Array(this.modifier.length).fill(0);
		this.colors = Array(this.modifier.length).fill(0.0);
		this.geometry.setAttribute(
			"color",
			new THREE.Float32BufferAttribute(
				new Array(this.modifier.length * 3),
				3
			)
		);
	}
}

class Tetrahedral extends Element3D {
	order;
	line_order;

	constructor(coords, gdls) {
		super(coords, gdls);
		this.type = "TE1V";
		this.ndim = 3;
		this.nfaces = 4;
		this.coords_o = coords;
		this.initGeometry();
		this.Z = [
			[0.01583591, 0.3280547, 0.3280547],
			[0.3280547, 0.01583591, 0.3280547],
			[0.3280547, 0.3280547, 0.01583591],
			[0.3280547, 0.3280547, 0.3280547],
			[0.67914318, 0.10695227, 0.10695227],
			[0.10695227, 0.67914318, 0.10695227],
			[0.10695227, 0.10695227, 0.67914318],
			[0.10695227, 0.10695227, 0.10695227],
		];
		this.W = [
			0.023088, 0.023088, 0.023088, 0.023088, 0.01857867, 0.01857867,
			0.01857867, 0.01857867,
		];
	}
	psi(_z) {
		let x = _z[0];
		let y = _z[1];
		let z = _z[2];
		let L1 = 1 - x - y - z;
		let L2 = x;
		let L3 = y;
		let L4 = z;
		return [L1, L2, L3, L4];
	}
	dpsi(_z) {
		const kernell = 0.0;
		return [
			[-1.0 + kernell, -1.0 + kernell, -1.0 + kernell],
			[1.0 + kernell, 0.0 + kernell, 0.0 + kernell],
			[0.0 + kernell, 1.0 + kernell, 0.0 + kernell],
			[0.0 + kernell, 0.0 + kernell, 1.0 + kernell],
		];
	}
	transformation(geo) {
		this.modifier = [];
		this.line_domain = [];
		this.line_modifier = [];
		const Z = [];
		for (let i = 0; i < geo.attributes.position.count; i++) {
			const x = geo.attributes.position.getX(i);
			const y = geo.attributes.position.getY(i);
			const z = geo.attributes.position.getZ(i);
			this.modifier.push([0.0, 0.0, 0.0]);
			Z.push([x, y, z]);
		}
		for (let i = 0; i < this.line_geometry.attributes.position.count; i++) {
			const x = this.line_geometry.attributes.position.getX(i);
			const y = this.line_geometry.attributes.position.getY(i);
			const z = this.line_geometry.attributes.position.getZ(i);
			this.line_domain.push([x, y, z]);
			this.line_modifier.push([0.0, 0.0, 0.0]);
		}
		return Z;
	}
	initGeometry() {
		this.geometry = newTet(this.res);
		this.line_geometry = new THREE.EdgesGeometry(this.geometry);
		this.domain = this.transformation(this.geometry);
		this._domain = this.domain;
		this.modifier_lineas = new Array(this.modifier.length).fill(0);
		this.colors = Array(this.modifier.length).fill(0.0);
		this.geometry.setAttribute(
			"color",
			new THREE.Float32BufferAttribute(
				new Array(this.modifier.length * 3),
				3
			)
		);
	}
}

class Lineal extends Element3D {
	order;
	line_order;
	constructor(coords, gdls, tama) {
		super(coords, gdls);
		this.tama = tama;
		this.type = "L1V";
		this.ndim = 1;
		const c = [];
		for (let i = 0; i < coords.length; i++) {
			const x = coords[i][0];
			c.push([x]);
		}
		this.coords_o = c;
		this.initGeometry();
		this.Z = [[-0.77459667], [0], [0.77459667]];
		this.W = [0.55555556, 0.88888889, 0.55555556];
	}
	psi(z) {
		return [0.5 * (1.0 - z[0]), 0.5 * (1.0 + z[0])];
	}
	dpsi(_z) {
		return [[-0.5], [0.5]];
	}
	transformation(geo) {
		this.modifier = [];
		this.line_domain = [];
		this.line_modifier = [];
		this._domain = [];
		const Z = [];
		for (let i = 0; i < geo.attributes.position.count; i++) {
			const x = geo.attributes.position.getX(i);
			const y = geo.attributes.position.getY(i);
			const z = geo.attributes.position.getZ(i);
			Z.push([x * 2, y * 2, z * 2]);
			this._domain.push([x * 2]);
			this.modifier.push([
				0.0,
				(this.tama / 20) * (y + 0.5),
				(this.tama / 20) * (z + 0.5),
			]);
		}
		for (let i = 0; i < this.line_geometry.attributes.position.count; i++) {
			const x = this.line_geometry.attributes.position.getX(i);
			const y = this.line_geometry.attributes.position.getY(i);
			const z = this.line_geometry.attributes.position.getZ(i);
			this.line_domain.push([x * 2]);
			this.line_modifier.push([
				0.0,
				(this.tama / 20) * (y + 0.5),
				(this.tama / 20) * (z + 0.5),
			]);
		}
		return Z;
	}
	initGeometry() {
		this.geometry = new THREE.BoxGeometry(
			1,
			1,
			1,
			2 ** (this.res - 1),
			1,
			1
		);
		this.line_geometry = new THREE.EdgesGeometry(this.geometry);
		this.domain = this.transformation(this.geometry);
		this.colors = Array(this.modifier.length).fill(0.0);
		this.geometry.setAttribute(
			"color",
			new THREE.Float32BufferAttribute(
				new Array(this.modifier.length * 3),
				3
			)
		);
	}
}

class Triangular extends Element3D {
	order;
	line_order;
	constructor(coords, gdls, tama) {
		super(coords, gdls);
		this.type = "T1V";
		this.ndim = 2;
		this.tama = tama;

		const c = [];
		for (let i = 0; i < coords.length; i++) {
			const x = coords[i][0];
			const y = coords[i][1];
			c.push([x, y]);
		}
		this.coords_o = c;
		this.initGeometry();
		const A0 = 1 / 3;
		const A1 = 0.05971587178977;
		const A2 = 0.797426985353087;
		const B1 = 0.470142064105115;
		const B2 = 0.101286507323456;
		const W0 = 0.1125;
		const W1 = 0.066197076394253;
		const W2 = 0.062969590272413;
		const X = [A0, A1, B1, B1, B2, B2, A2];
		const Y = [A0, B1, A1, B1, A2, B2, B2];
		this.Z = [];
		for (let i = 0; i < X.length; i++) {
			this.Z.push([X[i], Y[i]]);
		}
		this.W = [W0, W1, W1, W1, W2, W2, W2];
	}
	psi(_z) {
		return [1.0 - _z[0] - _z[1], _z[0], _z[1]];
	}
	dpsi(_z) {
		const kernell = _z[0] - _z[0];
		return [
			[-1.0 * (1 + kernell), -1.0 * (1 + kernell)],
			[1.0 * (1 + kernell), 0.0 * (1 + kernell)],
			[0.0 * (1 + kernell), 1.0 * (1 + kernell)],
		];
	}
	transformation(geo) {
		this._domain = [];
		this.modifier = [];
		this.line_domain = [];
		this.line_modifier = [];
		const Z = [];
		for (let i = 0; i < geo.attributes.position.count; i++) {
			const x = geo.attributes.position.getX(i);
			const y = geo.attributes.position.getY(i);
			const z = geo.attributes.position.getZ(i);
			Z.push([x, y, z]);
			this._domain.push([x, y]);
			this.modifier.push([0.0, 0.0, (this.tama / 20) * z]);
		}
		for (let i = 0; i < this.line_geometry.attributes.position.count; i++) {
			const x = this.line_geometry.attributes.position.getX(i);
			const y = this.line_geometry.attributes.position.getY(i);
			const z = this.line_geometry.attributes.position.getZ(i);
			this.line_domain.push([x, y]);
			this.line_modifier.push([0.0, 0.0, (this.tama / 20) * z]);
		}
		return Z;
	}
	initGeometry() {
		this.geometry = newPrism(this.res);
		this.line_geometry = new THREE.EdgesGeometry(this.geometry);
		this.domain = this.transformation(this.geometry);
		this.colors = Array(this.modifier.length).fill(0.0);
		this.geometry.setAttribute(
			"color",
			new THREE.Float32BufferAttribute(
				new Array(this.modifier.length * 3),
				3
			)
		);
	}
}

class Quadrilateral extends Element3D {
	order;
	line_order;
	constructor(coords, gdls, tama) {
		super(coords, gdls);
		this.tama = tama;
		this.type = "C1V";
		this.ndim = 2;

		const c = [];
		for (let i = 0; i < coords.length; i++) {
			const x = coords[i][0];
			const y = coords[i][1];
			c.push([x, y]);
		}
		this.coords_o = c;
		this.initGeometry();
		this.Z = [
			[-0.77459667, -0.77459667],
			[-0.77459667, 0],
			[-0.77459667, 0.77459667],
			[0, -0.77459667],
			[0, 0],
			[0, 0.77459667],
			[0.77459667, -0.77459667],
			[0.77459667, 0],
			[0.77459667, 0.77459667],
		];
		this.W = [
			0.30864198, 0.49382716, 0.30864198, 0.49382716, 0.79012346,
			0.49382716, 0.30864198, 0.49382716, 0.30864198,
		];
	}
	psi(z) {
		return [
			0.25 * (1.0 - z[0]) * (1.0 - z[1]),
			0.25 * (1.0 + z[0]) * (1.0 - z[1]),
			0.25 * (1.0 + z[0]) * (1.0 + z[1]),
			0.25 * (1.0 - z[0]) * (1.0 + z[1]),
		];
	}
	dpsi(z) {
		return [
			[0.25 * (z[1] - 1.0), 0.25 * (z[0] - 1.0)],
			[-0.25 * (z[1] - 1.0), -0.25 * (z[0] + 1.0)],
			[0.25 * (z[1] + 1.0), 0.25 * (1.0 + z[0])],
			[-0.25 * (1.0 + z[1]), 0.25 * (1.0 - z[0])],
		];
	}
	transformation(geo) {
		this._domain = [];
		this.modifier = [];
		this.line_domain = [];
		this.line_modifier = [];
		const Z = [];
		for (let i = 0; i < geo.attributes.position.count; i++) {
			const x = geo.attributes.position.getX(i);
			const y = geo.attributes.position.getY(i);
			const z = geo.attributes.position.getZ(i);
			Z.push([x * 2, y * 2, 2 * z]);
			this._domain.push([x * 2, y * 2]);
			this.modifier.push([0.0, 0.0, (this.tama / 20) * (z + 0.5)]);
		}
		for (let i = 0; i < this.line_geometry.attributes.position.count; i++) {
			const x = this.line_geometry.attributes.position.getX(i);
			const y = this.line_geometry.attributes.position.getY(i);
			const z = this.line_geometry.attributes.position.getZ(i);
			this.line_domain.push([x * 2, y * 2]);
			this.line_modifier.push([0.0, 0.0, (this.tama / 20) * (z + 0.5)]);
		}
		return Z;
	}
	initGeometry() {
		this.geometry = new THREE.BoxGeometry(
			1,
			1,
			1,
			2 ** (this.res - 1),
			2 ** (this.res - 1),
			1
		);
		this.line_geometry = new THREE.EdgesGeometry(this.geometry);
		this.domain = this.transformation(this.geometry);
		this.colors = Array(this.modifier.length).fill(0.0);
		this.geometry.setAttribute(
			"color",
			new THREE.Float32BufferAttribute(
				new Array(this.modifier.length * 3),
				3
			)
		);
	}
}

class LinealO2 extends Lineal {
	constructor(coords, gdls, tama) {
		super(coords, gdls, tama);
		this.type = "L2V";
	}
	psi(z) {
		let zm1 = z[0] + 1.0;
		return [
			1.0 - (3.0 / 2.0) * zm1 + (zm1 * zm1) / 2.0,
			2.0 * zm1 * (1.0 - zm1 / 2.0),
			(z / 2.0) * zm1,
		];
	}
	dpsi(z) {
		return [[z[0] - 0.5], [-2.0 * z[0]], [0.5 + z[0]]];
	}
}

class TetrahedralO2 extends Tetrahedral {
	constructor(coords, gdls) {
		super(coords, gdls);
		this.type = "TE2V";
	}
	psi(_z) {
		let x = _z[0];
		let y = _z[1];
		let z = _z[2];
		let L1 = 1 - x - y - z;
		let L2 = x;
		let L3 = y;
		let L4 = z;
		return [
			L1 * (2 * L1 - 1),
			L2 * (2 * L2 - 1),
			L3 * (2 * L3 - 1),
			L4 * (2 * L4 - 1),
			4 * L1 * L2,
			4 * L2 * L3,
			4 * L3 * L1,
			4 * L1 * L4,
			4 * L2 * L4,
			4 * L3 * L4,
		];
	}
	dpsi(_z) {
		let x = _z[0];
		let y = _z[1];
		let z = _z[2];

		return [
			[
				4 * x + 4 * y + 4 * z - 3,
				4 * x + 4 * y + 4 * z - 3,
				4 * x + 4 * y + 4 * z - 3,
			],
			[4 * x - 1, 0, 0],
			[0, 4 * y - 1, 0],
			[0, 0, 4 * z - 1],
			[-8 * x - 4 * y - 4 * z + 4, -4 * x, -4 * x],
			[4 * y, 4 * x, 0],
			[-4 * y, -4 * x - 8 * y - 4 * z + 4, -4 * y],
			[-4 * z, -4 * z, -4 * x - 4 * y - 8 * z + 4],
			[4 * z, 0, 4 * x],
			[0, 4 * z, 4 * y],
		];
	}
}

class BrickO2 extends Brick {
	constructor(coords, gdls) {
		super(coords, gdls);
		this.type = "B2V";
	}
	psi(_z) {
		let x = _z[0];
		let y = _z[1];
		let z = _z[2];
		return [
			(1 / 8) * ((1 - x) * (1 - y) * (1 - z) * (-x - y - z - 2)),
			(1 / 8) * ((1 + x) * (1 - y) * (1 - z) * (x - y - z - 2)),
			(1 / 8) * ((1 + x) * (1 + y) * (1 - z) * (x + y - z - 2)),
			(1 / 8) * ((1 - x) * (1 + y) * (1 - z) * (-x + y - z - 2)),
			(1 / 8) * ((1 - x) * (1 - y) * (1 + z) * (-x - y + z - 2)),
			(1 / 8) * ((1 + x) * (1 - y) * (1 + z) * (x - y + z - 2)),
			(1 / 8) * ((1 + x) * (1 + y) * (1 + z) * (x + y + z - 2)),
			(1 / 8) * ((1 - x) * (1 + y) * (1 + z) * (-x + y + z - 2)),
			(1 / 8) * (2 * (1 - x ** 2) * (1 - y) * (1 - z)),
			(1 / 8) * (2 * (1 + x) * (1 - y ** 2) * (1 - z)),
			(1 / 8) * (2 * (1 - x ** 2) * (1 + y) * (1 - z)),
			(1 / 8) * (2 * (1 - x) * (1 - y ** 2) * (1 - z)),
			(1 / 8) * (2 * (1 - x) * (1 - y) * (1 - z ** 2)),
			(1 / 8) * (2 * (1 + x) * (1 - y) * (1 - z ** 2)),
			(1 / 8) * (2 * (1 + x) * (1 + y) * (1 - z ** 2)),
			(1 / 8) * (2 * (1 - x) * (1 + y) * (1 - z ** 2)),
			(1 / 8) * (2 * (1 - x ** 2) * (1 - y) * (1 + z)),
			(1 / 8) * (2 * (1 + x) * (1 - y ** 2) * (1 + z)),
			(1 / 8) * (2 * (1 - x ** 2) * (1 + y) * (1 + z)),
			(1 / 8) * (2 * (1 - x) * (1 - y ** 2) * (1 + z)),
		];
	}
	dpsi(_z) {
		let x = _z[0];
		let y = _z[1];
		let z = _z[2];
		return [
			[
				(1 / 8) *
					(-(1 - x) * (1 - y) * (1 - z) +
						(1 - z) * (y - 1) * (-x - y - z - 2)),
				(1 / 8) *
					(-(1 - x) * (1 - y) * (1 - z) +
						(1 - z) * (x - 1) * (-x - y - z - 2)),
				(1 / 8) *
					(-(1 - x) * (1 - y) * (1 - z) -
						(1 - x) * (1 - y) * (-x - y - z - 2)),
			],
			[
				(1 / 8) *
					((1 - y) * (1 - z) * (x + 1) +
						(1 - y) * (1 - z) * (x - y - z - 2)),
				(1 / 8) *
					(-(1 - y) * (1 - z) * (x + 1) +
						(1 - z) * (-x - 1) * (x - y - z - 2)),
				(1 / 8) *
					(-(1 - y) * (1 - z) * (x + 1) -
						(1 - y) * (x + 1) * (x - y - z - 2)),
			],
			[
				(1 / 8) *
					((1 - z) * (x + 1) * (y + 1) +
						(1 - z) * (y + 1) * (x + y - z - 2)),
				(1 / 8) *
					((1 - z) * (x + 1) * (y + 1) +
						(1 - z) * (x + 1) * (x + y - z - 2)),
				(1 / 8) *
					(-(1 - z) * (x + 1) * (y + 1) -
						(x + 1) * (y + 1) * (x + y - z - 2)),
			],
			[
				(1 / 8) *
					(-(1 - x) * (1 - z) * (y + 1) +
						(1 - z) * (-y - 1) * (-x + y - z - 2)),
				(1 / 8) *
					((1 - x) * (1 - z) * (y + 1) +
						(1 - x) * (1 - z) * (-x + y - z - 2)),
				(1 / 8) *
					(-(1 - x) * (1 - z) * (y + 1) -
						(1 - x) * (y + 1) * (-x + y - z - 2)),
			],
			[
				(1 / 8) *
					(-(1 - x) * (1 - y) * (z + 1) +
						(1 - y) * (-z - 1) * (-x - y + z - 2)),
				(1 / 8) *
					(-(1 - x) * (1 - y) * (z + 1) -
						(1 - x) * (z + 1) * (-x - y + z - 2)),
				(1 / 8) *
					((1 - x) * (1 - y) * (z + 1) +
						(1 - x) * (1 - y) * (-x - y + z - 2)),
			],
			[
				(1 / 8) *
					((1 - y) * (x + 1) * (z + 1) +
						(1 - y) * (z + 1) * (x - y + z - 2)),
				(1 / 8) *
					(-(1 - y) * (x + 1) * (z + 1) -
						(x + 1) * (z + 1) * (x - y + z - 2)),
				(1 / 8) *
					((1 - y) * (x + 1) * (z + 1) +
						(1 - y) * (x + 1) * (x - y + z - 2)),
			],
			[
				(1 / 8) *
					((x + 1) * (y + 1) * (z + 1) +
						(y + 1) * (z + 1) * (x + y + z - 2)),
				(1 / 8) *
					((x + 1) * (y + 1) * (z + 1) +
						(x + 1) * (z + 1) * (x + y + z - 2)),
				(1 / 8) *
					((x + 1) * (y + 1) * (z + 1) +
						(x + 1) * (y + 1) * (x + y + z - 2)),
			],
			[
				(1 / 8) *
					(-(1 - x) * (y + 1) * (z + 1) -
						(y + 1) * (z + 1) * (-x + y + z - 2)),
				(1 / 8) *
					((1 - x) * (y + 1) * (z + 1) +
						(1 - x) * (z + 1) * (-x + y + z - 2)),
				(1 / 8) *
					((1 - x) * (y + 1) * (z + 1) +
						(1 - x) * (y + 1) * (-x + y + z - 2)),
			],
			[
				(1 / 8) * (-4 * x * (1 - y) * (1 - z)),
				(1 / 8) * ((2 - 2 * x ** 2) * (z - 1)),
				(1 / 8) * ((2 - 2 * x ** 2) * (y - 1)),
			],
			[
				(1 / 8) * (2 * (1 - y ** 2) * (1 - z)),
				(1 / 8) * (-2 * y * (1 - z) * (2 * x + 2)),
				(1 / 8) * ((2 * x + 2) * (y ** 2 - 1)),
			],
			[
				(1 / 8) * (-4 * x * (1 - z) * (y + 1)),
				(1 / 8) * ((1 - z) * (2 - 2 * x ** 2)),
				(1 / 8) * ((2 - 2 * x ** 2) * (-y - 1)),
			],
			[
				(1 / 8) * (-2 * (1 - y ** 2) * (1 - z)),
				(1 / 8) * (-2 * y * (1 - z) * (2 - 2 * x)),
				(1 / 8) * ((2 - 2 * x) * (y ** 2 - 1)),
			],
			[
				(1 / 8) * (-2 * (1 - y) * (1 - z ** 2)),
				(1 / 8) * ((2 - 2 * x) * (z ** 2 - 1)),
				(1 / 8) * (-2 * z * (1 - y) * (2 - 2 * x)),
			],
			[
				(1 / 8) * (2 * (1 - y) * (1 - z ** 2)),
				(1 / 8) * ((2 * x + 2) * (z ** 2 - 1)),
				(1 / 8) * (-2 * z * (1 - y) * (2 * x + 2)),
			],
			[
				(1 / 8) * (2 * (1 - z ** 2) * (y + 1)),
				(1 / 8) * ((1 - z ** 2) * (2 * x + 2)),
				(1 / 8) * (-2 * z * (2 * x + 2) * (y + 1)),
			],
			[
				(1 / 8) * (-2 * (1 - z ** 2) * (y + 1)),
				(1 / 8) * ((1 - z ** 2) * (2 - 2 * x)),
				(1 / 8) * (-2 * z * (2 - 2 * x) * (y + 1)),
			],
			[
				(1 / 8) * (-4 * x * (1 - y) * (z + 1)),
				(1 / 8) * ((2 - 2 * x ** 2) * (-z - 1)),
				(1 / 8) * ((1 - y) * (2 - 2 * x ** 2)),
			],
			[
				(1 / 8) * (2 * (1 - y ** 2) * (z + 1)),
				(1 / 8) * (-2 * y * (2 * x + 2) * (z + 1)),
				(1 / 8) * ((1 - y ** 2) * (2 * x + 2)),
			],
			[
				(1 / 8) * (-4 * x * (y + 1) * (z + 1)),
				(1 / 8) * ((2 - 2 * x ** 2) * (z + 1)),
				(1 / 8) * ((2 - 2 * x ** 2) * (y + 1)),
			],
			[
				(1 / 8) * (-2 * (1 - y ** 2) * (z + 1)),
				(1 / 8) * (-2 * y * (2 - 2 * x) * (z + 1)),
				(1 / 8) * ((1 - y ** 2) * (2 - 2 * x)),
			],
		];
	}
}

class TriangularO2 extends Triangular {
	constructor(coords, gdls, tama) {
		super(coords, gdls, tama);
		this.type = "T2V";
		let c = [coords[0], coords[1], coords[2]];
		let gdl = [-1, -1, -1];
		this.auxE = new Triangular(c, gdl, 0.2);
	}
	psi(z) {
		return [
			2.0 * (z[0] + z[1] - 1.0) * (z[0] + z[1] - 0.5),
			2.0 * z[0] * (z[0] - 0.5),
			2.0 * z[1] * (z[1] - 0.5),
			-4.0 * (z[0] + z[1] - 1.0) * z[0],
			4.0 * z[0] * z[1],
			-4.0 * z[1] * (z[0] + z[1] - 1.0),
		];
	}
	dpsi(z) {
		return [
			[4.0 * z[0] + 4.0 * z[1] - 3.0, 4.0 * z[1] + 4.0 * z[0] - 3.0],
			[4.0 * z[0] - 1.0, 0 * z[0]],
			[0 * z[0], 4.0 * z[1] - 1.0],
			[-8.0 * z[0] - 4.0 * (z[1] - 1.0), -4.0 * z[0]],
			[4.0 * z[1], 4.0 * z[0]],
			[-4.0 * z[1], -8.0 * z[1] - 4.0 * z[0] + 4.0],
		];
	}
	inverseMapping(xo, giveP) {
		return this.auxE.inverseMapping(xo, giveP);
	}
}

class Serendipity extends Quadrilateral {
	constructor(coords, gdls, tama) {
		super(coords, gdls, tama);
		this.type = "C2V";
	}
	psi(z) {
		return [
			0.25 * (1.0 - z[0]) * (1.0 - z[1]) * (-1.0 - z[0] - z[1]),
			0.25 * (1.0 + z[0]) * (1.0 - z[1]) * (-1.0 + z[0] - z[1]),
			0.25 * (1.0 + z[0]) * (1.0 + z[1]) * (-1.0 + z[0] + z[1]),
			0.25 * (1.0 - z[0]) * (1.0 + z[1]) * (-1.0 - z[0] + z[1]),
			0.5 * (1.0 - z[0] ** 2.0) * (1.0 - z[1]),
			0.5 * (1.0 + z[0]) * (1.0 - z[1] ** 2.0),
			0.5 * (1.0 - z[0] ** 2.0) * (1.0 + z[1]),
			0.5 * (1.0 - z[0]) * (1.0 - z[1] ** 2.0),
		];
	}
	dpsi(z) {
		return [
			[
				-0.25 * (z[1] - 1.0) * (2.0 * z[0] + z[1]),
				-0.25 * (z[0] - 1.0) * (2.0 * z[1] + z[0]),
			],
			[
				-0.25 * (z[1] - 1.0) * (2.0 * z[0] - z[1]),
				0.25 * (z[0] + 1.0) * (2.0 * z[1] - z[0]),
			],
			[
				0.25 * (z[1] + 1.0) * (2.0 * z[0] + z[1]),
				0.25 * (z[0] + 1.0) * (2.0 * z[1] + z[0]),
			],
			[
				0.25 * (z[1] + 1.0) * (2.0 * z[0] - z[1]),
				-0.25 * (z[0] - 1.0) * (2.0 * z[1] - z[0]),
			],
			[(z[1] - 1.0) * z[0], 0.5 * (z[0] ** 2.0 - 1.0)],
			[-0.5 * (z[1] ** 2.0 - 1.0), -z[1] * (z[0] + 1.0)],
			[-(z[1] + 1.0) * z[0], -0.5 * (z[0] ** 2.0 - 1.0)],
			[0.5 * (z[1] ** 2.0 - 1.0), z[1] * (z[0] - 1.0)],
		];
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

function fromElement(e) {
	let nee = undefined;
	if (e.tama) {
		nee = new types[e.type](e.coords, e.gdls, e.tama);
	} else {
		nee = new types[e.type](e.coords, e.gdls);
	}
	nee = Object.assign(nee, e);
	console.log(nee, e);
	return nee;
}

export {
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
	Element,
	Element3D,
	fromElement,
};
