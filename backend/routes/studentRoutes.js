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
import {
  openBlockLeave,
  createBlockLeave,
  joinBlockLeave,
  submitBlockLeave,
  myBlockLeaves,
} from "../controllers/blockleavecontrol.js";

const router = express.Router();

router.use(verifyToken, requireRole("STUDENT"));

router.post("/leaves", applyLeave);
router.get("/leaves", myLeaves);
router.get("/blocked-days", myBlockedDays);
router.get("/leaves/:leaveId/movements", leaveMovements);

router.get("/block-leave/open", openBlockLeave);
router.post("/block-leave", createBlockLeave);
router.post("/block-leave/:id/join", joinBlockLeave);
router.post("/block-leave/:id/submit", submitBlockLeave);
router.get("/block-leave/mine", myBlockLeaves);

router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.post("/photo-request", requestPhotoChange);
router.get("/photo-requests", myPhotoRequests);

export default router;
