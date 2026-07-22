import express from "express";
import { login, changePassword, updateMyPhoto, requestOtp, verifyOtp } from "../controllers/logauthcontrol.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/change-password", verifyToken, changePassword);
router.patch("/photo", verifyToken, updateMyPhoto);
router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtp);

export default router;
