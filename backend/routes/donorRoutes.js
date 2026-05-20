// backend/routes/donorRoutes.js
import express from "express";
import { protectDonor } from "../middlewares/donorMiddleware.js";
import { 
  getDonorProfile, 
  updateDonorProfile, 
  getDonorStats, 
  getDonorHistory,
  getDonorTestResults,
  getDonorReminders,
  getDonationCertificate,
  getUrgentBloodRequests,
  sendOtp,        // ✅ THÊM
  verifyOtp       
} from "../controllers/donorController.js";
import { 
  getAvailableCamps, 
  createAppointment,
  getMyAppointments,
  cancelAppointment,
  checkAppointmentEligibility 
} from "../controllers/donationController.js";
import Donor from "../models/donorModel.js";
import axios from "axios";
import { checkLocationAndDate } from '../controllers/donationController.js';
import { uploadIdCard, verifyAndSaveIdCard } from "../controllers/donorController.js";
import { submitHealthDeclaration } from '../controllers/donationController.js';
const router = express.Router();
router.post('/check-location', protectDonor, checkLocationAndDate);
router.post("/check-appointment", protectDonor, checkAppointmentEligibility);
router.post('/send-otp', protectDonor, sendOtp);
router.post('/verify-otp', protectDonor, verifyOtp);
router.post('/health-declaration', protectDonor, submitHealthDeclaration);
// Profile routes
router.get("/profile", protectDonor, getDonorProfile);
router.put("/profile", protectDonor, updateDonorProfile);
router.get("/stats", protectDonor, getDonorStats);
router.get("/history", protectDonor, getDonorHistory);

// Test results
router.get("/test-results", protectDonor, getDonorTestResults);

// Reminders
router.get("/reminders", protectDonor, getDonorReminders);

// Certificate
router.get("/certificate/:donationId", protectDonor, getDonationCertificate);

// Urgent requests
router.get("/urgent-requests", protectDonor, getUrgentBloodRequests);

// Camp routes
router.get("/camps", protectDonor, getAvailableCamps);

// Appointment routes
router.post("/appointments", protectDonor, createAppointment);
router.get("/appointments", protectDonor, getMyAppointments);
router.put("/appointments/:id/cancel", protectDonor, cancelAppointment);
router.post("/upload-id-card", protectDonor, uploadIdCard);
router.post("/verify-id-card", protectDonor, verifyAndSaveIdCard);// Public route for Golang (no authentication required)
router.get("/public/test-results/:email", async (req, res) => {
  try {
    const donor = await Donor.findOne({ email: req.params.email }).populate({
      path: "donationHistory.bloodUnitId",
      select: "barcode bloodGroup donationDate screening screeningStatus productType"
    });
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    const results = donor.donationHistory
      .filter(item => item.bloodUnitId)
      .map(item => ({
        donationDate: item.donationDate,
        bloodGroup: item.bloodGroup,
        barcode: item.bloodUnitId.barcode,
        productType: item.bloodUnitId.productType,
        screeningStatus: item.bloodUnitId.screeningStatus,
        screening: item.bloodUnitId.screening,
      }));
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/invite", protectDonor, async (req, res) => {
  try {
    const { toEmail, message } = req.body;
    const donorName = req.donor.fullName;
    const inviteLink = "http://localhost:5173/register/donor";

    console.log("📨 Nhận yêu cầu mời bạn bè:", { toEmail, donorName });

    // Gọi Golang service
    const goResponse = await axios.post("http://localhost:8080/invite", {
      toEmail,
      donorName,
      message,
      inviteLink
    });

    console.log("✅ Golang response:", goResponse.data);
    res.json({ success: true, message: "Đã gửi lời mời!" });
  } catch (error) {
    console.error("❌ Invite error:", error.message);
    if (error.response) {
      console.error("Golang error response:", error.response.data);
    }
    res.status(500).json({ success: false, message: "Gửi lời mời thất bại" });
  }
});

export default router;