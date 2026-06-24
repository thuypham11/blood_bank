import Donor from "../models/donorModel.js";
import Facility from "../models/facilityModel.js";
import Admin from "../models/adminModel.js";
import BloodCamp from "../models/bloodCampModel.js";
import BloodModel from "../models/BloodModel.js";
import BloodRequest from "../models/bloodRequestModel.js";
import AuditLog from "../models/AuditLogModel.js";
import Notification from "../models/NotificationModel.js";
import DonationSession from "../models/DonationSession.js";
import Staff from "../models/Staff.js";
import mongoose from "mongoose";
import { sendDonorPasswordReset } from "../services/emailService.js";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DEFAULT_UNIT_VOLUME_ML = 450;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);
const getBloodGroup = (item) => item.bloodGroup || item.bloodType;
const toObjectId = (value) => (
  value && mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value
);
const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const getDateKey = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};
/* ==============================================================
   DASHBOARD STATS
   ============================================================== */
export const getDashboardStats = async (_req, res) => {
  try {
    const totalDonors = await Donor.countDocuments();
    const totalFacilities = await Facility.countDocuments();
    const pendingFacilities = await Facility.countDocuments({ status: "pending" });
    const approvedFacilities = await Facility.countDocuments({ status: "approved" });

    const donors = await Donor.find({}, "donationHistory bloodGroup eligibleToDonate");
    const totalDonations = donors.reduce((sum, d) => sum + (d.donationHistory?.length || 0), 0);
    const activeDonors = donors.filter((d) => d.eligibleToDonate).length;

    const upcomingCamps = await BloodCamp.countDocuments({ status: { $in: ["Upcoming", "Ongoing"] } });
    const totalBloodUnits = await BloodModel.countDocuments({ status: "available" });
    const expiringSoon = await BloodModel.countDocuments({
      status: { $in: ["available", "pending_testing"] },
      $or: [
        { expiryDate: { $lte: new Date(Date.now() + 7 * 86400000), $gt: new Date() } },
        { expirationDate: { $lte: new Date(Date.now() + 7 * 86400000), $gt: new Date() } },
      ],
    });
    const pendingRequests = await BloodRequest.countDocuments({ status: "pending" });

    const bloodTypeStats = {};
    const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
    bloodGroups.forEach((g) => { bloodTypeStats[g] = 0; });
    donors.forEach((d) => {
      if (d.bloodGroup && bloodTypeStats[d.bloodGroup] !== undefined) bloodTypeStats[d.bloodGroup]++;
    });

    res.status(200).json({
      totalDonors, totalFacilities, approvedFacilities, pendingFacilities,
      totalDonations, activeDonors, upcomingCamps, bloodTypeStats,
      totalBloodUnits, expiringSoon, pendingRequests,
    });
  } catch (err) {
    console.error("Admin Stats Error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

/* ==============================================================
   DONOR MANAGEMENT
   ============================================================== */
export const getAllDonors = async (req, res) => {
  try {
    const { search, bloodGroup, eligible, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.$or = [{ fullName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }, { phone: { $regex: search, $options: "i" } }];
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (eligible === "true") filter.eligibleToDonate = true;
    if (eligible === "false") filter.eligibleToDonate = false;

    const total = await Donor.countDocuments(filter);
    const donors = await Donor.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, donors, total, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (err) {
    res.status(500).json({ message: "Error fetching donors" });
  }
};

export const getDonorById = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id).select("-password");
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    res.status(200).json({ donor });
  } catch (err) {
    res.status(500).json({ message: "Error fetching donor" });
  }
};

export const updateDonor = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.password) {
      delete updateData.password; // Don't allow password update here, or hash it if needed
    }
    const donor = await Donor.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select("-password");
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    res.status(200).json({ success: true, donor });
  } catch (err) {
    res.status(500).json({ message: "Error updating donor", error: err.message });
  }
};

export const deleteDonor = async (req, res) => {
  try {
    const donor = await Donor.findByIdAndDelete(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    res.status(200).json({ success: true, message: "Donor deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting donor" });
  }
};

/* ==============================================================
   FACILITY MANAGEMENT
   ============================================================== */
export const getAllFacilities = async (req, res) => {
  try {
    const { search, status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    if (status) filter.status = status;
    if (type) filter.facilityType = type;

    const total = await Facility.countDocuments(filter);
    const facilities = await Facility.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, facilities, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Error fetching facilities" });
  }
};

export const approveFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) return res.status(404).json({ message: "Facility not found" });
    await Facility.updateOne({ _id: req.params.id }, { $set: { status: "approved", approvedAt: new Date() } });
    const updated = await Facility.findById(req.params.id).select("-password");
    res.status(200).json({ message: "Facility approved", facility: updated });
  } catch (err) {
    res.status(500).json({ message: "Error approving facility" });
  }
};

export const rejectFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) return res.status(404).json({ message: "Facility not found" });
    const { rejectionReason } = req.body;
    if (!rejectionReason) return res.status(400).json({ message: "Rejection reason is required." });
    await Facility.updateOne({ _id: req.params.id }, { $set: { status: "rejected", rejectionReason } });
    const updated = await Facility.findById(req.params.id).select("-password");
    res.status(200).json({ message: "Facility rejected", facility: updated });
  } catch (err) {
    res.status(500).json({ message: "Error rejecting facility" });
  }
};

export const deleteFacility = async (req, res) => {
  try {
    const facility = await Facility.findByIdAndDelete(req.params.id);
    if (!facility) return res.status(404).json({ message: "Facility not found" });
    res.status(200).json({ success: true, message: "Facility deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting facility" });
  }
};

