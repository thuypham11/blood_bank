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
// backend/controllers/staffController.js
// Sửa lại hàm callNextDonor
export const callNextDonor = async (req, res) => {
  const io = req.app.get('io');
  
  try {
    const { sessionId } = req.params;
    
    console.log('📞 callNextDonor called for session:', sessionId);
    
    const session = await DonationSession.findById(sessionId)
      .populate('queue.donor', 'fullName phone bloodGroup');
    
    if (!session) {
      console.log('❌ Session not found:', sessionId);
      return res.status(404).json({ success: false, message: 'Phiên hiến không tồn tại' });
    }
    
    // Tìm donor đầu tiên có status 'waiting'
    const nextIndex = session.queue.findIndex(d => d.status === 'waiting');
    console.log('🔍 Next index:', nextIndex);
    console.log('📊 Queue statuses:', session.queue.map(d => ({ status: d.status, donor: d.donor?._id })));
    
    if (nextIndex === -1) {
      return res.status(404).json({ success: false, message: 'Hàng đợi trống' });
    }
    
    // Cập nhật status
    session.queue[nextIndex].status = 'called';
    session.queue[nextIndex].calledAt = new Date();
    session.currentServing = session.queue[nextIndex].position;
    
    await session.save();
    
    const calledDonor = session.queue[nextIndex];
    console.log('✅ Called donor:', calledDonor.donor?.fullName);
    
    // Gửi thông báo realtime nếu io tồn tại
    if (io) {
      io.to(`staff_${sessionId}`).emit('queue_updated', { 
        queue: session.queue, 
        currentServing: session.currentServing 
      });
      
      if (calledDonor.donor?._id) {
        io.to(`donor_${calledDonor.donor._id}`).emit('your_turn', {
          sessionId,
          position: calledDonor.position,
          message: 'Đến lượt bạn! Vui lòng vào khu vực hiến máu.'
        });
      }
    }
    
    res.json({ success: true, data: calledDonor });
    
  } catch (error) {
    console.error('❌ Error in callNextDonor:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
// Hoàn thành hiến máu và sinh barcode
// backend/controllers/staffController.js
// Hoàn thành hiến máu và sinh barcode
export const completeDonation = async (req, res) => {
  const io = req.app.get('io');
  
  try {
    const { sessionId, donorId, volume, notes } = req.body;
    const staffId = req.user.id;
    
    console.log('🔥 ===== COMPLETE DONATION =====');
    console.log('📦 Request body:', { sessionId, donorId, volume });
    
    const session = await DonationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Phiên hiến không tồn tại' });
    }
    
    // Tìm donor trong queue (called hoặc donating)
    const donorQueueIndex = session.queue.findIndex(
      d => d.donor.toString() === donorId && (d.status === 'called' || d.status === 'donating')
    );
    
    if (donorQueueIndex === -1) {
      return res.status(404).json({ success: false, message: 'Donor không trong trạng thái hiến máu' });
    }
    
    // Cập nhật queue
    const donorQueue = session.queue[donorQueueIndex];
    donorQueue.status = 'completed';
    donorQueue.completedAt = new Date();
    donorQueue.notes = notes;
    donorQueue.volume = volume;
    session.completedDonors += 1;
    await session.save();
    
    // Lấy thông tin donor - KHÔNG cập nhật donor, chỉ lấy thông tin
    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy donor' });
    }
    
    console.log('✅ Donor found:', { 
      id: donor._id, 
      fullName: donor.fullName, 
      bloodGroup: donor.bloodGroup,
      gender: donor.gender  // Log để kiểm tra
    });
    
    // Tạo barcode data (mã định danh duy nhất)
    const barcodeText = `BLOOD-${Date.now()}-${donorId.slice(-6)}-${volume}`;
    
    // Tạo QR code image
    const qrData = JSON.stringify({
      bloodUnitId: `BU-${Date.now()}`,
      donorId: donor._id,
      donorName: donor.fullName,
      bloodGroup: donor.bloodGroup,
      volume: volume,
      donationDate: new Date(),
      staffId,
      sessionId
    });
    
    const qrCodeImage = await QRCode.toDataURL(qrData);
    
    // Tạo BloodUnit - KHÔNG cập nhật donor
    const bloodUnit = await BloodUnit.create({
      barcode: barcodeText,
      qrCode: qrCodeImage,
      donor: donorId,
      bloodGroup: donor.bloodGroup,
      quantity: volume,
      donationDate: new Date(),
      collectionSite: session.camp,
      status: 'quarantine',
      screeningStatus: 'pending',
      staff: staffId,
      session: sessionId
    });
    
    // ✅ SỬA: Cập nhật donationHistory mà KHÔNG yêu cầu gender
    // Chỉ push vào donationHistory, không cập nhật các trường khác
    donor.donationHistory.push({
      donationDate: new Date(),
      facility: session.camp,
      bloodGroup: donor.bloodGroup,
      quantity: volume,
      bloodUnitId: bloodUnit._id,
      verified: false
    });
    donor.lastDonationDate = new Date();
    donor.totalDonations = (donor.totalDonations || 0) + 1;
    
    // Sử dụng save với validateModifiedOnly để tránh lỗi validation
    await donor.save({ validateModifiedOnly: true });
    
    console.log('✅ Donor updated successfully');
    
    // Gửi thông báo realtime
    if (io) {
      io.to(`staff_${sessionId}`).emit('queue_updated', { 
        queue: session.queue,
        completedDonors: session.completedDonors
      });
      
      io.to(`donor_${donorId}`).emit('donation_completed', {
        message: 'Cảm ơn bạn đã hiến máu! Bạn có thể xem kết quả xét nghiệm sau vài ngày.',
        bloodUnitId: bloodUnit._id
      });
    }
    
    // Trả về đầy đủ thông tin để in barcode
    res.json({ 
      success: true, 
      message: 'Hoàn thành hiến máu thành công!',
      data: { 
        bloodUnit: {
          _id: bloodUnit._id,
          barcode: bloodUnit.barcode,
          qrCode: qrCodeImage
        },
        donor: {
          _id: donor._id,
          fullName: donor.fullName,
          bloodGroup: donor.bloodGroup,
          phone: donor.phone,
          gender: donor.gender  // Thêm gender vào response
        },
        volume: volume,
        queue: session.queue,
        completedDonors: session.completedDonors
      }
    });
    
  } catch (error) {
    console.error('❌ Complete donation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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