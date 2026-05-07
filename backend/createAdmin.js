/**
 * 🔧 Script tạo tài khoản Admin — Blood Bank
 * Cách chạy:
 *   1. Đặt file vào thư mục backend/
 *   2. cd backend
 *   3. node createAdmin.js
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/Blood-bank";

// ── Thông tin admin ──────────────────────────────────────────────────────────
const ADMIN_INFO = {
	name: "Super Admin", // ← đổi tên nếu muốn
	email: "admin@bloodbank.com", // ← đổi email nếu muốn
	password: "Admin@123456", // ← đổi mật khẩu nếu muốn
	role: "admin", // "admin" hoặc "superadmin"
};

async function createAdmin() {
	try {
		console.log("🔌 Đang kết nối MongoDB...");
		await mongoose.connect(MONGO_URI);
		console.log("✅ Kết nối thành công!\n");

		const { default: Admin } = await import("./models/adminModel.js");

		// Kiểm tra tồn tại
		const existing = await Admin.findOne({ email: ADMIN_INFO.email });
		if (existing) {
			console.log(`⚠️  Email "${ADMIN_INFO.email}" đã tồn tại trong DB.`);
			console.log("   Xóa document trong MongoDB Compass rồi chạy lại nếu muốn tạo mới.");
			return;
		}

		// Hash password — adminModel.pre("save") hash bằng bcrypt(password.trim(), 12)
		const hashedPassword = await bcrypt.hash(ADMIN_INFO.password.trim(), 12);

		// insertOne trực tiếp → bỏ qua pre-save hook, tránh hash 2 lần
		await Admin.collection.insertOne({
			name: ADMIN_INFO.name,
			email: ADMIN_INFO.email.toLowerCase().trim(),
			password: hashedPassword,
			role: ADMIN_INFO.role,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		console.log("🎉 Tạo tài khoản Admin thành công!\n");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log(`  📧 Email    : ${ADMIN_INFO.email}`);
		console.log(`  🔑 Mật khẩu : ${ADMIN_INFO.password}`);
		console.log(`  👤 Tên      : ${ADMIN_INFO.name}`);
		console.log(`  🪪 Role     : ${ADMIN_INFO.role}`);
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("\n⚠️  Hãy đổi mật khẩu sau khi đăng nhập lần đầu!");
	} catch (error) {
		console.error("❌ Lỗi:", error.message);
		if (error.message.includes("Cannot find module")) {
			console.error("   → Kiểm tra đường dẫn adminModel: ./models/adminModel.js");
		}
	} finally {
		await mongoose.disconnect();
		console.log("\n🔌 Đã ngắt kết nối MongoDB.");
		process.exit(0);
	}
}

createAdmin();
