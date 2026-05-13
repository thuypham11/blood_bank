import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const donorSchema = new mongoose.Schema(
	{
		// 👤 Basic Info
		fullName: {
			type: String,
			required: [true, "Full name is required"],
			trim: true,
			maxlength: [200, "Name cannot exceed 200 characters"],
		},
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: true,
			lowercase: true,
			trim: true,
			match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Please enter a valid email"],
		},
		password: {
			type: String,
			required: [true, "Password is required"],
			minlength: [6, "Password must be at least 6 characters"],
			select: false, // 🔑 IMPORTANT: Prevents password from being returned in queries by default
		},
		phone: {
			type: String,
			required: [true, "Phone number is required"],
			match: [/^[0-9]{10}$/, "Vui lòng nhập số điện thoại hợp lệ 10 chữ số"],
		},
		role: {
			type: String,
			default: "donor",
			enum: ["donor"], // Ensure role is restricted
		},

		// 📍 Location
		address: {
			street: { type: String, required: [true, "Địa chỉ đường là bắt buộc"] },
			city: { type: String },
			ward: { type: String, required: [true, "Phường/Xã là bắt buộc"] },
			state: { type: String, required: [true, "Tỉnh/Thành phố là bắt buộc"] },
			pincode: { type: String }, // optional — đã xóa khỏi form
		},

		// 🩸 Medical / Blood Info
		bloodGroup: {
			type: String,
			required: [true, "Blood group is required"],
			enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
		},
		age: {
			type: Number,
			required: [true, "Age is required"],
			min: [18, "Must be at least 18 years old to donate blood"],
			max: [65, "Age limit for blood donation is 65 years"],
		},
		gender: {
			type: String,
			enum: ["Male", "Female"],
			required: [true, "Gender is required"],
		},
		weight: {
			type: Number,
			min: [45, "Minimum weight should be 45kg to donate blood"],
		},
		lastDonationDate: { type: Date }, // Automatically updated by history entry

		// This field can be used for manual/medical override, separate from the 90-day cooldown calculated by the virtual
		eligibleToDonate: { type: Boolean, default: true },

		// 🧾 Documents (optional for verification)
		idProof: {
			url: String,
			filename: String,
			uploadedAt: { type: Date, default: Date.now },
		},

		// 📜 Donation History (for admin + donor profile)
		donationHistory: [
			{
				donationDate: { type: Date, default: Date.now },
				facility: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" }, // Reference to the Blood Bank/Facility
				bloodGroup: {
					type: String,
					enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
				},
				quantity: { type: Number, default: 1 }, // Assuming 1 unit/pint
				remarks: String,
				verified: { type: Boolean, default: false },
				bloodUnitId: { type: mongoose.Schema.Types.ObjectId, ref: "BloodUnit" },
			},
		],

		idCard: {
  number: { type: String, unique: true, sparse: true },      // Số CCCD
  fullName: { type: String },
  birthDate: { type: Date },
  gender: { type: String, enum: ["Nam", "Nữ"] },
  home: { type: String },                                    // Quê quán
  address: { type: String },                                 // Địa chỉ thường trú
  issueDate: { type: Date },
  expiryDate: { type: Date },
  imageUrl: { type: String },                                // Đường dẫn ảnh đã upload
  verifiedAt: { type: Date },
},
isIdVerified: { type: Boolean, default: false },  

		// 🔐 Security & Access
		lastLogin: Date,
		loginAttempts: { type: Number, default: 0 },
		lockUntil: Date,
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true },
);

// 🔐 Pre-save hook: Hash password before saving if it's new or modified
donorSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();

	// Use a consistent salt round value (e.g., 12)
	const salt = await bcrypt.genSalt(12);
	this.password = await bcrypt.hash(this.password, salt);
	next();
});

// 🧠 Instance Method: Compare password
donorSchema.methods.comparePassword = async function (candidatePassword) {
	// Compares the given password with the hashed password stored in the database
	return await bcrypt.compare(candidatePassword, this.password);
};

// 🧩 Virtual: Calculate 90-day donation eligibility based on last donation date
donorSchema.virtual("isEligible").get(function () {
	if (!this.lastDonationDate) return true;
	const last = new Date(this.lastDonationDate);
	const now = new Date();
	const diff = (now - last) / (1000 * 60 * 60 * 24); // Difference in days
	return diff >= 90; // Standard 90-day gap rule
});

const Donor = mongoose.model("Donor", donorSchema);
export default Donor;
