import Donor from "../models/donorModel.js";
import Facility from "../models/facilityModel.js";

// 🧩 Get Dashboard Overview Stats
export const getDashboardStats = async (req, res) => {
	try {
		const totalDonors = await Donor.countDocuments();
		const totalFacilities = await Facility.countDocuments();
		const pendingFacilities = await Facility.countDocuments({ status: "pending" });
		const approvedFacilities = await Facility.countDocuments({ status: "approved" });

		// Count total donations across all donors
		const donors = await Donor.find({}, "donationHistory");
		const totalDonations = donors.reduce(
			(sum, donor) => sum + (donor.donationHistory?.length || 0),
			0,
		);

		const activeDonors = await Donor.countDocuments({ isEligible: true });

		res.status(200).json({
			totalDonors,
			totalFacilities,
			approvedFacilities,
			pendingFacilities,
			totalDonations,
			activeDonors,
			upcomingCamps: 3, // Placeholder
		});
	} catch (err) {
		console.error("Admin Stats Error:", err);
		res.status(500).json({ message: "Failed to fetch stats" });
	}
};

// 🧍 Get All Donors
export const getAllDonors = async (req, res) => {
	try {
		// Note: This function was present in your code block but not used in the router
		const donors = await Donor.find().select("-password");
		res.status(200).json({ donors });
	} catch (err) {
		res.status(500).json({ message: "Error fetching donors" });
	}
};

// 🏥 Get All Facilities (Pending + Approved)
export const getAllFacilities = async (req, res) => {
	try {
		const facilities = await Facility.find();
		res.status(200).json({ facilities });
	} catch (err) {
		res.status(500).json({ message: "Error fetching facilities" });
	}
};

// ✅ Approve a Facility
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
		console.error("Facility Approval Error:", err);
		res.status(500).json({ message: "Error approving facility" });
	}
};

// ❌ Reject / Update Facility Status to Rejected
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
		res.status(200).json({ message: "Facility rejected and status updated", facility: updated });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Error rejecting facility" });
	}
};
