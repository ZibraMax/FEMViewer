const GENERAL = {
	calculateStrain: false,
	displacements: false,
	props: [],
};
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
	props: [],
};
const PlaneStressSparse = {
	calculateStrain: true,
	displacements: true,
	dict: {
		εx: 0,
		εy: 1,
		εxy: 2,
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
	Heat2D: Heat2D,
	Torsion2D: Torsion2D,
	NonLinealSimpleEquation: GENERAL,
	PlaneStrainSparse: PlaneStressSparse,
	PlaneStressOrthotropic: PlaneStressSparse,
	PlaneStress: PlaneStressSparse,
	Elasticity: Elasticity,
	ElasticityFromTensor: Elasticity,
	PlaneStrain: PlaneStressSparse,
	PlaneStressNonLocalSparse: PlaneStressSparse,
	PlaneStressSparse: PlaneStressSparse,
	NonLocalElasticityFromTensor: Elasticity,
};
export { CONFIG_DICT };
