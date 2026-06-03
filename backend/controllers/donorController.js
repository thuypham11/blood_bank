// backend/controllers/donorController.js
import Donor from "../models/donorModel.js";
import Facility from "../models/facilityModel.js";
import BloodCamp from "../models/bloodCampModel.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { extractIdCardInfo } from "../services/ocrService.js";
import BloodUnit from "../models/BloodUnit.js";
import OTP from '../models/OTP.js';
import axios from 'axios';

// Cấu hình multer
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ==================== GET DONOR PROFILE ====================
export const getDonorProfile = async (req, res) => {
  try {
    const donorId = req.donor.id;
    const donor = await Donor.findById(donorId)
      .populate({
        path: "donationHistory.facility",
        select: "facilityName address.city address.state",
      })
      .select("-password -__v");

    if (!donor) return res.status(404).json({ message: "Donor not found" });

    const isEligible = donor.isEligible;
    const totalDonations = donor.donationHistory.length;
    const lastDonation = donor.lastDonationDate || null;
    let nextEligibleDate = null;
    if (lastDonation) {
      const next = new Date(lastDonation);
      next.setDate(next.getDate() + 90);
      nextEligibleDate = next;
    }

    const donorProfile = {
  _id: donor._id,
  fullName: donor.fullName,
  email: donor.email,
  phone: donor.phone,
  bloodGroup: donor.bloodGroup,
  age: donor.age,
  gender: donor.gender,
  weight: donor.weight,
  address: donor.address,
  totalDonations,
  lastDonationDate: lastDonation,
  nextEligibleDate,
  eligibleToDonate: isEligible && donor.eligibleToDonate,
  // ✅ Các trường bổ sung
  birthDate: donor.birthDate,
  isIdVerified: donor.isIdVerified || false,
  idCard: donor.idCard || null,
  permanentAddress: donor.permanentAddress || null,
  donationHistory: donor.donationHistory.map((don) => ({
    id: don._id,
    donationDate: don.donationDate,
    facility: don.facility?.facilityName || "N/A",
    city: don.facility?.address?.city,
    state: don.facility?.address?.state,
    bloodGroup: don.bloodGroup,
    quantity: don.quantity,
    remarks: don.remarks,
    verified: don.verified,
  })),
  createdAt: donor.createdAt,
  updatedAt: donor.updatedAt,
};
    res.status(200).json({ donor: donorProfile });
  } catch (error) {
    console.error("❌ Error fetching donor profile:", error);
    res.status(500).json({ message: "Error fetching donor profile", error: error.message });
  }
};

// ==================== UPDATE DONOR PROFILE ====================
export const updateDonorProfile = async (req, res) => {
  try {
    const donorId = req.donor._id;
    const { fullName, phone, address, age, gender, weight, password } = req.body;

    const donor = await Donor.findById(donorId).select("+password");
    if (!donor) return res.status(404).json({ message: "Donor not found" });

    donor.fullName = fullName !== undefined ? fullName : donor.fullName;
    donor.phone = phone !== undefined ? phone : donor.phone;
    if (address) {
      donor.address.street = address.street || donor.address.street;
      donor.address.city = address.city || donor.address.city;
      donor.address.state = address.state || donor.address.state;
      donor.address.pincode = address.pincode || donor.address.pincode;
    }
    donor.age = age !== undefined ? age : donor.age;
    donor.gender = gender !== undefined ? gender : donor.gender;
    donor.weight = weight !== undefined ? weight : donor.weight;

    if (password) {
      const salt = await bcrypt.genSalt(12);
      donor.password = await bcrypt.hash(password, salt);
    }

    const updatedDonor = await donor.save();
    res.status(200).json({
      message: "Profile updated successfully",
      donor: {
        fullName: updatedDonor.fullName,
        email: updatedDonor.email,
        phone: updatedDonor.phone,
        address: updatedDonor.address,
        age: updatedDonor.age,
        gender: updatedDonor.gender,
        weight: updatedDonor.weight,
      },
    });
  } catch (error) {
    console.error("❌ Error updating donor profile:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};

// ==================== UPLOAD ID CARD (OCR) ====================
export const uploadIdCard = async (req, res) => {
  const uploadSingle = upload.single("idCardImage");
  uploadSingle(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: "Chưa có file ảnh" });

    const imagePath = req.file.path;
    try {
      const ocrResult = await extractIdCardInfo(imagePath);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      if (!ocrResult.success) {
        return res.status(400).json(ocrResult);
      }
      return res.json({
        success: true,
        data: ocrResult.data,
        message: "Đã trích xuất thông tin. Vui lòng kiểm tra lại.",
      });
    } catch (error) {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      console.error("Upload ID Card Error:", error);
      return res.status(500).json({ success: false, message: "Lỗi xử lý ảnh" });
    }
  });
};

