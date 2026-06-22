import mongoose from "mongoose";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const BLOOD_COMPONENTS = ["red_cells", "platelets", "white_cells"];

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

const bloodRequestSchema = new mongoose.Schema(
	{
		hospitalId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Facility",
			required: true,
		},
		labId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Facility",
			required: true,
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
		status: {
			type: String,
			enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
			default: "pending",
		},
		handoverStatus: {
			type: String,
			enum: ["requested", "received", "preparing", "packed", "shipping", "confirmed"],
			default: "requested",
		},
		handoverTimeline: [
			{
				status: {
					type: String,
					enum: ["requested", "received", "preparing", "packed", "shipping", "confirmed", "rejected"],
				},
				label: String,
				date: {
					type: Date,
					default: Date.now,
				},
				actor: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Facility",
				},
				note: String,
			},
		],
		processedAt: Date,
		confirmedAt: Date,
		requestedDeliveryDate: Date,
		expiresAt: {
			type: Date,
			default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
		},
		cancelledAt: Date,
		cancellationReason: String,
		notes: String,
	},
	{ timestamps: true },
);

bloodRequestSchema.pre("validate", function (next) {
	if ((!this.bloodItems || this.bloodItems.length === 0) && this.bloodType && this.units) {
		this.bloodItems = [{ bloodType: this.bloodType, units: this.units, volumeMl: this.units }];
	}

	const bloodItems = this.bloodItems || [];
	const componentItems = this.componentItems || [];

	if (!bloodItems.length && !componentItems.length) {
		return next(new Error("Can request at least one whole blood group or blood component."));
	}

	const totalUnits = [...bloodItems, ...componentItems].reduce(
		(sum, item) => sum + Number(item.units || item.volumeMl || 0),
		0,
	);
	this.bloodType = [...bloodItems.map((item) => item.bloodType), ...componentItems.map((item) => item.componentType)].join(", ");
	this.units = totalUnits;

	next();
});

export default mongoose.model("BloodRequest", bloodRequestSchema);
