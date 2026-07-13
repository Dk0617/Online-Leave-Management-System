import express from "express";
import { verifyToken, requireRole } from "../middleware.js";
import {
  applyLeave,
  myLeaves,
  leaveMovements,
  getProfile,
  updateProfile,
  updatePhoto,
} from "../controllers/studentcontrol.js";

const router = express.Router();

router.use(verifyToken, requireRole("STUDENT"));

router.post("/leaves", applyLeave);
router.get("/leaves", myLeaves);
router.get("/leaves/:leaveId/movements", leaveMovements);

router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.patch("/photo", updatePhoto);

export default router;