/* ==============================================================
   ADMIN PROFILE
   ============================================================== */
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.status(200).json({ admin });
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile" });
  }
};

export const updateAdminProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    if (name) admin.name = name.trim();
    if (email) admin.email = email.trim().toLowerCase();
    await admin.save();
    const updated = await Admin.findById(req.user.id).select("-password");
    res.status(200).json({ message: "Profile updated", admin: updated });
  } catch (err) {
    res.status(500).json({ message: "Error updating profile" });
  }
};

export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Cần cung cấp mật khẩu hiện tại và mật khẩu mới" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    const admin = await Admin.findById(req.user.id).select("+password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    admin.password = newPassword;
    await admin.save();
    res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    res.status(500).json({ message: "Error changing password" });
  }
};

/* ==============================================================
   ADMIN MANAGEMENT (RBAC) - Superadmin only
   ============================================================== */
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, admins });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching admins" });
  }
};

export const createAdminUser = async (req, res) => {
  try {
    const { name, email, password, role, department, permissions } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Name, email and password are required" });
    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "Email đã được sử dụng" });
    const admin = await Admin.create({
      name, email, password,
      role: role || "admin",
      department: department || "admin",
      permissions: permissions || []
    });
    const result = admin.toObject();
    delete result.password;
    res.status(201).json({ success: true, message: "Tạo tài khoản Admin thành công", admin: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Error creating admin" });
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    const { name, email, password, role, department, permissions, isActive } = req.body;
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (password && password.trim()) admin.password = password; // triggers pre-save hash
    if (role) admin.role = role;
    if (department) admin.department = department;
    if (permissions) admin.permissions = permissions;
    if (isActive !== undefined) admin.isActive = isActive;
    await admin.save();
    const result = admin.toObject();
    delete result.password;
    res.status(200).json({ success: true, message: "Cập nhật Admin thành công", admin: result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating admin" });
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, message: "Không thể xóa tài khoản đang đăng nhập" });
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    if (admin.role === "superadmin")
      return res.status(400).json({ success: false, message: "Không thể xóa Superadmin" });
    await admin.deleteOne();
    res.status(200).json({ success: true, message: "Đã xóa tài khoản Admin" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting admin" });
  }
};

/* ==============================================================
   BLOOD REQUEST MANAGEMENT
   ============================================================== */
export const getAllBloodRequests = async (req, res) => {
  try {
    const { status, bloodType, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (bloodType) filter.bloodType = bloodType;

    const total = await BloodRequest.countDocuments(filter);
    const requests = await BloodRequest.find(filter)
      .populate("hospitalId", "name address phone facilityType")
      .populate("labId", "name address phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, requests, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("getAllBloodRequests error:", err);
    res.status(500).json({ success: false, message: "Error fetching blood requests" });
  }
};

export const approveBloodRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu" });
    request.status = "accepted";
    request.handoverStatus = "preparing";
    request.processedAt = new Date();
    request.handoverTimeline.push({
      status: "preparing",
      label: "Yeu cau duoc duyet va dang chuan bi",
      date: new Date(),
      actor: request.labId,
      note: "Approved by admin",
    });
    await request.save();
    await AuditLog.create({
      action: "APPROVE_BLOOD_REQUEST",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "BloodRequest", targetId: request._id },
      description: `Duyệt yêu cầu ${request.units} đơn vị ${request.bloodType}`,
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, message: "Yêu cầu đã được duyệt", request });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi duyệt yêu cầu" });
  }
};

export const rejectBloodRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu" });
    request.status = "rejected";
    request.handoverTimeline.push({
      status: "rejected",
      label: "Yeu cau bi tu choi",
      date: new Date(),
      actor: request.labId,
      note: reason || "Rejected by admin",
    });
    request.rejectionReason = reason || "Bị từ chối bởi Admin";
    await request.save();
    await AuditLog.create({
      action: "REJECT_BLOOD_REQUEST",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "BloodRequest", targetId: request._id },
      description: `Từ chối yêu cầu máu: ${reason}`,
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, message: "Yêu cầu đã bị từ chối", request });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi từ chối yêu cầu" });
  }
};

/* ==============================================================
   BLOOD STOCK MANAGEMENT
   ============================================================== */
export const getGlobalBloodStock = async (_req, res) => {
  try {
    const stock = await BloodModel.aggregate([
      { $group: { _id: { group: "$bloodGroup", status: "$status" }, count: { $sum: 1 }, totalML: { $sum: "$quantity" } } },
    ]);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000);
    const expiringSoon = await BloodModel.find({
      status: { $in: ["available", "pending_testing"] },
      $or: [
        { expiryDate: { $lte: sevenDaysFromNow, $gt: new Date() } },
        { expirationDate: { $lte: sevenDaysFromNow, $gt: new Date() } },
      ],
    })
      .populate("bloodLab", "name address")
      .sort({ expiryDate: 1 });
    res.status(200).json({ success: true, stock, expiringSoon });
  } catch (err) {
    console.error("getGlobalBloodStock error:", err);
    res.status(500).json({ success: false, message: "Error fetching blood stock" });
  }
};

