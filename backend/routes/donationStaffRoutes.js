// backend/routes/donationStaffRoutes.js
import express from 'express';
import { protectDonationStaff } from '../middlewares/donationStaffMiddleware.js';
import {
  getQueue,
  callNextDonor,
  startDonation,
  completeDonation,
  deferDonor
} from '../controllers/donationStaffController.js';

const router = express.Router();

router.use(protectDonationStaff);

router.get('/queue', getQueue);
router.post('/call', callNextDonor);
router.put('/start/:appointmentId', startDonation);
router.put('/complete/:appointmentId', completeDonation);
router.put('/defer/:appointmentId', deferDonor);

export default router;