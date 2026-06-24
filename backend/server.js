import "./setDns.js";
import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');
import "dotenv/config";
console.log("ENV CHECK:", {
  MONGO_URI: process.env.MONGO_URI,
  PORT: process.env.PORT,
});
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { initSocketServer } from "./socket/index.js";
// Import routes
import authRoutes from "./routes/authRoutes.js";
import donorRoutes from "./routes/donorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import facilityRoutes from "./routes/facilityRoutes.js";
import bloodLabRoutes from "./routes/bloodLabRoutes.js";
import hospitalRoutes from "./routes/hospitalRoutes.js";
import donationStaffRoutes from './routes/donationStaffRoutes.js';
import labStaffRoutes from './routes/labStaffRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
const app = express();
const server = http.createServer(app);

// CORS configuration

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// 🔧 SỬA: Thay ' * ' bằng '/{*all}' để tương thích Express 5
app.options('/{*all}', cors());

app.use(express.json());
app.use('/api/donation-staff', donationStaffRoutes);
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/donor", donorRoutes);
app.use("/api/facility", facilityRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/blood-lab", bloodLabRoutes);
app.use("/api/lab-staff", labStaffRoutes);
app.use("/api/hospital", hospitalRoutes);
app.use('/api/staff', staffRoutes);

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected ✅");

    // ============================================================
    // AUTO STATUS UPDATER — Chạy mỗi 60 giây
    // Upcoming → Ongoing (khi đến ngày tổ chức)
    // Ongoing  → Completed (khi qua ngày tổ chức)
    // ============================================================
    const { default: BloodCamp } = await import("./models/bloodCampModel.js");

    const autoUpdateCampStatus = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

        // Upcoming → Ongoing: ngày tổ chức = hôm nay
        const toOngoing = await BloodCamp.updateMany(
          { status: "Upcoming", date: { $gte: todayStart, $lte: todayEnd } },
          { $set: { status: "Ongoing" } }
        );

        // Ongoing → Completed: ngày tổ chức < hôm nay (đã qua)
        const toCompleted = await BloodCamp.updateMany(
          { status: "Ongoing", date: { $lt: todayStart } },
          { $set: { status: "Completed" } }
        );

        // Upcoming đã qua ngày mà chưa được xử lý → Completed
        const upcomingPast = await BloodCamp.updateMany(
          { status: "Upcoming", date: { $lt: todayStart } },
          { $set: { status: "Completed" } }
        );

        const totalChanged = toOngoing.modifiedCount + toCompleted.modifiedCount + upcomingPast.modifiedCount;
        if (totalChanged > 0) {
          console.log(`⏰ AutoStatus: ${toOngoing.modifiedCount} → Ongoing, ${toCompleted.modifiedCount + upcomingPast.modifiedCount} → Completed`);
          // Broadcast cho tất cả clients
          try {
            const { getIO } = await import("./socket/index.js");
            getIO().emit("campStatusUpdated", {
              message: "Trạng thái chiến dịch đã được cập nhật",
              timestamp: new Date().toISOString(),
            });
          } catch (_) {}
        }
      } catch (err) {
        console.error("AutoStatus error:", err.message);
      }
    };

    // Chạy ngay khi khởi động
    autoUpdateCampStatus();
    // Chạy mỗi 60 giây
    setInterval(autoUpdateCampStatus, 60 * 1000);
  })
  .catch((err) => console.log("MongoDB Error ❌", err));

// Socket.io
initSocketServer(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} 🚀`));
