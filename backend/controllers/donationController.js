// backend/controllers/donationController.js
import BloodCamp from "../models/bloodCampModel.js";
import Donor from "../models/donorModel.js";
import DonationAppointment from "../models/DonationAppointment.js";
// KHÔNG cần import mongoose nếu không dùng transaction
import QRCode from 'qrcode';
import HealthDeclaration from '../models/HealthDeclaration.js';
// Lấy danh sách camps (dùng cho donor frontend)
export const getAvailableCamps = async (req, res) => {
  try {
    const { status, page = 1, limit = 9, q } = req.query;

    const filter = {};

    // Lọc status: mặc định chỉ Upcoming và Ongoing nếu không truyền
    if (status && status !== "all") {
      filter.status = status;
    } else if (!status) {
      filter.status = { $in: ["Upcoming", "Ongoing"] };
    }

    // Tìm kiếm theo tên, địa điểm
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { "location.venue": { $regex: q, $options: "i" } },
        { "location.city": { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [camps, total] = await Promise.all([
      BloodCamp.find(filter)
        .populate("hospital", "name address phone email")
        .sort({ date: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BloodCamp.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        camps,
        pagination: {
          total,
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get camps error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tạo lịch hẹn - KHÔNG DÙNG TRANSACTION
export const createAppointment = async (req, res) => {
  console.log("🔥 ===== CREATE APPOINTMENT =====");
  console.log("📦 Request body:", req.body);
  
  try {
    // Lấy donorId từ req.donor (đã được middleware gán)
    const donorId = req.donor?._id || req.donor?.id;
    const { campId, appointmentDate, appointmentTime } = req.body;
    
    console.log("📝 Parsed data:", { donorId, campId, appointmentDate, appointmentTime });
    
    // Validation
    if (!donorId) {
      return res.status(401).json({ 
        success: false, 
        message: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại." 
      });
    }
    
    if (!campId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ 
        success: false, 
        message: "Vui lòng cung cấp đầy đủ thông tin" 
      });
    }
    
    // Kiểm tra donor tồn tại
    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy người hiến máu" 
      });
    }
    
    // Kiểm tra camp tồn tại
    const camp = await BloodCamp.findById(campId);
    if (!camp) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy điểm hiến máu" 
      });
    }
    
    // Kiểm tra ngày
    const appointmentDateObj = new Date(appointmentDate);
    const campDate = new Date(camp.date);
    
    if (appointmentDateObj.toDateString() !== campDate.toDateString()) {
      return res.status(400).json({ 
        success: false, 
        message: "Ngày đặt lịch phải trùng với ngày diễn ra sự kiện" 
      });
    }
    
    // Kiểm tra trùng lịch
    const existingAppointment = await DonationAppointment.findOne({
      donor: donorId,
      camp: campId,
      status: { $in: ["pending", "confirmed", "checked_in"] }
    });
    
    if (existingAppointment) {
      return res.status(400).json({ 
        success: false, 
        message: "Bạn đã đặt lịch cho điểm hiến máu này rồi" 
      });
    }
    
    // Tạo appointment (KHÔNG dùng session)
    const appointment = new DonationAppointment({
      donor: donorId,
      camp: campId,
      appointmentDate: appointmentDateObj,
      appointmentTime,
      status: "confirmed"
    });
    
    await appointment.save();
    
    console.log("✅ Appointment created:", appointment._id);
    
    res.status(201).json({
      success: true,
      message: "Đặt lịch hiến máu thành công!",
      data: {
        appointmentId: appointment._id,
        camp: {
          id: camp._id,
          title: camp.title,
          location: camp.location,
          date: camp.date
        }
      }
    });
    
  } catch (error) {
    console.error("❌ Lỗi tạo lịch hẹn:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Lỗi server, vui lòng thử lại sau"
    });
  }
};

