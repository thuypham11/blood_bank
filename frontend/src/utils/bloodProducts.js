export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export const BLOOD_COMPONENTS = [
	{ value: "red_cells", label: "Hong cau" },
	{ value: "platelets", label: "Tieu cau" },
	{ value: "white_cells", label: "Bach cau" },
];

export const BAG_VOLUMES = [250, 350, 450];

export const isValidBloodVolume = (value) => {
	const amount = Number(value);
	if (!Number.isFinite(amount) || amount < 250 || amount % 1 !== 0) return false;

	const reachable = new Array(amount + 1).fill(false);
	reachable[0] = true;
	for (let i = 1; i <= amount; i += 1) {
		reachable[i] = BAG_VOLUMES.some((bag) => i >= bag && reachable[i - bag]);
	}
	return reachable[amount];
};

export const buildBloodItems = (volumes) =>
	BLOOD_TYPES.map((bloodType) => ({
		bloodType,
		volumeMl: Number(volumes[bloodType] || 0),
		units: Number(volumes[bloodType] || 0),
	})).filter((item) => item.volumeMl > 0);

export const buildComponentItems = (volumes) =>
	BLOOD_COMPONENTS.map((component) => ({
		componentType: component.value,
		volumeMl: Number(volumes[component.value] || 0),
		units: Number(volumes[component.value] || 0),
	})).filter((item) => item.volumeMl > 0);

export const validateProductItems = (bloodItems, componentItems) => {
	const invalid = [...bloodItems, ...componentItems].filter((item) => !isValidBloodVolume(item.volumeMl));
	return invalid.length === 0;
};

export const componentLabel = (value) => BLOOD_COMPONENTS.find((item) => item.value === value)?.label || value;

export const productLabel = (item) =>
	item.productType === "blood_component" ? componentLabel(item.componentType) : item.bloodGroup || item.bloodType;

export const formatRequestProducts = (request) => {
	const blood = (request.bloodItems || []).map((item) => `${item.bloodType}: ${item.volumeMl || item.units}ml`);
	const components = (request.componentItems || []).map(
		(item) => `${componentLabel(item.componentType)}: ${item.volumeMl || item.units}ml`,
	);
	return [...blood, ...components].join(", ") || request.bloodType || "N/A";
};
