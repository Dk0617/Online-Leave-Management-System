import express from "express";
import { verifyToken, requireRole } from "../middleware.js";
import { hod, hodCorrectDateTime } from "../controllers/leavecontrol.js";
import { listEvents, createEvent, deleteEvent, rejectOverlapping } from "../controllers/eventcontrol.js";
import { hodMovements } from "../controllers/movementcontrol.js";

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
// Left open to LECTURER too (unlike the HOD-only routes above) since the
// Lecturer portal reuses this same Dashboard/useHodPortal wholesale (see
// app/lecturer/page.tsx) — its refresh() Promise.all would otherwise 403 and
// fail every other tile too. hodMovements itself uses hodScopeFilter, so an
// actively-covering Lecturer sees that HOD's movements, same widening their
// leave queue already gets; a non-covering one just sees an empty scope.
router.get("/movements", hodMovements);

router.get("/events", requireRole("HOD"), listEvents);
router.post("/events", requireRole("HOD"), createEvent);
router.delete("/events/:id", requireRole("HOD"), deleteEvent);
router.post("/events/:id/reject-overlapping", requireRole("HOD"), rejectOverlapping);

export default router;
