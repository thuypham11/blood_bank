// backend/scripts/createDonationStaff.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Facility from '../models/facilityModel.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI 

async function createStaff() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Lấy ID của camp (thay bằng ID thực tế)
    const campId = 'ID_CAMP_VUA_TAO';
    
    const staffData = {
      name: 'Nguyễn Văn A - Nhân viên điểm hiến',
      email: 'staff@donation.com',
      password: 'staff123456',
      phone: '0901234567',
      emergencyContact: '0901234568',
      address: {
        street: '123 Đường Hiến Máu',
        city: 'Hồ Chí Minh',
        state: 'Hồ Chí Minh',
        pincode: '700000'
      },
      registrationNumber: 'STAFF-DON-001',
      facilityType: 'donation_staff',
      facilityCategory: 'Private',
      role: 'donation_staff',
      status: 'approved',
      isActive: true,
      assignedCamp: campId
    };
    
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(staffData.password, salt);
    
    const staff = new Facility({
      ...staffData,
      password: hashedPassword
    });
    
    await staff.save();
    console.log('✅ Staff created!');
    console.log(`📧 Email: ${staffData.email}`);
    console.log(`🔑 Password: ${staffData.password}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createStaff();