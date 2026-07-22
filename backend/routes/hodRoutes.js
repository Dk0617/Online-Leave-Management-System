import express from "express";
import { verifyToken, requireRole } from "../middleware.js";
import { hod } from "../controllers/leavecontrol.js";
import { listEvents, createEvent, deleteEvent, rejectOverlapping } from "../controllers/eventcontrol.js";

const router = express.Router();

// A Lecturer only ever reaches here while actively covering an unavailable
// HOD (see leavecontrol.js hodScopeFilter) — everything below except the
// Event Calendar, which stays HOD-only since marking mandatory days is a
// longer-term planning tool, not something a one-day substitute should be
// doing.
router.use(verifyToken, requireRole("HOD", "LECTURER"));

router.get("/leaves/pending", hod.pending);
router.get("/leaves/history", hod.history);
router.patch("/leaves/:id/approve", hod.approve);
router.patch("/leaves/:id/reject", hod.reject);

router.get("/events", requireRole("HOD"), listEvents);
router.post("/events", requireRole("HOD"), createEvent);
router.delete("/events/:id", requireRole("HOD"), deleteEvent);
router.post("/events/:id/reject-overlapping", requireRole("HOD"), rejectOverlapping);

export default router;
