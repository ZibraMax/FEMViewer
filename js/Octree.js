import { EdgesGeometry, BoxGeometry } from "./build/three.module.js";

class Quadrant3D {
	constructor(p, dim) {
		let [x, y, z] = p;
		let [w, h, d] = dim;
		[this.x, this.y, this.z] = [x, y, z];
		[this.w, this.h, this.d] = [w, h, d];
		this.coords = [
			[x - w, y - h, z - d],
			[x + w, y - h, z - d],
			[x + w, y + h, z - d],
			[x - w, y + h, z - d],
			[x - w, y - h, z + d],
			[x + w, y - h, z + d],
			[x + w, y + h, z + d],
			[x - w, y + h, z + d],
		];
		this.coordsT = this.coords[0].map((_, colIndex) =>
			this.coords.map((row) => row[colIndex])
		);
		this.maximos_this = [];
		this.minimos_this = [];
		for (let i = 0; i < 3; i++) {
			this.maximos_this.push(Math.max(...this.coordsT[i]));
			this.minimos_this.push(Math.min(...this.coordsT[i]));
		}
		this._xcenter = [x, y, z];
	}
	contains(e) {
		let x = e["_xcenter"];

		for (let i = 0; i < 3; i++) {
			if (this.maximos_this[i] - x[i] < 0) return false;
			if (x[i] - this.minimos_this[i] < 0) return false;
		}

		return true;
	}

	giveBox(norm) {
		let geo = new BoxGeometry(
			2 * this.w * norm,
			2 * this.h * norm,
			2 * this.d * norm
		);
		for (let i = 0; i < geo.attributes.position.count; i++) {
			const x = geo.attributes.position.getX(i);
			const y = geo.attributes.position.getY(i);
			const z = geo.attributes.position.getZ(i);

			geo.attributes.position.setX(i, x + this.x * norm);
			geo.attributes.position.setY(i, y + this.y * norm);
			geo.attributes.position.setZ(i, z + this.z * norm);
		}
		return geo;
	}

	boxes_disjoint(e) {
		let [maxx1, maxy1, maxz1] = this.maximos_this;
		let [minx1, miny1, minz1] = this.minimos_this;

		let [maxx2, maxy2, maxz2] = e.maximos_this;
		let [minx2, miny2, minz2] = e.minimos_this;

		return (
			maxx2 <= minx1 ||
			maxx1 <= minx2 ||
			maxy2 <= miny1 ||
			maxy1 <= miny2 ||
			maxz2 <= minz1 ||
			maxz1 <= minz2
		);
	}
	intesects_quadrant(e) {
		return !this.boxes_disjoint(e);
	}
	subdivide() {
		let divs = [];
		let nw = this.w / 2;
		let nh = this.h / 2;
		let nd = this.d / 2;
		let [x, y, z] = [this.x, this.y, this.z];

		divs.push(new Quadrant3D([x + nw, y + nh, z + nd], [nw, nh, nd]));
		divs.push(new Quadrant3D([x + nw, y + nh, z - nd], [nw, nh, nd]));
		divs.push(new Quadrant3D([x + nw, y - nh, z + nd], [nw, nh, nd]));
		divs.push(new Quadrant3D([x + nw, y - nh, z - nd], [nw, nh, nd]));
		divs.push(new Quadrant3D([x - nw, y + nh, z + nd], [nw, nh, nd]));
		divs.push(new Quadrant3D([x - nw, y + nh, z - nd], [nw, nh, nd]));
		divs.push(new Quadrant3D([x - nw, y - nh, z + nd], [nw, nh, nd]));
		divs.push(new Quadrant3D([x - nw, y - nh, z - nd], [nw, nh, nd]));
		return divs;
	}
}
class Quadrant3DSpherical extends Quadrant3D {
	constructor(p, r) {
		let dim = [r, r, r];
		super(p, dim);
		this.r = r;
	}
	contains(e) {
		let s = 0;
		s += (this._xcenter[0] - e["_xcenter"][0]) ** 2;
		s += (this._xcenter[1] - e["_xcenter"][1]) ** 2;
		s += (this._xcenter[2] - e["_xcenter"][2]) ** 2;

		return s <= this.r ** 2;
	}
}
class Geometree {
	constructor(boundary, n = 1, depth = 1) {
		this.boundary = boundary;
		this.points = [];
		this.n = n;
		this.divided = false;
		this.children = [];
		this.depth = depth;
	}

	giveContours(norm) {
		let res = [];
		let geo = this.boundary.giveBox(norm);
		let edges = new EdgesGeometry(geo);
		edges.computeVertexNormals();
		res.push(edges);
		for (const ch of this.children) {
			res = res.concat(ch.giveContours(norm));
		}
		return res;
	}

	contains(p) {
		return this.boundary.contains(p);
	}
	subdivide() {
		this.divided = true;
		this.children = [];
		let divs = this.boundary.subdivide();
		for (const d of divs) {
			this.children.push(new Geometree(d, this.n, this.depth + 1));
		}
	}
	add_point(p) {
		//dist = p.coords-p._xcenter
		//min_search_size = max(np.sum(dist**2, axis=1)**0.5)
		//this.min_search_size = max(min_search_size, this.min_search_size)
		if (!this.contains(p)) {
			return false;
		}
		if (this.points.length < this.n && !this.divided) {
			this.points.push(p);
			return true;
		}
		if (!this.divided) {
			this.subdivide();
			const puntos = this.points.slice().reverse();
			for (const p2 of puntos) {
				for (const sq of this.children) {
					if (sq.add_point(p2)) {
						this.points.pop();
						break;
					}
				}
			}
		}
		for (const sq of this.children) {
			if (sq.add_point(p)) {
				return true;
			}
		}
		console.error("This should never happen");
	}
	query_range(quadrant) {
		let result = [];
		if (!this.boundary.intesects_quadrant(quadrant)) {
			return result;
		}
		for (const p of this.points) {
			if (quadrant.contains(p)) {
				result.push(p);
			}
		}
		if (!this.divided) {
			return result;
		}
		for (const sq of this.children) {
			result = result.concat(sq.query_range(quadrant));
		}
		return result;
	}
	query_range_point_radius(p, r) {
		if (r == undefined) {
			r = 2 * this.min_search_size;
		}
		let q = new Quadrant3DSpherical(p, r);
		let selected = this.query_range(q);
		return selected;
	}
	query_first_point_set() {
		if (this.divided) {
			for (const ch of this.children) {
				if (ch.children.length > 0 || ch.points.length > 0) {
					return ch.query_first_point_set();
				}
			}
		} else {
			return this.points;
		}
		console.error("This should not happen");
	}
	query_ray(ray, d) {
		console.error("Not implemented");
	}
}

export { Quadrant3D, Geometree };
