const GENERAL = {
	calculateStrain: false,
	displacements: false,
	props: [],
};

function fun_es(props) {
	return [
		[1, 0, 0, 0, 0, 0],
		[0, 1, 0, 0, 0, 0],
		[0, 0, 1, 0, 0, 0],
		[0, 0, 0, 1, 0, 0],
		[0, 0, 0, 0, 1, 0],
		[0, 0, 0, 0, 0, 1],
	];
}

const Elasticity = {
	calculateStrain: true,
	displacements: true,
	dict: {
		εx: 0,
		εy: 1,
		εz: 2,
		εxy: 3,
		εxz: 4,
		εyz: 5,
	},
	C: fun_es,
	props: [],
};

function fun_ps(props) {
	let E1 = props["E1"];
	let E2 = props["E2"];
	let v12 = props["v12"];
	let G12 = props["G12"];
	let v21 = (v12 * E2) / E1;
	let c11 = E1 / (1 - v12 * v21);
	let c12 = c11 * v21;
	let c22 = E2 / (1 - v12 * v21);
	let c66 = G12;
	return [
		[c11, c12, 0],
		[c12, c22, 0],
		[0, 0, c66],
	];
}
function fun_pstr(props) {
	let E1 = props["E1"];
	let v12 = props["v12"];
	let c11 = (E1 * (1 - v12)) / (1 + v12) / (1 - 2 * v12);
	let c12 = (E1 * v12) / (1 + v12) / (1 - 2 * v12);
	let c22 = c11;
	let c66 = E1 / (2 * (1 + v12));
	return [
		[c11, c12, 0],
		[c12, c22, 0],
		[0, 0, c66],
	];
}
const PlaneStressSparse = {
	calculateStrain: true,
	displacements: true,
	C: fun_ps,
	dict: {
		εx: 0,
		εy: 1,
		εxy: 2,
		σx: 3,
		σy: 4,
		σxy: 5,
		σ1: 6,
		σ2: 7,
		σ3: 8,
	},
	props: ["E1", "E2", "G12", "v12", "t", "rho"],
};
const PlaneStrainSparse = {
	calculateStrain: true,
	displacements: true,
	C: fun_pstr,
	dict: {
		εx: 0,
		εy: 1,
		εxy: 2,
		σx: 3,
		σy: 4,
		σxy: 5,
		σ1: 6,
		σ2: 7,
		σ3: 8,
	},
	props: ["E1", "E2", "G12", "v12", "t", "rho"],
};

const Torsion2D = {
	calculateStrain: false,
	displacements: false,
	dict: {
		"dΨ/dx": [0, 0],
		"dΨ/dy": [0, 1],
	},
	props: ["_phi", "G"],
};

const Heat1D = {
	calculateStrain: false,
	displacements: false,
	dict: {
		"dT/dx": [0, 0],
	},
	props: ["A", "P", "ku", "beta", "Ta", "q"],
};
const Heat1DTransient = {
	calculateStrain: false,
	displacements: false,
	dict: {
		"dT/dx": [0, 0],
	},
	props: ["A", "P", "ku", "beta", "Ta", "q"],
};

const Heat2D = {
	calculateStrain: false,
	displacements: false,
	dict: {
		"dT/dx": [0, 0],
		"dT/dy": [0, 1],
	},
	props: ["kx", "ky"],
};

const CONFIG_DICT = {
	GENERAL: GENERAL,
	EDO1D: GENERAL,
	EulerBernoulliBeam: GENERAL,
	EulerBernoulliBeamNonLineal: GENERAL,
	Heat1D: Heat1D,
	Heat1DTransient: Heat1DTransient,
	Heat2D: Heat2D,
	Torsion2D: Torsion2D,
	NonLinealSimpleEquation: GENERAL,
	PlaneStrainSparse: PlaneStrainSparse,
	PlaneStressOrthotropic: PlaneStrainSparse,
	PlaneStress: PlaneStressSparse,
	Elasticity: Elasticity,
	ElasticityFromTensor: Elasticity,
	PlaneStrain: PlaneStrainSparse,
	PlaneStressNonLocalSparse: PlaneStressSparse,
	PlaneStressSparse: PlaneStressSparse,
	NonLocalElasticityFromTensor: Elasticity,
};
export { CONFIG_DICT };