export const getBloodStockUnits = async (req, res) => {
  try {
    const { bloodGroup, status, labId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (status) filter.status = status;
    if (labId) filter.bloodLab = labId;
    const total = await BloodModel.countDocuments(filter);
    const units = await BloodModel.find(filter)
      .populate("bloodLab", "name address")
      .populate("donor", "fullName bloodGroup phone")
      .sort({ expiryDate: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.status(200).json({ success: true, units, total, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (err) {
    console.error("getBloodStockUnits error:", err);
    res.status(500).json({ success: false, message: "Lỗi tải danh sách đơn vị máu" });
  }
};

export const addBloodUnit = async (req, res) => {
  try {
    const { bloodGroup, quantity, bloodLab, collectionDate, screeningResult, donorId } = req.body;
    if (!bloodGroup) return res.status(400).json({ success: false, message: "Nhóm máu là bắt buộc" });
    const barcode = `BLD-${Date.now()}-${Math.floor(Math.random() * 99999)}`;

    // Validate donor if provided
    let donor = null;
    if (donorId) {
      donor = await Donor.findById(donorId);
      if (!donor) return res.status(404).json({ success: false, message: "Không tìm thấy người hiến máu" });
    }

    const collDate = collectionDate ? new Date(collectionDate) : new Date();
    const unit = await BloodModel.create({
      barcode, bloodGroup, bloodType: bloodGroup,
      quantity: quantity || 250,
      bloodLab,
      donor: donorId || undefined,
      collectionDate: collDate,
      screeningResult: screeningResult || { hiv: "pending", hbv: "pending", hcv: "pending" },
      status: "pending_testing",
    });

    // ✅ Nếu có người hiến máu, cập nhật lịch sử hiến máu của họ
    if (donor) {
      donor.donationHistory.push({
        donationDate: collDate,
        facility: bloodLab || undefined,
        bloodGroup: bloodGroup,
        quantity: quantity || 250,
        bloodUnitId: unit._id,
        verified: false,
      });
      donor.lastDonationDate = collDate;
      await donor.save();
    }

    await AuditLog.create({
      action: "ADD_BLOOD_UNIT",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "Blood", targetId: unit._id },
      description: `Nhập kho ${quantity}ml ${bloodGroup} (${barcode})${donor ? ` - Người hiến: ${donor.fullName}` : ""}`,
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, message: "Đã thêm đơn vị máu vào kho", unit });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi thêm đơn vị máu: " + err.message });
  }
};

export const updateBloodUnit = async (req, res) => {
  try {
    const { status, screeningResult } = req.body;
    const unit = await BloodModel.findByIdAndUpdate(
      req.params.id,
      { $set: { status, screeningResult } },
      { new: true }
    );
    if (!unit) return res.status(404).json({ success: false, message: "Không tìm thấy đơn vị máu" });
    res.status(200).json({ success: true, message: "Cập nhật đơn vị máu thành công", unit });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi cập nhật" });
  }
};

/* ==============================================================
   BLOOD CAMPS
   ============================================================== */
export const getAllCamps = async (req, res) => {
  try {
    const { status, city, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (city) filter["location.city"] = { $regex: city, $options: "i" };

    const total = await BloodCamp.countDocuments(filter);
    const camps = await BloodCamp.find(filter)
      .populate("hospital", "name phone email")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.status(200).json({ success: true, camps, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Error in getAllCamps:", err);
    res.status(500).json({ success: false, message: "Error fetching blood camps", error: err.message });
  }
};

export const createCamp = async (req, res) => {
  try {
    const { title, date, time, location, hospital, expectedDonors, description } = req.body;

    // Validation cơ bản
    if (!title || !date) {
      return res.status(400).json({ success: false, message: "Tiêu đề và ngày là bắt buộc" });
    }

    // Tạo camp
    const camp = await BloodCamp.create({
      title,
      date,
      time,
      location: {
        venue: location?.venue || title,
        address: location?.address || "",
        city: location?.city || "",
        state: location?.state || "",
        coordinates: { lat: location?.lat || 10.7769, lng: location?.lng || 106.7009 },
      },
      hospital: hospital || req.body.organizer,
      organizer: hospital || req.body.organizer,
      expectedDonors: expectedDonors || 0,
      description: description || "",
      status: "Upcoming",
    });

    // ===== TẠO DONATION SESSION =====
    // 1. Lấy ID của facility (hospital)
    const facilityId = camp.hospital; // hoặc hospital từ req.body

    // 2. Tìm nhân viên đầu tiên thuộc facility đó
    let staff = null;
    if (facilityId) {
      staff = await Staff.findOne({ facility: facilityId });
    }

    // 3. Xác định trạng thái session: nếu ngày diễn ra là hôm nay → active, nếu chưa đến → vẫn active (hoặc có thể set thành scheduled nếu schema hỗ trợ)
    // Hiện schema chỉ có active/completed/cancelled, nên ta dùng active
    const sessionStatus = 'active'; // hoặc có thể kiểm tra nếu new Date(date) <= today thì active, còn không thì active cũng được

    // 4. Tạo DonationSession
    const session = await DonationSession.create({
      camp: camp._id,
      staff: staff ? staff._id : null,
      date: new Date(date), // ngày diễn ra camp
      status: sessionStatus,
      queue: [],
      totalDonors: 0,
      completedDonors: 0,
    });

    // Ghi log cho việc tạo camp
    await AuditLog.create({
      action: "CREATE_BLOOD_CAMP",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "BloodCamp", targetId: camp._id },
      description: `Tạo chiến dịch hiến máu: ${title}`,
      ipAddress: req.ip,
    });

    // Ghi log thêm cho việc tạo session (tùy chọn)
    await AuditLog.create({
      action: "CREATE_DONATION_SESSION",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "DonationSession", targetId: session._id },
      description: `Tạo phiên hiến máu cho camp "${title}" với nhân viên ${staff ? staff.fullName : 'chưa có'}`,
      ipAddress: req.ip,
    });

    // Trả về kết quả kèm thông tin session
    res.status(201).json({
      success: true,
      message: "Đã tạo chiến dịch hiến máu và phiên hiến máu tương ứng",
      camp,
      session // có thể trả về session nếu frontend cần
    });

  } catch (err) {
    console.error("Lỗi tạo camp:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi tạo chiến dịch: " + err.message
    });
  }
};

export const updateCampStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const camp = await BloodCamp.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!camp) return res.status(404).json({ success: false, message: "Không tìm thấy chiến dịch" });
    res.status(200).json({ success: true, message: "Đã cập nhật trạng thái", camp });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi cập nhật trạng thái" });
  }
};

export const deleteCamp = async (req, res) => {
  try {
    const camp = await BloodCamp.findByIdAndDelete(req.params.id);
    if (!camp) return res.status(404).json({ success: false, message: "Không tìm thấy chiến dịch" });
    res.status(200).json({ success: true, message: "Đã xóa chiến dịch" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi xóa chiến dịch" });
  }
};

/* ==============================================================
   AUDIT LOGS & REPORTS
   ============================================================== */
export const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, search } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (search) filter.description = { $regex: search, $options: "i" };
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.status(200).json({ success: true, count: logs.length, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching audit logs" });
  }
};

export const getAdvancedReports = async (req, res) => {
  try {
    const rejectedBlood = await BloodModel.aggregate([
      { $match: { status: "rejected" } },
      { $group: { _id: { hiv: "$screeningResult.hiv", hbv: "$screeningResult.hbv", hcv: "$screeningResult.hcv" }, count: { $sum: 1 } } },
    ]);
    const camps = await BloodCamp.find().select("title date expectedDonors status").sort({ date: -1 }).limit(10);
    const requestsStats = await BloodRequest.aggregate([
      { $group: { _id: "$status", totalUnits: { $sum: "$units" }, count: { $sum: 1 } } },
    ]);
    const stockByGroup = await BloodModel.aggregate([
      { $match: { status: { $in: ["available", "pending_testing"] } } },
      { $group: { _id: "$bloodGroup", total: { $sum: 1 }, totalML: { $sum: "$quantity" } } },
      { $sort: { _id: 1 } },
    ]);
    const bloodUsed = await BloodModel.aggregate([
      { $match: { status: "used" } },
      { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const donorsByBloodGroup = await Donor.aggregate([
      { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const totalAvailable = await BloodModel.countDocuments({ status: "available" });
    const totalUsed = await BloodModel.countDocuments({ status: "used" });
    const totalPending = await BloodModel.countDocuments({ status: "pending_testing" });
    const totalExpired = await BloodModel.countDocuments({ status: "expired" });
    const totalDonors = await Donor.countDocuments();
    const totalCamps = await BloodCamp.countDocuments();
    res.status(200).json({
      success: true,
      reports: { rejectedBlood, camps, requestsStats, stockByGroup, bloodUsed, donorsByBloodGroup, kpis: { totalAvailable, totalUsed, totalPending, totalExpired, totalDonors, totalCamps } },
    });
  } catch (err) {
    console.error("getAdvancedReports error:", err);
    res.status(500).json({ success: false, message: "Error fetching reports" });
  }
};

export const generateBloodConsumptionReport = async (req, res) => {
  try {
    const rangeDays = clampNumber(toFiniteNumber(req.query.rangeDays, 90), 1, 3650);
    const forecastDays = clampNumber(toFiniteNumber(req.query.forecastDays, 30), 1, 365);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(endDate.getTime() - (rangeDays - 1) * MS_PER_DAY);
    startDate.setHours(0, 0, 0, 0);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "Khoang thoi gian bao cao khong hop le",
      });
    }

    const actualRangeDays = Math.max(1, Math.ceil((endDate - startDate + 1) / MS_PER_DAY));
    const { hospitalId } = req.query;
    const labId = req.reportLabId || req.query.labId;

    if ((labId && !mongoose.Types.ObjectId.isValid(labId)) ||
        (hospitalId && !mongoose.Types.ObjectId.isValid(hospitalId))) {
      return res.status(400).json({
        success: false,
        message: "Ma blood lab hoac benh vien khong hop le",
      });
    }

    const requestFilter = {};
    const aggregateRequestFilter = {};
    const stockFilter = {};
    const issuedFilter = {
      status: { $in: ["issued", "used"] },
      issuedAt: { $gte: startDate, $lte: endDate },
    };

    if (labId) {
      requestFilter.labId = labId;
      aggregateRequestFilter.labId = toObjectId(labId);
      stockFilter.bloodLab = labId;
      issuedFilter.bloodLab = labId;
    }

    if (hospitalId) {
      requestFilter.hospitalId = hospitalId;
      aggregateRequestFilter.hospitalId = toObjectId(hospitalId);
      stockFilter.hospital = hospitalId;
      issuedFilter.$or = [{ issuedTo: hospitalId }, { hospital: hospitalId }];
    }

    const rangeRequestFilter = {
      ...requestFilter,
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { confirmedAt: { $gte: startDate, $lte: endDate } },
        { issuedAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate }, status: { $in: ["completed", "rejected"] } },
      ],
    };
    const aggregateRangeRequestFilter = {
      ...aggregateRequestFilter,
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { confirmedAt: { $gte: startDate, $lte: endDate } },
        { issuedAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate }, status: { $in: ["completed", "rejected"] } },
      ],
    };

    const [requests, openRequests, issuedUnits, stockUnits, topHospitals, topLabs] = await Promise.all([
      BloodRequest.find(rangeRequestFilter).lean(),
      BloodRequest.find({ ...requestFilter, status: { $in: ["pending", "accepted"] } })
        .populate("hospitalId", "name facilityType")
        .populate("labId", "name facilityType")
        .sort({ createdAt: 1 })
        .lean(),
      BloodModel.find(issuedFilter).lean(),
      BloodModel.find(stockFilter).lean(),
      BloodRequest.aggregate([
        { $match: aggregateRangeRequestFilter },
        { $group: { _id: "$hospitalId", requests: { $sum: 1 }, units: { $sum: "$units" } } },
        { $sort: { units: -1 } },
        { $limit: 5 },
        { $lookup: { from: "facilities", localField: "_id", foreignField: "_id", as: "facility" } },
        { $unwind: { path: "$facility", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, name: "$facility.name", requests: 1, units: 1 } },
      ]),
      BloodRequest.aggregate([
        { $match: aggregateRangeRequestFilter },
        { $group: { _id: "$labId", requests: { $sum: 1 }, units: { $sum: "$units" } } },
        { $sort: { units: -1 } },
        { $limit: 5 },
        { $lookup: { from: "facilities", localField: "_id", foreignField: "_id", as: "facility" } },
        { $unwind: { path: "$facility", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, name: "$facility.name", requests: 1, units: 1 } },
      ]),
    ]);

    const reportByType = BLOOD_TYPES.reduce((acc, type) => {
      acc[type] = {
        bloodType: type,
        currentStockUnits: 0,
        currentStockMl: 0,
        qualifiedStockMl: 0,
        pendingScreeningMl: 0,
        expiringSoonMl: 0,
        requestedUnits: 0,
        requestedVolumeMl: 0,
        pendingUnits: 0,
        acceptedUnits: 0,
        completedUnits: 0,
        rejectedUnits: 0,
        openDemandMl: 0,
        issuedUnits: 0,
        issuedVolumeMl: 0,
        fulfilledRequestVolumeMl: 0,
        fulfilledVolumeMl: 0,
      };
      return acc;
    }, {});

    const dailyMap = new Map();
    const getDailyBucket = (key) => {
      if (!key) return null;
      if (!dailyMap.has(key)) {
        dailyMap.set(key, {
          date: key,
          requestedUnits: 0,
          completedUnits: 0,
          issuedVolumeMl: 0,
          byBloodType: BLOOD_TYPES.reduce((acc, type) => {
            acc[type] = { requestedUnits: 0, completedUnits: 0, issuedVolumeMl: 0 };
            return acc;
          }, {}),
        });
      }
      return dailyMap.get(key);
    };

    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + forecastDays * MS_PER_DAY);

    stockUnits.forEach((unit) => {
      const bloodType = getBloodGroup(unit);
      if (!reportByType[bloodType]) return;

      const quantity = toFiniteNumber(unit.quantity);
      if (unit.status === "available") {
        reportByType[bloodType].currentStockUnits += 1;
        reportByType[bloodType].currentStockMl += quantity;
      } else if (unit.status === "qualified") {
        reportByType[bloodType].qualifiedStockMl += quantity;
      } else if (["pending_screening", "pending-testing", "pending_testing", "quarantine"].includes(unit.status)) {
        reportByType[bloodType].pendingScreeningMl += quantity;
      }

      const expiry = unit.expiryDate || unit.expirationDate;
      if (unit.status === "available" && expiry && new Date(expiry) <= expiryThreshold && new Date(expiry) >= now) {
        reportByType[bloodType].expiringSoonMl += quantity;
      }
    });

    requests.forEach((request) => {
      const bloodType = request.bloodType;
      if (!reportByType[bloodType]) return;

      const units = toFiniteNumber(request.units);
      const volume = units * DEFAULT_UNIT_VOLUME_ML;
      reportByType[bloodType].requestedUnits += units;
      reportByType[bloodType].requestedVolumeMl += volume;
      reportByType[bloodType][`${request.status}Units`] =
        toFiniteNumber(reportByType[bloodType][`${request.status}Units`]) + units;

      const createdBucket = getDailyBucket(getDateKey(request.createdAt));
      if (createdBucket) {
        createdBucket.requestedUnits += units;
        createdBucket.byBloodType[bloodType].requestedUnits += units;
      }

      if (request.status === "completed") {
        const fulfilledVolume = toFiniteNumber(request.fulfilledVolume) || units * DEFAULT_UNIT_VOLUME_ML;
        reportByType[bloodType].fulfilledRequestVolumeMl += fulfilledVolume;
        const completedBucket = getDailyBucket(getDateKey(request.confirmedAt || request.issuedAt || request.updatedAt));
        if (completedBucket) {
          completedBucket.completedUnits += units;
          completedBucket.byBloodType[bloodType].completedUnits += units;
        }
      }
    });

    openRequests.forEach((request) => {
      const bloodType = request.bloodType;
      if (!reportByType[bloodType]) return;
      reportByType[bloodType].openDemandMl += toFiniteNumber(request.units) * DEFAULT_UNIT_VOLUME_ML;
    });

    issuedUnits.forEach((unit) => {
      const bloodType = getBloodGroup(unit);
      if (!reportByType[bloodType]) return;

      const quantity = toFiniteNumber(unit.quantity);
      reportByType[bloodType].issuedUnits += 1;
      reportByType[bloodType].issuedVolumeMl += quantity;
      reportByType[bloodType].fulfilledVolumeMl += quantity;

      const issuedBucket = getDailyBucket(getDateKey(unit.issuedAt || unit.updatedAt));
      if (issuedBucket) {
        issuedBucket.issuedVolumeMl += quantity;
        issuedBucket.byBloodType[bloodType].issuedVolumeMl += quantity;
      }
    });

    const byBloodType = BLOOD_TYPES.map((type) => {
      const item = reportByType[type];
      const demandBasisMl = Math.max(item.issuedVolumeMl, item.fulfilledRequestVolumeMl);
      const averageDailyDemandMl = Math.round(demandBasisMl / actualRangeDays);
      const forecastDemandMl = Math.round(averageDailyDemandMl * forecastDays);
      const projectedNeedMl = forecastDemandMl + item.openDemandMl;
      const projectedStockAfterForecastMl = item.currentStockMl - projectedNeedMl;
      const reorderSuggestionMl = Math.max(0, Math.ceil((projectedNeedMl - item.currentStockMl) / DEFAULT_UNIT_VOLUME_ML) * DEFAULT_UNIT_VOLUME_ML);
      const coverageDays = averageDailyDemandMl > 0
        ? Math.round((item.currentStockMl / averageDailyDemandMl) * 10) / 10
        : null;

      let riskLevel = "low";
      if (reorderSuggestionMl > 0) riskLevel = "critical";
      else if (coverageDays !== null && coverageDays < 7) riskLevel = "high";
      else if (coverageDays !== null && coverageDays < forecastDays) riskLevel = "medium";
      else if (item.currentStockMl > 0 && item.expiringSoonMl / item.currentStockMl > 0.35) riskLevel = "medium";

      return {
        ...item,
        averageDailyDemandMl,
        forecastDays,
        forecastDemandMl,
        projectedStockAfterForecastMl,
        reorderSuggestionMl,
        coverageDays,
        riskLevel,
      };
    });

    const totals = byBloodType.reduce((acc, item) => {
      acc.currentStockMl += item.currentStockMl;
      acc.expiringSoonMl += item.expiringSoonMl;
      acc.requestedUnits += item.requestedUnits;
      acc.pendingUnits += item.pendingUnits;
      acc.acceptedUnits += item.acceptedUnits;
      acc.completedUnits += item.completedUnits;
      acc.rejectedUnits += item.rejectedUnits;
      acc.openDemandMl += item.openDemandMl;
      acc.issuedVolumeMl += item.issuedVolumeMl;
      acc.forecastDemandMl += item.forecastDemandMl;
      acc.reorderSuggestionMl += item.reorderSuggestionMl;
      return acc;
    }, {
      currentStockMl: 0,
      expiringSoonMl: 0,
      requestedUnits: 0,
      pendingUnits: 0,
      acceptedUnits: 0,
      completedUnits: 0,
      rejectedUnits: 0,
      openDemandMl: 0,
      issuedVolumeMl: 0,
      forecastDemandMl: 0,
      reorderSuggestionMl: 0,
    });

    const fulfilledRequests = totals.completedUnits + totals.rejectedUnits;
    const fulfillmentRate = requests.length > 0
      ? Math.round((requests.filter((request) => request.status === "completed").length / requests.length) * 1000) / 10
      : 0;

    const syncIssues = {
      openRequests: openRequests.length,
      acceptedNotShipping: openRequests.filter((request) =>
        request.status === "accepted" && !["shipping", "confirmed"].includes(request.handoverStatus)
      ).length,
      issuedWithoutRequest: issuedUnits.filter((unit) => !unit.issueRequestId).length,
      pendingOlderThan48h: openRequests.filter((request) =>
        request.status === "pending" && Date.now() - new Date(request.createdAt).getTime() > 2 * MS_PER_DAY
      ).length,
    };

    res.status(200).json({
      success: true,
      generatedAt: new Date(),
      filters: {
        startDate,
        endDate,
        rangeDays: actualRangeDays,
        forecastDays,
        labId: labId || null,
        hospitalId: hospitalId || null,
        unitVolumeMl: DEFAULT_UNIT_VOLUME_ML,
      },
      summary: {
        ...totals,
        processedUnits: fulfilledRequests,
        fulfillmentRate,
      },
      byBloodType,
      daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      openRequests: openRequests.map((request) => ({
        _id: request._id,
        status: request.status,
        handoverStatus: request.handoverStatus,
        bloodType: request.bloodType,
        units: request.units,
        estimatedVolumeMl: toFiniteNumber(request.units) * DEFAULT_UNIT_VOLUME_ML,
        hospital: request.hospitalId?.name || request.hospitalId,
        lab: request.labId?.name || request.labId,
        createdAt: request.createdAt,
      })),
      topHospitals,
      topLabs,
      sync: syncIssues,
    });
  } catch (err) {
    console.error("generateBloodConsumptionReport error:", err);
    res.status(500).json({ success: false, message: "Error generating blood consumption report" });
  }
};

/* ==============================================================
   NOTIFICATIONS
   ============================================================== */
export const broadcastNotification = async (req, res) => {
  try {
    const { title, message, type, recipientType } = req.body;
    if (!title || !message || !recipientType)
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    const newNotification = await Notification.create({
      recipient: { userType: recipientType },
      title, message,
      type: type || "info",
    });
    await AuditLog.create({
      action: "NOTIFICATION_SENT",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "System", targetId: req.user?.id },
      description: `Gửi thông báo "${title}" đến ${recipientType}`,
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, message: "Đã gửi thông báo thành công", notification: newNotification });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi gửi thông báo" });
  }
};

export const getNotificationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Notification.countDocuments();
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.status(200).json({ success: true, notifications, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi tải lịch sử thông báo" });
  }
};

/* ==============================================================
   SEED & BACKUP
   ============================================================== */
export const seedAdmin = async (req, res) => {
  try {
    const existing = await Admin.findOne({ email: "admin@bloodbank.com" });
    if (!existing) {
      await Admin.create({
        name: "Super Admin", email: "admin@bloodbank.com", password: "password123",
        role: "superadmin",
        permissions: ["manage_users", "manage_blood_camps", "manage_blood_stock", "manage_requests", "view_reports", "view_audit_logs", "manage_admins"],
      });
      res.status(201).json({ message: "Created superadmin: admin@bloodbank.com / password123" });
    } else {
      existing.role = "superadmin";
      existing.permissions = ["manage_users", "manage_blood_camps", "manage_blood_stock", "manage_requests", "view_reports", "view_audit_logs", "manage_admins"];
      await existing.save();
      res.status(200).json({ message: "Superadmin already exists, updated role/permissions." });
    }
  } catch (err) {
    res.status(500).json({ message: "Seed error", error: err.message });
  }
};

export const backupDatabase = async (req, res) => {
  try {
    const { exec } = await import("child_process");
    const fs = await import("fs");
    const path = await import("path");
    const util = await import("util");
    const execPromise = util.promisify(exec);
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) return res.status(400).json({ success: false, message: "MONGO_URI not found" });
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    const cmd = `mongodump --uri="${MONGO_URI}" --out="${backupPath}"`;
    await execPromise(cmd);
    await AuditLog.create({
      action: "BACKUP_CREATED",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "System", targetId: req.user?.id },
      description: `Tạo backup database thành công: backup-${timestamp}`,
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, message: "Sao lưu cơ sở dữ liệu thành công!", path: backupPath });
  } catch (err) {
    console.error("Backup Error:", err);
    res.status(500).json({ success: false, message: "Lỗi sao lưu. Vui lòng đảm bảo MongoDB Tools (mongodump) đã được cài đặt." });
  }
};

