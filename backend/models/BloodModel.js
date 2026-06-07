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
        unitCode: {
            type: String,
            unique: true,
            required: true,
            trim: true,
        },

        bloodType: {
            type: String,
            enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
            required: true,
        },

        quantity: {
            type: Number, //dung tích túi máu , tính bằng ml
            required: true,
            enum: [250, 350, 450],
        },

        collectionDate: {
            type: Date,
            default: Date.now,
        },
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Facility",
            required: true,
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
    if (this.collectionDate && !this.expiryDate) {
        const expiration = new Date(this.collectionDate);
        expiration.setDate(expiration.getDate() + 42);
        this.expiryDate = expiration;
    }
    next();
});

bloodSchema.virtual("isExpired").get(function () {
    return Boolean(this.expiryDate && new Date() > this.expiryDate);
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
                await doc.save()
            };
        })
    );
});

const Blood = mongoose.models.Blood || mongoose.model("Blood", bloodSchema);
console.log("Blood Model active");
export default Blood;