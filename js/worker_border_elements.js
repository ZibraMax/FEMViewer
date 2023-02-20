import { Geometree, Quadrant3D } from "./Octree.js";

function detectBorderElements(elements, Octree, min_search_radius) {
	const e = Octree.query_first_point_set()[0];
	let [res, vecinos] = _detectBorderElementsIterative(
		elements,
		Octree,
		min_search_radius,
		e
	);
	console.log("Se encontraron " + res.length + " elementos de borde");
	let be = [];
	for (const b of res) {
		be.push(b["id"]);
	}
	return be;
}

function testNeighborg(elements, ide1, ide2) {
	const e1 = elements[ide1];
	const e2 = elements[ide2];
	let MIN_VERTICES = 3;
	let en_comun = 0;
	for (const c1 of e1.coords) {
		for (const c2 of e2.coords) {
			if (c2 == c1) {
				en_comun += 1;
				if (en_comun >= MIN_VERTICES) {
					return true;
				}
				break;
			}
		}
	}
	return false;
}

function _isBorder(elements, OctTree, min_search_radius, e) {
	let nfaces = elements[e["id"]].nfaces;
	let neighbors = 0;
	let potential = OctTree.query_range_point_radius(
		e["_xcenter"],
		min_search_radius
	);
	let nb = [];
	for (const ie2 of potential) {
		if (e["id"] != ie2["id"]) {
			if (testNeighborg(elements, e["id"], ie2["id"])) {
				neighbors += 1;
				nb.push(ie2);
				if (neighbors == nfaces) {
					break;
				}
			}
		}
	}
	if (neighbors < nfaces) {
		return [true, nb];
	}
	return [false, potential];
}

function _detectBorderElementsIterative(
	elements,
	Octree,
	min_search_radius,
	e
) {
	const visited = new Array(elements.length).fill(false);
	let i = 0;
	let le = [e];
	let vecinos = [];
	visited[e["id"]] = true;
	let [isBorder, neighbors] = _isBorder(
		elements,
		Octree,
		min_search_radius,
		e
	);
	vecinos.push(neighbors);
	while (i < le.length) {
		let ele_index = le[i]["id"];
		e = { _xcenter: elements[ele_index]._xcenter, id: ele_index };
		neighbors = vecinos[i];
		for (const nb of neighbors) {
			if (!visited[nb["id"]]) {
				visited[nb["id"]] = true;
				let [ib, nbn] = _isBorder(
					elements,
					Octree,
					min_search_radius,
					nb
				);
				if (ib) {
					le.push(nb);
					vecinos.push(nbn);
				}
			}
		}
		i += 1;
		postMessage(["MSG", "Found " + le.length + " border elements. ⌛"]);
	}
	return [le, vecinos];
}

function parse_trees(Octree) {
	for (let i = 0; i < Octree.children.length; i++) {
		Octree.children[i].boundary = new Quadrant3D(
			[
				Octree.children[i].boundary.x,
				Octree.children[i].boundary.y,
				Octree.children[i].boundary.z,
			],
			[
				Octree.children[i].boundary.w,
				Octree.children[i].boundary.h,
				Octree.children[i].boundary.d,
			]
		);
		Octree.children[i] = Object.assign(new Geometree(), Octree.children[i]);
		parse_trees(Octree.children[i]);
	}
}

onmessage = function (msg) {
	const elements = msg.data[0];
	const bdr = msg.data[1].boundary;
	msg.data[1].boundary = new Quadrant3D(
		[bdr.x, bdr.y, bdr.z],
		[bdr.w, bdr.h, bdr.d]
	);
	const Octree = Object.assign(new Geometree(), msg.data[1]);
	parse_trees(Octree);
	const min_search_radius = msg.data[2];
	const workerResult = detectBorderElements(
		elements,
		Octree,
		min_search_radius
	);
	postMessage(workerResult);
};
