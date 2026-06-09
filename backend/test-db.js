import "./setDns.js";
import mongoose from "mongoose";
import "dotenv/config";

console.log("Testing connection to:", process.env.MONGO_URI.replace(/:([^:@]{3,})@/, ":***@"));

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("✅ MongoDB Connected successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });
