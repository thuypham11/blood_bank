// backend/middlewares/staffMiddleware.js
import jwt from 'jsonwebtoken';
import Staff from '../models/Staff.js';

export const protectStaff = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.role !== 'staff') {
        return res.status(403).json({ message: 'Không có quyền truy cập' });
      }
      
      const staff = await Staff.findById(decoded.id).select('-password');
      if (!staff) {
        return res.status(401).json({ message: 'Staff không tồn tại' });
      }
      
      req.user = staff;
      next();
    } catch (error) {
      console.error('Staff auth error:', error);
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  } else {
    res.status(401).json({ message: 'Không có token xác thực' });
  }
};

export const authenticateStaffOrDonor = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Cho phép cả staff và donor
    if (decoded.role === 'staff' || decoded.role === 'donor') {
      req.user = decoded;
      return next();
    }
    
    res.status(403).json({ message: 'Forbidden' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};