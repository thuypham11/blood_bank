import express from "express";
import {
  createBloodUnit,
  discardBloodUnit,
  getAllLabs,
  getHospitalsForIssue,
  getBloodLabDashboard,
  getBloodLabHistory,
  generateOwnBloodConsumptionReport,
  getBloodStock,
  getBloodUnitByBarcode,
  getBloodUnitCodeImage,
  getBloodUnits,
  getLabBloodRequests,
  importBloodUnitToStock,
  issueBloodUnits,
  previewIssueBloodUnits,
  splitBloodUnitComponents,
  updateBloodHandoverStatus,
  updateBloodRequestStatus,
  updateBloodUnitScreening,
  checkBloodExpiry,
} from "../controllers/bloodLabController.js";
import {
  getRecentDonations,
  markDonation,
  searchDonor,
} from "../controllers/donorController.js";
import { protectFacility } from "../middlewares/facilityMiddleware.js";
const router = express.Router();

router.get("/dashboard", protectFacility, getBloodLabDashboard);
router.get("/history", protectFacility, getBloodLabHistory);
router.get("/reports/blood-consumption", protectFacility, generateOwnBloodConsumptionReport);


router.get("/blood/check-expiry", protectFacility, checkBloodExpiry);

router.get("/blood/stock", protectFacility, getBloodStock);
router.get("/blood/units", protectFacility, getBloodUnits);
router.post("/blood/units", protectFacility, createBloodUnit);
router.get("/blood/units/barcode/:barcode", protectFacility, getBloodUnitByBarcode);
router.get("/blood/units/:id/code", protectFacility, getBloodUnitCodeImage);
router.post("/blood/units/:id/components", protectFacility, splitBloodUnitComponents);
router.post("/blood/units/issue/preview", protectFacility, previewIssueBloodUnits);
router.patch("/blood/units/issue", protectFacility, issueBloodUnits);
router.patch("/blood/units/:id/screening", protectFacility, updateBloodUnitScreening);
router.patch("/blood/units/:id/import", protectFacility, importBloodUnitToStock);
router.patch("/blood/units/:id/discard", protectFacility, discardBloodUnit);

router.get("/blood/requests", protectFacility, getLabBloodRequests);

router.put("/blood/requests/:id", protectFacility, updateBloodRequestStatus);
router.patch("/blood/requests/:id", protectFacility, updateBloodRequestStatus);

router.patch("/blood/requests/:id/status", protectFacility, updateBloodRequestStatus);
router.patch("/blood/requests/:id/handover", protectFacility, updateBloodHandoverStatus);

router.get("/donor/search", protectFacility, searchDonor);
router.post("/donor/donate/:id", protectFacility, markDonation);
router.get("/donors/search", protectFacility, searchDonor);
router.post("/donors/donate/:id", protectFacility, markDonation);
router.get("/donations/recent", protectFacility, getRecentDonations);

router.get("/labs", protectFacility, getAllLabs);
router.get("/hospitals", protectFacility, getHospitalsForIssue);

export default router;
