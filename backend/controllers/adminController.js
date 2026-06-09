import Donor from "../models/donorModel.js";
import Facility from "../models/facilityModel.js";
import Admin from "../models/adminModel.js";
import BloodCamp from "../models/bloodCampModel.js";
import BloodModel from "../models/BloodModel.js";
import BloodRequest from "../models/bloodRequestModel.js";
import AuditLog from "../models/AuditLogModel.js";
import Notification from "../models/NotificationModel.js";

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
    const { bloodGroup, quantity, bloodLab, collectionDate, screeningResult } = req.body;
    if (!bloodGroup) return res.status(400).json({ success: false, message: "Nhóm máu là bắt buộc" });
    const barcode = `BLD-${Date.now()}-${Math.floor(Math.random() * 99999)}`;
    const unit = await BloodModel.create({
      barcode, bloodGroup, bloodType: bloodGroup,
      quantity: quantity || 250,
      bloodLab,
      collectionDate: collectionDate || new Date(),
      screeningResult: screeningResult || { hiv: "pending", hbv: "pending", hcv: "pending" },
      status: "pending_testing",
    });
    await AuditLog.create({
      action: "ADD_BLOOD_UNIT",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "Blood", targetId: unit._id },
      description: `Nhập kho ${quantity}ml ${bloodGroup} (${barcode})`,
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
    if (!title || !date) return res.status(400).json({ success: false, message: "Tiêu đề và ngày là bắt buộc" });
    const camp = await BloodCamp.create({
      title, date, time,
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
    await AuditLog.create({
      action: "CREATE_BLOOD_CAMP",
      performedBy: { userType: "Admin", userId: req.user?.id, name: req.user?.name || "Admin" },
      target: { targetType: "BloodCamp", targetId: camp._id },
      description: `Tạo chiến dịch hiến máu: ${title}`,
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, message: "Đã tạo chiến dịch hiến máu", camp });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi tạo chiến dịch: " + err.message });
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
