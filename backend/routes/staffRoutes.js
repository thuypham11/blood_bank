// backend/routes/staffRoutes.js
import express from 'express';
import { protectStaff } from '../middlewares/staffMiddleware.js';
import { staffLogin } from '../controllers/staffAuthController.js';
import {
  getTodaySessions,
  getQueue,
  addToQueue,
  callNextDonor,
  startDonation,
  completeDonation,
  getStats
} from '../controllers/staffController.js';

const router = express.Router();

// Public route
router.post('/login', staffLogin);

// Protected routes - TẤT CẢ đều cần protectStaff
router.get('/sessions', protectStaff, getTodaySessions);
router.get('/queue/:sessionId', protectStaff, getQueue);
router.get('/stats', protectStaff, getStats);

router.post('/queue/add', protectStaff, addToQueue);
router.post('/queue/call/:sessionId', protectStaff, callNextDonor);
router.post('/donation/start', protectStaff, startDonation);
router.post('/donation/complete', protectStaff, completeDonation);

export default router;