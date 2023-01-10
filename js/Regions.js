import { PlaneGeometry, CylinderGeometry } from "./build/three.module.js";
import { Quadrant3D } from "./Octree.js";
import { dot, squared_distance, subst } from "./math.js";
class Region {
	constructor() {
		this.nodes = [];
	}
	setNodesOfRegion(nodes, tol = 1 * 10 ** -6) {
		this.nodes = [];
		for (let i = 0; i < nodes.length; i++) {
			const p1 = nodes[i];
			if (this.isBetween(p, tol)) {
				this.nodes.push(p);
			}
		}
	}
}

class LineRegion extends Region {
	constructor(p1, p2) {
		super();
		this.p1 = p1;
		this.p2 = p2;
		this.l = squared_distance(this.p1, this.p2);
	}
	isBetween(p, tol) {
		let d1 = squared_distance(p, this.p1);
		let d2 = squared_distance(p, this.p2);
		let d = d1 + d2;
		let delta = Math.abs(d - this.l);
		if (delta <= tol) {
			return true;
		}
		return false;
	}
	giveGeometry(norm, size, ndim) {
		let rt = 0.005 / 2;
		if (ndim == 3) {
			let geo = new CylinderGeometry(rt, rt, 1, 10, 1);
			for (let i = 0; i < geo.attributes.position.count; i++) {
				const x = geo.attributes.position.getX(i);
				const y = geo.attributes.position.getY(i);
				const z = geo.attributes.position.getZ(i);

				if (y < 0) {
					geo.attributes.position.setX(i, x + this.p1[0] * norm);
					geo.attributes.position.setY(
						i,
						y + this.p1[1] * norm + 0.5
					);
					geo.attributes.position.setZ(i, z + this.p1[2] * norm);
				} else {
					geo.attributes.position.setX(i, x + this.p2[0] * norm);
					geo.attributes.position.setY(
						i,
						y + this.p2[1] * norm - 0.5
					);
					geo.attributes.position.setZ(i, z + this.p2[2] * norm);
				}
			}
			return geo;
		} else if (ndim == 2) {
			let geo = new PlaneGeometry(1, 1);
			let points = [];
			points.push([
				this.p1[0] * norm,
				this.p1[1] * norm,
				this.p1[2] * norm,
			]);
			points.push([
				this.p2[0] * norm,
				this.p2[1] * norm,
				this.p2[2] * norm,
			]);
			points.push([
				this.p1[0] * norm,
				this.p1[1] * norm,
				this.p1[2] * norm + size / 20,
			]);
			points.push([
				this.p2[0] * norm,
				this.p2[1] * norm,
				this.p2[2] * norm + size / 20,
			]);

			for (let i = 0; i < geo.attributes.position.count; i++) {
				geo.attributes.position.setX(i, points[i][0]);
				geo.attributes.position.setY(i, points[i][1]);
				geo.attributes.position.setZ(i, points[i][2]);
			}

			return geo;
		}
	}
}
class TriangularPlaneRegion extends Region {
	constructor(p1, p2, p3) {
		super();
		this.p1 = p1;
		this.p2 = p2;
		this.p3 = p3;
		this.norm = cross(subst(p3, p1), subst(p2, p1));
		this.p0 = this.p1;
	}
	isBetween(p, tol) {
		let pmp0 = subst(p, this.p0);
		let mag = dot(this.nodes, pmp0);
		let delta = dot(mag, mag);
		if (delta <= tol) {
			return true;
		}
		return false;
	}
	giveGeometry(norm) {
		return 0.0;
	}
}
class RectangularPlaneRegion extends Region {
	constructor(p1, p2, p3, p4) {
		super();
		this.plane1 = new TriangularPlaneRegion(p1, p2, p3);
		this.plane2 = new TriangularPlaneRegion(p1, p3, p4);
	}
	isBetween(p, tol) {
		return this.plane1.isBetween(p, tol) || this.plane2.isBetween(p, tol);
	}
	giveGeometry(norm) {
		return 0.0;
	}
}

export { LineRegion, TriangularPlaneRegion, RectangularPlaneRegion };
