import express from "express";
import {
  createBloodUnit,
  createBloodBatch,
  discardBloodUnit,
  getAllLabs,
  getBloodLabDashboard,
  getBloodLabHistory,
  getBloodStock,
  getBloodUnitByBarcode,
  getBloodUnitCodeImage,
  getBloodUnits,
  getLabBloodRequests,
  importBloodBatchScreeningFromCsv,
  importBloodUnitToStock,
  importBloodBatchToStock,
  issueBloodUnits,
  labResultCsvUpload,
  splitBloodUnitComponents,
  updateBloodBatchScreening,
  updateBloodHandoverStatus,
  updateBloodRequestStatus,
  updateBloodUnitScreening,
} from "../controllers/bloodLabController.js";
import {
  getRecentDonations,
  markDonation,
  searchDonor,
} from "../controllers/donorController.js";
import { protectFacility } from "../middlewares/facilityMiddleware.js";
import { createLabStaff, getLabStaff, updateLabStaff } from "../controllers/labStaffController.js";

const router = express.Router();

router.get("/dashboard", protectFacility, getBloodLabDashboard);
router.get("/history", protectFacility, getBloodLabHistory);

router.get("/staff", protectFacility, getLabStaff);
router.post("/staff", protectFacility, createLabStaff);
router.patch("/staff/:id", protectFacility, updateLabStaff);

router.get("/blood/stock", protectFacility, getBloodStock);
router.get("/blood/units", protectFacility, getBloodUnits);
router.post("/blood/units/batch", protectFacility, createBloodBatch);
router.post("/blood/units", protectFacility, createBloodUnit);
router.get("/blood/units/barcode/:barcode", protectFacility, getBloodUnitByBarcode);
router.get("/blood/units/:id/code", protectFacility, getBloodUnitCodeImage);
router.post("/blood/units/:id/components", protectFacility, splitBloodUnitComponents);
router.patch("/blood/units/issue", protectFacility, issueBloodUnits);
router.patch("/blood/units/:id/screening", protectFacility, updateBloodUnitScreening);
router.patch("/blood/units/:id/import", protectFacility, importBloodUnitToStock);
router.patch("/blood/units/:id/discard", protectFacility, discardBloodUnit);
router.patch("/blood/batches/:batchCode/screening", protectFacility, updateBloodBatchScreening);
router.post(
  "/blood/batches/:batchCode/screening/import-csv",
  protectFacility,
  labResultCsvUpload.single("file"),
  importBloodBatchScreeningFromCsv
);
router.patch("/blood/batches/:batchCode/import", protectFacility, importBloodBatchToStock);

router.get("/blood/requests", protectFacility, getLabBloodRequests);
router.put("/blood/requests/:id", protectFacility, updateBloodRequestStatus);
router.patch("/blood/requests/:id/handover", protectFacility, updateBloodHandoverStatus);

router.get("/donor/search", protectFacility, searchDonor);
router.post("/donor/donate/:id", protectFacility, markDonation);
router.get("/donors/search", protectFacility, searchDonor);
router.post("/donors/donate/:id", protectFacility, markDonation);
router.get("/donations/recent", protectFacility, getRecentDonations);

router.get("/labs", protectFacility, getAllLabs);

export default router;
