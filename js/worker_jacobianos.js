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

onmessage = function (msg) {
	const workerResult = [];
	for (const dat of msg.data) {
		const e = new types[dat.type](dat.coords, dat.gdls);
		e.Z = dat.Z;
		e.W = dat.W;
		workerResult.push(e.sJ);
	}
	postMessage(workerResult);
};
