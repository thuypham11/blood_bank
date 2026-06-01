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
    // backend/models/DonationAppointment.js
// Thêm vào schema
queueNumber: { type: Number, default: null },
bedNumber: { type: String, default: null },  // Số giường/bàn hiến máu
calledAt: { type: Date, default: null },     // Thời gian gọi donor
calledStatus: { 
  type: String, 
  enum: ['pending', 'called', 'in_progress', 'completed'],
  default: 'pending' 
},
completedAt: { type: Date, default: null },
completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model("DonationAppointment", donationAppointmentSchema);