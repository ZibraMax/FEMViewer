function vecMake(n, val) {
	let result = [];
	for (let i = 0; i < n; ++i) {
		result[i] = val;
	}
	return result;
}

function matMake(rows, cols, val) {
	let result = [];
	for (let i = 0; i < rows; ++i) {
		result[i] = [];
		for (let j = 0; j < cols; ++j) {
			result[i][j] = val;
		}
	}
	return result;
}

function matInverse(m) {
	let n = m.length;
	let result = matMake(n, n, 0.0); // make a copy
	for (let i = 0; i < n; ++i) {
		for (let j = 0; j < n; ++j) {
			result[i][j] = m[i][j];
		}
	}

	let lum = matMake(n, n, 0.0); // combined lower & upper
	let perm = vecMake(n, 0.0); // out parameter
	matDecompose(m, lum, perm); // ignore return

	let b = vecMake(n, 0.0);
	for (let i = 0; i < n; ++i) {
		for (let j = 0; j < n; ++j) {
			if (i == perm[j]) b[j] = 1.0;
			else b[j] = 0.0;
		}

		let x = reduce(lum, b); //
		for (let j = 0; j < n; ++j) result[j][i] = x[j];
	}
	return result;
}

function matDecompose(m, lum, perm) {
	let toggle = +1; // even (+1) or odd (-1) row permutatuions
	let n = m.length;
	for (let i = 0; i < n; ++i) {
		for (let j = 0; j < n; ++j) {
			lum[i][j] = m[i][j];
		}
	}

	for (let i = 0; i < n; ++i) perm[i] = i;

	for (let j = 0; j < n - 1; ++j) {
		// note n-1
		let max = Math.abs(lum[j][j]);
		let piv = j;

		for (let i = j + 1; i < n; ++i) {
			// pivot index
			let xij = Math.abs(lum[i][j]);
			if (xij > max) {
				max = xij;
				piv = i;
			}
		} // i

		if (piv != j) {
			let tmp = lum[piv]; // swap rows j, piv
			lum[piv] = lum[j];
			lum[j] = tmp;

			let t = perm[piv]; // swap perm elements
			perm[piv] = perm[j];
			perm[j] = t;

			toggle = -toggle;
		}

		let xjj = lum[j][j];
		if (xjj != 0.0) {
			// TODO: fix bad compare here
			for (let i = j + 1; i < n; ++i) {
				let xij = lum[i][j] / xjj;
				lum[i][j] = xij;
				for (let k = j + 1; k < n; ++k) {
					lum[i][k] -= xij * lum[j][k];
				}
			}
		}
	} // j

	return toggle; // for determinant
} // matDecompose

function reduce(lum, b) {
	// helper
	let n = lum.length;
	let x = vecMake(n, 0.0);
	for (let i = 0; i < n; ++i) {
		x[i] = b[i];
	}

	for (let i = 1; i < n; ++i) {
		let sum = x[i];
		for (let j = 0; j < i; ++j) {
			sum -= lum[i][j] * x[j];
		}
		x[i] = sum;
	}

	x[n - 1] /= lum[n - 1][n - 1];
	for (let i = n - 2; i >= 0; --i) {
		let sum = x[i];
		for (let j = i + 1; j < n; ++j) {
			sum -= lum[i][j] * x[j];
		}
		x[i] = sum / lum[i][i];
	}

	return x;
} // reduce

function add(a, b) {
	if (a instanceof Array && b instanceof Array) {
		var m = new Array(a.length);
		for (let i = 0; i < a.length; i++) {
			m[i] = a[i] + b[i];
		}
		return m;
	}
}
function subst(a, b) {
	if (a instanceof Array && b instanceof Array) {
		var m = new Array(a.length);
		for (let i = 0; i < a.length; i++) {
			m[i] = a[i] - b[i];
		}
		return m;
	}
}

function abs(arr) {
	return arr.map((x) => {
		return Math.abs(x);
	});
}

function max(arr) {
	let maximo = arr[0];
	for (let i = 1; i < arr.length; i++) {
		if (arr[i] > maximo) {
			maximo = arr[i];
		}
	}
	return maximo;
}

function min(arr) {
	let maximo = arr[0];
	for (let i = 1; i < arr.length; i++) {
		if (arr[i] < maximo) {
			maximo = arr[i];
		}
	}
	return maximo;
}

function transpose(arr) {
	return arr[0].map((_, colIndex) => arr.map((row) => row[colIndex]));
}
function createVector(arr) {
	return transpose([[...arr]]);
}
function multiply(a, b) {
	var aNumRows = a.length,
		aNumCols = a[0].length,
		bNumRows = b.length,
		bNumCols = b[0].length,
		m = new Array(aNumRows); // initialize array of rows
	for (var r = 0; r < aNumRows; ++r) {
		m[r] = new Array(bNumCols); // initialize the current row
		for (var c = 0; c < bNumCols; ++c) {
			m[r][c] = 0; // initialize the current cell
			for (var i = 0; i < aNumCols; ++i) {
				m[r][c] += a[r][i] * b[i][c];
			}
		}
	}
	return m;
}

function multiplyScalar(a, escalar) {
	var aNumRows = a.length;
	var m = new Array(aNumRows);
	let ndim = 2;
	if (a[0].length == undefined) {
		ndim = 1;
	}
	if (ndim == 2) {
		var aNumCols = a[0].length;
		for (var r = 0; r < aNumRows; ++r) {
			m[r] = new Array(aNumCols);
			for (var c = 0; c < aNumCols; ++c) {
				m[r][c] = a[r][c] * escalar;
			}
		}
	} else if (ndim == 1) {
		for (var r = 0; r < aNumRows; ++r) {
			m[r] = a[r] * escalar;
		}
	}
	return m;
}

const det = (m) =>
	m.length == 1
		? m[0][0]
		: m.length == 2
		? m[0][0] * m[1][1] - m[0][1] * m[1][0]
		: m[0].reduce(
				(r, e, i) =>
					r +
					(-1) ** (i + 2) *
						e *
						det(m.slice(1).map((c) => c.filter((_, j) => i != j))),
				0
		  );

function sum(arr) {
	return arr.reduce((partialSum, a) => partialSum + a, 0);
}

function dot(a, b) {
	let r = 0;
	for (let i = 0; i < a.length; i++) {
		r += a[i] * b[i];
	}
	return r;
}

function point_to_ray_distance(s, v, p) {
	let pms = add(p, multiplyScalar(s, -1));
	return dot(pms, pms) + (dot(p, v) - dot(s, v)) ** 2;
}

function squared_distance(p1, p2) {
	let s = 0;
	for (let i = 0; i < p1.length; i++) {
		s += (p2[i] - p1[i]) ** 2;
	}
	return s;
}
function cross(p1, p2) {
	return [
		p1[1] * p2[2] - p1[2] * p2[1],
		p1[2] * p2[0] - p1[0] * p2[2],
		p1[0] * p2[1] - p1[1] * p2[0],
	];
}
function normVector(v) {
	let r = [];
	let mag = dot(v, v) ** 0.5;
	for (let i = 0; i < v.length; i++) {
		r.push(v[i] / mag);
	}
	return r;
}

export {
	squared_distance,
	sum,
	det,
	multiplyScalar,
	multiply,
	transpose,
	min,
	max,
	abs,
	add,
	reduce,
	matDecompose,
	matInverse,
	matMake,
	vecMake,
	dot,
	point_to_ray_distance,
	subst,
	cross,
	normVector,
	createVector,
};