// Lấy danh sách lịch hẹn
export const getMyAppointments = async (req, res) => {
  try {
    const donorId = req.donor?._id || req.donor?.id;
    
    const appointments = await DonationAppointment.find({ donor: donorId })
      .populate("camp", "title location date time expectedDonors")
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    console.error("Lỗi lấy lịch hẹn:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Hủy lịch hẹn
export const cancelAppointment = async (req, res) => {
  try {
    const donorId = req.donor?._id || req.donor?.id;
    const { id } = req.params;
    const { reason } = req.body;
    
    const appointment = await DonationAppointment.findOne({
      _id: id,
      donor: donorId
    });
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });
    }
    
    if (appointment.status === "completed") {
      return res.status(400).json({ success: false, message: "Không thể hủy lịch hẹn đã hoàn thành" });
    }
    
    appointment.status = "cancelled";
    appointment.cancellationReason = reason || "Người dùng hủy";
    await appointment.save();
    
    res.json({
      success: true,
      message: "Đã hủy lịch hẹn thành công"
    });
  } catch (error) {
    console.error("Lỗi hủy lịch hẹn:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Thêm hàm mới: kiểm tra điều kiện (không tạo appointment)
export const checkAppointmentEligibility = async (req, res) => {
  try {
    const donorId = req.donor?._id || req.donor?.id;
    const { campId, appointmentDate, appointmentTime } = req.body;

    if (!donorId || !campId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin" });
    }

    // Kiểm tra camp tồn tại
    const camp = await BloodCamp.findById(campId);
    if (!camp) {
      return res.status(404).json({ success: false, message: "Điểm hiến máu không tồn tại" });
    }

    // Kiểm tra ngày
    const appointmentDateObj = new Date(appointmentDate);
    const campDate = new Date(camp.date);
    if (appointmentDateObj.toDateString() !== campDate.toDateString()) {
      return res.status(400).json({ success: false, message: "Ngày đặt lịch phải trùng với ngày diễn ra sự kiện" });
    }

    // Kiểm tra trùng lịch
    const existingAppointment = await DonationAppointment.findOne({
      donor: donorId,
      camp: campId,
      status: { $in: ["pending", "confirmed", "checked_in"] }
    });
    if (existingAppointment) {
      return res.status(400).json({ success: false, message: "Bạn đã đặt lịch cho điểm hiến máu này rồi" });
    }

    return res.json({ success: true, message: "Có thể đặt lịch" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Lỗi kiểm tra" });
  }
};

export const submitHealthDeclaration = async (req, res) => {
  try {
    const donorId = req.donor?._id || req.donor?.id;
    const { appointmentId, answers } = req.body;

    // Kiểm tra lịch hẹn tồn tại và thuộc donor, status confirmed
    const appointment = await DonationAppointment.findOne({
      _id: appointmentId,
      donor: donorId,
      status: 'confirmed'
    });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Lịch hẹn không hợp lệ' });
    }

    // Xóa declaration cũ (nếu có)
    await HealthDeclaration.deleteMany({ donor: donorId, appointment: appointmentId });

    // Tạo declaration mới
    const declaration = new HealthDeclaration({
      donor: donorId,
      appointment: appointmentId,
      answers
    });
    await declaration.save();

    // Tạo QR code chứa declarationId
    const qrPayload = JSON.stringify({ declarationId: declaration._id });
    const qrCode = await QRCode.toDataURL(qrPayload);
    declaration.qrCode = qrCode;
    await declaration.save();

    res.json({
      success: true,
      qrCode,
      declarationId: declaration._id,
      expiresAt: declaration.expiresAt
    });
  } catch (error) {
    console.error('Submit health declaration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// Helper tính khoảng cách (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // mét
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const checkLocationAndDate = async (req, res) => {
  try {
    const donorId = req.donor.id;
    const { appointmentId, latitude, longitude } = req.body;
    const appointment = await DonationAppointment.findById(appointmentId).populate('camp');
    if (!appointment) return res.status(404).json({ success: false, message: 'Lịch hẹn không tồn tại' });
    if (appointment.donor.toString() !== donorId) return res.status(403).json({ success: false, message: 'Không phải lịch hẹn của bạn' });

    // Kiểm tra ngày
    const today = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    if (today.toDateString() !== appointmentDate.toDateString()) {
      return res.status(400).json({ success: false, message: 'Hôm nay không phải ngày hiến máu của bạn' });
    }

    // Kiểm tra vị trí (bán kính 500m)
    const camp = appointment.camp;
    if (!camp.location?.coordinates) {
      return res.status(500).json({ success: false, message: 'Điểm hiến máu chưa được cấu hình tọa độ' });
    }
    const distance = getDistance(latitude, longitude, camp.location.coordinates.lat, camp.location.coordinates.lng);
    if (distance > 2000) {
      return res.status(400).json({ success: false, message: `Bạn chưa đến đúng điểm hiến máu (cách ${Math.round(distance)}m, yêu cầu trong bán kính 500m)` });
    }

    res.json({ success: true, message: 'Đã đến đúng địa điểm, có thể khai báo y tế' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