export const getBackupList = async (req, res) => {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) return res.status(200).json({ success: true, backups: [] });
    const items = fs.readdirSync(backupDir, { withFileTypes: true });
    const backups = items
      .filter((f) => f.isDirectory())
      .map((f) => {
        const fullPath = path.join(backupDir, f.name);
        const stat = fs.statSync(fullPath);
        return { name: f.name, createdAt: stat.birthtime, size: getDirSize(fs, fullPath) };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi liệt kê backup: " + err.message });
  }
};

function getDirSize(fs, dirPath) {
  try {
    let size = 0;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const f of files) {
      const fp = dirPath + "/" + f.name;
      if (f.isDirectory()) size += getDirSize(fs, fp);
      else size += fs.statSync(fp).size;
    }
    return size;
  } catch { return 0; }
}

/* ==============================================================
   EXTRA CRUD OPERATIONS FOR FULL ADMIN CONTROL
   ============================================================== */

export const createDonor = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.password) data.password = "123456"; // default password
    const existing = await Donor.findOne({ email: data.email });
    if (existing) return res.status(400).json({ success: false, message: "Email đã tồn tại" });
    const donor = await Donor.create(data);
    res.status(201).json({ success: true, message: "Thêm người hiến máu thành công", donor });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi thêm người hiến máu", error: err.message });
  }
};

