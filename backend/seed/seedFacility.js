// backend/seed/seedFacility.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Facility from "../models/facilityModel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/Blood-bank";

const facilitiesData = [
  {
    name: "Bệnh viện Bạch Mai",
    email: "bachmai@hospital.com",
    password: "hospital123",
    phone: "0243869373",
    emergencyContact: "0438693732",
    address: {
      street: "78 Đường Giải Phóng",
      city: "Hà Nội",
      ward: "Phương Liệt",
      state: "Hà Nội",
      pincode: "100000",
    },
    registrationNumber: "BV-HN-001",
    facilityType: "hospital",
    facilityCategory: "Government",
    status: "approved",
    is24x7: true,
    emergencyServices: true,
  },
  {
    name: "Bệnh viện Chợ Rẫy",
    email: "choray@hospital.com",
    password: "hospital123",
    phone: "0283855413",
    emergencyContact: "0283855413",
    address: {
      street: "201B Nguyễn Chí Thanh",
      city: "Hồ Chí Minh",
      ward: "Phường 12",
      state: "Hồ Chí Minh",
      pincode: "700000",
    },
    registrationNumber: "BV-HCM-002",
    facilityType: "hospital",
    facilityCategory: "Government",
    status: "approved",
    is24x7: true,
    emergencyServices: true,
  },
];

async function seedFacilities() {
  try {
    console.log("🔌 Đang kết nối MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Kết nối thành công!\n");

    // Hash passwords
    for (const facility of facilitiesData) {
      facility.password = await bcrypt.hash(facility.password, 12);
    }

    // Xóa dữ liệu cũ
    const deletedCount = await Facility.deleteMany({});
    console.log(`🗑️ Đã xóa ${deletedCount.deletedCount} cơ sở cũ.\n`);

    // Insert dữ liệu mới
    const result = await Facility.insertMany(facilitiesData);
    console.log(`✅ Đã tạo ${result.length} cơ sở y tế mới!\n`);

    console.log("📋 Danh sách cơ sở y tế:");
    result.forEach((facility, index) => {
      console.log(`${index + 1}. ${facility.name} (${facility.facilityType}) - ${facility.email}`);
    });

    console.log("\n🎉 Seed dữ liệu cơ sở thành công!");
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Đã ngắt kết nối MongoDB.");
    process.exit(0);
  }
}

seedFacilities();