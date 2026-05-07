import mongoose from "mongoose";

const bloodUnitSchema = new mongoose.Schema({
    barcode: { type: String, unique: true, required: true },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "Donor", required: true },
    donationDate: { type: Date, default: Date.now },
    bloodGroup: { type: String, required: true },
    productType: { type: String, enum: ["whole_blood", "red_cells", "platelets", "plasma"], default: "whole_blood" },
    quantity: { type: Number, default: 350 },
    status: { type: String, enum: ["quarantine", "available", "issued", "expired", "discarded"], default: "quarantine" },
    screeningStatus: { type: String, enum: ["pending", "passed", "failed"], default: "pending" },
    screening: {
        hiv: { type: String, enum: ["pending", "positive", "negative"], default: "pending" },
        hepatitisB: { type: String, enum: ["pending", "positive", "negative"], default: "pending" },
        hepatitisC: { type: String, enum: ["pending", "positive", "negative"], default: "pending" },
        syphilis: { type: String, enum: ["pending", "positive", "negative"], default: "pending" },
        malaria: { type: String, enum: ["pending", "positive", "negative"], default: "pending" },
        testedAt: Date,
        testedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },
    facility: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" }, // nơi lưu trữ
    expiryDate: Date
}, { timestamps: true });

export default mongoose.model("BloodUnit", bloodUnitSchema);