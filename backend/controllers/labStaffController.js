import LabStaff, { LAB_STAFF_PERMISSIONS } from "../models/LabStaff.js";
import Donor from "../models/donorModel.js";
import Facility from "../models/facilityModel.js";
import Admin from "../models/adminModel.js";

const ensureBloodLab = (req, res) => {
	if (req.user?.facilityType !== "blood-lab") {
		res.status(403).json({ success: false, message: "Chỉ trung tâm xét nghiệm được quản lý nhân viên" });
		return false;
	}
	return true;
};

const publicFields = "fullName employeeCode email phone permissions isActive lastLogin createdAt";

export const getLabStaff = async (req, res) => {
	try {
		if (!ensureBloodLab(req, res)) return;
		const staff = await LabStaff.find({ facility: req.user._id })
			.select(publicFields)
			.sort({ isActive: -1, createdAt: -1 });
		res.json({ success: true, data: staff });
	} catch (error) {
		res.status(500).json({ success: false, message: "Không thể tải danh sách nhân viên" });
	}
};

export const createLabStaff = async (req, res) => {
	try {
		if (!ensureBloodLab(req, res)) return;
		const { fullName, employeeCode, email, phone, password, permissions = [] } = req.body;

		if (!fullName || !employeeCode || !email || !phone || !password) {
			return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ thông tin bắt buộc" });
		}
		if (password.length < 6) {
			return res.status(400).json({ success: false, message: "Mật khẩu phải có ít nhất 6 ký tự" });
		}
		if (!/^\d{10}$/.test(phone)) {
			return res.status(400).json({ success: false, message: "Số điện thoại phải có đúng 10 chữ số" });
		}
		const normalizedEmail = email.trim().toLowerCase();
		const emailInUse =
			(await Donor.exists({ email: normalizedEmail })) ||
			(await Facility.exists({ email: normalizedEmail })) ||
			(await Admin.exists({ email: normalizedEmail })) ||
			(await LabStaff.exists({ email: normalizedEmail }));
		if (emailInUse) {
			return res.status(409).json({ success: false, message: "Email đã được sử dụng" });
		}

		const normalizedPermissions = [...new Set(permissions)].filter((item) =>
			LAB_STAFF_PERMISSIONS.includes(item),
		);
		const staff = await LabStaff.create({
			facility: req.user._id,
			fullName,
			employeeCode,
			email: normalizedEmail,
			phone,
			password,
			permissions: normalizedPermissions,
		});

		res.status(201).json({
			success: true,
			message: "Đã tạo tài khoản nhân viên xét nghiệm",
			data: await LabStaff.findById(staff._id).select(publicFields),
		});
	} catch (error) {
		if (error?.code === 11000) {
			const field = error.keyPattern?.email ? "Email" : "Mã nhân viên";
			return res.status(409).json({ success: false, message: `${field} đã được sử dụng` });
		}
		res.status(500).json({ success: false, message: error.message || "Không thể tạo nhân viên" });
	}
};

export const updateLabStaff = async (req, res) => {
	try {
		if (!ensureBloodLab(req, res)) return;
		const allowedUpdates = ["fullName", "phone", "permissions", "isActive"];
		const updates = Object.fromEntries(
			Object.entries(req.body).filter(([key]) => allowedUpdates.includes(key)),
		);
		if (updates.permissions) {
			updates.permissions = [...new Set(updates.permissions)].filter((item) =>
				LAB_STAFF_PERMISSIONS.includes(item),
			);
		}

		const staff = await LabStaff.findOneAndUpdate(
			{ _id: req.params.id, facility: req.user._id },
			{ $set: updates },
			{ new: true, runValidators: true },
		).select(publicFields);
		if (!staff) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });

		res.json({ success: true, message: "Đã cập nhật nhân viên", data: staff });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message || "Không thể cập nhật nhân viên" });
	}
};
