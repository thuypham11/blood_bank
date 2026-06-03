// backend/controllers/staffAuthController.js
import Staff from '../models/Staff.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const staff = await Staff.findOne({ email }).select('+password');
    
    if (!staff) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
    
    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
    
    staff.lastLogin = new Date();
    await staff.save();
    
    const token = jwt.sign(
      { id: staff._id, role: 'staff', facility: staff.facility },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      staff: { id: staff._id, name: staff.name, email: staff.email, facility: staff.facility }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};