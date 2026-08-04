import express from "express";
import { login, changePassword, updateMyPhoto } from "../controllers/logauthcontrol.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/change-password", verifyToken, changePassword);
router.patch("/photo", verifyToken, updateMyPhoto);

export default router;