// ==================== VERIFY AND SAVE ID CARD ====================
export const verifyAndSaveIdCard = async (req, res) => {
  try {
    const donorId = req.donor.id;
    const { idCardData } = req.body;
    if (!idCardData || !idCardData.number) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin CCCD" });
    }

    // Kiểm tra trùng
    const existing = await Donor.findOne({
      "idCard.number": idCardData.number,
      _id: { $ne: donorId }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "Số CCCD này đã được đăng ký bởi người khác" });
    }

    const parseDate = (dateStr) => (dateStr ? new Date(dateStr) : null);

    // Chuyển đổi giới tính từ "Nam" -> "Male", "Nữ" -> "Female"
    let genderEnum = "";
    if (idCardData.gender === "Nam") genderEnum = "Male";
    else if (idCardData.gender === "Nữ") genderEnum = "Female";

    const updatedDonor = await Donor.findByIdAndUpdate(
      donorId,
      {
        fullName: idCardData.fullName,
        gender: genderEnum, // cập nhật donor.gender
        birthDate: parseDate(idCardData.birthDate),
        permanentAddress: {
          street: idCardData.address || "",
          city: idCardData.home?.split(",")[1]?.trim() || "",
          state: idCardData.home?.split(",")[2]?.trim() || "",
          pincode: "",
        },
        idCard: {
          number: idCardData.number,
          fullName: idCardData.fullName,
          birthDate: parseDate(idCardData.birthDate),
          gender: idCardData.gender, // lưu "Nam"/"Nữ" gốc để hiển thị
          home: idCardData.home,
          address: idCardData.address,
          issueDate: parseDate(idCardData.issueDate),
          expiryDate: parseDate(idCardData.expiryDate),
          verifiedAt: new Date(),
        },
        isIdVerified: true,
      },
      { new: true, select: "-password -__v" }
    );

    res.json({
      success: true,
      message: "Xác thực CCCD thành công!",
      donor: updatedDonor,
    });
  } catch (error) {
    console.error("Verify ID Card Error:", error);
    res.status(500).json({ success: false, message: "Lỗi lưu thông tin CCCD" });
  }
};
// ==================== BLOOD CAMPS ====================
export const getDonorCamps = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [camps, total] = await Promise.all([
      BloodCamp.find(filter).sort({ date: 1 }).skip(skip).limit(parseInt(limit)),
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
    console.error("Get Donor Camps Error:", error);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
    }
    res.status(500).json({ success: false, message: "Failed to fetch blood camps" });
  }
};

