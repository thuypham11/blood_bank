import bcrypt from "bcryptjs";
import Donor from "../models/donorModel.js";
import Facility from "../models/facilityModel.js";
import Admin from "../models/adminModel.js";
import Blood from "../models/BloodModel.js";
import jwt from "jsonwebtoken";

const normalizeFacilityRole = (value = "") => {
	const raw = String(value).toLowerCase();
	if (raw.includes("blood") || raw.includes("lab") || raw.includes("xet") || raw.includes("xÃ©t"))
		return "blood-lab";
	if (raw.includes("hospital") || raw.includes("benh") || raw.includes("bá»‡nh")) return "hospital";
	return value;
};

const getHospitalStockAlerts = async (hospitalId) => {
	const watchTypes = ["A+", "A-", "B+", "B-", "O+", "O-"];
	const stock = await Blood.find({ hospital: hospitalId }).lean();
	const now = new Date();
	const alerts = [];

	watchTypes.forEach((type) => {
		const items = stock.filter((item) => (item.bloodGroup || item.bloodType) === type);
		const validUnits = items
			.filter((item) => {
				const expiry = item.expiryDate || item.expirationDate;
				return !expiry || new Date(expiry) > now;
			})
			.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
		const expiredUnits = items
			.filter((item) => {
				const expiry = item.expiryDate || item.expirationDate;
				return expiry && new Date(expiry) <= now;
			})
			.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

		if (expiredUnits > 0) alerts.push({ type: "expired", bloodType: type, units: expiredUnits });
		if (validUnits <= 0) alerts.push({ type: "out_of_stock", bloodType: type, units: 0 });
	});

	return alerts;
};

/**
 * REGISTER (Unified)
 */
export const register = async (req, res) => {
	try {
		const body = { ...req.body };
		let { role } = body; // donor | hospital | blood-lab
		role = normalizeFacilityRole(role || body.facilityType);
		body.role = role;
		if (role === "hospital" || role === "blood-lab") body.facilityType = role;

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
		const duplicateField = Object.keys(error.keyPattern || {})[0];
		if (error.code === 11000 && duplicateField) {
			return res
				.status(409)
				.json({ message: `${duplicateField} already exists`, error: error.message });
		}
		const status = error.name === "ValidationError" ? 400 : 500;
		res.status(status).json({ message: "Registration failed", error: error.message });
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
		let user =
			(await Donor.findOne({ email }).select("+password")) ||
			(await Admin.findOne({ email }).select("+password")) ||
			(await Facility.findOne({ email }).select("+password"));

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

		// ✅ Create token
		const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
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
		} else if (user.role === "admin" || user.role === "superadmin") {
			await Admin.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
		} else {
			await Donor.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
		}

		// 🎯 Redirect logic
		let redirect = "/";
		if (user.role === "donor") redirect = "/donor";
		else if (user.role === "hospital") redirect = "/hospital";
		else if (user.role === "blood-lab") redirect = "/lab";
		else if (user.role === "admin" || user.role === "superadmin") redirect = "/admin";

		const alerts = user.role === "hospital" ? await getHospitalStockAlerts(user._id) : [];

		res.status(200).json({
			success: true,
			message: "Login successful",
			token,
			user: { id: user._id, email: user.email, role: user.role, status: user.status }, // ✅ status added
			alerts,
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
		let user;
		if (req.user.role === "donor") {
			user = await Donor.findById(req.user.id).select("-password");
		} else if (req.user.role === "admin" || req.user.role === "superadmin") {
			user = await Admin.findById(req.user.id).select("-password");
		} else {
			user = await Facility.findById(req.user.id).select("-password");
		}

		if (!user) return res.status(404).json({ message: "User not found" });

		res.status(200).json({ user });
	} catch (error) {
		res.status(500).json({ message: "Error fetching profile", error: error.message });
	}
};
