import {
	PlaneGeometry,
	CylinderGeometry,
	BoxGeometry,
	BufferGeometry,
	BufferAttribute,
} from "./build/three.module.js";
import { Quadrilateral } from "./Elements.js";
import { Quadrant3D } from "./Octree.js";
import { dot, squared_distance, subst } from "./math.js";
import { Triangle } from "./TriangularBasedGeometries.js";
class Region {
	constructor() {
		this.nodes = [];
	}
	setNodesOfRegion(nodes, tol = 1 * 10 ** -6) {
		this.nodes = [];
		for (let i = 0; i < nodes.length; i++) {
			const p = nodes[i];
			if (this.isBetween(p, tol)) {
				this.nodes.push({ _xcenter: p, index: i });
			}
		}
	}
}

function extrudeTriangularPlane(p1, p2, p3, h) {
	const t = new Triangle([p1, p2, p3]);
	const coordinates = t.extrude(h).flat();
	const vertices = new Float32Array(coordinates);
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(vertices, 3));
	geometry.computeVertexNormals();
	return geometry;
}

function extrudeRectangularPlane(p1, p2, p3, p4, h) {
	const t1 = new Triangle([p1, p2, p3]);
	const t2 = new Triangle([p3, p2, p4]);
	t2.normal = t1.normal;
	const c1 = t1.extrude(h).flat();
	const c2 = t2.extrude(h).flat();
	const coordinates = [...c1, ...c2];

	const vertices = new Float32Array(coordinates);
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(vertices, 3));
	geometry.computeVertexNormals();
	return geometry;
}

class LineRegion extends Region {
	constructor(p1, p2) {
		super();
		this.p1 = p1;
		this.p2 = p2;
		this.l = squared_distance(this.p1, this.p2) ** 0.5;
	}
	isBetween(p, tol) {
		let d1 = squared_distance(p, this.p1) ** 0.5;
		let d2 = squared_distance(p, this.p2) ** 0.5;
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
				this.p1[2] * norm + (size / 20) * norm,
			]);
			points.push([
				this.p2[0] * norm,
				this.p2[1] * norm,
				this.p2[2] * norm + (size / 20) * norm,
			]);
			let geo = new extrudeRectangularPlane(
				points[0],
				points[1],
				points[2],
				points[3],
				0.005
			);

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
