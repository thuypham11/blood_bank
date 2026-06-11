import "./setDns.js";
import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');
import "dotenv/config";
console.log("ENV CHECK:", {
  MONGO_URI: process.env.MONGO_URI,
  PORT: process.env.PORT,
});

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { initSocketServer } from "./socket/index.js";
import staffRoutes from './routes/staffRoutes.js';
// Import routes
import authRoutes from "./routes/authRoutes.js";
import donorRoutes from "./routes/donorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import facilityRoutes from "./routes/facilityRoutes.js";
import bloodLabRoutes from "./routes/bloodLabRoutes.js";
import hospitalRoutes from "./routes/hospitalRoutes.js";
import donationStaffRoutes from './routes/donationStaffRoutes.js';

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

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
app.use("/api/hospital", hospitalRoutes);
app.use('/api/staff', staffRoutes);
// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("MongoDB Error ❌", err));

// Socket.io
initSocketServer(server);

const PORT = process.env.PORT || 5000;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Retrying in 2s...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} 🚀`));
    }, 2000);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} 🚀`));