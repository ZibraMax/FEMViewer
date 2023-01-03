class Triangle {
	constructor(coords) {
		this.coords = coords || [
			[0.0, 0.0, 0.5],
			[1.0, 0.0, 0.5],
			[0.0, 1.0, 0.5],
		];
		this.divided = false;
		this.children = [];
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
			[0.0, 0.0, 0.0],
			[1.0, 0.0, 0.0],
			[0.0, 1.0, 0.0],
		]);
		let ct = this.topTriang.coords;
		this.bottomTriang = new Triangle([
			[0.0, 0.0, 1.0],
			[1.0, 0.0, 1.0],
			[0.0, 1.0, 1.0],
		]);
		let cb = this.bottomTriang.coords;
		this.sideTriangles = [
			cb[0],
			cb[2],
			ct[2],
			cb[0],
			ct[2],
			ct[0],
			cb[1],
			ct[2],
			cb[2],
			ct[1],
			ct[2],
			cb[1],
			cb[1],
			cb[0],
			ct[1],
			cb[0],
			ct[0],
			ct[1],
		];
	}
	giveCoords() {
		let coords = this.topTriang.giveCoords(true);
		coords = coords.concat(this.bottomTriang.giveCoords());
		coords = coords.concat(this.sideTriangles);
		return coords.flat();
	}
	divide(n) {
		this.topTriang.divide(n);
		this.bottomTriang.divide(n);
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
