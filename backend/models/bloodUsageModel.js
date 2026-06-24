import mongoose from "mongoose";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
<<<<<<< Updated upstream
const BLOOD_COMPONENTS = ["red_cells", "platelets", "plasma"];
=======
const BLOOD_COMPONENTS = ["red_cells", "platelets", "white_cells", "plasma"];
>>>>>>> Stashed changes

const bloodItemSchema = new mongoose.Schema(
	{
		bloodType: {
			type: String,
			required: true,
			enum: BLOOD_TYPES,
		},
		units: {
			type: Number,
			required: true,
			min: 1,
		},
		volumeMl: {
			type: Number,
			min: 1,
		},
	},
	{ _id: false },
);

const componentItemSchema = new mongoose.Schema(
	{
		componentType: {
			type: String,
			required: true,
			enum: BLOOD_COMPONENTS,
		},
		units: {
			type: Number,
			required: true,
			min: 1,
		},
		volumeMl: {
			type: Number,
			min: 1,
		},
	},
	{ _id: false },
);

const bloodUsageSchema = new mongoose.Schema(
	{
		hospital: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Facility",
			required: true,
		},
		usageDate: {
			type: Date,
			required: true,
		},
		usageTime: {
			type: String,
			required: true,
		},
		patientName: {
			type: String,
			required: true,
			trim: true,
		},
		patientPhone: {
			type: String,
			trim: true,
		},
		relativeName: {
			type: String,
			trim: true,
		},
		relativePhone: {
			type: String,
			trim: true,
		},
		bloodType: {
			type: String,
		},
		units: {
			type: Number,
			min: 1,
		},
		bloodItems: {
			type: [bloodItemSchema],
			default: [],
		},
		componentItems: {
			type: [componentItemSchema],
			default: [],
		},
		reason: {
			type: String,
			required: true,
			trim: true,
		},
	},
	{ timestamps: true },
);

bloodUsageSchema.pre("validate", function (next) {
	if ((!this.bloodItems || this.bloodItems.length === 0) && this.bloodType && this.units) {
		this.bloodItems = [{ bloodType: this.bloodType, units: this.units, volumeMl: this.units }];
	}

	const bloodItems = this.bloodItems || [];
	const componentItems = this.componentItems || [];

	if (!bloodItems.length && !componentItems.length) {
		return next(new Error("Có thể sử dụng ít nhất một nhóm máu toàn phần hoặc thành phần máu."));
	}

	const totalUnits = [...bloodItems, ...componentItems].reduce(
		(sum, item) => sum + Number(item.units || item.volumeMl || 0),
		0,
	);
	this.bloodType = [
		...bloodItems.map((item) => item.bloodType),
		...componentItems.map((item) => item.componentType),
	].join(", ");
	this.units = totalUnits;

	next();
});

export default mongoose.model("BloodUsage", bloodUsageSchema);
