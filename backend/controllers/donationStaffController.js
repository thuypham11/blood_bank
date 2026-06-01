// backend/controllers/donationStaffController.js
import DonationAppointment from '../models/DonationAppointment.js';
import Donor from '../models/donorModel.js';
import BloodUnit from '../models/BloodUnit.js';
import QRCode from 'qrcode';

// Tạo barcode duy nhất
function generateBarcode(bloodGroup) {
  const prefix = 'WB';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${bloodGroup}-${timestamp}-${random}`;
}

// Lấy hàng đợi
export const getQueue = async (req, res) => {
  try {
    const staff = req.staff;
    
    const queue = await DonationAppointment.find({
      camp: staff.assignedCamp,
      status: 'checked_in',
      calledStatus: { $in: ['pending', 'called', 'in_progress'] }
    })
    .populate('donor', 'fullName phone bloodGroup age gender')
    .sort({ queueNumber: 1, createdAt: 1 });
    
    const stats = {
      total: queue.length,
      waiting: queue.filter(q => q.calledStatus === 'pending').length,
      called: queue.filter(q => q.calledStatus === 'called').length,
      inProgress: queue.filter(q => q.calledStatus === 'in_progress').length,
    };
    
    res.json({ success: true, data: { queue, stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Gọi donor tiếp theo
export const callNextDonor = async (req, res) => {
  const io = req.app.get('io');
  const staff = req.staff;
  const { bedNumber } = req.body;
  
  try {
    const nextInQueue = await DonationAppointment.findOne({
      camp: staff.assignedCamp,
      status: 'checked_in',
      calledStatus: 'pending'
    })
    .sort({ queueNumber: 1, createdAt: 1 })
    .populate('donor', 'fullName');
    
    if (!nextInQueue) {
      return res.status(404).json({ success: false, message: 'Hàng đợi trống' });
    }
    
    nextInQueue.calledStatus = 'called';
    nextInQueue.calledAt = new Date();
    nextInQueue.bedNumber = bedNumber;
    await nextInQueue.save();
    
    // Gửi thông báo realtime
    io.to(`donor_${nextInQueue.donor._id}`).emit('donor_called', {
      bedNumber,
      campName: staff.name
    });
    
    res.json({ success: true, message: `Đã gọi donor vào giường ${bedNumber}`, data: nextInQueue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bắt đầu hiến (donor đã vào giường)
export const startDonation = async (req, res) => {
  const { appointmentId } = req.params;
  
  try {
    const appointment = await DonationAppointment.findById(appointmentId);
    appointment.calledStatus = 'in_progress';
    await appointment.save();
    
    res.json({ success: true, message: 'Đã bắt đầu hiến máu' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Hoàn thành hiến máu (tạo barcode)
export const completeDonation = async (req, res) => {
  const io = req.app.get('io');
  const { appointmentId } = req.params;
  const { quantity = 350 } = req.body;
  const staffId = req.staff._id;
  
  try {
    const appointment = await DonationAppointment.findById(appointmentId)
      .populate('donor', 'fullName bloodGroup');
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    // Tạo barcode
    const barcode = generateBarcode(appointment.donor.bloodGroup);
    
    // Tạo Blood Unit
    const bloodUnit = new BloodUnit({
      barcode,
      donor: appointment.donor._id,
      donationDate: new Date(),
      bloodGroup: appointment.donor.bloodGroup,
      productType: 'whole_blood',
      quantity,
      status: 'quarantine',
      screeningStatus: 'pending',
      facility: appointment.camp,
      expiryDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000)
    });
    await bloodUnit.save();
    
    // QR code để in
    const qrCode = await QRCode.toDataURL(barcode);
    
    // Cập nhật donor
    const donor = await Donor.findById(appointment.donor._id);
    donor.donationHistory.push({
      donationDate: new Date(),
      facility: appointment.camp,
      bloodGroup: appointment.donor.bloodGroup,
      quantity,
      bloodUnitId: bloodUnit._id,
      verified: false
    });
    donor.lastDonationDate = new Date();
    await donor.save();
    
    // Cập nhật appointment
    appointment.status = 'completed';
    appointment.calledStatus = 'completed';
    appointment.completedAt = new Date();
    appointment.completedBy = staffId;
    await appointment.save();
    
    // Gửi thông báo
    io.to(`donor_${appointment.donor._id}`).emit('donation_completed', {
      message: 'Cảm ơn bạn đã hiến máu!'
    });
    
    res.json({
      success: true,
      message: 'Xác nhận hiến máu thành công!',
      data: { barcode, qrCode, bloodUnitId: bloodUnit._id }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Trì hoãn donor
export const deferDonor = async (req, res) => {
  const { appointmentId } = req.params;
  const { reason } = req.body;
  
  try {
    const appointment = await DonationAppointment.findById(appointmentId);
    appointment.status = 'cancelled';
    appointment.cancellationReason = reason;
    await appointment.save();
    
    res.json({ success: true, message: 'Đã trì hoãn donor' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};