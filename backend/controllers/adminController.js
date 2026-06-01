import Donor from "../models/donorModel.js";
import Facility from "../models/facilityModel.js";
import Admin from "../models/adminModel.js";
import BloodCamp from "../models/bloodCampModel.js";
export const getDashboardStats = async (_req, res) => {
	try {
		const totalDonors = await Donor.countDocuments();
		const totalFacilities = await Facility.countDocuments();
		const pendingFacilities = await Facility.countDocuments({ status: "pending" });
		const approvedFacilities = await Facility.countDocuments({ status: "approved" });

		const donors = await Donor.find({}, "donationHistory bloodGroup eligibleToDonate");
		const totalDonations = donors.reduce(
			(sum, donor) => sum + (donor.donationHistory?.length || 0),
			0,
		);
		const activeDonors = donors.filter((d) => d.eligibleToDonate).length;

		const upcomingCamps = await BloodCamp.countDocuments({
			status: { $in: ["Upcoming", "Ongoing"] },
		});

		// Blood type distribution
		const bloodTypeStats = {};
		const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
		bloodGroups.forEach((g) => { bloodTypeStats[g] = 0; });
		donors.forEach((d) => {
			if (d.bloodGroup && bloodTypeStats[d.bloodGroup] !== undefined) {
				bloodTypeStats[d.bloodGroup]++;
			}
		});

		res.status(200).json({
			totalDonors,
			totalFacilities,
			approvedFacilities,
			pendingFacilities,
			totalDonations,
			activeDonors,
			upcomingCamps,
			bloodTypeStats,
		});
	} catch (err) {
		console.error("Admin Stats Error:", err);
		res.status(500).json({ message: "Failed to fetch stats" });
	}
};

export const getAllDonors = async (_req, res) => {
	try {
		const donors = await Donor.find().select("-password");
		res.status(200).json({ donors });
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

export const getAllFacilities = async (_req, res) => {
	try {
		const facilities = await Facility.find();
		res.status(200).json({ facilities });
	} catch (err) {
		res.status(500).json({ message: "Error fetching facilities" });
	}
};

export const approveFacility = async (req, res) => {
	try {
		const facility = await Facility.findById(req.params.id);
		if (!facility) return res.status(404).json({ message: "Facility not found" });

		await Facility.updateOne(
			{ _id: req.params.id },
			{ $set: { status: "approved", approvedAt: new Date() } },
		);
		const updated = await Facility.findById(req.params.id);
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

		await Facility.updateOne(
			{ _id: req.params.id },
			{ $set: { status: "rejected", rejectionReason } },
		);
		const updated = await Facility.findById(req.params.id);
		res.status(200).json({ message: "Facility rejected", facility: updated });
	} catch (err) {
		res.status(500).json({ message: "Error rejecting facility" });
	}
};

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
