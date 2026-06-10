import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const facilitySchema = new mongoose.Schema(
	{
		// 🏥 Basic Info
		name: {
			type: String,
			required: [true, "Tên hợp lệ"],
			trim: true,
			maxlength: [200, "Tên không được quá 200 ký tự"],
		},
		email: {
			type: String,
			required: [true, "Email hợp lệ"],
			unique: true,
			lowercase: true,
			trim: true,
			match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Vui lòng nhập email hợp lệ"],
		},
		password: {
			type: String,
			required: [true, "Mật khẩu hợp lệ"],
			minlength: [6, "Mật khẩu ít nhất phải 6 ký tự"],
			select: false,
		},

		// 📞 Contact Info
		phone: {
			type: String,
			required: [true, "Số điện thoại hợp lệ"],
			match: [/^[0-9]{10}$/, "Vui lòng nhập số điện thoại hợp lệ 10 chữ số"],
		},
		emergencyContact: {
			type: String,
			required: [true, "Cuộc gọi khẩn cấp cần đủ 10 chữ số"],
			match: [/^[0-9]{10}$/, "Vui lòng nhập đủ 10 chữ số"],
		},
		address: {
			street: { type: String, required: [true, "Địa chỉ hợp lệ"] },
			city: { type: String }, // optional — frontend dùng ward từ location.js
			ward: { type: String },
			state: { type: String, required: [true, "State is required"] },
			latitude: { type: Number },
			longitude: { type: Number },
			location: {
				type: {
					type: String,
					enum: ["Point"],
				},
				coordinates: {
					type: [Number],
				},
			},
			pincode: {
				type: String,
				match: [/^[0-9]{6}$/, "Vui lòng nhập mã bưu chính hợp lệ 6 chữ số"],
			},
		},

		// 🧾 Facility Details
		registrationNumber: {
			type: String,
			required: [true, "Mã đăng ký hợp lệ"],
			unique: true,
			uppercase: true,
			trim: true,
		},
		facilityType: {
			type: String,
			enum: ["hospital", "blood-lab", "donation_staff"],
			required: [true, "Loại cơ sở y tế hợp lệ"],
		},
		role: {
			type: String,
			enum: ["hospital", "blood-lab"],
		},
		facilityCategory: {
			type: String,
			enum: ["Nhà nước", "Tư nhân", "Tổ chức từ thiện", "Phi lợi nhuận", "Khác"],
			default: "Private",
		},
		assignedCamp: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "BloodCamp",
			default: null,
		},

		// 📄 Documents & Verification
		documents: {
			registrationProof: {
				url: { type: String }, // optional — đã xóa khỏi form đăng ký
				filename: String,
				uploadedAt: { type: Date, default: Date.now },
			},
		},
		status: {
			type: String,
			enum: ["pending", "approved", "rejected"],
			default: "pending",
		},
		approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
		approvedAt: Date,
		rejectionReason: String,

		// 🕒 Operating Info (for admin dashboard)
		operatingHours: {
			open: { type: String, default: "09:00" },
			close: { type: String, default: "18:00" },
			workingDays: {
				type: [String],
				enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
				default: ["Mon", "Tue", "Wed", "Thu", "Fri"],
			},
		},
		is24x7: { type: Boolean, default: false },
		emergencyServices: { type: Boolean, default: false },

		// 📜 History for Admin Dashboard

		history: {
			type: [
				{
					eventType: {
						type: String,
						enum: [
							"Login",
							"Verification",
							"Stock Update",
							"Blood Camp",
							"Request Approved",
							"Profile Update",
							"Donation",
							"Contact",
						],
					},
					description: String,
					date: { type: Date, default: Date.now },
				},
			],
			default: [], // ✅ ensures history is always initialized
		},

		// 🔐 Security & Access
		lastLogin: Date,
		loginAttempts: { type: Number, default: 0 },
		lockUntil: Date,
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true },
);

// 🧩 Auto-assign role from facilityType
facilitySchema.pre("save", function (next) {
	if (this.facilityType) {
		this.role = this.facilityType;
	}
	next();
});

//
// 🔐 Hash password before save
//
facilitySchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	const salt = await bcrypt.genSalt(12);
	this.password = await bcrypt.hash(this.password, salt);
	next();
});

//
// 🧠 Compare password
//
facilitySchema.methods.comparePassword = async function (candidatePassword) {
	return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("Facility", facilitySchema);
