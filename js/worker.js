import {
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
	Element3D,
} from "./build/Elements.js";

function sJ(e) {
	if (e.scaledJacobian) {
		return e.scaledJacobian;
	}
	let max_j = -Infinity;
	let min_j = Infinity;
	for (const z of this.Z) {
		const [J, dpz] = e.J(z);
		const j = math.det(J);
		max_j = Math.max(max_j, j);
		min_j = Math.min(min_j, j);
	}
	e.scaledJacobian = min_j / Math.abs(max_j);
	return min_j / Math.abs(max_j);
}
onmessage = function (msg) {
	const workerResult = [];
	for (const dat of msg.data) {
		const e = new Element3D(dat.coords, dat.gdls);
		e.Z = dat.Z;
		e.W = dat.W;
		workerResult.push(e.sJ);
	}
	postMessage(workerResult);
};
