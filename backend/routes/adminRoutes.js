import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
	getAllFacilities,
	approveFacility,
	rejectFacility,
	getDashboardStats,
	getAllDonors,
	getDonorById,
	getAdminProfile,
	updateAdminProfile,
	changeAdminPassword,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/dashboard", protect, getDashboardStats);
router.get("/donors", protect, getAllDonors);
router.get("/donor/:id", protect, getDonorById);
router.get("/facilities", protect, getAllFacilities);
router.put("/facility/approve/:id", protect, approveFacility);
router.put("/facility/reject/:id", protect, rejectFacility);
router.get("/profile", protect, getAdminProfile);
router.put("/profile", protect, updateAdminProfile);
router.put("/change-password", protect, changeAdminPassword);

export default router;
