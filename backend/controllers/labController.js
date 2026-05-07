import BloodUnit from "../models/BloodUnit.js";
import DonationSession from "../models/DonationSession.js";
import Donor from "../models/donorModel.js";

export const updateScreeningResults = async (req, res) => {
    try {
        const { bloodUnitId, screening } = req.body; // screening: { hiv, hepatitisB, ... }
        const bloodUnit = await BloodUnit.findById(bloodUnitId);
        if (!bloodUnit) return res.status(404).json({ message: "Blood unit not found" });

        // Cập nhật kết quả xét nghiệm
        Object.assign(bloodUnit.screening, screening);
        bloodUnit.screening.testedAt = new Date();
        bloodUnit.screening.testedBy = req.user.id; // từ middleware

        // Xác định screeningStatus tổng thể
        const allNegative = Object.values(screening).every(v => v === "negative");
        bloodUnit.screeningStatus = allNegative ? "passed" : "failed";
        bloodUnit.status = allNegative ? "available" : "discarded";

        await bloodUnit.save();

        // Cập nhật donationHistory của donor
        const donor = await Donor.findById(bloodUnit.donor);
        if (donor) {
            const donationEntry = donor.donationHistory.find(d => d.bloodUnitId?.toString() === bloodUnitId);
            if (donationEntry) {
                donationEntry.verified = allNegative;
            } else {
                // Nếu chưa có, thêm mới (đảm bảo có bloodUnitId)
                donor.donationHistory.push({
                    donationDate: bloodUnit.donationDate,
                    bloodGroup: bloodUnit.bloodGroup,
                    quantity: bloodUnit.quantity,
                    bloodUnitId: bloodUnit._id,
                    verified: allNegative
                });
                await donor.save();
            }
        }

        res.json({ success: true, message: "Screening results updated", bloodUnit });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};