import { Lineal } from "./Elements.js";
import * as THREE from "./build/three.module.js";

class Path {
	constructor(coords) {
		this.coords = coords;
		this._coords = [...coords];
	}
	give_points_bwline(c0, c1, n) {
		const r = [];
		for (let i = 1; i < n; i++) {
			let s = i / n;
			let px = c0[0] + s * (c1[0] - c0[0]);
			let py = c0[1] + s * (c1[1] - c0[1]);
			let pz = c0[2] + s * (c1[2] - c0[2]);
			let p = [px, py, pz];
			r.push(p);
		}
		return r;
	}
	generate_points(n) {
		this._coords = [];
		for (let i = 0; i < this.coords.length - 1; i++) {
			const c0 = this.coords[i];
			const c1 = this.coords[i + 1];
			this._coords.push(c0);
			this._coords.push(...this.give_points_bwline(c0, c1, n));
			if (i == this.coords.length - 2) {
				this._coords.push(c1);
			}
		}
	}
}
export { Path };
