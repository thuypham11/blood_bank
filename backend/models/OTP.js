// backend/models/OTP.js
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // tự động xóa sau 5 phút
});

export default mongoose.model('OTP', otpSchema);