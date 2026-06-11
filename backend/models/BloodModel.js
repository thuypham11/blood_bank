import mongoose from "mongoose";

const screeningResultSchema = new mongoose.Schema(
  {
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
    hepatitis: {
      type: String,
      enum: ["pending", "negative", "positive"],
      default: "pending",
    },
    syphilis: {
      type: String,
      enum: ["pending", "negative", "positive"],
      default: "pending",
    },
  },
  { _id: false }
);

const bloodSchema = new mongoose.Schema(
  {
    barcode: {
      type: String,
      unique: true,
      sparse: true,
    },
    unitCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
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
      type: screeningResultSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: [
        "pending_screening",
        "qualified",
        "available",
        "issued",
        "used",
        "expired",
        "rejected",
        "discarded",
      ],
      default: "pending_screening",
    },
    issuedTo: {
      type: String,
      trim: true,
    },
    issueReason: {
      type: String,
      trim: true,
    },
    issuedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bloodSchema.pre("validate", function (next) {
  if (!this.bloodType && this.bloodGroup) {
    this.bloodType = this.bloodGroup;
  }
  if (!this.bloodGroup && this.bloodType) {
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

bloodSchema.virtual("isExpired").get(function () {
  return new Date() > (this.expiryDate || this.expirationDate);
});

bloodSchema.post("find", async function (docs) {
  await Promise.all(
    docs.map(async (doc) => {
      if (
        doc.isExpired &&
        !["expired", "issued", "used", "discarded", "rejected"].includes(
          doc.status
        )
      ) {
        doc.status = "expired";
        await doc.save();
      }
    })
  );
});

const Blood = mongoose.models.Blood || mongoose.model("Blood", bloodSchema);
console.log("Blood Model active");
export default Blood;
