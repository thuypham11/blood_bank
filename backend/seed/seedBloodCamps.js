// backend/seed/seedBloodCamps.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import BloodCamp from "../models/bloodCampModel.js";
import Facility from "../models/facilityModel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/Blood-bank";

// Dữ liệu mẫu cho các điểm hiến máu (BloodCamp)
const bloodCampsData = [
  {
    title: "Hiến Máu Nhân Đạo - Quận 1",
    description: "Chương trình hiến máu tình nguyện tại trung tâm Quận 1. Được tổ chức bởi Hội Chữ Thập Đỏ TP.HCM.",
    date: new Date(new Date().setDate(new Date().getDate() + 7)),
    time: { start: "08:00", end: "16:00" },
    location: {
      venue: "Trung tâm Văn hóa Quận 1",
      city: "Hồ Chí Minh",
      state: "Hồ Chí Minh",
      pincode: "700000",
      coordinates: { lat: 10.7769, lng: 106.7009 },
    },
    expectedDonors: 200,
    status: "Upcoming",
  },
  {
    title: "Giọt Máu Hồng - Bệnh viện Bạch Mai",
    description: "Chương trình hiến máu cứu người tại Bệnh viện Bạch Mai.",
    date: new Date(new Date().setDate(new Date().getDate() + 14)),
    time: { start: "07:30", end: "17:00" },
    location: {
      venue: "Bệnh viện Bạch Mai",
      city: "Hà Nội",
      state: "Hà Nội",
      pincode: "100000",
      coordinates: { lat: 21.0038, lng: 105.8416 },
    },
    expectedDonors: 300,
    status: "Upcoming",
  },
  {
    title: "Ngày Hội Hiến Máu - Đà Nẵng",
    description: "Sự kiện hiến máu lớn nhất Đà Nẵng, kêu gọi toàn thể người dân tham gia.",
    date: new Date(new Date().setDate(new Date().getDate() + 21)),
    time: { start: "08:30", end: "15:30" },
    location: {
      venue: "Trung tâm Hội nghị Đà Nẵng",
      city: "Đà Nẵng",
      state: "Đà Nẵng",
      pincode: "550000",
      coordinates: { lat: 16.0544, lng: 108.2022 },
    },
    expectedDonors: 150,
    status: "Upcoming",
  },
  {
    title: "Hiến Máu Cứu Người - Cần Thơ",
    description: "Chương trình hiến máu tại Cần Thơ, hỗ trợ các bệnh viện khu vực Đồng bằng sông Cửu Long.",
    date: new Date(new Date().setDate(new Date().getDate() + 10)),
    time: { start: "08:00", end: "16:00" },
    location: {
      venue: "Bệnh viện Đa khoa Cần Thơ",
      city: "Cần Thơ",
      state: "Cần Thơ",
      pincode: "900000",
      coordinates: { lat: 10.0452, lng: 105.7469 },
    },
    expectedDonors: 120,
    status: "Upcoming",
  },
  {
    title: "Chủ Nhật Đỏ - Biên Hòa",
    description: "Hiến máu tình nguyện chủ nhật hàng tuần tại Trung tâm Văn hóa Biên Hòa.",
    date: new Date(new Date().setDate(new Date().getDate() + 5)),
    time: { start: "08:00", end: "12:00" },
    location: {
      venue: "Trung tâm Văn hóa Biên Hòa",
      city: "Đồng Nai",
      state: "Đồng Nai",
      pincode: "810000",
      coordinates: { lat: 10.9460, lng: 106.8237 },
    },
    expectedDonors: 80,
    status: "Upcoming",
  },
  {
    title: "Hiến Máu Lưu Động - Huế",
    description: "Xe hiến máu lưu động sẽ có mặt tại các điểm trung tâm thành phố Huế.",
    date: new Date(new Date().setDate(new Date().getDate() + 12)),
    time: { start: "08:00", end: "18:00" },
    location: {
      venue: "Bệnh viện Trung ương Huế",
      city: "Thừa Thiên Huế",
      state: "Thừa Thiên Huế",
      pincode: "490000",
      coordinates: { lat: 16.4637, lng: 107.5909 },
    },
    expectedDonors: 90,
    status: "Upcoming",
  },
  {
    title: "Ngày Hội Hiến Máu - Bình Dương",
    description: "Sự kiện hiến máu quy mô lớn tại Bình Dương, có quà tặng cho người tham gia.",
    date: new Date(new Date().setDate(new Date().getDate() + 18)),
    time: { start: "07:00", end: "14:00" },
    location: {
      venue: "Trung tâm Hành chính Bình Dương",
      city: "Bình Dương",
      state: "Bình Dương",
      pincode: "820000",
      coordinates: { lat: 11.1625, lng: 106.6575 },
    },
    expectedDonors: 250,
    status: "Upcoming",
  },
  {
    title: "Hiến Máu Cấp Cứu - Hải Phòng",
    description: "Đợt hiến máu đặc biệt để hỗ trợ các bệnh nhân cấp cứu tại Hải Phòng.",
    date: new Date(new Date().setDate(new Date().getDate() + 4)),
    time: { start: "08:00", end: "20:00" },
    location: {
      venue: "Bệnh viện Hữu Nghị Việt Tiệp",
      city: "Hải Phòng",
      state: "Hải Phòng",
      pincode: "180000",
      coordinates: { lat: 20.8449, lng: 106.6881 },
    },
    expectedDonors: 150,
    status: "Upcoming",
  },
  {
    title: "Xuân Hồng 2026 - Hà Nội",
    description: "Chương trình hiến máu Xuân Hồng thường niên tại Hà Nội.",
    date: new Date(new Date().setDate(new Date().getDate() + 30)),
    time: { start: "07:00", end: "17:00" },
    location: {
      venue: "Cung Văn hóa Hữu Nghị",
      city: "Hà Nội",
      state: "Hà Nội",
      pincode: "100000",
      coordinates: { lat: 21.0285, lng: 105.8542 },
    },
    expectedDonors: 500,
    status: "Upcoming",
  },
  {
    title: "Hiến Máu Tại Công Ty ABC - TP.HCM",
    description: "Chương trình hiến máu nội bộ tại Công ty ABC.",
    date: new Date(new Date().setDate(new Date().getDate() + 2)),
    time: { start: "09:00", end: "16:00" },
    location: {
      venue: "Công ty ABC, Lầu 5 Tòa nhà SaiGon Center",
      city: "Hồ Chí Minh",
      state: "Hồ Chí Minh",
      pincode: "700000",
      coordinates: { lat: 10.7743, lng: 106.7038 },
    },
    expectedDonors: 60,
    status: "Upcoming",
  },
];

