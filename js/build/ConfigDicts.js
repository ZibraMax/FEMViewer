const GENERAL = {
	calculateStrain: false,
	displacements: false,
	props: [],
};
const Elasticity = {
	calculateStrain: true,
	displacements: true,
	dict: {
		"\\(\\varepsilon_x\\)": "0",
		"\\(\\varepsilon_y\\)": "1",
		"\\(\\varepsilon_z\\)": "2",
		"\\(\\varepsilon_{xy}\\)": "3",
		"\\(\\varepsilon_{xz}\\)": "4",
		"\\(\\varepsilon_{yz}\\)": "5",
	},
	props: [],
};
const PlaneStress = {
	calculateStrain: true,
	displacements: true,
	dict: {
		"\\(\\varepsilon_x\\)": "0",
		"\\(\\varepsilon_y\\)": "1",
		"\\(\\varepsilon_{xy}\\)": "2",
	},
	props: [],
};

const PlaneStressSparse = {
	calculateStrain: true,
	displacements: true,
	dict: {
		"\\(\\varepsilon_x\\)": "0",
		"\\(\\varepsilon_y\\)": "1",
		"\\(\\varepsilon_{xy}\\)": "2",
	},
	props: ["E1", "E2", "G12", "v12", "t", "rho"],
};

const PlaneStressNonLocalSparse = {
	calculateStrain: true,
	displacements: true,
	dict: {
		"\\(\\varepsilon_x\\)": "0",
		"\\(\\varepsilon_y\\)": "1",
		"\\(\\varepsilon_{xy}\\)": "2",
	},
	props: [],
};
const PlaneStrain = {
	calculateStrain: true,
	displacements: true,
	dict: {
		"\\(\\varepsilon_x\\)": "0",
		"\\(\\varepsilon_y\\)": "1",
		"\\(\\varepsilon_{xy}\\)": "2",
	},
	props: [],
};

const CONFIG_DICT = {
	GENERAL: GENERAL,
	PlaneStress: PlaneStress,
	Elasticity: Elasticity,
	PlaneStrain: PlaneStrain,
	PlaneStressNonLocalSparse: PlaneStressNonLocalSparse,
	PlaneStressSparse: PlaneStressSparse,
};

export { CONFIG_DICT };
