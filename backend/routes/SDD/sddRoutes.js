import express from "express";
import { verifyToken, requireRole } from "../../middleware/auth.js";
import { sdd, sddOverview, sddPipeline } from "../../controllers/leavecontrol.js";

const router = express.Router();

router.use(verifyToken, requireRole("SDD"));

router.get("/leaves/pending", sdd.pending);
router.get("/leaves/history", sdd.history);
router.get("/leaves/overview", sddOverview);
router.get("/leaves/pipeline", sddPipeline);
router.patch("/leaves/:id/approve", sdd.approve);
router.patch("/leaves/:id/reject", sdd.reject);

export default router;