async function seedBloodCamps() {
  try {
    console.log("🔌 Đang kết nối MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Kết nối thành công!\n");

    // Tìm một facility đã được approve để gán làm hospital
    const approvedHospital = await Facility.findOne({ 
      facilityType: "hospital", 
      status: "approved" 
    });

    if (!approvedHospital) {
      console.log("⚠️ Không tìm thấy bệnh viện nào đã được phê duyệt.");
      console.log("   Vui lòng tạo và phê duyệt một bệnh viện trước.");
      console.log("\n   Cách tạo nhanh: Chạy script seedFacility.js");
      process.exit(1);
    }

    console.log(`🏥 Sử dụng bệnh viện: ${approvedHospital.name} (ID: ${approvedHospital._id})`);

    // Thêm hospitalId vào từng camp
    const campsWithHospital = bloodCampsData.map(camp => ({
      ...camp,
      hospital: approvedHospital._id
    }));

    // Xóa dữ liệu cũ
    const deletedCount = await BloodCamp.deleteMany({});
    console.log(`🗑️ Đã xóa ${deletedCount.deletedCount} điểm hiến máu cũ.\n`);

    // Insert dữ liệu mới
    const result = await BloodCamp.insertMany(campsWithHospital);
    console.log(`✅ Đã tạo ${result.length} điểm hiến máu mới!\n`);

    // Hiển thị danh sách
    console.log("📋 Danh sách điểm hiến máu:");
    console.log("━".repeat(60));
    result.forEach((camp, index) => {
      console.log(`${index + 1}. ${camp.title}`);
      console.log(`   📍 ${camp.location.venue}, ${camp.location.city}`);
      console.log(`   📅 ${camp.date.toLocaleDateString("vi-VN")} | 🕐 ${camp.time.start} - ${camp.time.end}`);
      console.log(`   👥 Dự kiến: ${camp.expectedDonors} người`);
      console.log("");
    });

    console.log("🎉 Seed dữ liệu thành công!");
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Đã ngắt kết nối MongoDB.");
    process.exit(0);
  }
}

seedBloodCamps();