import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Admin from "../models/adminModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const teamAccounts = [
  // ── KHÁNH (Superadmin - Admin tổng) ───────────────────────────────────────
  {
    name: "Đặng Minh Khánh",
    email: "khanh@bloodbank.vn",
    password: "khanh123",
    role: "superadmin",
    department: "admin",
    permissions: [
      "manage_users",
      "manage_admins",
      "view_reports",
      "view_audit_logs",
      "send_notifications",
      "manage_backup",
      // Superadmin được tất cả quyền
      "manage_donors",
      "manage_blood_camps",
      "manage_appointments",
      "manage_blood_stock",
      "manage_screening",
      "view_expiring_alerts",
      "manage_requests",
      "manage_facilities",
      "manage_handover",
    ],
    isActive: true,
  },

  // ── THÙY (Quản lý Người hiến máu) ─────────────────────────────────────────
  {
    name: "Phạm Thị Thùy",
    email: "thuy@bloodbank.vn",
    password: "thuy123",
    role: "admin",
    department: "donor_management",
    permissions: [
      "manage_donors",        // Xem, sửa người hiến máu
      "manage_blood_camps",   // Quản lý chiến dịch hiến máu
      "manage_appointments",  // Lịch hẹn hiến máu
      "view_reports",         // Xem báo cáo
    ],
    isActive: true,
  },

  // ── HÒA (Quản lý Phòng xét nghiệm) ───────────────────────────────────────
  {
    name: "Nguyễn Thị Hòa",
    email: "hoa@bloodbank.vn",
    password: "hoa123",
    role: "admin",
    department: "lab_management",
    permissions: [
      "manage_blood_stock",    // Quản lý kho máu
      "manage_screening",      // Xét nghiệm, duyệt kết quả
      "view_expiring_alerts",  // Cảnh báo sắp hết hạn
      "view_reports",          // Xem báo cáo
    ],
    isActive: true,
  },

  // ── HOÀNG (Quản lý Bệnh viện) ─────────────────────────────────────────────
  {
    name: "Lê Minh Hoàng",
    email: "hoang@bloodbank.vn",
    password: "hoang123",
    role: "admin",
    department: "hospital_management",
    permissions: [
      "manage_requests",   // Duyệt yêu cầu máu từ bệnh viện
      "manage_facilities", // Duyệt đăng ký bệnh viện
      "manage_handover",   // Bàn giao máu
      "view_reports",      // Xem báo cáo
    ],
    isActive: true,
  },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
    console.log("─────────────────────────────────────────");
    console.log("👥 Tạo tài khoản nhóm Blood Bank System");
    console.log("─────────────────────────────────────────");

    for (const acc of teamAccounts) {
      const existing = await Admin.findOne({ email: acc.email });
      if (existing) {
        // Cập nhật lại nếu đã tồn tại
        existing.name = acc.name;
        existing.role = acc.role;
        existing.department = acc.department;
        existing.permissions = acc.permissions;
        existing.isActive = acc.isActive;
        existing.password = acc.password; // trigger pre-save hash
        await existing.save();
        console.log(`  🔄 Cập nhật: ${acc.name} (${acc.email})`);
      } else {
        await Admin.create(acc);
        console.log(`  ✅ Tạo mới: ${acc.name} (${acc.email})`);
      }
    }

    console.log("─────────────────────────────────────────");
    console.log("🎉 HOÀN THÀNH! Tài khoản các thành viên:");
    console.log("");
    console.log("  👑 Khánh (Superadmin):");
    console.log("     Email   : khanh@bloodbank.vn");
    console.log("     Password: khanh123");
    console.log("     Quyền   : TẤT CẢ (Quản trị hệ thống)");
    console.log("");
    console.log("  🩸 Thùy (Người hiến máu):");
    console.log("     Email   : thuy@bloodbank.vn");
    console.log("     Password: thuy123");
    console.log("     Quyền   : Donors + Chiến dịch + Lịch hẹn");
    console.log("");
    console.log("  🔬 Hòa (Phòng xét nghiệm):");
    console.log("     Email   : hoa@bloodbank.vn");
    console.log("     Password: hoa123");
    console.log("     Quyền   : Kho máu + Xét nghiệm + Cảnh báo");
    console.log("");
    console.log("  🏥 Hoàng (Bệnh viện):");
    console.log("     Email   : hoang@bloodbank.vn");
    console.log("     Password: hoang123");
    console.log("     Quyền   : Yêu cầu máu + Bệnh viện + Bàn giao");
    console.log("─────────────────────────────────────────");

    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    process.exit(1);
  }
};

run();
