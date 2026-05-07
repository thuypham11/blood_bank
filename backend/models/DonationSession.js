import mongoose from "mongoose";

const donationSessionSchema = new mongoose.Schema({
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "Donor", required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "DonationAppointment" },
    camp: { type: mongoose.Schema.Types.ObjectId, ref: "BloodCamp" },
    facility: { type: mongoose.Schema.Types.ObjectId, ref: "Facility", required: true },
    bloodUnit: { type: mongoose.Schema.Types.ObjectId, ref: "BloodUnit" }, // kết quả xét nghiệm sẽ gắn vào đây
    status: { type: String, enum: ["scheduled", "checked_in", "donating", "completed", "cancelled"], default: "scheduled" },
    donationDate: Date,
    notes: String
}, { timestamps: true });

export default mongoose.model("DonationSession", donationSessionModel);