import "dotenv/config";
console.log("ENV CHECK:", {
	MONGO_URI: process.env.MONGO_URI,
	PORT: process.env.PORT,
});

import express from "express";
import mongoose from "mongoose";

import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import donorRoutes from "./routes/donorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import facilityRoutes from "./routes/facilityRoutes.js";
import http from "http";
import { initSocketServer } from "./socket/index.js";

const app = express();
const server = http.createServer(app);
app.use(express.json());

app.use(
	cors({
		origin: "http://localhost:5173", // or 3000
		credentials: true,
	}),
);

// 🧩 Routes

app.use("/api/auth", authRoutes);

app.use("/api/donor", donorRoutes);

app.use("/api/facility", facilityRoutes);

app.use("/api/admin", adminRoutes);

import bloodLabRoutes from "./routes/bloodLabRoutes.js";
app.use("/api/blood-lab", bloodLabRoutes);

import hospitalRoutes from "./routes/hospitalRoutes.js";
app.use("/api/hospital", hospitalRoutes);

// 🗄️ DB Connection
mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log("MongoDB Connected ✅"))
	.catch((err) => console.log("MongoDB Error ❌", err));
initSocketServer(server);
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
