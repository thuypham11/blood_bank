import mongoose from "mongoose";

const barcodeSequenceSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        value: { type: Number, required: true, default: 0, min: 0 },
    },
    { timestamps: true }
);

const BarcodeSequence =
    mongoose.models.BarcodeSequence ||
    mongoose.model("BarcodeSequence", barcodeSequenceSchema);

export default BarcodeSequence;
