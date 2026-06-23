// backend/models/Staff.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  phone: String,
  facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  role: { type: String, enum: ['staff', 'manager'], default: 'staff' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, { timestamps: true });

staffSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

export default mongoose.model('Staff', staffSchema);