import express from "express";
import { protectFacility } from "../middlewares/facilityMiddleware.js";
import {
  hospitalRequestBlood,
  getHospitalRequests,
  getHospitalDashboard,
  getHospitalStock,
  getHospitalHistory,
  confirmBloodHandover,
  getPublicBloodNeeds,
  getAllDonors,
  logContactAttempt
} from "../controllers/hospitalController.js";

const router = express.Router();

router.get("/blood/needs", getPublicBloodNeeds);

// Blood request routes for hospitals
router.post("/blood/request", protectFacility, hospitalRequestBlood);
router.get("/blood/requests", protectFacility, getHospitalRequests);
router.patch("/blood/requests/:id/confirm", protectFacility, confirmBloodHandover);

// Dashboard routes
router.get("/dashboard", protectFacility, getHospitalDashboard);
router.get("/blood/stock", protectFacility, getHospitalStock);
router.get("/history", protectFacility, getHospitalHistory);

// Add to bloodLabRoutes.js
router.get("/donors", protectFacility, getAllDonors);
router.post("/donors/:id/contact", protectFacility, logContactAttempt);

export default router;
