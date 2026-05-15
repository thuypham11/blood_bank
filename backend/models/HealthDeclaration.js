import mongoose from 'mongoose';

const healthDeclarationSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'DonationAppointment', required: true },
  qrCode: { type: String }, // data URL của QR
  answers: {
    usedStimulants: { type: Boolean, default: false },
    usedCannabis: { type: Boolean, default: false },
    usedCocaine: { type: Boolean, default: false },
    usedHeroin: { type: Boolean, default: false },
    usedCorticoids: { type: Boolean, default: false },
    hasFever: { type: Boolean, default: false },
    hasCough: { type: Boolean, default: false },
    hasInfection: { type: Boolean, default: false },
    hasSkinDisease: { type: Boolean, default: false },
    hasAllergy: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 60 * 1000) } // 30 phút
});

export default mongoose.model('HealthDeclaration', healthDeclarationSchema);