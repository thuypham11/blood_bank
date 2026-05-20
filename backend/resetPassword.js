import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Donor from "./models/donorModel.js";
import dotenv from "dotenv";
dotenv.config();

const reset = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const newPassword = "110102005";
    const hashed = await bcrypt.hash(newPassword, 12);
    const result = await Donor.updateOne(
      { _id: "69f6a5e750bbdc8a0c5ee080" },
      { $set: { password: hashed } }
    );
    console.log("✅ Cập nhật thành công:", result);
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi:", err);
    process.exit(1);
  }
};
reset();