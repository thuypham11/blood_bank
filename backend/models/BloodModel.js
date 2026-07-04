import mongoose from "mongoose";
import { generateBloodStorageId } from "../services/barcodeService.js";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const ABO_TYPES = ["A", "B", "AB", "O"];

const screeningResultSchema = new mongoose.Schema(
  {
    hiv: { type: String, enum: ["pending", "negative", "positive"], default: "pending" },
    hbv: { type: String, enum: ["pending", "negative", "positive"], default: "pending" },
    hcv: { type: String, enum: ["pending", "negative", "positive"], default: "pending" },
    hepatitis: { type: String, enum: ["pending", "negative", "positive"], default: "pending" },
    syphilis: { type: String, enum: ["pending", "negative", "positive"], default: "pending" },
  },
  { _id: false }
);

const bloodSchema = new mongoose.Schema(
  {
    unitCode: { type: String, unique: true, sparse: true, trim: true },
    barcode: { type: String, unique: true, sparse: true, trim: true },

    bloodType: { type: String, enum: BLOOD_TYPES },
    bloodGroup: { type: String, enum: BLOOD_TYPES },
    aboGroup: { type: String, enum: ABO_TYPES },
    rhFactor: { type: String, enum: ["positive", "negative"] },

    quantity: { type: Number, required: true, min: 0 },
    batchCode: { type: String, trim: true, index: true },
    batchReceivedAt: Date,
    receivedAt: { type: Date, default: Date.now },

    collectionDate: { type: Date, default: Date.now },
    expiryDate: Date,
    expirationDate: Date,

    testSampleCode: { type: String, trim: true, index: true },
    qrPayload: { type: String, trim: true },
    sampleType: {
      type: String,
      enum: ["serum", "plasma", "whole_blood", "unknown"],
      default: "unknown",
    },
    sampleCollectedAt: Date,
    traceabilityVerified: { type: Boolean, default: true },
    intakeNote: { type: String, trim: true },

    bloodLab: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },

    donor: { type: mongoose.Schema.Types.ObjectId, ref: "Donor", index: true },
    donationHistoryId: { type: mongoose.Schema.Types.ObjectId },
    donationNumber: { type: Number, min: 1 },
    donorSnapshot: {
      fullName: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      bloodGroup: { type: String, enum: BLOOD_TYPES },
    },
    previousDonation: {
      bloodUnit: { type: mongoose.Schema.Types.ObjectId, ref: "Blood" },
      unitCode: { type: String, trim: true },
      collectionDate: Date,
      status: String,
      screeningResult: { type: screeningResultSchema, default: undefined },
    },
    intakeWarnings: [{ type: String, trim: true }],

    componentType: {
      type: String,
      enum: ["whole_blood", "red_cells", "platelets", "plasma"],
      default: "whole_blood",
    },

    parentUnit: { type: mongoose.Schema.Types.ObjectId, ref: "Blood", default: null },
    parentBarcode: { type: String, trim: true, default: null },
    splitAt: Date,

    screeningResult: { type: screeningResultSchema, default: () => ({}) },

    status: {
      type: String,
      enum: [
        "pending_screening",
        "pending-testing",
        "pending_testing",
        "testing",
        "qualified",
        "available",
        "issued",
        "used",
        "expired",
        "rejected",
        "discarded",
        "quarantine",
        "processed",
      ],
      default: "pending_screening",
    },

    issuedTo: { type: String, trim: true },
    issueReason: { type: String, trim: true },
    issuedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bloodSchema.pre("validate", async function () {
  if (!this.bloodType && this.bloodGroup) this.bloodType = this.bloodGroup;
  if (!this.bloodGroup && this.bloodType) this.bloodGroup = this.bloodType;
  if (this.bloodType) {
    this.aboGroup = this.bloodType.replace(/[+-]/g, "");
    this.rhFactor = this.bloodType.endsWith("+") ? "positive" : "negative";
  }

  if (!this.barcode && this.unitCode) this.barcode = this.unitCode;
  if (!this.unitCode && this.barcode) this.unitCode = this.barcode;

  if (this.isNew && !this.barcode && !this.unitCode) {
    const facilityId = this.bloodLab || this.hospital;

    if (facilityId) {
      const identifier = await generateBloodStorageId({ facilityId });
      this.barcode = identifier;
      this.unitCode = identifier;
    }
  }

  if (!this.bloodType) {
    this.invalidate("bloodType", "Nhóm máu là bắt buộc");
  }

  if (!this.sampleCollectedAt && this.collectionDate) {
    this.sampleCollectedAt = this.collectionDate;
  }

  if (!this.testSampleCode && (this.unitCode || this.barcode)) {
    this.testSampleCode = `SMP-${this.unitCode || this.barcode}`;
  }

  if (
    this.componentType !== "whole_blood" &&
    (!this.parentUnit || !this.parentBarcode)
  ) {
    this.invalidate("parentUnit", "Chế phẩm phải liên kết với túi máu gốc");
  }

  if (this.collectionDate && !this.expiryDate && !this.expirationDate) {
    const expiration = new Date(this.collectionDate);
    expiration.setDate(expiration.getDate() + 42);
    this.expiryDate = expiration;
    this.expirationDate = expiration;
  } else if (this.expiryDate && !this.expirationDate) {
    this.expirationDate = this.expiryDate;
  } else if (this.expirationDate && !this.expiryDate) {
    this.expiryDate = this.expirationDate;
  }
});

bloodSchema.index(
  { parentUnit: 1, componentType: 1 },
  {
    unique: true,
    partialFilterExpression: { parentUnit: { $type: "objectId" } },
  }
);

bloodSchema.virtual("isExpired").get(function () {
  const expiry = this.expiryDate || this.expirationDate;
  return Boolean(expiry && new Date() > expiry);
});

const Blood = mongoose.models.Blood || mongoose.model("Blood", bloodSchema);

export default Blood;
