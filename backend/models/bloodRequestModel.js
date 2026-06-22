// models/bloodRequestModel.js
import mongoose from "mongoose";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

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
			validate: {
				validator(items) {
					return Array.isArray(items) && items.length > 0;
				},
				message: "Cần ít nhất một nhóm máu.",
			},
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
		this.bloodItems = [{ bloodType: this.bloodType, units: this.units }];
	}

	if (this.bloodItems?.length) {
		const totalUnits = this.bloodItems.reduce((sum, item) => sum + Number(item.units || 0), 0);
		this.bloodType = this.bloodItems.map((item) => item.bloodType).join(", ");
		this.units = totalUnits;
	}

	next();
});

export default mongoose.model("BloodRequest", bloodRequestSchema);
