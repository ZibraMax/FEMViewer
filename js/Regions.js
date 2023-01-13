import {
	PlaneGeometry,
	CylinderGeometry,
	BoxGeometry,
	BufferGeometry,
	BufferAttribute,
} from "./build/three.module.js";
import { mergeBufferGeometries } from "./build/BufferGeometryUtils.js";
import { Quadrilateral } from "./Elements.js";
import { Quadrant3D } from "./Octree.js";
import {
	dot,
	squared_distance,
	subst,
	multiplyScalar,
	cross,
	normVector,
	multiply,
	transpose,
	max,
	min,
} from "./math.js";
import { Triangle } from "./TriangularBasedGeometries.js";
class Region {
	constructor(coordinates) {
		this.nodes = [];
		this.selected = false;
		this.coordinates = coordinates;
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
	setNodesOfRegionOctree(octree, tol = 1 * 10 ** -6) {
		let coordinates = transpose(this.coordinates);
		let sizex = max(coordinates[0]) - min(coordinates[0]);
		let sizey = max(coordinates[1]) - min(coordinates[1]);
		let sizez = max(coordinates[2]) - min(coordinates[2]);

		sizex = Math.max(sizex, tol);
		sizey = Math.max(sizey, tol);
		sizez = Math.max(sizez, tol);

		let centerx = (max(coordinates[0]) + min(coordinates[0])) / 2;
		let centery = (max(coordinates[1]) + min(coordinates[1])) / 2;
		let centerz = (max(coordinates[2]) + min(coordinates[2])) / 2;

		let bounding = new Quadrant3D(
			[centerx, centery, centerz],
			[sizex / 2, sizey / 2, sizez / 2]
		);
		let nodes = octree.query_range(bounding);
		this.nodes = [];
		for (let i = 0; i < nodes.length; i++) {
			const p = nodes[i]["_xcenter"];
			if (this.isBetween(p, tol)) {
				this.nodes.push({ _xcenter: p, index: nodes[i]["id"] });
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
	const t2 = new Triangle([p3, p4, p2].reverse());
	const c1 = t1.extrude(h, true).flat();
	const c2 = t2.extrude(h, true).flat();
	const coordinates = [...c1, ...c2];

	const vertices = new Float32Array(coordinates);
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(vertices, 3));
	geometry.computeVertexNormals();
	return geometry;
}

class LineRegion extends Region {
	constructor(p1, p2) {
		super([p1, p2]);
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
	giveGeometry(norm, size, ndim, radius) {
		let rt = radius / 2;
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
			let geo = extrudeRectangularPlane(
				points[0],
				points[1],
				points[2],
				points[3],
				radius
			);

			return geo;
		}
	}
}

class Region2D extends Region {
	constructor(coordinates) {
		super(coordinates);
	}
	createProjections() {
		this.coords = [];
		for (const c of this._coords) {
			this.coords.push(
				transpose(multiply(this.transfMatrix, transpose([c])))[0]
			);
		}
	}
	pointInPlolygon(p) {
		let vs = this.coords;
		var x = p[0],
			y = p[1];

		var inside = false;
		for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
			var xi = vs[i][0],
				yi = vs[i][1];
			var xj = vs[j][0],
				yj = vs[j][1];

			var intersect =
				yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
			if (intersect) inside = !inside;
		}

		return inside;
	}
	setNodesOfRegion(nodes, tol = 1 * 10 ** -6) {
		this.nodes = [];
		for (let i = 0; i < nodes.length; i++) {
			const p = nodes[i];
			if (this.isInPlane(p, tol)) {
				if (this.isBetween(p, tol)) {
					this.nodes.push({ _xcenter: p, index: i });
				}
			}
		}
	}
}

class TriangularPlaneRegion extends Region2D {
	constructor(p1, p2, p3) {
		super([p1, p2, p3]);
		this.p1 = p1;
		this.p2 = p2;
		this.p3 = p3;
		this.l1 = new LineRegion(p1, p2);
		this.l2 = new LineRegion(p2, p3);
		this.l3 = new LineRegion(p3, p1);
		this.u1 = subst(p3, p1);
		this.v2 = subst(p2, p1);
		this.norm = cross(this.u1, this.v2);
		this.p0 = this.p1;
		let proju1v2 = multiplyScalar(
			this.u1,
			dot(this.u1, this.v2) / dot(this.u1, this.u1)
		);
		this.u2 = subst(this.v2, proju1v2);

		//Normalizar u1,
		this.u1 = normVector(this.u1);
		this.u2 = normVector(this.u2);
		this.transfMatrix = [this.u1, this.u2];
		this._coords = [p1, p2, p3];
		this.createProjections();
	}
	isInPlane(p, tol) {
		let pmp0 = subst(p, this.p0);
		let delta = Math.abs(dot(this.norm, pmp0));
		if (delta <= tol) {
			return true;
		}
		return false;
	}
	isBetween(p, tol) {
		let p2 = multiply(this.transfMatrix, transpose([p]));
		let r = this.pointInPlolygon(p2);
		return (
			r ||
			this.l1.isBetween(p, tol) ||
			this.l2.isBetween(p, tol) ||
			this.l3.isBetween(p, tol)
		);
	}
	giveGeometry(norm, size, ndim, radius) {
		let geo1 = extrudeTriangularPlane(
			multiplyScalar(this.p1, norm),
			multiplyScalar(this.p2, norm),
			multiplyScalar(this.p3, norm),
			radius
		);
		if (ndim == 2 || ndim == 1) {
			let p1 = [...this.p1];
			let p2 = [...this.p2];
			let p3 = [...this.p3];

			p1[2] += size / 20;
			p2[2] += size / 20;
			p3[2] += size / 20;

			let geo2 = extrudeTriangularPlane(
				multiplyScalar(p1, norm),
				multiplyScalar(p2, norm),
				multiplyScalar(p3, norm),
				radius
			);
			return mergeBufferGeometries([geo1, geo2]);
		}
		return geo1;
	}
}
class RectangularPlaneRegion extends Region2D {
	constructor(p1, p2, p3, p4) {
		super([p1, p2, p3, p4]);
		this.p1 = p1;
		this.p2 = p2;
		this.p3 = p3;
		this.p4 = p4;
		this.plane1 = new TriangularPlaneRegion(p1, p2, p3);
		this.plane2 = new TriangularPlaneRegion(p1, p3, p4);
	}
	isBetween(p, tol) {
		return this.plane1.isBetween(p, tol) || this.plane2.isBetween(p, tol);
	}
	isInPlane(p, tol) {
		return this.plane1.isInPlane(p, tol) || this.plane2.isInPlane(p, tol);
	}
	giveGeometry(norm, size, ndim, radius) {
		let geo1 = extrudeRectangularPlane(
			multiplyScalar(this.p1, norm),
			multiplyScalar(this.p2, norm),
			multiplyScalar(this.p4, norm),
			multiplyScalar(this.p3, norm),
			radius
		);
		if (ndim == 2 || ndim == 1) {
			let p1 = [...this.p1];
			let p2 = [...this.p2];
			let p3 = [...this.p3];
			let p4 = [...this.p4];

			p1[2] += size / 20;
			p2[2] += size / 20;
			p3[2] += size / 20;
			p4[2] += size / 20;

			let geo2 = extrudeRectangularPlane(
				multiplyScalar(p1, norm),
				multiplyScalar(p2, norm),
				multiplyScalar(p4, norm),
				multiplyScalar(p3, norm),
				radius
			);
			return mergeBufferGeometries([geo1, geo2]);
		}
		return geo1;
	}
}

export { LineRegion, TriangularPlaneRegion, RectangularPlaneRegion };
