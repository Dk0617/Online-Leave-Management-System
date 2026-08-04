import express from "express";
import { verifyToken, requireRole } from "../middleware.js";
import {
  applyLeave,
  myBlockedDays,
  myLeaves,
  leaveMovements,
  getProfile,
  updateProfile,
  requestPhotoChange,
  myPhotoRequests,
} from "../controllers/studentcontrol.js";

const router = express.Router();

router.use(verifyToken, requireRole("STUDENT"));

router.post("/leaves", applyLeave);
router.get("/leaves", myLeaves);
router.get("/blocked-days", myBlockedDays);
router.get("/leaves/:leaveId/movements", leaveMovements);

router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.post("/photo-request", requestPhotoChange);
router.get("/photo-requests", myPhotoRequests);

export default router;
