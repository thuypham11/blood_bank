import bcrypt from "bcryptjs";
import Donor from "../models/donorModel.js";
import Facility from "../models/facilityModel.js";
import Admin from "../models/adminModel.js";
import jwt from "jsonwebtoken";
import LabStaff from "../models/LabStaff.js";

/**
 * REGISTER (Unified)
 */
export const register = async (req, res) => {
	try {
		const { role } = req.body; // donor | hospital | blood-lab

		if (!role) {
			return res.status(400).json({ message: "Role is required" });
		}

		let user;

		if (role === "donor") {
			user = await Donor.create(req.body);
		} else if (role === "hospital" || role === "blood-lab") {
			user = await Facility.create(req.body);
		} else {
			return res.status(400).json({ message: "Invalid role" });
		}

		// Decide redirect based on role
		const redirect = role === "donor" ? "/donor/dashboard" : "/"; // hospital/lab back to home after registration

		res.status(201).json({
			success: true,
			message:
				role === "donor"
					? "Donor registered successfully! Redirecting to dashboard..."
					: "Facility registered successfully! Please wait for admin approval.",
			user: { id: user._id, email: user.email, role: user.role },
			redirect,
		});
	} catch (error) {
		console.error("❌ Registration Error:", error);
		res.status(500).json({ message: "Registration failed", error: error.message });
	}
};

/**
 * LOGIN (Unified)
 */
export const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password)
			return res.status(400).json({ message: "Email and password are required" });

		// Find user in any model
		const normalizedEmail = email.trim().toLowerCase();
		let user =
			(await Donor.findOne({ email: normalizedEmail }).select("+password")) ||
			(await Admin.findOne({ email: normalizedEmail }).select("+password")) ||
			(await Facility.findOne({ email: normalizedEmail }).select("+password")) ||
			(await LabStaff.findOne({ email: normalizedEmail }).select("+password"));

		if (!user) return res.status(404).json({ message: "User not found" });

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

		// 🚫 If facility not approved yet
		// ✅ If facility not approved yet
		if (user instanceof Facility) {
			if (user.status === "pending") {
				// <-- FIXED: Use lowercase "pending"
				return res.status(403).json({
					success: false,
					message: "Your account is awaiting admin approval. Please wait before logging in.",
				});
			}
			if (user.status === "rejected") {
				// <-- FIXED: Use lowercase "rejected"
				return res.status(403).json({
					success: false,
					message: "Your registration has been rejected by admin. Contact support for details.",
				});
			}
			// The code will now only proceed to create a token and redirect if the status is "approved" (or any other value not 'pending' or 'rejected').
		}
		if (user instanceof LabStaff && !user.isActive) {
			return res.status(403).json({ success: false, message: "Tài khoản nhân viên đã bị khóa" });
		}

		const authenticatedRole = user instanceof Facility
			? (user.role || user.facilityType)
			: user instanceof LabStaff ? "lab_staff" : user.role;

		// ✅ Create token
		const token = jwt.sign({
			id: user._id,
			role: authenticatedRole,
			...(user instanceof LabStaff ? { facilityId: user.facility } : {}),
		}, process.env.JWT_SECRET, {
			expiresIn: "7d",
		});

		// ✅ Dùng updateOne thay vì save() — tránh trigger pre-save hook bcrypt hash password lần 2
		if (user instanceof Facility) {
			const updatedHistory = [
				...(user.history || []),
				{ eventType: "Login", description: "Facility logged in successfully", date: new Date() },
			].slice(-50);
			await Facility.updateOne(
				{ _id: user._id },
				{ $set: { lastLogin: new Date(), history: updatedHistory } },
			);
		} else if (user instanceof LabStaff) {
			await LabStaff.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
		} else if (user.role === "admin" || user.role === "superadmin") {
			await Admin.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
		} else {
			await Donor.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
		}

		// 🎯 Redirect logic
		let redirect = "/";
		if (authenticatedRole === "donor") redirect = "/donor";
		else if (authenticatedRole === "hospital") redirect = "/hospital";
		else if (authenticatedRole === "blood-lab") redirect = "/lab";
		else if (authenticatedRole === "lab_staff") redirect = "/lab-staff";
		else if (authenticatedRole === "admin" || authenticatedRole === "superadmin") redirect = "/admin";

		res.status(200).json({
			success: true,
			message: "Login successful",
			token,
			user: { id: user._id, email: user.email, role: authenticatedRole, status: user.status }, // ✅ status added
			redirect,
		});
	} catch (error) {
		console.error("🚨 Login Error:", error);
		res.status(500).json({ message: "Login failed", error: error.message });
	}
};

/**
 * PROFILE FETCH
 */
export const getProfile = async (req, res) => {
	try {
		let user = req.authUser;

		if (!user) return res.status(404).json({ message: "User not found" });

		if (user instanceof Facility && !user.role) {
			user = user.toObject();
			user.role = user.facilityType;
		}

		res.status(200).json({ user });
	} catch (error) {
		res.status(500).json({ message: "Error fetching profile", error: error.message });
	}
};
export const createAdmin = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		if (!name || !email || !password) {
			return res.status(400).json({
				message: "Name, email and password are required",
			});
		}

		const existed = await Admin.findOne({ email });

		if (existed) {
			return res.status(400).json({
				message: "Admin already exists",
			});
		}

		const admin = await Admin.create({
			name,
			email,
			password,
			role: "admin",
			isActive: true,
		});

		res.status(201).json({
			success: true,
			message: "Admin created successfully",
			admin: {
				id: admin._id,
				name: admin.name,
				email: admin.email,
				role: admin.role,
			},
		});
	} catch (err) {
		console.error("Create Admin Error:", err);
		res.status(500).json({
			message: "Create admin failed",
			error: err.message,
		});
	}
};