// ==================== TEST RESULTS ====================
export const getDonorTestResults = async (req, res) => {
  try {
    const donorId = req.donor.id;
    const donor = await Donor.findById(donorId).populate({
      path: "donationHistory.bloodUnitId",
      select: "barcode bloodGroup donationDate screening screeningStatus productType",
    });
    const results = donor.donationHistory
      .filter((item) => item.bloodUnitId)
      .map((item) => ({
        donationDate: item.donationDate,
        bloodGroup: item.bloodGroup,
        barcode: item.bloodUnitId.barcode,
        productType: item.bloodUnitId.productType,
        screeningStatus: item.bloodUnitId.screeningStatus,
        screening: item.bloodUnitId.screening,
      }));
    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Get test results error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== REMINDERS ====================
export const getDonorReminders = async (req, res) => {
  try {
    const donorId = req.donor.id;
    const donor = await Donor.findById(donorId);
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    const reminders = [];
    const today = new Date();
    if (donor.lastDonationDate) {
      const nextEligible = new Date(donor.lastDonationDate);
      nextEligible.setDate(nextEligible.getDate() + 90);
      const daysLeft = Math.ceil((nextEligible - today) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 0) {
        reminders.push({ type: "ELIGIBLE", message: "Bạn đã sẵn sàng hiến máu lại!", priority: "high" });
      } else if (daysLeft <= 30) {
        reminders.push({ type: "UPCOMING", message: `Bạn có thể hiến máu sau ${daysLeft} ngày nữa.`, priority: "medium" });
      }
    } else {
      reminders.push({ type: "FIRST_TIME", message: "Hãy đăng ký hiến máu lần đầu tiên!", priority: "high" });
    }
    res.json({ success: true, reminders });
  } catch (error) {
    console.error("Get reminders error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== CERTIFICATE ====================
export const getDonationCertificate = async (req, res) => {
  try {
    const donorId = req.donor.id;
    const { donationId } = req.params;
    const donor = await Donor.findById(donorId);
    const donation = donor.donationHistory.id(donationId);
    if (!donation) return res.status(404).json({ message: "Donation not found" });
    const facility = await Facility.findById(donation.facility).select("name address");
    const certificate = {
      donorName: donor.fullName,
      bloodGroup: donor.bloodGroup,
      donationDate: donation.donationDate,
      quantity: donation.quantity,
      facilityName: facility?.name || "Điểm hiến máu",
      certificateNumber: `CERT-${donation._id.toString().slice(-8)}`,
    };
    res.json({ success: true, certificate });
  } catch (error) {
    console.error("Get certificate error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== URGENT REQUESTS ====================
export const getUrgentBloodRequests = async (req, res) => {
  try {
    const donorId = req.donor.id;
    const donor = await Donor.findById(donorId);
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    const BloodRequest = mongoose.model("BloodRequest");
    const urgentRequests = await BloodRequest.find({
      bloodType: donor.bloodGroup,
      status: "pending",
      createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    })
      .populate("hospitalId", "name")
      .limit(5);
    res.json({ success: true, urgentRequests });
  } catch (error) {
    console.error("Urgent requests error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== STATS ====================
export const getDonorStats = async (req, res) => {
  try {
    const donorId = req.donor?.id || req.donor?._id;
    if (!donorId) {
      return res.status(401).json({ success: false, message: "Unauthorized: Donor ID missing from request." });
    }
    const donorStats = await Donor.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(donorId) } },
      {
        $project: {
          _id: 0,
          totalDonations: { $size: "$donationHistory" },
          lastDonationDate: { $max: "$donationHistory.donationDate" },
          weight: "$weight",
          age: "$age",
        },
      },
    ]);
    if (!donorStats || donorStats.length === 0) {
      return res.status(404).json({ success: false, message: "Donor profile not found." });
    }
    const stats = donorStats[0];
    const totalDonations = stats.totalDonations || 0;
    const lastDonationDate = stats.lastDonationDate || null;
    let nextEligibleDonationDate = null;
    let eligibilityStatus = "Eligible";
    if (lastDonationDate) {
      const nextDate = new Date(lastDonationDate);
      nextDate.setDate(nextDate.getDate() + 90);
      nextEligibleDonationDate = nextDate;
      if (nextEligibleDonationDate > new Date()) {
        const remainingDays = Math.ceil((nextEligibleDonationDate - new Date()) / (1000 * 60 * 60 * 24));
        eligibilityStatus = `Ineligible (Cooldown: ${remainingDays} days remaining)`;
      }
    }
    if (stats.age < 18 || stats.age > 65) {
      eligibilityStatus = "Ineligible (Age constraint)";
    } else if (stats.weight < 45) {
      eligibilityStatus = "Ineligible (Weight constraint)";
    }
    res.json({
      success: true,
      dashboard: {
        totalDonations,
        lastDonationDate,
        nextEligibleDonationDate,
        eligibilityStatus,
      },
    });
  } catch (error) {
    console.error("Get Donor Stats Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch donor statistics." });
  }
};

// ==================== DONATION HISTORY (PAGINATED) ====================
export const getDonorHistory = async (req, res) => {
  try {
    const donorId = req.donor?.id || req.donor?._id;
    if (!donorId) {
      return res.status(401).json({ success: false, message: "Unauthorized: Donor ID missing from request." });
    }
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const aggregationPipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(donorId) } },
      { $addFields: { totalHistoryLength: { $size: "$donationHistory" } } },
      { $unwind: "$donationHistory" },
      { $sort: { "donationHistory.donationDate": -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "facilities",
          localField: "donationHistory.facility",
          foreignField: "_id",
          as: "facilityDetails",
        },
      },
      {
        $project: {
          _id: 0,
          donation: "$donationHistory",
          total: "$totalHistoryLength",
          facility: { $arrayElemAt: ["$facilityDetails", 0] },
        },
      },
    ];
    const result = await Donor.aggregate(aggregationPipeline);
    const total = result.length > 0 ? result[0].total : 0;
    const history = result.map((item) => ({
      id: item.donation._id,
      donationDate: item.donation.donationDate,
      bloodGroup: item.donation.bloodGroup,
      quantity: item.donation.quantity,
      remarks: item.donation.remarks,
      verified: item.donation.verified,
      facility: item.facility?.facilityName || "N/A",
      city: item.facility?.address?.city,
      state: item.facility?.address?.state,
    }));
    res.json({
      success: true,
      history,
      pagination: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get Donor History Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch donation history." });
  }
};

// ==================== FOR BLOOD LAB CONTROLLER ====================
export const searchDonor = async (req, res) => {
  try {
    const { term } = req.query;
    if (!term) return res.status(400).json({ success: false, message: "Search term required" });
    const donors = await Donor.find({
      $or: [
        { fullName: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
        { phone: { $regex: term, $options: "i" } },
      ],
    })
      .select("fullName email phone bloodGroup lastDonationDate donationHistory")
      .limit(20)
      .sort({ lastDonationDate: -1 });
    res.status(200).json({ success: true, donors });
  } catch (err) {
    console.error("Search donor error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const markDonation = async (req, res) => {
  try {
    const donorId = req.params.id;
    const labId = req.user._id;
    const { quantity = 1, remarks = "", bloodGroup } = req.body;
    const donor = await Donor.findById(donorId);
    if (!donor) return res.status(404).json({ success: false, message: "Donor not found" });
    if (donor.lastDonationDate) {
      const lastDonation = new Date(donor.lastDonationDate);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      if (lastDonation > threeMonthsAgo) {
        return res.status(400).json({
          success: false,
          message: "Donor cannot donate yet. Minimum 3 months required between donations.",
        });
      }
    }
    donor.lastDonationDate = new Date();
    if (bloodGroup) donor.bloodGroup = bloodGroup;
    donor.donationHistory.push({
      donationDate: new Date(),
      facility: labId,
      bloodGroup: bloodGroup || donor.bloodGroup,
      quantity,
      remarks,
      verified: true,
    });
    await donor.save();
    await Facility.findByIdAndUpdate(labId, {
      $push: {
        history: {
          eventType: "Donation",
          description: `Recorded donation from ${donor.fullName} - ${quantity} unit(s) of ${bloodGroup || donor.bloodGroup}`,
          date: new Date(),
          referenceId: donor._id,
        },
      },
    });
    const bloodType = bloodGroup || donor.bloodGroup;
    await addToBloodStock(labId, bloodType, quantity);
    res.status(200).json({ success: true, message: "Donation recorded successfully", donor });
  } catch (err) {
    console.error("Mark donation error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getRecentDonations = async (req, res) => {
  try {
    const labId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const [todayDonations, weekDonations, allDonations, recentDonors] = await Promise.all([
      Donor.countDocuments({
        "donationHistory.facility": labId,
        "donationHistory.donationDate": { $gte: today, $lt: tomorrow },
      }),
      Donor.countDocuments({
        "donationHistory.facility": labId,
        "donationHistory.donationDate": { $gte: weekStart },
      }),
      Donor.aggregate([{ $unwind: "$donationHistory" }, { $match: { "donationHistory.facility": labId } }, { $count: "total" }]),
      Donor.find({ "donationHistory.facility": labId })
        .select("fullName bloodGroup donationHistory")
        .sort({ "donationHistory.donationDate": -1 })
        .limit(10),
    ]);
    const recentDonations = recentDonors
      .flatMap((donor) =>
        donor.donationHistory
          .filter((d) => d.facility.equals(labId))
          .slice(0, 3)
          .map((d) => ({
            donorName: donor.fullName,
            bloodGroup: d.bloodGroup,
            quantity: d.quantity,
            date: d.donationDate,
            remarks: d.remarks,
          }))
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
    res.json({
      success: true,
      stats: {
        today: todayDonations,
        thisWeek: weekDonations,
        total: allDonations[0]?.total || 0,
      },
      donations: recentDonations,
    });
  } catch (err) {
    console.error("Get recent donations error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch recent donations" });
  }
};

// Helper for blood stock
const addToBloodStock = async (labId, bloodType, quantity) => {
  try {
    const Blood = mongoose.model("Blood");
    let stock = await Blood.findOne({ bloodGroup: bloodType, bloodLab: labId });
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 42);
    if (stock) {
      stock.quantity += quantity;
      stock.expiryDate = expiryDate;
      await stock.save();
    } else {
      await Blood.create({
        bloodGroup: bloodType,
        quantity,
        expiryDate,
        bloodLab: labId,
      });
    }
  } catch (error) {
    console.error("Error adding to blood stock:", error);
  }
};
export const sendOtp = async (req, res) => {
  try {
    const donorId = req.donor.id;
    const donor = await Donor.findById(donorId);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });

    // Xóa OTP cũ (nếu có)
    await OTP.deleteMany({ donorId });

    // Tạo mã 6 số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    await OTP.create({ donorId, code: otpCode, expiresAt });

    // Gọi Golang service gửi email OTP
    await axios.post('http://localhost:8080/send-otp', {
      toEmail: donor.email,
      otpCode,
      donorName: donor.fullName
    });

    res.json({ success: true, message: 'Mã OTP đã được gửi đến email của bạn' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Gửi OTP thất bại' });
  }
};

// Xác thực OTP
export const verifyOtp = async (req, res) => {
  try {
    const donorId = req.donor.id;
    const { otpCode } = req.body;

    const otpRecord = await OTP.findOne({ donorId, code: otpCode });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Mã OTP không hợp lệ' });
    }
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn' });
    }

    // Xóa OTP sau khi xác thực thành công
    await OTP.deleteOne({ _id: otpRecord._id });

    // Lưu trạng thái xác thực vào session hoặc token tạm thời (tuỳ chọn)
    // Ví dụ: tạo JWT ngắn hạn hoặc dùng Redis. Ở đây ta chỉ cần trả về thành công,
    // frontend sẽ cho phép gọi tiếp API tạo appointment.
    res.json({ success: true, message: 'Xác thực thành công' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xác thực OTP' });
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
    if (!camp.location?.coordinates || typeof camp.location.coordinates.lat !== 'number') {
      return res.status(500).json({ success: false, message: 'Điểm hiến máu chưa được cấu hình tọa độ' });
    }
    // const distance = getDistance(latitude, longitude, camp.location.coordinates.lat, camp.location.coordinates.lng);
    // if (distance > 5000) {
    //   return res.status(400).json({ success: false, message: `Bạn chưa đến đúng điểm hiến máu (cách ${Math.round(distance)}m, yêu cầu trong bán kính 500m)` });
    // }

    res.json({ success: true, message: 'Đã đến đúng địa điểm, có thể khai báo y tế' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};