import dotenv from "dotenv";
import mongoose from "mongoose";
import Blood from "../models/BloodModel.js";
import Facility from "../models/facilityModel.js";

dotenv.config();

const COMPONENT_DEFAULTS = [
	{ componentType: "red_cells", quantity: 700 },
	{ componentType: "platelets", quantity: 500 },
	{ componentType: "white_cells", quantity: 350 },
];

const getExpiryDate = () => {
	const expiryDate = new Date();
	expiryDate.setDate(expiryDate.getDate() + 42);
	return expiryDate;
};

const run = async () => {
	if (!process.env.MONGO_URI) {
		throw new Error("MONGO_URI is missing");
	}

	await mongoose.connect(process.env.MONGO_URI);

	const migratedWholeBlood = await Blood.updateMany(
		{ productType: { $exists: false }, $or: [{ bloodGroup: { $exists: true } }, { bloodType: { $exists: true } }] },
		{ $set: { productType: "whole_blood" } },
	);

	const hospitals = await Facility.find({ facilityType: "hospital" }).select("_id name").lean();
	let created = 0;
	let skipped = 0;

	for (const hospital of hospitals) {
		for (const component of COMPONENT_DEFAULTS) {
			const existing = await Blood.findOne({
				hospital: hospital._id,
				productType: "blood_component",
				componentType: component.componentType,
			});

			if (existing) {
				skipped += 1;
				continue;
			}

			await Blood.create({
				productType: "blood_component",
				componentType: component.componentType,
				quantity: component.quantity,
				collectionDate: new Date(),
				expiryDate: getExpiryDate(),
				hospital: hospital._id,
				screeningResult: {
					hiv: "negative",
					hbv: "negative",
					hcv: "negative",
				},
				status: "available",
			});

			await Facility.findByIdAndUpdate(hospital._id, {
				$push: {
					history: {
						eventType: "Stock Update",
						description: `Khoi tao ${component.quantity}ml che pham ${component.componentType}`,
						date: new Date(),
					},
				},
			});

			created += 1;
		}
	}

	console.log(JSON.stringify({
		hospitals: hospitals.length,
		createdComponentStocks: created,
		skippedExistingComponentStocks: skipped,
		migratedWholeBlood: migratedWholeBlood.modifiedCount,
	}, null, 2));
};

run()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await mongoose.disconnect();
	});
