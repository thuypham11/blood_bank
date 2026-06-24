import mongoose from "mongoose";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const BLOOD_COMPONENTS = ["red_cells", "platelets", "white_cells"];

const bloodSchema = new mongoose.Schema(
	{
		barcode: {
			type: String,
			unique: true,
			sparse: true,
		},
		productType: {
			type: String,
			enum: ["whole_blood", "blood_component"],
			default: "whole_blood",
		},
		componentType: {
			type: String,
			enum: BLOOD_COMPONENTS,
		},
		bloodGroup: {
			type: String,
			enum: BLOOD_GROUPS,
		},
		bloodType: {
			type: String,
			enum: BLOOD_GROUPS,
		},
		quantity: {
			type: Number,
			required: true,
			min: 0,
		},
		collectionDate: {
			type: Date,
			default: Date.now,
		},
		expirationDate: {
			type: Date,
		},
		expiryDate: {
			type: Date,
		},
		bloodLab: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Facility",
		},
		hospital: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Facility",
		},
		screeningResult: {
			hiv: {
				type: String,
				enum: ["pending", "negative", "positive"],
				default: "pending",
			},
			hbv: {
				type: String,
				enum: ["pending", "negative", "positive"],
				default: "pending",
			},
			hcv: {
				type: String,
				enum: ["pending", "negative", "positive"],
				default: "pending",
			},
		},

		status: {
			type: String,
			enum: ["pending_testing", "available", "used", "expired", "rejected"],
			default: "pending_testing",
		},
	},
	{ timestamps: true },
);

// Pre-save middleware to set expiration date (42 days after collection)
bloodSchema.pre("save", function (next) {
	if (!this.productType) {
		this.productType = this.componentType ? "blood_component" : "whole_blood";
	}
	if (this.productType === "whole_blood" && !this.bloodGroup && !this.bloodType) {
		return next(new Error("Nhóm máu là yếu tố cần thiết để dự trữ máu toàn phần."));
	}
	if (this.productType === "blood_component" && !this.componentType) {
		return next(new Error("Loại thành phần máu là bắt buộc đối với kho dự trữ thành phần máu."));
	}
	if (this.productType === "whole_blood" && !this.bloodType && this.bloodGroup) {
		this.bloodType = this.bloodGroup;
	}
	if (this.productType === "whole_blood" && !this.bloodGroup && this.bloodType) {
		this.bloodGroup = this.bloodType;
	}
	if (this.collectionDate && !this.expirationDate && !this.expiryDate) {
		const expiration = new Date(this.collectionDate);
		expiration.setDate(expiration.getDate() + 42);
		this.expirationDate = expiration;
		this.expiryDate = expiration;
	} else if (this.expirationDate && !this.expiryDate) {
		this.expiryDate = this.expirationDate;
	} else if (this.expiryDate && !this.expirationDate) {
		this.expirationDate = this.expiryDate;
	}
	next();
});

// Virtual for checking if blood is expired
bloodSchema.virtual("isExpired").get(function () {
	return new Date() > (this.expiryDate || this.expirationDate);
});

// Update status if expired
bloodSchema.post("find", function (docs) {
	docs.forEach(async (doc) => {
		if (doc.isExpired && doc.status !== "expired") {
			doc.status = "expired";
			await doc.save();
		}
	});
});

export default mongoose.model("Blood", bloodSchema);
