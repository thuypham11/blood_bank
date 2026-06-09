import mongoose from "mongoose";

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
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
    units: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("BloodUsage", bloodUsageSchema);