export const createFacility = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.password) data.password = "123456"; // default password
    const existing = await Facility.findOne({ email: data.email });
    if (existing) return res.status(400).json({ success: false, message: "Email đã tồn tại" });
    if (!data.status) data.status = "approved"; // Admin created, default to approved
    const facility = await Facility.create(data);
    res.status(201).json({ success: true, message: "Thêm cơ sở y tế thành công", facility });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi thêm cơ sở y tế", error: err.message });
  }
};

export const updateFacility = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.password) delete updateData.password;
    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select("-password");
    if (!facility) return res.status(404).json({ success: false, message: "Không tìm thấy cơ sở y tế" });
    res.status(200).json({ success: true, message: "Cập nhật thành công", facility });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi cập nhật", error: err.message });
  }
};

export const createBloodRequest = async (req, res) => {
  try {
    const requestData = { ...req.body };
    const request = await BloodRequest.create(requestData);
    await AuditLog.create({
      action: "CREATE_BLOOD_REQUEST",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "BloodRequest", targetId: request._id },
      description: `Tạo yêu cầu máu: ${request.units} đơn vị ${request.bloodType}`,
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, message: "Tạo yêu cầu máu thành công", request });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi tạo yêu cầu máu", error: err.message });
  }
};

export const updateBloodRequest = async (req, res) => {
  try {
    const updateData = { ...req.body };
    const request = await BloodRequest.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu máu" });
    res.status(200).json({ success: true, message: "Cập nhật yêu cầu thành công", request });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi cập nhật yêu cầu", error: err.message });
  }
};

