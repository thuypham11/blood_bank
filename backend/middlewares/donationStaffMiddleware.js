// backend/middlewares/donationStaffMiddleware.js
import jwt from 'jsonwebtoken';
import Facility from '../models/facilityModel.js';

export const protectDonationStaff = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const staff = await Facility.findById(decoded.id).select('-password');
      
      if (!staff || staff.facilityType !== 'donation_staff' || staff.status !== 'approved') {
        return res.status(401).json({ message: 'Not authorized as donation staff' });
      }
      
      if (!staff.assignedCamp) {
        return res.status(403).json({ message: 'Chưa được phân công điểm hiến máu' });
      }
      
      req.staff = staff;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Token invalid or expired' });
    }
  } else {
    res.status(401).json({ message: 'No token provided' });
  }
};