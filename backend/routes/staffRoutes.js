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

// Protected routes
router.use(protectStaff);

router.get('/sessions', getTodaySessions);
router.get('/queue/:sessionId', getQueue);
router.get('/stats', getStats);

router.post('/queue/add', addToQueue);
router.post('/queue/call/:sessionId', callNextDonor);
router.post('/donation/start', startDonation);
router.post('/donation/complete', completeDonation);

export default router;