export const deleteBloodRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu" });
    await AuditLog.create({
      action: "DELETE_BLOOD_REQUEST",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "BloodRequest", targetId: request._id },
      description: `Xóa yêu cầu máu: ${request.units} đơn vị ${request.bloodType}`,
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, message: "Đã xóa yêu cầu cấp máu" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi xóa yêu cầu", error: err.message });
  }
};

/* ==============================================================
   RESET DONOR PASSWORD (Admin)
   ============================================================== */
export const resetDonorPassword = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ success: false, message: "Không tìm thấy người hiến máu" });

    // Tạo mật khẩu mới ngẫu nhiên 10 ký tự (chữ + số)
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const newPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

    // Gán mật khẩu mới (pre-save hook sẽ hash tự động)
    donor.password = newPassword;
    await donor.save();

    // Gửi email
    let emailSent = false;
    try {
      await sendDonorPasswordReset({
        toEmail: donor.email,
        fullName: donor.fullName,
        newPassword,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("Email send error:", emailErr.message);
    }

    // Audit log
    await AuditLog.create({
      action: "RESET_DONOR_PASSWORD",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "Donor", targetId: donor._id },
      description: `Đặt lại mật khẩu cho donor ${donor.fullName} (${donor.email})`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: emailSent
        ? `✅ Đã đặt lại mật khẩu và gửi email đến ${donor.email}`
        : `✅ Đã đặt lại mật khẩu (lỗi gửi email — kiểm tra cấu hình EMAIL_USER/EMAIL_PASS trong .env)`,
      emailSent,
    });
  } catch (err) {
    console.error("resetDonorPassword error:", err);
    res.status(500).json({ success: false, message: "Lỗi đặt lại mật khẩu: " + err.message });
  }
};

