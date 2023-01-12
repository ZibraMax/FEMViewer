import { subst, add, multiplyScalar, dot, cross } from "./math.js";
class Triangle {
	constructor(coords) {
		this.coords = coords || [
			[0.0, 0.0, 0.5],
			[1.0, 0.0, 0.5],
			[0.0, 1.0, 0.5],
		];
		let delta1 = subst(coords[1], coords[0]);
		let delta2 = subst(coords[2], coords[0]);
		let casi_normal = cross(delta1, delta2);
		let mag_norm = dot(casi_normal, casi_normal) ** 0.5;
		this.normal = multiplyScalar(casi_normal, 1 / mag_norm);
		this.divided = false;
		this.children = [];
	}

	extrude(h, a) {
		let newCoordsArriba = [];
		for (const c of this.coords) {
			let abajo = add(multiplyScalar(this.normal, -h / 2), c);
			newCoordsArriba.push(abajo);
		}
		let newCoordsAbajo = [];
		for (const c of this.coords) {
			let arriba = add(multiplyScalar(this.normal, +h / 2), c);
			newCoordsAbajo.push(arriba);
		}
		let newCoordsInter = [];
		newCoordsInter.push(
			newCoordsArriba[0],
			newCoordsAbajo[0],
			newCoordsArriba[1]
		);
		newCoordsInter.push(
			newCoordsAbajo[0],
			newCoordsAbajo[1],
			newCoordsArriba[1]
		);

		newCoordsInter.push(
			newCoordsArriba[1],
			newCoordsAbajo[1],
			newCoordsArriba[2]
		);
		newCoordsInter.push(
			newCoordsAbajo[1],
			newCoordsAbajo[2],
			newCoordsArriba[2]
		);

		if (!a) {
			newCoordsInter.push(
				newCoordsArriba[2],
				newCoordsAbajo[2],
				newCoordsArriba[0]
			);
			newCoordsInter.push(
				newCoordsAbajo[2],
				newCoordsAbajo[0],
				newCoordsArriba[0]
			);
		}

		return [
			...[...newCoordsArriba].reverse(),
			...newCoordsAbajo,
			...newCoordsInter,
		];
	}

	divide(n = 1) {
		if (n == 0) {
			return;
		} else {
			this.subdivide();
			for (const ch of this.children) {
				ch.divide(n - 1);
			}
		}
	}

	subdivide() {
		this.divided = true;
		const c = this.coords;
		let mid1 = [
			c[1][0] / 2 + c[0][0] / 2,
			c[1][1] / 2 + c[0][1] / 2,
			c[1][2] / 2 + c[0][2] / 2,
		];
		let mid2 = [
			c[2][0] / 2 + c[0][0] / 2,
			c[2][1] / 2 + c[0][1] / 2,
			c[2][2] / 2 + c[0][2] / 2,
		];
		let mid3 = [
			c[2][0] / 2 + c[1][0] / 2,
			c[2][1] / 2 + c[1][1] / 2,
			c[2][2] / 2 + c[1][2] / 2,
		];

		let Ta = new Triangle([c[0], mid1, mid2]);
		let Tb = new Triangle([mid3, mid2, mid1]);
		let Tc = new Triangle([mid1, c[1], mid3]);
		let Td = new Triangle([mid2, mid3, c[2]]);
		this.children = [Ta, Tb, Tc, Td];
	}

	giveCoords(reverse = false) {
		let result = [];
		if (!this.divided) {
			if (reverse) {
				return [...this.coords].reverse();
			} else {
				return this.coords;
			}
		}
		for (const ch of this.children) {
			result = result.concat(ch.giveCoords(reverse));
		}
		return result;
	}
}
class Prism {
	constructor() {
		this.topTriang = new Triangle([
			[0.0, 0.0, 1.0],
			[1.0, 0.0, 1.0],
			[0.0, 1.0, 1.0],
		]);
		let ct = this.topTriang.coords;
		this.bottomTriang = new Triangle([
			[0.0, 0.0, 0.0],
			[1.0, 0.0, 0.0],
			[0.0, 1.0, 0.0],
		]);
		let cb = this.bottomTriang.coords;
		this.sideTriangles = [
			cb[2],
			cb[0],
			ct[2],
			ct[2],
			cb[0],
			ct[0],
			ct[2],
			cb[1],
			cb[2],
			ct[2],
			ct[1],
			cb[1],
			cb[0],
			cb[1],
			ct[1],
			ct[0],
			cb[0],
			ct[1],
		];
	}
	giveCoords() {
		let coords = this.topTriang.giveCoords();
		coords = coords.concat(this.bottomTriang.giveCoords(true));
		coords = coords.concat(this.sideTriangles);
		return coords.flat();
	}
	divide(n) {
		this.topTriang.divide(n);
		this.bottomTriang.divide(n);
		this.sideTriangles = [];
		let h = 1 / 2 ** n;
		for (let i = 0; i < 2 ** n; i++) {
			const left = i * h;
			const right = (i + 1) * h;
			const t1 = [
				[left, 0.0, 1.0],
				[left, 0.0, 0.0],
				[right, 0.0, 1.0],
			];
			const t2 = [
				[left, 0.0, 0.0],
				[right, 0.0, 0.0],
				[right, 0.0, 1.0],
			];

			const t3 = [
				[0.0, left, 1.0],
				[0.0, right, 1.0],
				[0.0, left, 0.0],
			];
			const t4 = [
				[0.0, left, 0.0],
				[0.0, right, 1.0],
				[0.0, right, 0.0],
			];

			const t5 = [
				[left, 1 - left, 1.0],
				[right, 1 - right, 0.0],
				[left, 1 - left, 0.0],
			];
			const t6 = [
				[left, 1 - left, 1.0],
				[right, 1 - right, 1.0],
				[right, 1 - right, 0.0],
			];
			this.sideTriangles = this.sideTriangles.concat(t1);
			this.sideTriangles = this.sideTriangles.concat(t2);
			this.sideTriangles = this.sideTriangles.concat(t3);
			this.sideTriangles = this.sideTriangles.concat(t4);
			this.sideTriangles = this.sideTriangles.concat(t5);
			this.sideTriangles = this.sideTriangles.concat(t6);
		}
	}
}
class Tet {
	constructor() {
		this.topTriang = new Triangle([
			[0.0, 0.0, 1.0],
			[1.0, 0.0, 0.0],
			[0.0, 1.0, 0.0],
		]);
		this.bottomTriang = new Triangle([
			[0.0, 0.0, 0.0],
			[1.0, 0.0, 0.0],
			[0.0, 1.0, 0.0],
		]);

		this.leftTriang = new Triangle([
			[0.0, 0.0, 0.0],
			[0.0, 0.0, 1.0],
			[0.0, 1.0, 0.0],
		]);
		this.rightTriang = new Triangle([
			[0.0, 0.0, 0.0],
			[1.0, 0.0, 0.0],
			[0.0, 0.0, 1],
		]);
	}
	giveCoords() {
		let coords = this.topTriang.giveCoords();
		coords = coords.concat(this.bottomTriang.giveCoords(true));
		coords = coords.concat(this.leftTriang.giveCoords());
		coords = coords.concat(this.rightTriang.giveCoords());
		return coords.flat();
	}
	divide(n) {
		this.topTriang.divide(n);
		this.bottomTriang.divide(n);
		this.leftTriang.divide(n);
		this.rightTriang.divide(n);
	}
}

export { Triangle, Tet, Prism };
