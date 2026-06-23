import express from "express";
import {
  register,
  login,
  getProfile,
  createAdmin,
} from "../controllers/authContoller.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/create-admin", createAdmin);
router.post("/login", login);
// PROFILE (Protected Route)
router.get("/profile", protect, getProfile);


export default router;
