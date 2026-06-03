import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

import Donor from "../models/donorModel.js";
import Facility from "../models/facilityModel.js";
import BloodCamp from "../models/bloodCampModel.js";
import BloodModel from "../models/BloodModel.js";
import BloodRequest from "../models/bloodRequestModel.js";
import AuditLog from "../models/AuditLogModel.js";
import Notification from "../models/NotificationModel.js";
import Admin from "../models/adminModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const seedData = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected!");
    console.log("─────────────────────────────────────────");
    console.log("🌱 Seeding Vietnamese Blood Bank Data v3");
    console.log("─────────────────────────────────────────");

    // 1. CLEAR
    console.log("1. Cleaning old data...");
    await Donor.deleteMany({});
    await Facility.deleteMany({});
    await BloodCamp.deleteMany({});
    await BloodRequest.deleteMany({});
    await AuditLog.deleteMany({});
    await Notification.deleteMany({});
    try { await mongoose.connection.collection("bloods").drop(); } catch (_) {}
    console.log("   ✅ Cleared.");

    const pwd = await bcrypt.hash("password123", 10);

    // 2. FACILITIES - 5 Labs + 10 Hospitals
    console.log("2. Seeding Facilities...");
    const labsRaw = [
      { name: "Viện Huyết học - Truyền máu Trung ương", email: "vhhtmtw@bloodbank.vn", phone: "0243869373", emergencyContact: "0243869373", address: { street: "Phố Phạm Văn Bạch, Cầu Giấy", city: "Hà Nội", state: "Hà Nội", pincode: "100000" }, registrationNumber: "LAB-HN-001", status: "approved" },
      { name: "BV Truyền máu Huyết học TP.HCM", email: "tmhh.hcm@bloodbank.vn", phone: "0283957134", emergencyContact: "0283957134", address: { street: "118 Hồng Bàng, Quận 5", city: "Hồ Chí Minh", state: "Hồ Chí Minh", pincode: "700000" }, registrationNumber: "LAB-HCM-001", status: "approved" },
      { name: "Trung tâm Máu Quốc gia Đà Nẵng", email: "mauquocgia.dn@bloodbank.vn", phone: "0236382513", emergencyContact: "0236382513", address: { street: "124 Hải Phòng, Hải Châu", city: "Đà Nẵng", state: "Đà Nẵng", pincode: "550000" }, registrationNumber: "LAB-DN-001", status: "approved" },
      { name: "Trung tâm Truyền máu Cần Thơ", email: "ttm.cantho@bloodbank.vn", phone: "0292382513", emergencyContact: "0292382513", address: { street: "4 Châu Văn Liêm, Ninh Kiều", city: "Cần Thơ", state: "Cần Thơ", pincode: "900000" }, registrationNumber: "LAB-CT-001", status: "approved" },
      { name: "Ngân hàng Máu Huế", email: "nhmau.hue@bloodbank.vn", phone: "0234382513", emergencyContact: "0234382513", address: { street: "16 Lê Lợi, TP Huế", city: "Huế", state: "Thừa Thiên Huế", pincode: "530000" }, registrationNumber: "LAB-HUE-001", status: "approved" },
    ];

    const hospitalsRaw = [
      { name: "Bệnh viện Chợ Rẫy", email: "choray@hospital.vn", phone: "0283855413", emergencyContact: "0283855413", address: { street: "201B Nguyễn Chí Thanh, Quận 5", city: "Hồ Chí Minh", state: "Hồ Chí Minh", pincode: "700000" }, registrationNumber: "HOS-HCM-001", status: "approved" },
      { name: "Bệnh viện Bạch Mai", email: "bachmai@hospital.vn", phone: "0243869374", emergencyContact: "0243869374", address: { street: "78 Giải Phóng, Đống Đa", city: "Hà Nội", state: "Hà Nội", pincode: "100000" }, registrationNumber: "HOS-HN-001", status: "approved" },
      { name: "Bệnh viện Nhân dân 115", email: "bv115@hospital.vn", phone: "0283865236", emergencyContact: "0283865236", address: { street: "527 Sư Vạn Hạnh, Quận 10", city: "Hồ Chí Minh", state: "Hồ Chí Minh", pincode: "700000" }, registrationNumber: "HOS-HCM-002", status: "approved" },
      { name: "Bệnh viện Đại học Y Dược TP.HCM", email: "ump@hospital.vn", phone: "0283855412", emergencyContact: "0283855412", address: { street: "215 Hồng Bàng, Quận 5", city: "Hồ Chí Minh", state: "Hồ Chí Minh", pincode: "700000" }, registrationNumber: "HOS-HCM-003", status: "approved" },
      { name: "Bệnh viện Việt Đức", email: "vietduc@hospital.vn", phone: "0243825703", emergencyContact: "0243825703", address: { street: "40 Tràng Thi, Hoàn Kiếm", city: "Hà Nội", state: "Hà Nội", pincode: "100000" }, registrationNumber: "HOS-HN-002", status: "approved" },
      { name: "Bệnh viện Trung ương Huế", email: "bvhue@hospital.vn", phone: "0234822325", emergencyContact: "0234822325", address: { street: "16 Lê Lợi, TP Huế", city: "Huế", state: "Thừa Thiên Huế", pincode: "530000" }, registrationNumber: "HOS-HUE-001", status: "approved" },
      { name: "Bệnh viện C Đà Nẵng", email: "bvc.danang@hospital.vn", phone: "0236382514", emergencyContact: "0236382514", address: { street: "122 Hải Phòng, Hải Châu", city: "Đà Nẵng", state: "Đà Nẵng", pincode: "550000" }, registrationNumber: "HOS-DN-001", status: "approved" },
      { name: "Bệnh viện Nhi đồng 1", email: "nhidong1@hospital.vn", phone: "0283927341", emergencyContact: "0283927341", address: { street: "341 Sư Vạn Hạnh, Quận 10", city: "Hồ Chí Minh", state: "Hồ Chí Minh", pincode: "700000" }, registrationNumber: "HOS-HCM-004", status: "approved" },
      { name: "Bệnh viện Từ Dũ", email: "tudu@hospital.vn", phone: "0283295007", emergencyContact: "0283295007", address: { street: "284 Cống Quỳnh, Quận 1", city: "Hồ Chí Minh", state: "Hồ Chí Minh", pincode: "700000" }, registrationNumber: "HOS-HCM-005", status: "approved" },
      { name: "BV Đa khoa Đồng Nai", email: "dongnaibv@hospital.vn", phone: "0251382777", emergencyContact: "0251382777", address: { street: "1 Phan Chu Trinh, Biên Hòa", city: "Đồng Nai", state: "Đồng Nai", pincode: "810000" }, registrationNumber: "HOS-DN-002", status: "pending" },
    ];

    const labs = await Facility.insertMany(
      labsRaw.map(f => ({ ...f, password: pwd, facilityType: "blood-lab", facilityCategory: "Government" }))
    );
    const hospitals = await Facility.insertMany(
      hospitalsRaw.map(f => ({ ...f, password: pwd, facilityType: "hospital", facilityCategory: "Government" }))
    );
    console.log(`   ✅ ${labs.length} Labs + ${hospitals.length} Hospitals`);

    // 3. DONORS - 10 người thực tế
    console.log("3. Seeding Donors...");
    const donorList = [
      { fullName: "Nguyễn Văn Hùng", email: "nvhung@gmail.com", phone: "0912345678", bloodGroup: "O+", gender: "Male", dateOfBirth: new Date("1990-03-15"), age: 34, eligibleToDonate: true, isVerified: true, address: { street: "123 Nguyễn Huệ", city: "Hồ Chí Minh", state: "Hồ Chí Minh", zipCode: "700000" } },
      { fullName: "Trần Thị Lan", email: "ttlan@gmail.com", phone: "0923456789", bloodGroup: "A+", gender: "Female", dateOfBirth: new Date("1995-07-22"), age: 28, eligibleToDonate: true, isVerified: true, address: { street: "45 Lê Lợi", city: "Hà Nội", state: "Hà Nội", zipCode: "100000" } },
      { fullName: "Lê Minh Tuấn", email: "lmtuan@gmail.com", phone: "0934567890", bloodGroup: "B+", gender: "Male", dateOfBirth: new Date("1988-11-03"), age: 35, eligibleToDonate: true, isVerified: true, address: { street: "78 Trần Hưng Đạo", city: "Đà Nẵng", state: "Đà Nẵng", zipCode: "550000" } },
      { fullName: "Phạm Thu Hà", email: "ptha@gmail.com", phone: "0945678901", bloodGroup: "AB+", gender: "Female", dateOfBirth: new Date("1993-05-18"), age: 31, eligibleToDonate: false, isVerified: true, address: { street: "12 Võ Thị Sáu", city: "Hồ Chí Minh", state: "Hồ Chí Minh", zipCode: "700000" } },
      { fullName: "Hoàng Anh Đức", email: "haduc@gmail.com", phone: "0956789012", bloodGroup: "O-", gender: "Male", dateOfBirth: new Date("1985-09-30"), age: 38, eligibleToDonate: true, isVerified: true, address: { street: "99 Đinh Tiên Hoàng", city: "Hà Nội", state: "Hà Nội", zipCode: "100000" } },
      { fullName: "Vũ Thị Mai", email: "vtmai@gmail.com", phone: "0967890123", bloodGroup: "A-", gender: "Female", dateOfBirth: new Date("1997-12-05"), age: 26, eligibleToDonate: true, isVerified: false, address: { street: "55 Lê Duẩn", city: "Đà Nẵng", state: "Đà Nẵng", zipCode: "550000" } },
      { fullName: "Phan Thanh Hải", email: "pthai@gmail.com", phone: "0978901234", bloodGroup: "B-", gender: "Male", dateOfBirth: new Date("1991-02-14"), age: 33, eligibleToDonate: true, isVerified: true, address: { street: "200 Cách Mạng Tháng 8", city: "Hồ Chí Minh", state: "Hồ Chí Minh", zipCode: "700000" } },
      { fullName: "Đặng Văn Ngọc", email: "dvngoc@gmail.com", phone: "0989012345", bloodGroup: "AB-", gender: "Male", dateOfBirth: new Date("1986-06-25"), age: 37, eligibleToDonate: true, isVerified: true, address: { street: "34 Hoàng Diệu", city: "Cần Thơ", state: "Cần Thơ", zipCode: "900000" } },
      { fullName: "Bùi Thị Phương", email: "btphuong@gmail.com", phone: "0990123456", bloodGroup: "O+", gender: "Female", dateOfBirth: new Date("1999-08-10"), age: 24, eligibleToDonate: true, isVerified: true, address: { street: "18 Lý Thường Kiệt", city: "Huế", state: "Thừa Thiên Huế", zipCode: "530000" } },
      { fullName: "Hồ Minh Châu", email: "hmchau@gmail.com", phone: "0901234567", bloodGroup: "A+", gender: "Female", dateOfBirth: new Date("1994-04-28"), age: 30, eligibleToDonate: false, isVerified: false, address: { street: "66 Pasteur", city: "Hồ Chí Minh", state: "Hồ Chí Minh", zipCode: "700000" } },
    ];

    const donors = await Donor.insertMany(donorList.map(d => ({ ...d, password: pwd })));
    console.log(`   ✅ ${donors.length} Donors`);

    // 4. BLOOD CAMPS - 8 chiến dịch thực tế
    console.log("4. Seeding Blood Camps...");
    const camps = await BloodCamp.insertMany([
      { title: "Lễ hội Xuân Hồng 2026", date: new Date(Date.now() + 10 * 86400000), time: { start: "07:30", end: "17:00" }, location: { venue: "Nhà Văn hóa Thanh niên", address: "4 Phạm Ngọc Thạch, Bến Nghé", city: "Hồ Chí Minh", state: "Hồ Chí Minh", coordinates: { lat: 10.782, lng: 106.697 } }, hospital: labs[1]._id, organizer: labs[1]._id, status: "Upcoming", expectedDonors: 500, description: "Chiến dịch hiến máu lớn nhất đầu năm 2026, kêu gọi toàn bộ CBNV và sinh viên tham gia." },
      { title: "Chủ nhật Đỏ lần thứ XVIII", date: new Date(Date.now() - 20 * 86400000), time: { start: "08:00", end: "16:00" }, location: { venue: "Sân vận động Mỹ Đình", address: "Lê Đức Thọ, Nam Từ Liêm", city: "Hà Nội", state: "Hà Nội", coordinates: { lat: 21.020, lng: 105.766 } }, hospital: labs[0]._id, organizer: labs[0]._id, status: "Completed", expectedDonors: 1000, description: "Ngày hội hiến máu toàn quốc lần thứ XVIII. Thu về 980 đơn vị máu an toàn." },
      { title: "Giọt hồng Bách Khoa", date: new Date(Date.now() + 2 * 86400000), time: { start: "07:00", end: "11:30" }, location: { venue: "ĐH Bách Khoa TP.HCM", address: "268 Lý Thường Kiệt, Q10", city: "Hồ Chí Minh", state: "Hồ Chí Minh", coordinates: { lat: 10.772, lng: 106.657 } }, hospital: labs[1]._id, organizer: labs[1]._id, status: "Upcoming", expectedDonors: 300, description: "Sinh viên Bách Khoa chung tay cứu người." },
      { title: "Hành trình Đỏ - Miền Trung", date: new Date(Date.now() - 5 * 86400000), time: { start: "08:00", end: "12:00" }, location: { venue: "Sân vận động Chi Lăng", address: "202 Hoàng Diệu, Hải Châu", city: "Đà Nẵng", state: "Đà Nẵng", coordinates: { lat: 16.060, lng: 108.223 } }, hospital: labs[2]._id, organizer: labs[2]._id, status: "Ongoing", expectedDonors: 400, description: "Chiến dịch hiến máu khu vực Miền Trung." },
      { title: "Tri ân Thầy Thuốc 27/02", date: new Date(Date.now() + 20 * 86400000), time: { start: "09:00", end: "15:00" }, location: { venue: "Công viên Thống Nhất", address: "58 Lê Duẩn, Hai Bà Trưng", city: "Hà Nội", state: "Hà Nội", coordinates: { lat: 21.012, lng: 105.844 } }, hospital: labs[0]._id, organizer: labs[0]._id, status: "Upcoming", expectedDonors: 250, description: "Nhân dịp ngày Thầy thuốc Việt Nam." },
      { title: "Hiến máu Chào năm mới 2026", date: new Date(Date.now() - 45 * 86400000), time: { start: "08:00", end: "17:00" }, location: { venue: "Nhà Thi Đấu Phú Thọ", address: "1 Lữ Gia, Quận 11", city: "Hồ Chí Minh", state: "Hồ Chí Minh", coordinates: { lat: 10.767, lng: 106.652 } }, hospital: labs[1]._id, organizer: labs[1]._id, status: "Completed", expectedDonors: 600, description: "Chào đón năm mới bằng nghĩa cử cao đẹp. Đạt 95% chỉ tiêu." },
      { title: "Ngân hàng máu Sống - RMIT", date: new Date(Date.now() + 35 * 86400000), time: { start: "09:00", end: "13:00" }, location: { venue: "RMIT Việt Nam", address: "702 Nguyễn Văn Linh, Q7", city: "Hồ Chí Minh", state: "Hồ Chí Minh", coordinates: { lat: 10.729, lng: 106.723 } }, hospital: labs[1]._id, organizer: labs[1]._id, status: "Upcoming", expectedDonors: 150, description: "Sinh viên quốc tế RMIT cùng hiến máu." },
      { title: "Hiến máu tại Cần Thơ - Mùa lũ", date: new Date(Date.now() + 5 * 86400000), time: { start: "08:00", end: "14:00" }, location: { venue: "Bến Ninh Kiều", address: "Quảng trường Ninh Kiều", city: "Cần Thơ", state: "Cần Thơ", coordinates: { lat: 10.034, lng: 105.787 } }, hospital: labs[3]._id, organizer: labs[3]._id, status: "Upcoming", expectedDonors: 200, description: "Hỗ trợ máu dự phòng trong mùa lũ Đồng bằng sông Cửu Long." },
    ]);
    console.log(`   ✅ ${camps.length} Blood Camps`);

    // 5. BLOOD STOCK - 200 đơn vị (20 sắp hết hạn)
    console.log("5. Seeding Blood Stock (200 units)...");
    const bloodUnits = [];
    for (let i = 0; i < 200; i++) {
      const bg = BLOOD_GROUPS[Math.floor(Math.random() * BLOOD_GROUPS.length)];
      const lab = labs[Math.floor(Math.random() * labs.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const collectionDate = new Date(Date.now() - daysAgo * 86400000);
      const expiryDate = new Date(collectionDate.getTime() + 42 * 86400000);
      if (i < 20) expiryDate.setTime(Date.now() + Math.floor(Math.random() * 6 + 1) * 86400000);
      const statusRoll = Math.random();
      const status = statusRoll < 0.50 ? "available" : statusRoll < 0.70 ? "pending_testing" : statusRoll < 0.84 ? "used" : statusRoll < 0.92 ? "expired" : "rejected";
      bloodUnits.push({
        barcode: `BLD-${Date.now()}-${i}-${Math.floor(Math.random() * 99999)}`,
        bloodGroup: bg, bloodType: bg,
        quantity: [250, 350, 450][Math.floor(Math.random() * 3)],
        collectionDate, expirationDate: expiryDate, expiryDate,
        bloodLab: lab._id, status,
        screeningResult: {
          hiv: status === "rejected" && Math.random() < 0.5 ? "positive" : "negative",
          hbv: status === "rejected" && Math.random() < 0.3 ? "positive" : "negative",
          hcv: status === "rejected" && Math.random() < 0.2 ? "positive" : "negative",
        },
      });
    }
    await BloodModel.insertMany(bloodUnits);
    console.log(`   ✅ ${bloodUnits.length} Blood Units`);

    // 6. BLOOD REQUESTS - 10 yêu cầu thực tế
    console.log("6. Seeding Blood Requests...");
    const reqStatuses = ["pending", "accepted", "completed", "rejected"];
    const handoverMap = { pending: "requested", accepted: "preparing", completed: "confirmed", rejected: "requested" };
    const requests = await BloodRequest.insertMany([
      { hospitalId: hospitals[0]._id, labId: labs[1]._id, bloodType: "O+", units: 20, status: "pending", handoverStatus: "requested", createdAt: new Date(Date.now() - 1 * 86400000) },
      { hospitalId: hospitals[1]._id, labId: labs[0]._id, bloodType: "A+", units: 15, status: "accepted", handoverStatus: "preparing", createdAt: new Date(Date.now() - 3 * 86400000) },
      { hospitalId: hospitals[2]._id, labId: labs[1]._id, bloodType: "B+", units: 10, status: "completed", handoverStatus: "confirmed", createdAt: new Date(Date.now() - 10 * 86400000) },
      { hospitalId: hospitals[3]._id, labId: labs[1]._id, bloodType: "AB-", units: 5, status: "rejected", handoverStatus: "requested", createdAt: new Date(Date.now() - 5 * 86400000) },
      { hospitalId: hospitals[4]._id, labId: labs[0]._id, bloodType: "O-", units: 8, status: "pending", handoverStatus: "requested", createdAt: new Date(Date.now() - 2 * 86400000) },
      { hospitalId: hospitals[5]._id, labId: labs[2]._id, bloodType: "A-", units: 12, status: "accepted", handoverStatus: "preparing", createdAt: new Date(Date.now() - 4 * 86400000) },
      { hospitalId: hospitals[6]._id, labId: labs[2]._id, bloodType: "B+", units: 25, status: "pending", handoverStatus: "requested", createdAt: new Date(Date.now() - 1 * 86400000) },
      { hospitalId: hospitals[7]._id, labId: labs[1]._id, bloodType: "O+", units: 30, status: "completed", handoverStatus: "confirmed", createdAt: new Date(Date.now() - 15 * 86400000) },
      { hospitalId: hospitals[8]._id, labId: labs[1]._id, bloodType: "A+", units: 18, status: "pending", handoverStatus: "requested", createdAt: new Date(Date.now() - 1 * 86400000) },
      { hospitalId: hospitals[0]._id, labId: labs[3]._id, bloodType: "AB+", units: 6, status: "accepted", handoverStatus: "preparing", createdAt: new Date(Date.now() - 6 * 86400000) },
    ]);
    console.log(`   ✅ ${requests.length} Blood Requests`);

    // 7. ADMIN + 5 sub-admins
    console.log("7. Seeding Admins...");
    let superAdmin = await Admin.findOne({ email: "admin@bloodbank.com" });
    if (!superAdmin) {
      superAdmin = await Admin.create({
        name: "Super Admin", email: "admin@bloodbank.com", password: "password123",
        role: "superadmin",
        permissions: ["manage_users", "manage_blood_camps", "manage_blood_stock", "manage_requests", "view_reports", "view_audit_logs", "manage_admins"],
      });
    } else {
      superAdmin.role = "superadmin";
      superAdmin.permissions = ["manage_users", "manage_blood_camps", "manage_blood_stock", "manage_requests", "view_reports", "view_audit_logs", "manage_admins"];
      await superAdmin.save();
    }

    const subAdmins = [
      { name: "Nguyễn Quản Lý", email: "quanly1@bloodbank.vn", password: "password123", role: "admin", permissions: ["manage_blood_stock", "manage_requests", "view_reports"], isActive: true },
      { name: "Trần Điều Phối", email: "dieuphoi@bloodbank.vn", password: "password123", role: "admin", permissions: ["manage_blood_camps", "manage_requests"], isActive: true },
      { name: "Lê Thống Kê", email: "thongke@bloodbank.vn", password: "password123", role: "admin", permissions: ["view_reports", "view_audit_logs"], isActive: true },
      { name: "Phạm Kho Máu", email: "khomau@bloodbank.vn", password: "password123", role: "admin", permissions: ["manage_blood_stock", "manage_users"], isActive: true },
      { name: "Hoàng Chiến Dịch", email: "chiendich@bloodbank.vn", password: "password123", role: "admin", permissions: ["manage_blood_camps"], isActive: false },
    ];

    for (const sa of subAdmins) {
      const exists = await Admin.findOne({ email: sa.email });
      if (!exists) await Admin.create(sa);
    }
    console.log(`   ✅ 1 Superadmin + ${subAdmins.length} Sub-admins`);

    // 8. AUDIT LOGS - 10 hành động
    console.log("8. Seeding Audit Logs...");
    const auditLogs = await AuditLog.insertMany([
      { action: "APPROVE_FACILITY", performedBy: { userType: "Admin", userId: superAdmin._id, name: "Super Admin" }, target: { targetType: "Facility", targetId: hospitals[0]._id }, description: `Duyệt cơ sở: ${hospitals[0].name}`, ipAddress: "192.168.1.10", createdAt: new Date(Date.now() - 29 * 86400000) },
      { action: "APPROVE_FACILITY", performedBy: { userType: "Admin", userId: superAdmin._id, name: "Super Admin" }, target: { targetType: "Facility", targetId: hospitals[1]._id }, description: `Duyệt cơ sở: ${hospitals[1].name}`, ipAddress: "192.168.1.10", createdAt: new Date(Date.now() - 28 * 86400000) },
      { action: "REJECT_FACILITY",  performedBy: { userType: "Admin", userId: superAdmin._id, name: "Super Admin" }, target: { targetType: "Facility", targetId: hospitals[9]._id }, description: `Từ chối cơ sở: ${hospitals[9].name} - thiếu giấy phép`, ipAddress: "192.168.1.10", createdAt: new Date(Date.now() - 25 * 86400000) },
      { action: "CREATE_BLOOD_CAMP", performedBy: { userType: "Admin", userId: superAdmin._id, name: "Super Admin" }, target: { targetType: "BloodCamp", targetId: camps[0]._id }, description: `Tạo chiến dịch: ${camps[0].title}`, ipAddress: "192.168.1.11", createdAt: new Date(Date.now() - 20 * 86400000) },
      { action: "APPROVE_BLOOD_REQUEST", performedBy: { userType: "Admin", userId: superAdmin._id, name: "Super Admin" }, target: { targetType: "BloodRequest", targetId: requests[1]._id }, description: `Duyệt yêu cầu 15 đơn vị A+ từ ${hospitals[1].name}`, ipAddress: "192.168.1.12", createdAt: new Date(Date.now() - 3 * 86400000) },
      { action: "REJECT_BLOOD_REQUEST", performedBy: { userType: "Admin", userId: superAdmin._id, name: "Super Admin" }, target: { targetType: "BloodRequest", targetId: requests[3]._id }, description: `Từ chối yêu cầu AB- từ ${hospitals[3].name} - không đủ tồn kho`, ipAddress: "192.168.1.12", createdAt: new Date(Date.now() - 5 * 86400000) },
      { action: "ADD_BLOOD_UNIT", performedBy: { userType: "Admin", userId: superAdmin._id, name: "Super Admin" }, target: { targetType: "Blood", targetId: superAdmin._id }, description: "Nhập kho thủ công 250ml O+ (BLD-manual-001)", ipAddress: "192.168.1.13", createdAt: new Date(Date.now() - 8 * 86400000) },
      { action: "NOTIFICATION_SENT", performedBy: { userType: "Admin", userId: superAdmin._id, name: "Super Admin" }, target: { targetType: "System", targetId: superAdmin._id }, description: "Gửi thông báo khẩn: Thiếu máu O- tới toàn bộ Donor", ipAddress: "192.168.1.10", createdAt: new Date(Date.now() - 2 * 86400000) },
      { action: "USER_LOGIN", performedBy: { userType: "Admin", userId: superAdmin._id, name: "Super Admin" }, target: { targetType: "Admin", targetId: superAdmin._id }, description: "Admin đăng nhập từ 192.168.1.10", ipAddress: "192.168.1.10", createdAt: new Date(Date.now() - 1 * 86400000) },
      { action: "BACKUP_CREATED", performedBy: { userType: "Admin", userId: superAdmin._id, name: "Super Admin" }, target: { targetType: "System", targetId: superAdmin._id }, description: "Tạo backup database thành công", ipAddress: "192.168.1.10", createdAt: new Date(Date.now() - 7 * 86400000) },
    ]);
    console.log(`   ✅ ${auditLogs.length} Audit Logs`);

    // 9. NOTIFICATIONS - 7 thông báo thực tế
    console.log("9. Seeding Notifications...");
    const notifs = await Notification.insertMany([
      { title: "🚨 Khẩn cấp: Thiếu máu O-", message: "Hệ thống hiện đang thiếu nghiêm trọng máu nhóm O- (chỉ còn 3 đơn vị). Kêu gọi tất cả người có nhóm máu O- đến các điểm hiến máu gần nhất!", type: "urgent", recipient: { userType: "Donor" } },
      { title: "📅 Chiến dịch sắp diễn ra: Xuân Hồng 2026", message: "Lễ hội Xuân Hồng 2026 sẽ diễn ra ngày 09/06 tại Nhà Văn hóa Thanh niên, TP.HCM. Đăng ký ngay để nhận quà tặng và tham gia bốc thăm!", type: "info", recipient: { userType: "Donor" } },
      { title: "✅ Yêu cầu máu A+ được duyệt", message: "Yêu cầu 15 đơn vị máu A+ của Bệnh viện Bạch Mai đã được Viện Huyết học TW chấp thuận. Máu sẽ được giao trong 24h tới.", type: "success", recipient: { userType: "Facility" } },
      { title: "⚠️ Cảnh báo: 20 đơn vị sắp hết hạn", message: "Có 20 đơn vị máu trong kho sẽ hết hạn trong vòng 7 ngày tới. Vui lòng ưu tiên sử dụng hoặc chuyển nhượng đến cơ sở cần.", type: "warning", recipient: { userType: "Facility" } },
      { title: "🎉 Cảm ơn đã tham gia Chủ nhật Đỏ XVIII", message: "Cảm ơn 980 người đã tham gia hiến máu tại sự kiện Chủ nhật Đỏ lần thứ XVIII! Hành động của các bạn đã cứu sống hàng trăm bệnh nhân trên cả nước.", type: "reminder", recipient: { userType: "Donor" } },
      { title: "🔔 Nhắc nhở: Kiểm tra sức khỏe định kỳ", message: "Đã 3 tháng kể từ lần hiến máu trước của bạn. Hãy kiểm tra sức khỏe và đăng ký hiến máu lần tiếp theo để duy trì thói quen tốt!", type: "reminder", recipient: { userType: "Donor" } },
      { title: "🏥 Bệnh viện Đồng Nai đăng ký mới", message: "Bệnh viện Đa khoa Đồng Nai vừa đăng ký tham gia hệ thống. Vui lòng xét duyệt hồ sơ trong vòng 48 giờ theo quy định.", type: "info", recipient: { userType: "Admin" } },
    ]);
    console.log(`   ✅ ${notifs.length} Notifications`);

    console.log("─────────────────────────────────────────");
    console.log("🎉 SEEDING COMPLETED!");
    console.log(`   Labs: ${labs.length} | Hospitals: ${hospitals.length}`);
    console.log(`   Donors: ${donors.length} | Camps: ${camps.length}`);
    console.log(`   Blood Units: ${bloodUnits.length} | Requests: ${requests.length}`);
    console.log(`   Audit Logs: ${auditLogs.length} | Notifications: ${notifs.length}`);
    console.log("─────────────────────────────────────────");
    console.log("🔑 Admin: admin@bloodbank.com / password123");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
};

seedData();
