import express from "express";
import { verifyToken, requireRole } from "../middleware.js";
import {
  troopPendingDayScholar,
  troopPendingCadet,
  troopPending,
  troopHistory,
  troopAllRecords,
  troopApprove,
  troopReject,
} from "../controllers/leavecontrol.js";

const router = express.Router();

router.use(verifyToken, requireRole("TROOP"));

router.get("/leaves/pending", troopPending);
router.get("/leaves/pending/dayscholar", troopPendingDayScholar);
router.get("/leaves/pending/cadet", troopPendingCadet);
router.get("/leaves/history", troopHistory);
router.get("/leaves/records", troopAllRecords);
router.patch("/leaves/:id/approve", troopApprove);
router.patch("/leaves/:id/reject", troopReject);

export default router;
