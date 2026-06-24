import dotenv from "dotenv";
import mongoose from "mongoose";
import Blood from "../models/BloodModel.js";
import Facility from "../models/facilityModel.js";

dotenv.config();

const HOSPITAL_ID = "6a1d334a0b6c62b160975deb";
const BARCODE_PREFIX = "BBU-LABCT000-2026-";
const FIRST_BARCODE_NUMBER = 161;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const addDays = (date, days) => {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
};

const barcodeFor = (number) => `${BARCODE_PREFIX}${String(number).padStart(8, "0")}`;

const distributeBloodGroups = (count) =>
	Array.from({ length: count }, (_, index) => BLOOD_GROUPS[index % BLOOD_GROUPS.length]);

const createBags = () => {
	const collectionDate = new Date();
	const expiryDate = addDays(collectionDate, 42);
	const screeningResult = { hiv: "negative", hbv: "negative", hcv: "negative" };
	let barcodeNumber = FIRST_BARCODE_NUMBER;

	const baseBag = () => ({
		barcode: barcodeFor(barcodeNumber++),
		collectionDate,
		expirationDate: expiryDate,
		expiryDate,
		hospital: HOSPITAL_ID,
		screeningResult,
		status: "available",
	});

	const wholeBlood = [
		...Array.from({ length: 35 }, () => ({ bloodGroup: "O+", quantity: 450 })),
		...Array.from({ length: 27 }, () => ({ bloodGroup: "O-", quantity: 450 })),
	].map((item) => ({
		...baseBag(),
		productType: "whole_blood",
		bloodGroup: item.bloodGroup,
		bloodType: item.bloodGroup,
		quantity: item.quantity,
	}));

	const componentBags = [
		{ componentType: "red_cells", count: 35, quantity: 350 },
		{ componentType: "platelets", count: 40, quantity: 250 },
		{ componentType: "plasma", count: 20, quantity: 250 },
	].flatMap(({ componentType, count, quantity }) =>
		distributeBloodGroups(count).map((bloodGroup) => ({
			...baseBag(),
			productType: "blood_component",
			componentType,
			bloodGroup,
			bloodType: bloodGroup,
			quantity,
		})),
	);

	return [...wholeBlood, ...componentBags];
};

const summarize = (bags) =>
	bags.reduce((acc, bag) => {
		const key =
			bag.productType === "whole_blood"
				? `whole_blood:${bag.bloodGroup}`
				: `component:${bag.componentType}`;
		acc[key] = (acc[key] || 0) + 1;
		return acc;
	}, {});

const run = async () => {
	if (!process.env.MONGO_URI) {
		throw new Error("MONGO_URI is missing");
	}
	if (!mongoose.Types.ObjectId.isValid(HOSPITAL_ID)) {
		throw new Error(`Invalid hospital id: ${HOSPITAL_ID}`);
	}

	await mongoose.connect(process.env.MONGO_URI);

	const hospital = await Facility.findById(HOSPITAL_ID).select("_id name facilityType").lean();
	if (!hospital) {
		throw new Error(`Hospital not found: ${HOSPITAL_ID}`);
	}

	const bags = createBags();
	const barcodes = bags.map((bag) => bag.barcode);
	const existing = await Blood.find({ barcode: { $in: barcodes } }).select("barcode").lean();
	const existingBarcodes = new Set(existing.map((item) => item.barcode));
	const missingBags = bags.filter((bag) => !existingBarcodes.has(bag.barcode));

	if (missingBags.length) {
		await Blood.insertMany(missingBags, { ordered: false });
		await Facility.findByIdAndUpdate(HOSPITAL_ID, {
			$push: {
				history: {
					eventType: "Stock Update",
					description: `Seeded ${missingBags.length} blood bags from ${barcodeFor(FIRST_BARCODE_NUMBER)} to ${barcodeFor(FIRST_BARCODE_NUMBER + bags.length - 1)}.`,
					date: new Date(),
				},
			},
		});
	}

	console.log(
		JSON.stringify(
			{
				hospital: {
					id: hospital._id,
					name: hospital.name,
					facilityType: hospital.facilityType,
				},
				requestedBags: bags.length,
				createdBags: missingBags.length,
				skippedExistingBags: bags.length - missingBags.length,
				firstBarcode: barcodeFor(FIRST_BARCODE_NUMBER),
				lastBarcode: barcodeFor(FIRST_BARCODE_NUMBER + bags.length - 1),
				summary: summarize(missingBags),
			},
			null,
			2,
		),
	);
};

run()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await mongoose.disconnect();
	});