export const deleteBloodUnit = async (req, res) => {
  try {
    const unit = await BloodModel.findByIdAndDelete(req.params.id);
    if (!unit) return res.status(404).json({ success: false, message: "Không tìm thấy đơn vị máu" });
    await AuditLog.create({
      action: "DELETE_BLOOD_UNIT",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "Blood", targetId: unit._id },
      description: `Xóa đơn vị máu (${unit.barcode})`,
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, message: "Đã xóa đơn vị máu" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi xóa đơn vị máu", error: err.message });
  }
};

export const updateCamp = async (req, res) => {
  try {
    const updateData = { ...req.body };
    const camp = await BloodCamp.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    if (!camp) return res.status(404).json({ success: false, message: "Không tìm thấy chiến dịch" });
    await AuditLog.create({
      action: "UPDATE_BLOOD_CAMP",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "BloodCamp", targetId: camp._id },
      description: `Sửa thông tin chiến dịch: ${camp.title}`,
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, message: "Cập nhật thông tin chiến dịch thành công", camp });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi cập nhật chiến dịch", error: err.message });
  }
};

/* ==============================================================
   SYNC BLOOD UNITS WITH DONORS (One-time data migration)
   ============================================================== */
export const syncBloodUnitsWithDonors = async (req, res) => {
  try {
    // 1. Lấy tất cả đơn vị máu chưa có donor
    const unlinkedUnits = await BloodModel.find({ donor: { $exists: false } });

    if (unlinkedUnits.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Tất cả đơn vị máu đã được liên kết với người hiến máu!",
        linked: 0,
        skipped: 0,
      });
    }

    // 2. Lấy tất cả donor, nhóm theo nhóm máu
    const allDonors = await Donor.find({}).select("_id fullName bloodGroup donationHistory lastDonationDate");
    const donorsByBloodGroup = {};
    allDonors.forEach(d => {
      if (!donorsByBloodGroup[d.bloodGroup]) donorsByBloodGroup[d.bloodGroup] = [];
      donorsByBloodGroup[d.bloodGroup].push(d);
    });

    let linked = 0;
    let skipped = 0;
    const donorUpdateMap = {}; // donorId -> { donor, newEntries[] }

    for (const unit of unlinkedUnits) {
      const bg = unit.bloodGroup;
      const candidates = donorsByBloodGroup[bg];

      if (!candidates || candidates.length === 0) {
        skipped++;
        continue;
      }

      // Chọn donor theo round-robin (phân bổ đều)
      const donorIndex = linked % candidates.length;
      const donor = candidates[donorIndex];

      // Cập nhật đơn vị máu — gán donor
      await BloodModel.findByIdAndUpdate(unit._id, { donor: donor._id });

      // Gom thay đổi donor lại
      if (!donorUpdateMap[donor._id.toString()]) {
        donorUpdateMap[donor._id.toString()] = { donor, newEntries: [] };
      }
      donorUpdateMap[donor._id.toString()].newEntries.push({
        donationDate: unit.collectionDate || unit.createdAt || new Date(),
        facility: unit.bloodLab || undefined,
        bloodGroup: bg,
        quantity: unit.quantity || 250,
        bloodUnitId: unit._id,
        verified: true,
      });

      linked++;
    }

    // 3. Cập nhật donationHistory cho từng donor
    for (const key of Object.keys(donorUpdateMap)) {
      const { donor, newEntries } = donorUpdateMap[key];
      const sortedEntries = newEntries.sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));
      const latestDate = sortedEntries[0].donationDate;

      await Donor.findByIdAndUpdate(donor._id, {
        $push: { donationHistory: { $each: newEntries } },
        $set: { lastDonationDate: latestDate },
      });
    }

    await AuditLog.create({
      action: "SYNC_BLOOD_DONATIONS",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "System", targetId: req.user?.id },
      description: `Đồng bộ dữ liệu: liên kết ${linked} đơn vị máu với người hiến. Bỏ qua ${skipped} đơn vị không tìm được donor phù hợp.`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `✅ Đồng bộ thành công! Đã liên kết ${linked} đơn vị máu với người hiến máu.`,
      linked,
      skipped,
      donorsUpdated: Object.keys(donorUpdateMap).length,
    });
  } catch (err) {
    console.error("syncBloodUnitsWithDonors error:", err);
    res.status(500).json({ success: false, message: "Lỗi đồng bộ dữ liệu: " + err.message });
  }
};
