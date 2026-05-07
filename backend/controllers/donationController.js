// backend/controllers/donationController.js
import BloodCamp from "../models/bloodCampModel.js";
import Donor from "../models/donorModel.js";
import DonationAppointment from "../models/DonationAppointment.js";
// KHÔNG cần import mongoose nếu không dùng transaction

// Lấy danh sách camps
export const getAvailableCamps = async (req, res) => {
  try {
    const camps = await BloodCamp.find({ 
      status: "Upcoming",
      date: { $gte: new Date() }
    })
    .populate("hospital", "name address phone")
    .sort({ date: 1 });
    
    res.json({
      success: true,
      data: { camps }
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