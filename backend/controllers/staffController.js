// backend/controllers/staffController.js
import DonationSession from '../models/DonationSession.js';
import BloodUnit from '../models/BloodUnit.js';
import Donor from '../models/donorModel.js';
import QRCode from 'qrcode';
import mongoose from 'mongoose';

// Lấy danh sách phiên hiến của staff hôm nay
export const getTodaySessions = async (req, res) => {
  try {
    const staffId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sessions = await DonationSession.find({
      staff: staffId,
      date: { $gte: today, $lt: tomorrow },
      status: 'active'
    }).populate('camp', 'title location');
    
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy queue của một phiên hiến
export const getQueue = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await DonationSession.findById(sessionId)
      .populate('queue.donor', 'fullName phone bloodGroup')
      .populate('queue.appointment', 'appointmentTime');
    
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Thêm donor vào queue (khi check-in)
export const addToQueue = async (req, res) => {
  const io = req.app.get('io');
  
  try {
    const { sessionId, donorId, appointmentId } = req.body;
    
    const session = await DonationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Phiên hiến không tồn tại' });
    }
    
    // Kiểm tra donor đã trong queue chưa
    const existing = session.queue.find(q => q.donor.toString() === donorId);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Donor đã có trong hàng đợi' });
    }
    
    const position = session.queue.length + 1;
    session.queue.push({
      donor: donorId,
      appointment: appointmentId,
      status: 'waiting',
      position
    });
    session.totalDonors += 1;
    await session.save();
    
    // Gửi thông báo realtime
    io.to(`staff_${sessionId}`).emit('queue_updated', { queue: session.queue });
    io.to(`donor_${donorId}`).emit('queue_position', { position, sessionId });
    
    res.json({ success: true, data: { position, queue: session.queue } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Gọi donor tiếp theo
export const callNextDonor = async (req, res) => {
  const io = req.app.get('io');
  
  try {
    const { sessionId } = req.params;
    
    const session = await DonationSession.findById(sessionId)
      .populate('queue.donor', 'fullName phone bloodGroup');
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Phiên hiến không tồn tại' });
    }
    
    const nextIndex = session.queue.findIndex(d => d.status === 'waiting');
    if (nextIndex === -1) {
      return res.status(404).json({ success: false, message: 'Hàng đợi trống' });
    }
    
    session.queue[nextIndex].status = 'called';
    session.queue[nextIndex].calledAt = new Date();
    session.currentServing = session.queue[nextIndex].position;
    await session.save();
    
    const calledDonor = session.queue[nextIndex];
    
    // Gửi thông báo realtime
    io.to(`staff_${sessionId}`).emit('queue_updated', { queue: session.queue, currentServing: session.currentServing });
    io.to(`donor_${calledDonor.donor._id}`).emit('your_turn', {
      sessionId,
      position: calledDonor.position,
      message: 'Đến lượt bạn! Vui lòng vào khu vực hiến máu.'
    });
    
    res.json({ success: true, data: calledDonor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bắt đầu hiến máu (donor vào phòng)
export const startDonation = async (req, res) => {
  const io = req.app.get('io');
  
  try {
    const { sessionId, donorId } = req.body;
    
    const session = await DonationSession.findById(sessionId);
    const donorQueue = session.queue.find(d => d.donor.toString() === donorId && d.status === 'called');
    
    if (!donorQueue) {
      return res.status(404).json({ success: false, message: 'Donor chưa được gọi' });
    }
    
    donorQueue.status = 'donating';
    donorQueue.startedAt = new Date();
    await session.save();
    
    io.to(`staff_${sessionId}`).emit('queue_updated', { queue: session.queue });
    
    res.json({ success: true, message: 'Bắt đầu hiến máu' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Hoàn thành hiến máu và sinh barcode
export const completeDonation = async (req, res) => {
  const io = req.app.get('io');
  
  try {
    const { sessionId, donorId, volume, notes } = req.body;
    const staffId = req.user.id;
    
    const session = await DonationSession.findById(sessionId);
    const donorQueue = session.queue.find(d => d.donor.toString() === donorId && d.status === 'donating');
    
    if (!donorQueue) {
      return res.status(404).json({ success: false, message: 'Donor không trong trạng thái hiến máu' });
    }
    
    // Cập nhật queue
    donorQueue.status = 'completed';
    donorQueue.completedAt = new Date();
    donorQueue.notes = notes;
    session.completedDonors += 1;
    await session.save();
    
    // Lấy thông tin donor
    const donor = await Donor.findById(donorId);
    
    // Tạo barcode data
    const barcodeData = JSON.stringify({
      donorId: donor._id,
      donorName: donor.fullName,
      bloodGroup: donor.bloodGroup,
      donationDate: new Date(),
      staffId,
      sessionId,
      volume
    });
    
    // Tạo QR code image
    const qrCodeImage = await QRCode.toDataURL(barcodeData);
    
    // Tạo BloodUnit
    const bloodUnit = await BloodUnit.create({
      barcode: barcodeData,
      donor: donorId,
      bloodGroup: donor.bloodGroup,
      quantity: volume,
      donationDate: new Date(),
      collectionSite: session.camp,
      status: 'quarantine',
      screeningStatus: 'pending'
    });
    
    // Cập nhật donationHistory của donor
    donor.donationHistory.push({
      donationDate: new Date(),
      facility: session.camp,
      bloodGroup: donor.bloodGroup,
      quantity: volume,
      bloodUnitId: bloodUnit._id,
      verified: false
    });
    donor.lastDonationDate = new Date();
    await donor.save();
    
    // Gửi thông báo
    io.to(`staff_${sessionId}`).emit('queue_updated', { queue: session.queue });
    io.to(`donor_${donorId}`).emit('donation_completed', {
      message: 'Cảm ơn bạn đã hiến máu! Bạn có thể xem kết quả xét nghiệm sau vài ngày.'
    });
    
    res.json({ 
      success: true, 
      data: { bloodUnit, qrCode: qrCodeImage, queue: session.queue }
    });
  } catch (error) {
    console.error('Complete donation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy thống kê nhanh
export const getStats = async (req, res) => {
  try {
    const staffId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sessions = await DonationSession.find({
      staff: staffId,
      date: { $gte: today }
    });
    
    const totalWaiting = sessions.reduce((sum, s) => sum + s.queue.filter(q => q.status === 'waiting').length, 0);
    const totalCompleted = sessions.reduce((sum, s) => sum + s.completedDonors, 0);
    const totalDonors = sessions.reduce((sum, s) => sum + s.totalDonors, 0);
    
    res.json({
      success: true,
      data: {
        totalWaiting,
        totalCompleted,
        totalDonors,
        activeSessions: sessions.filter(s => s.status === 'active').length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};