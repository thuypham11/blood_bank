import mongoose from "mongoose";

const testValues = ["pending", "negative", "positive"];
const resultFields = {
	hiv: { type: String, enum: testValues, default: "pending" },
	hbv: { type: String, enum: testValues, default: "pending" },
	hcv: { type: String, enum: testValues, default: "pending" },
	hepatitis: { type: String, enum: testValues, default: "pending" },
	syphilis: { type: String, enum: testValues, default: "pending" },
};

const labTestResultSchema = new mongoose.Schema(
	{
		facility: { type: mongoose.Schema.Types.ObjectId, ref: "Facility", required: true, index: true },
		bloodUnit: { type: mongoose.Schema.Types.ObjectId, ref: "Blood", required: true, unique: true },
		results: { type: new mongoose.Schema(resultFields, { _id: false }), default: () => ({}) },
		status: { type: String, enum: ["draft", "submitted", "approved"], default: "draft" },
		enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "LabStaff", required: true },
		submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "LabStaff" },
		submittedAt: Date,
		approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "LabStaff" },
		approvedAt: Date,
	},
	{ timestamps: true },
);

export default mongoose.model("LabTestResult", labTestResultSchema);
