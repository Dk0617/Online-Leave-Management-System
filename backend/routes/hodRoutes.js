import express from "express";
import { verifyToken, requireRole } from "../middleware.js";
import { hod, hodCorrectDateTime, coverStatus } from "../controllers/leavecontrol.js";
import { listEvents, createEvent, deleteEvent, rejectOverlapping } from "../controllers/eventcontrol.js";
import { hodMovements } from "../controllers/movementcontrol.js";
import {
  hodBlockLeavePending,
  hodBlockLeaveHistory,
  hodApproveBlockLeave,
  hodRejectBlockLeave,
} from "../controllers/blockleavecontrol.js";

const router = express.Router();

// A Lecturer only ever reaches here while actively covering an unavailable
// HOD (see leavecontrol.js hodScopeFilter) — marking/editing the Event
// Calendar stays HOD-only below, since that's a longer-term planning tool,
// not something a one-day substitute should be doing.
router.use(verifyToken, requireRole("HOD", "LECTURER"));

router.get("/leaves/pending", hod.pending);
router.get("/leaves/history", hod.history);
router.patch("/leaves/:id/approve", hod.approve);
router.patch("/leaves/:id/reject", hod.reject);
router.patch("/leaves/:id/datetime", requireRole("HOD"), hodCorrectDateTime);
router.get("/cover-status", requireRole("LECTURER"), coverStatus);

// Block Leave decisions are HOD-only, unlike the ordinary leave queue above
// — a covering Lecturer (see leavecontrol.js hodScopeFilter) can stand in
// for day-to-day individual approvals, but deciding a whole department's
// roster at once is left for the actual HOD, same reasoning as
// hodCorrectDateTime being HOD-only just above. The two GETs stay open to
// LECTURER too (naturally scoping to an empty list — their id never matches
// a hodId), same as hodMovements above: the Lecturer portal reuses this
// same useHodPortal wholesale, and a 403 here would fail its whole refresh.
router.get("/block-leave/pending", hodBlockLeavePending);
router.get("/block-leave/history", hodBlockLeaveHistory);
router.patch("/block-leave/:id/approve", requireRole("HOD"), hodApproveBlockLeave);
router.patch("/block-leave/:id/reject", requireRole("HOD"), hodRejectBlockLeave);
// Left open to LECTURER too (unlike the HOD-only routes above) since the
// Lecturer portal reuses this same Dashboard/useHodPortal wholesale (see
// app/lecturer/page.tsx) — its refresh() Promise.all would otherwise 403 and
// fail every other tile too. hodMovements itself uses hodScopeFilter, so an
// actively-covering Lecturer sees that HOD's movements, same widening their
// leave queue already gets; a non-covering one just sees an empty scope.
router.get("/movements", hodMovements);

// The GET stays open to LECTURER too (same reasoning as block-leave and
// movements above) — useHodPortal's refresh() fetches this unconditionally
// in the same Promise.all as the leave queue, so a 403 here would silently
// blank a covering Lecturer's entire dashboard, not just hide the calendar.
// The Lecturer portal's own nav simply has no Calendar tab to show it in.
router.get("/events", listEvents);
router.post("/events", requireRole("HOD"), createEvent);
router.delete("/events/:id", requireRole("HOD"), deleteEvent);
router.post("/events/:id/reject-overlapping", requireRole("HOD"), rejectOverlapping);

export default router;
