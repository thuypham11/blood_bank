import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const LAB_STAFF_PERMISSIONS = [
	"view_samples",
	"receive_samples",
	"enter_results",
	"submit_results",
	"approve_results",
	"view_basic_reports",
];

const labStaffSchema = new mongoose.Schema(
	{
		facility: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Facility",
			required: true,
			index: true,
		},
		employeeCode: { type: String, required: true, trim: true, uppercase: true },
		fullName: { type: String, required: true, trim: true, maxlength: 120 },
		email: { type: String, required: true, unique: true, lowercase: true, trim: true },
		phone: { type: String, required: true, trim: true, match: /^\d{10}$/ },
		password: { type: String, required: true, minlength: 6, select: false },
		permissions: {
			type: [{ type: String, enum: LAB_STAFF_PERMISSIONS }],
			default: ["view_samples", "receive_samples", "enter_results", "submit_results"],
		},
		isActive: { type: Boolean, default: true },
		lastLogin: Date,
	},
	{ timestamps: true },
);

labStaffSchema.index({ facility: 1, employeeCode: 1 }, { unique: true });

labStaffSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	this.password = await bcrypt.hash(this.password, 12);
	next();
});

export default mongoose.model("LabStaff", labStaffSchema);
