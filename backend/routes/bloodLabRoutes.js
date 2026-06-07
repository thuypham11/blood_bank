import express from "express";
import {
    getBloodLabDashboard,
    getBloodLabHistory,

    getBloodUnits,
    createBloodUnit,
    updateBloodUnitScreening,
    importBloodUnitToStock,
    discardBloodUnit,
    issueBloodUnits,

    getLabBloodRequests,
    updateBloodRequestStatus,
    getAllLabs,
} from "../controllers/bloodLabController.js";

import { protectFacility } from "../middlewares/facilityMiddleware.js";
import {
    getRecentDonations,
    markDonation,
    searchDonor,
} from "../controllers/donorController.js";
import { get } from "mongoose";

const router = express.Router();

// DASHBOARD & HISTORY 
router.get("/dashboard", protectFacility, getBloodLabDashboard);
router.get("/history", protectFacility, getBloodLabHistory);

router.get("/blood/units", protectFacility, getBloodUnits);

router.post("/blood/units", protectFacility, createBloodUnit);

//router này phải được đặt trước các router có :id
router.patch("/blood/units/issue", protectFacility, issueBloodUnits);

router.patch(
    "/blood/units/:id/screening",
    protectFacility,
    updateBloodUnitScreening
);

router.patch(
    "/blood/units/:id/import",
    protectFacility,
    importBloodUnitToStock
);

router.patch(
    "blood/units/:id/discard",
    protectFacility,
    discardBloodUnit
);

// Blood request
router.get("/blood/requests", protectFacility, getLabBloodRequests);
router.put("/blood/requests/:id", protectFacility, updateBloodRequestStatus);

// donor support
router.get("/donor/search", protectFacility, searchDonor);
router.post("/donor/donate/:id", protectFacility, markDonation);
router.get("/donations/recent", protectFacility, getRecentDonations);

// Labs
router.get("/labs", protectFacility, getAllLabs);
console.log("NEW BLOOD LAB ROUTES ACTIVE");
export default router;

