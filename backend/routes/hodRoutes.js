import express from "express";
import { verifyToken, requireRole } from "../middleware.js";
import { hod } from "../controllers/leavecontrol.js";
import { listEvents, createEvent, deleteEvent, rejectOverlapping } from "../controllers/eventcontrol.js";

const router = express.Router();

router.use(verifyToken, requireRole("HOD"));

router.get("/leaves/pending", hod.pending);
router.get("/leaves/history", hod.history);
router.patch("/leaves/:id/approve", hod.approve);
router.patch("/leaves/:id/reject", hod.reject);

router.get("/events", listEvents);
router.post("/events", createEvent);
router.delete("/events/:id", deleteEvent);
router.post("/events/:id/reject-overlapping", rejectOverlapping);

export default router;
