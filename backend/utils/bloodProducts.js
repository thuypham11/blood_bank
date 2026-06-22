export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
export const BLOOD_COMPONENTS = ["red_cells", "platelets", "white_cells"];
export const BLOOD_BAG_VOLUMES = [250, 350, 450];

export const COMPONENT_LABELS = {
	red_cells: "Hong cau",
	platelets: "Tieu cau",
	white_cells: "Bach cau",
};

export const isValidBloodVolume = (volume) => {
	const target = Number(volume);
	if (!Number.isFinite(target) || target < Math.min(...BLOOD_BAG_VOLUMES) || target % 1 !== 0) return false;

	const reachable = new Array(target + 1).fill(false);
	reachable[0] = true;
	for (let amount = 1; amount <= target; amount += 1) {
		reachable[amount] = BLOOD_BAG_VOLUMES.some((bag) => amount >= bag && reachable[amount - bag]);
	}
	return reachable[target];
};

const normalizeVolume = (item) => Number(item.volumeMl ?? item.units ?? item.quantity);

export const normalizeBloodItems = ({ bloodItems, bloodType, units, volumeMl } = {}) => {
	const source = Array.isArray(bloodItems) && bloodItems.length ? bloodItems : bloodType ? [{ bloodType, units, volumeMl }] : [];
	const merged = new Map();

	source.forEach((item) => {
		const type = String(item.bloodType || "").trim().toUpperCase();
		const amount = normalizeVolume(item);
		if (!BLOOD_TYPES.includes(type) || !isValidBloodVolume(amount)) return;
		merged.set(type, (merged.get(type) || 0) + amount);
	});

	return Array.from(merged, ([type, amount]) => ({ bloodType: type, units: amount, volumeMl: amount }));
};

export const normalizeComponentItems = ({ componentItems, componentType, units, volumeMl } = {}) => {
	const source =
		Array.isArray(componentItems) && componentItems.length ? componentItems : componentType ? [{ componentType, units, volumeMl }] : [];
	const merged = new Map();

	source.forEach((item) => {
		const type = String(item.componentType || "").trim();
		const amount = normalizeVolume(item);
		if (!BLOOD_COMPONENTS.includes(type) || !isValidBloodVolume(amount)) return;
		merged.set(type, (merged.get(type) || 0) + amount);
	});

	return Array.from(merged, ([type, amount]) => ({ componentType: type, units: amount, volumeMl: amount }));
};

export const normalizeProductItems = (payload = {}) => ({
	bloodItems: normalizeBloodItems(payload),
	componentItems: normalizeComponentItems(payload),
});

export const formatProductItems = ({ bloodItems = [], componentItems = [] } = {}) => {
	const bloodText = bloodItems.map((item) => `${item.volumeMl || item.units}ml mau toan phan ${item.bloodType}`);
	const componentText = componentItems.map(
		(item) => `${item.volumeMl || item.units}ml che pham ${COMPONENT_LABELS[item.componentType] || item.componentType}`,
	);
	return [...bloodText, ...componentText].join(", ");
};

export const getStockProductKey = (item) =>
	item.productType === "blood_component" ? `component:${item.componentType}` : `whole:${item.bloodGroup || item.bloodType}`;
