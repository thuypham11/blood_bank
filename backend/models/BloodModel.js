import mongoose from "mongoose";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const screeningResultSchema = new mongoose.Schema(
  {
    hiv: { type: String, enum: ["pending", "negative", "positive"], default: "pending" },
    hbv: { type: String, enum: ["pending", "negative", "positive"], default: "pending" },
    hcv: { type: String, enum: ["pending", "negative", "positive"], default: "pending" },
    hepatitis: { type: String, enum: ["pending", "negative", "positive"], default: "pending" },
    syphilis: { type: String, enum: ["pending", "negative", "positive"], default: "pending" },
  },
  { _id: false },
);

const bloodSchema = new mongoose.Schema(
  {
    unitCode: { type: String, unique: true, sparse: true, trim: true },
    barcode: { type: String, unique: true, sparse: true, trim: true },

    bloodType: { type: String, enum: BLOOD_TYPES },
    bloodGroup: { type: String, enum: BLOOD_TYPES },

    quantity: { type: Number, required: true, min: 0 },
    collectionDate: { type: Date, default: Date.now },
    expiryDate: Date,
    expirationDate: Date,

    bloodLab: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },

    screeningResult: { type: screeningResultSchema, default: () => ({}) },
    status: {
      type: String,
      enum: [
        "pending_screening",
        "pending-testing",
        "pending_testing",
        "qualified",
        "available",
        "issued",
        "used",
        "expired",
        "rejected",
        "discarded",
        "quarantine",
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
  },
);

bloodSchema.pre("validate", function (next) {
  if (!this.bloodType && this.bloodGroup) this.bloodType = this.bloodGroup;
  if (!this.bloodGroup && this.bloodType) this.bloodGroup = this.bloodType;

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

  next();
});

bloodSchema.virtual("isExpired").get(function () {
  const expiry = this.expiryDate || this.expirationDate;
  return Boolean(expiry && new Date() > expiry);
});

bloodSchema.post("find", async function (docs) {
  await Promise.all(
    docs.map(async (doc) => {
      if (
        doc.isExpired &&
        !["expired", "issued", "used", "discarded", "rejected"].includes(doc.status)
      ) {
        doc.status = "expired";
        await doc.save();
      }
    }),
  );
});

const Blood = mongoose.models.Blood || mongoose.model("Blood", bloodSchema);

export default Blood;
