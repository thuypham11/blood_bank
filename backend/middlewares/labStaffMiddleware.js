import jwt from "jsonwebtoken";
import LabStaff from "../models/LabStaff.js";

export const protectLabStaff = async (req, res, next) => {
	try {
		const token = req.headers.authorization?.startsWith("Bearer ")
			? req.headers.authorization.split(" ")[1]
			: null;
		if (!token) return res.status(401).json({ success: false, message: "Không có token xác thực" });

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		if (decoded.role !== "lab_staff") {
			return res.status(403).json({ success: false, message: "Không có quyền nhân viên xét nghiệm" });
		}

		const staff = await LabStaff.findById(decoded.id).select("-password");
		if (!staff || !staff.isActive) {
			return res.status(403).json({ success: false, message: "Tài khoản đã bị khóa hoặc không tồn tại" });
		}
		req.user = staff;
		req.facilityId = staff.facility;
		next();
	} catch (error) {
		res.status(401).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn" });
	}
};

export const requireLabPermission = (permission) => (req, res, next) => {
	if (!req.user?.permissions?.includes(permission)) {
		return res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện thao tác này" });
	}
	next();
};
