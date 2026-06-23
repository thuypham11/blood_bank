import express from "express";
import { protectLabStaff, requireLabPermission } from "../middlewares/labStaffMiddleware.js";
import {
	approveResult,
	getMyLabStaffProfile,
	getWorklist,
	saveDraftResult,
	submitResult,
} from "../controllers/labStaffWorkspaceController.js";

const router = express.Router();
router.use(protectLabStaff);
router.get("/me", getMyLabStaffProfile);
router.get("/worklist", requireLabPermission("view_samples"), getWorklist);
router.put("/results/:bloodUnitId/draft", requireLabPermission("enter_results"), saveDraftResult);
router.post("/results/:id/submit", requireLabPermission("submit_results"), submitResult);
router.post("/results/:id/approve", requireLabPermission("approve_results"), approveResult);

export default router;
