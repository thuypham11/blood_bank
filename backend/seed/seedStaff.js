// backend/seed/seedStaff.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Staff from "../models/Staff.js";
import Facility from "../models/facilityModel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://ThuyPham:Pttf.0511@ac-jgxqewd-shard-00-00.mnqekfu.mongodb.net:27017,ac-jgxqewd-shard-00-01.mnqekfu.mongodb.net:27017,ac-jgxqewd-shard-00-02.mnqekfu.mongodb.net:27017/Blood-bank?ssl=true&replicaSet=atlas-p41wab-shard-0&authSource=admin&retryWrites=true&w=majority";

// Danh sách staff mẫu
const staffData = [
  {
    name: "Nguyễn Văn A",
    email: "staff1@bloodbank.com",
    password: "staff123456",
    phone: "0987654321",
    role: "donation_staff",
    isActive: true,
  },
  {
    name: "Trần Thị B",
    email: "staff2@bloodbank.com",
    password: "staff123456",
    phone: "0987654322",
    role: "staff",
    isActive: true,
  },
  {
    name: "Lê Văn C",
    email: "staff3@bloodbank.com",
    password: "staff123456",
    phone: "0987654323",
    role: "manager",
    isActive: true,
  },
];

async function seedStaff() {
  try {
    console.log("🔌 Đang kết nối MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Kết nối thành công!\n");

    // Tìm facility (điểm hiến máu) để gán cho staff
    const facilities = await Facility.find({ facilityType: "hospital", status: "approved" });
    
    // Xóa staff cũ (tùy chọn)
    const deletedCount = await Staff.deleteMany({});
    console.log(`🗑️ Đã xóa ${deletedCount.deletedCount} staff cũ.\n`);

    // Tạo staff mới
    const staffToCreate = [];
    
    for (let i = 0; i < staffData.length; i++) {
      const staff = staffData[i];
      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(staff.password, 12);
      
      // Gán facility cho staff (nếu có)
      const facility = facilities[i % facilities.length] || null;
      
      staffToCreate.push({
        name: staff.name,
        email: staff.email,
        password: hashedPassword,
        phone: staff.phone,
        facility: facility?._id,
        role: staff.role,
        isActive: staff.isActive,
      });
    }

    const result = await Staff.insertMany(staffToCreate);
    console.log(`✅ Đã tạo ${result.length} tài khoản staff!\n`);

    console.log("📋 Danh sách tài khoản staff:");
    console.log("━".repeat(60));
    result.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.name}`);
      console.log(`   📧 Email: ${staff.email}`);
      console.log(`   🔑 Mật khẩu: ${staffData[index].password}`);
      console.log(`   🏥 Facility: ${staff.facility ? "Đã gán" : "Chưa gán"}`);
      console.log(`   👔 Role: ${staff.role}`);
      console.log("");
    });

    console.log("🎉 Seed staff thành công!");
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Đã ngắt kết nối MongoDB.");
    process.exit(0);
  }
}

seedStaff();