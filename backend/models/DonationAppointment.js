// backend/models/DonationAppointment.js
import mongoose from "mongoose";

const donationAppointmentSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donor",
      required: true,
    },
    camp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BloodCamp",
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "checked_in", "completed", "cancelled"],
      default: "pending",
    },
    qrCode: {
      type: String,
    },
    checkInTime: Date,
    notes: String,
    cancellationReason: String,
  },
  { timestamps: true }
);

export default mongoose.model("DonationAppointment", donationAppointmentSchema);