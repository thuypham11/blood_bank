// models/bloodRequestModel.js
import mongoose from "mongoose";

const bloodRequestSchema = new mongoose.Schema({
  hospitalId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Facility", 
    required: true 
  },
  labId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Facility", 
    required: true 
  },
  bloodType: { 
    type: String, 
    required: true,
    enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
  },
  units: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  status: { 
    type: String, 
    enum: ["pending", "accepted", "rejected", "completed"], 
    default: "pending" 
  },
  handoverStatus: {
    type: String,
    enum: ["requested", "received", "preparing", "packed", "shipping", "confirmed"],
    default: "requested"
  },
  handoverTimeline: [
    {
      status: {
        type: String,
        enum: ["requested", "received", "preparing", "packed", "shipping", "confirmed", "rejected"]
      },
      label: String,
      date: {
        type: Date,
        default: Date.now
      },
      actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Facility"
      },
      note: String
    }
  ],
  processedAt: Date,
  confirmedAt: Date,
  notes: String
}, { timestamps: true });

export default mongoose.model("BloodRequest", bloodRequestSchema);
