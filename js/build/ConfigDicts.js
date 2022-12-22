const GENERAL = {
	calculateStrain: false,
	displacements: false,
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
};
const PlaneStress = {
	calculateStrain: true,
	displacements: true,
	dict: {
		"\\(\\varepsilon_x\\)": "0",
		"\\(\\varepsilon_y\\)": "1",
		"\\(\\varepsilon_{xy}\\)": "2",
	},
};

const PlaneStressNonLocalSparse = {
	calculateStrain: true,
	displacements: true,
	dict: {
		"\\(\\varepsilon_x\\)": "0",
		"\\(\\varepsilon_y\\)": "1",
		"\\(\\varepsilon_{xy}\\)": "2",
	},
};
const PlaneStrain = {
	calculateStrain: true,
	displacements: true,
	dict: {
		"\\(\\varepsilon_x\\)": "0",
		"\\(\\varepsilon_y\\)": "1",
		"\\(\\varepsilon_{xy}\\)": "2",
	},
};

const CONFIG_DICT = {
	GENERAL: GENERAL,
	PlaneStress: PlaneStress,
	Elasticity: Elasticity,
	PlaneStrain: PlaneStrain,
	PlaneStressNonLocalSparse: PlaneStressNonLocalSparse,
};

export { CONFIG_DICT };
