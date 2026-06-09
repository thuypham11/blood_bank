import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Admin name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "superadmin"],
      default: "admin",
    },
    // Nhóm nghiệp vụ (để hiển thị label)
    department: {
      type: String,
      enum: ["admin", "donor_management", "lab_management", "hospital_management"],
      default: "admin",
    },
    permissions: [{
      type: String,
      enum: [
        // ── DONOR MANAGEMENT (Thùy) ──────────────────
        "manage_donors",        // Xem, sửa, xóa người hiến máu
        "manage_blood_camps",   // Quản lý chiến dịch hiến máu lưu động
        "manage_appointments",  // Quản lý lịch hẹn hiến máu

        // ── LAB MANAGEMENT (Hòa) ─────────────────────
        "manage_blood_stock",   // Quản lý kho máu, nhập/xuất đơn vị
        "manage_screening",     // Xét nghiệm, duyệt kết quả máu
        "view_expiring_alerts", // Cảnh báo máu sắp hết hạn

        // ── HOSPITAL MANAGEMENT (Hoàng) ───────────────
        "manage_requests",      // Duyệt/từ chối yêu cầu máu từ bệnh viện
        "manage_facilities",    // Duyệt/từ chối đăng ký bệnh viện
        "manage_handover",      // Quản lý bàn giao máu

        // ── ADMIN / REPORTS (Khánh) ───────────────────
        "manage_users",         // Quản lý toàn bộ người dùng hệ thống
        "manage_admins",        // Tạo/sửa/xóa tài khoản admin
        "view_reports",         // Xem báo cáo thống kê
        "view_audit_logs",      // Xem nhật ký hành động hệ thống
        "send_notifications",   // Gửi thông báo toàn hệ thống
        "manage_backup",        // Sao lưu / phục hồi dữ liệu
      ]
    }],
    lastLogin: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password.trim(), 12);
  next();
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword.trim(), this.password);
};

export default mongoose.model("Admin", adminSchema);
