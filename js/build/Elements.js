import * as THREE from "./three.module.js";

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
	}
	setUe(U, svs = true) {
		this.Ue = [];
		for (const v of this.gdls) {
			const u = [];
			for (const d of v) {
				u.push(U[d]);
			}
			this.Ue.push(u);
		}

		this.giveSecondVariableSolution(svs);
	}
	setGeometryCoords(Ue, mult, norm, parent_geometry, line_geometry) {
		if (!Ue) {
			Ue = [];
			const a = Array(this.coords.length).fill(0.0);
			Ue.push(a);
			Ue.push(a);
			Ue.push(a);
		}
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

		if (!parent_geometry) {
			parent_geometry = this.geometry;
		}
		if (!line_geometry) {
			line_geometry = this.line_geometry;
		}
		let count = parent_geometry.attributes.position.count;
		for (let i = 0; i < count; i++) {
			const node = this.order[i];
			const verticei = this.coords[node];
			parent_geometry.attributes.position.setX(
				i,
				verticei[0] * norm +
					this.modifier[i][0] +
					Ue[0][node] * mult * norm
			);
			parent_geometry.attributes.position.setY(
				i,
				verticei[1] * norm +
					this.modifier[i][1] +
					Ue[1][node] * mult * norm
			);
			parent_geometry.attributes.position.setZ(
				i,
				verticei[2] * norm +
					this.modifier[i][2] +
					Ue[2][node] * mult * norm
			);
		}
		parent_geometry.attributes.position.needsUpdate = true;
		parent_geometry.computeVertexNormals();
		if (line_geometry) {
			count = line_geometry.attributes.position.count;
			for (let i = 0; i < count; i++) {
				const node = this.line_order[i];
				const verticei = this.coords[node];
				line_geometry.attributes.position.setX(
					i,
					verticei[0] * norm +
						this.modifier[this.modifier_lineas[i]][0] +
						Ue[0][node] * mult * norm
				);
				line_geometry.attributes.position.setY(
					i,
					verticei[1] * norm +
						this.modifier[this.modifier_lineas[i]][1] +
						Ue[1][node] * mult * norm
				);
				line_geometry.attributes.position.setZ(
					i,
					verticei[2] * norm +
						this.modifier[this.modifier_lineas[i]][2] +
						Ue[2][node] * mult * norm
				);
			}
			line_geometry.attributes.position.needsUpdate = true;
			line_geometry.computeVertexNormals();
		}
	}
	J(_z) {
		const dpsis = math.transpose(this.dpsi(_z));
		const j = math.multiply(dpsis, this.coords_o);
		return [j, dpsis];
	}
	T(_z) {
		let p = this.psi(_z);
		return [math.multiply(p, this.coords_o), p];
	}
	async calculateJacobian() {
		return new Promise((resolve) => {
			let max_j = -Infinity;
			let min_j = Infinity;
			for (const z of this.Z) {
				const [J, dpz] = this.J(z);
				const j = math.det(J);
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
			const j = math.det(J);
			max_j = Math.max(max_j, j);
			min_j = Math.min(min_j, j);
		}
		this.scaledJacobian = min_j / Math.abs(max_j);
		return min_j / Math.abs(max_j);
	}
	inverseMapping(x0) {
		let zi = [0.15, 0.15, 0.15];
		for (let i = 0; i < 100; i++) {
			const xi = math.add(x0, math.multiply(this.T(zi)[0], -1));
			const [J, dpz] = this.J(zi);
			const _J = math.inv(J);
			const dz = math.multiply(_J, xi);
			zi = math.add(zi, dz);
			if (math.sum(math.abs(dz)) < 0.0000001) {
				return zi;
			}
		}
		return zi;
	}
	giveSecondVariableSolution(strain = false) {
		this.dus = [];
		try {
			for (const z of this.domain) {
				const [J, dpz] = this.J(z);
				const _J = math.inv(J);
				const dpx = math.multiply(_J, dpz);
				this.dus.push(math.multiply(this.Ue, math.transpose(dpx)));
			}
		} catch (error) {}
		if (strain) this.calculateStrain();
	}
	encontrarVertices() {
		const res = [];
		for (let j = 0; j < this.geometry.attributes.position.count; j++) {
			const x = this.geometry.attributes.position.getX(j);
			const y = this.geometry.attributes.position.getY(j);
			const z = this.geometry.attributes.position.getZ(j);
			const X = [x, y, z];
			let im = this.inverseMapping(X);
			for (let i = 0; i < this.domain.length; i++) {
				let p = this.domain[i];
				let resta = math.sum(
					...[
						(im[0] - p[0]) ** 2,
						(im[1] - p[1]) ** 2,
						(im[2] - p[2]) ** 2,
					]
				);
				if (resta < 0.0001) {
					res.push(i);
					break;
				}
			}
		}
		return res;
	}
	encontrarVerticesLineas() {
		const res = [];
		for (let j = 0; j < this.line_geometry.attributes.position.count; j++) {
			const x = this.line_geometry.attributes.position.getX(j);
			const y = this.line_geometry.attributes.position.getY(j);
			const z = this.line_geometry.attributes.position.getZ(j);
			const X = [x, y, z];
			let im = this.inverseMapping(X);
			for (let i = 0; i < this.domain.length; i++) {
				let p = this.domain[i];
				let resta = math.sum(
					...[
						(im[0] - p[0]) ** 2,
						(im[1] - p[1]) ** 2,
						(im[2] - p[2]) ** 2,
					]
				);
				if (resta < 0.0001) {
					res.push(i);
					break;
				}
			}
		}
		return res;
	}
	setMaxDispNode(colorMode, strain) {
		this.colors = Array(this.order.length).fill(0.0);
		let variable = this.Ue;
		if (colorMode == "dispmag") {
			for (let i = 0; i < this.order.length; i++) {
				const gdl = this.order[i];
				let color = 0.0;
				for (let j = 0; j < this.nvn; j++) {
					let v = variable[j][gdl];
					color += v ** 2;
				}
				this.colors[i] = color ** 0.5;
			}
		} else if (colorMode == "scaled_jac") {
			for (let i = 0; i < this.order.length; i++) {
				this.colors[i] = this.sJ;
			}
		} else if (strain) {
			variable = this.epsilons;
			for (let i = 0; i < this.order.length; i++) {
				const gdl = this.order[i];
				this.colors[i] = variable[gdl][colorMode];
			}
		} else if (colorMode != "nocolor") {
			variable = this.dus;
			for (let i = 0; i < this.order.length; i++) {
				const gdl = this.order[i];
				this.colors[i] = variable[gdl][colorMode[0]][colorMode[1]];
			}
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
		this.coords_o = coords;
		this.domain = [
			[-1, -1, -1],
			[1, -1, -1],
			[1, 1, -1],
			[-1, 1, -1],
			[-1, -1, 1],
			[1, -1, 1],
			[1, 1, 1],
			[-1, 1, 1],
		];
		this.geometry = new THREE.BoxGeometry(1, 1, 1);
		this.line_geometry = new THREE.EdgesGeometry(this.geometry);
		this.order = [
			6, 2, 5, 1, 3, 7, 0, 4, 3, 2, 7, 6, 4, 5, 0, 1, 7, 6, 4, 5, 2, 3, 1,
			0,
		];
		this.line_order = [
			3, 7, 6, 2, 4, 0, 1, 5, 7, 4, 6, 7, 4, 5, 5, 6, 2, 1, 3, 2, 1, 0, 0,
			3,
		];
		this.modifier = [
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
		];
		this.modifier_lineas = new Array(this.modifier.length).fill(0);
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
}

class Tetrahedral extends Element3D {
	order;
	line_order;
	constructor(coords, gdls) {
		super(coords, gdls);
		this.coords_o = coords;
		this.domain = [
			[0.0, 0.0, 0.0],
			[1.0, 0.0, 0.0],
			[0.0, 1.0, 0.0],
			[0.0, 0.0, 1.0],
		];
		this.geometry = new THREE.TetrahedronGeometry(1);
		this.line_geometry = new THREE.EdgesGeometry(this.geometry);
		this.order = [1, 0, 2, 3, 2, 0, 3, 0, 1, 3, 1, 2];
		this.line_order = [2, 0, 3, 0, 0, 1, 3, 1, 1, 2, 2, 3];
		this.modifier = [
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
		];
		this.modifier_lineas = new Array(this.modifier.length).fill(0);
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
}

class Lineal extends Element3D {
	order;
	line_order;
	constructor(coords, gdls, tama) {
		super(coords, gdls);
		this.geometry = new THREE.BoxGeometry(1);
		this.line_geometry = new THREE.EdgesGeometry(this.geometry);
		this.order = [
			1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0,
			0,
		];
		this.line_order = [
			0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0,
			0,
		];
		const h = tama / 10.0;
		this.modifier_lineas = [
			4, 5, 0, 1, 7, 6, 3, 2, 5, 7, 0, 5, 7, 2, 2, 0, 1, 3, 4, 1, 3, 6, 6,
			4,
		];
		this.modifier = [
			[0.0, h, h],
			[0.0, h, h],
			[0.0, h, 0.0],
			[0.0, h, 0.0],
			[0.0, 0.0, h],
			[0.0, 0.0, h],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, h],
			[0.0, h, h],
			[0.0, 0.0, h],
			[0.0, h, h],
			[0.0, 0.0, 0.0],
			[0.0, h, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, h, 0.0],
			[0.0, 0.0, h],
			[0.0, h, h],
			[0.0, 0.0, 0.0],
			[0.0, h, 0.0],
			[0.0, h, h],
			[0.0, 0.0, h],
			[0.0, h, 0.0],
			[0.0, 0.0, 0.0],
		];
		this.Z = [[-0.77459667], [0], [0.77459667]];
		this.W = [0.55555556, 0.88888889, 0.55555556];
	}
	psi(_z) {
		return 0.0;
	}
	dpsi(_z) {
		return 0.0;
	}
}

class LinealO2 extends Lineal {
	constructor(coords, gdls, tama) {
		super(coords, gdls, tama);
	}
	psi(_z) {
		return 0.0;
	}
	dpsi(_z) {
		return 0.0;
	}
}

class Triangular extends Element3D {
	order;
	line_order;
	constructor(coords, gdls, tama) {
		super(coords, gdls);
		const c = [];
		for (let i = 0; i < coords.length; i++) {
			const x = coords[i][0];
			const y = coords[i][1];
			c.push([x, y]);
		}
		this.coords_o = c;
		this.geometry = new THREE.BoxGeometry(1);
		this.line_geometry = new THREE.EdgesGeometry(this.geometry);
		this.domain = [
			[0, 0],
			[1, 0],
			[0, 1],
		];
		this.order = [
			2, 2, 1, 1, 2, 2, 0, 0, 2, 2, 2, 2, 0, 1, 0, 1, 2, 2, 0, 1, 2, 2, 1,
			0,
		];
		this.line_order = [
			2, 2, 2, 2, 0, 0, 1, 1, 2, 0, 2, 2, 0, 1, 1, 2, 2, 1, 2, 2, 1, 0, 0,
			2,
		];
		const h = tama / 20.0;
		const orderori = [
			6, 2, 5, 1, 3, 7, 0, 4, 3, 2, 7, 6, 4, 5, 0, 1, 7, 6, 4, 5, 2, 3, 1,
			0,
		];
		this.modifier_lineas = [
			4, 5, 0, 1, 7, 6, 3, 2, 5, 7, 0, 5, 7, 2, 2, 0, 1, 3, 4, 1, 3, 6, 6,
			4,
		];
		this.modifier = [
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
		];
		for (let k = 0; k < this.modifier.length; k++) {
			if (orderori[k] > 3) {
				this.modifier[k][2] = h;
			}
		}
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
}

class Quadrilateral extends Element3D {
	order;
	line_order;
	constructor(coords, gdls, tama) {
		super(coords, gdls);
		const c = [];
		for (let i = 0; i < coords.length; i++) {
			const x = coords[i][0];
			const y = coords[i][1];
			c.push([x, y]);
		}
		this.coords_o = c;
		this.geometry = new THREE.BoxGeometry(1);
		this.line_geometry = new THREE.EdgesGeometry(this.geometry);
		this.order = [
			2, 2, 1, 1, 3, 3, 0, 0, 3, 2, 3, 2, 0, 1, 0, 1, 3, 2, 0, 1, 2, 3, 1,
			0,
		];
		this.domain = [
			[0, 0],
			[1, 0],
			[1, 1],
			[0, 1],
		];
		this.line_order = [
			3, 3, 2, 2, 0, 0, 1, 1, 3, 0, 2, 3, 0, 1, 1, 2, 2, 1, 3, 2, 1, 0, 0,
			3,
		];
		this.modifier_lineas = [
			4, 5, 0, 1, 7, 6, 3, 2, 5, 7, 0, 5, 7, 2, 2, 0, 1, 3, 4, 1, 3, 6, 6,
			4,
		];
		const h = tama / 20.0;
		const orderori = [
			6, 2, 5, 1, 3, 7, 0, 4, 3, 2, 7, 6, 4, 5, 0, 1, 7, 6, 4, 5, 2, 3, 1,
			0,
		];
		this.modifier = [
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 0.0],
		];
		for (let k = 0; k < this.modifier.length; k++) {
			if (orderori[k] > 3) {
				this.modifier[k][2] = h;
			}
		}
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
}

class TetrahedralO2 extends Tetrahedral {
	constructor(coords, gdls) {
		super(coords, gdls);
	}
	psi(_z) {
		x = _z[0];
		y = _z[1];
		z = _z[2];
		L1 = 1 - x - y - z;
		L2 = x;
		L3 = y;
		L4 = z;
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
		x = _z[0];
		y = _z[1];
		z = _z[2];

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
// TODO Agregar estos elementos. Las funciones son un asco

class BrickO2 extends Brick {
	constructor(coords, gdls) {
		super(coords, gdls);
	}
	psi(z) {
		return 0.0;
	}
	dpsi(z) {
		return 0.0;
	}
}

class TriangularO2 extends Triangular {
	constructor(coords, gdls, tama) {
		super(coords, gdls, tama);
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
}

class Serendipity extends Quadrilateral {
	constructor(coords, gdls, tama) {
		super(coords, gdls, tama);
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
};
