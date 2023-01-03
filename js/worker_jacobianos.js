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
} from "./Elements.js";
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
	let i = 0;
	let n = msg.data.length;
	let times = 0;
	for (const dat of msg.data) {
		i = i + 1;
		const e = new types[dat.type](dat.coords, dat.gdls, dat.tama);
		workerResult.push(e.sJ);
		let percentage = (i / n) * 100;
		if (percentage > times) {
			times += 1;
			postMessage(["MSG", percentage]);
		}
	}
	postMessage(workerResult);
};
