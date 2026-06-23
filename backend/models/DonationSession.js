// backend/models/DonationSession.js
import mongoose from 'mongoose';

const donationSessionSchema = new mongoose.Schema({
  camp: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodCamp', required: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  date: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  queue: [{
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'DonationAppointment' },
    status: { type: String, enum: ['waiting', 'called', 'donating', 'completed', 'skipped'], default: 'waiting' },
    position: Number,
    calledAt: Date,
    startedAt: Date,
    completedAt: Date,
    barcode: String,
    notes: String
  }],
  currentServing: { type: Number, default: 0 },
  totalDonors: { type: Number, default: 0 },
  completedDonors: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('DonationSession', donationSessionSchema);