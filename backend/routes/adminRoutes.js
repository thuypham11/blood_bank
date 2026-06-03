import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import {
  // Dashboard
  getDashboardStats,
  seedAdmin,
  // Profile
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  // Admin Management
  getAllAdmins,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  // Donor Management
  getAllDonors,
  getDonorById,
  updateDonor,
  deleteDonor,
  // Facility Management
  getAllFacilities,
  approveFacility,
  rejectFacility,
  deleteFacility,
  // Blood Request Management
  getAllBloodRequests,
  approveBloodRequest,
  rejectBloodRequest,
  // Blood Stock Management
  getGlobalBloodStock,
  getBloodStockUnits,
  addBloodUnit,
  updateBloodUnit,
  // Blood Camps
  getAllCamps,
  createCamp,
  updateCampStatus,
  deleteCamp,
  // Audit Logs & Reports
  getAuditLogs,
  getAdvancedReports,
  // Notifications
  broadcastNotification,
  getNotificationHistory,
  // Backup
  backupDatabase,
  getBackupList,
} from "../controllers/adminController.js";

const router = express.Router();

// Seed (public - only for setup)
router.get("/seed", seedAdmin);

// ── Profile ──────────────────────────────────────────────────
router.get("/profile", protect, getAdminProfile);
router.put("/profile", protect, updateAdminProfile);
router.put("/change-password", protect, changeAdminPassword);

// ── Dashboard ─────────────────────────────────────────────────
router.get("/dashboard", protect, getDashboardStats);

// ── Admin Management (Superadmin only) ────────────────────────
router.get("/manage", protect, requireRole("superadmin"), getAllAdmins);
router.post("/manage", protect, requireRole("superadmin"), createAdminUser);
router.put("/manage/:id", protect, requireRole("superadmin"), updateAdminUser);
router.delete("/manage/:id", protect, requireRole("superadmin"), deleteAdminUser);

// ── Donor Management ──────────────────────────────────────────
router.get("/donors", protect, getAllDonors);
router.get("/donor/:id", protect, getDonorById);
router.put("/donor/:id", protect, updateDonor);
router.delete("/donor/:id", protect, requireRole("superadmin"), deleteDonor);

// ── Facility Management ───────────────────────────────────────
router.get("/facilities", protect, getAllFacilities);
router.put("/facility/approve/:id", protect, approveFacility);
router.put("/facility/reject/:id", protect, rejectFacility);
router.delete("/facility/:id", protect, requireRole("superadmin"), deleteFacility);

// ── Blood Request Management ──────────────────────────────────
router.get("/blood-requests", protect, getAllBloodRequests);
router.put("/blood-requests/:id/approve", protect, approveBloodRequest);
router.put("/blood-requests/:id/reject", protect, rejectBloodRequest);

// ── Blood Stock Management ────────────────────────────────────
router.get("/blood-stock", protect, getGlobalBloodStock);
router.get("/blood-stock/units", protect, getBloodStockUnits);
router.post("/blood-stock/add", protect, addBloodUnit);
router.put("/blood-stock/:id", protect, updateBloodUnit);

// ── Blood Camps ───────────────────────────────────────────────
router.get("/camps", protect, getAllCamps);
router.post("/camps", protect, createCamp);
router.put("/camps/:id/status", protect, updateCampStatus);
router.delete("/camps/:id", protect, requireRole("superadmin"), deleteCamp);

// ── Audit Logs & Reports ──────────────────────────────────────
router.get("/audit-logs", protect, requireRole("superadmin"), getAuditLogs);
router.get("/reports", protect, getAdvancedReports);

// ── Notifications ─────────────────────────────────────────────
router.post("/notifications/broadcast", protect, requireRole("superadmin"), broadcastNotification);
router.get("/notifications/history", protect, requireRole("superadmin"), getNotificationHistory);

// ── Backup & Settings ─────────────────────────────────────────
router.post("/backup", protect, requireRole("superadmin"), backupDatabase);
router.get("/backups/list", protect, requireRole("superadmin"), getBackupList);

export default router;
