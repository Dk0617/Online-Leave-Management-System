import express from "express";
import { verifyToken, requireRole } from "../middleware.js";
import { squadran } from "../controllers/leavecontrol.js";

const router = express.Router();

router.use(verifyToken, requireRole("SQUADRAN"));

router.get("/leaves/pending", squadran.pending);
router.get("/leaves/history", squadran.history);
router.patch("/leaves/:id/approve", squadran.approve);
router.patch("/leaves/:id/reject", squadran.reject);

export default router;
