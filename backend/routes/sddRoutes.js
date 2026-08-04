import express from "express";
import { verifyToken, requireRole } from "../middleware.js";
import { sdd, sddOverview, sddPipeline } from "../controllers/leavecontrol.js";
import { sddMovements } from "../controllers/movementcontrol.js";

const router = express.Router();

router.use(verifyToken, requireRole("SDD"));

router.get("/leaves/pending", sdd.pending);
router.get("/leaves/history", sdd.history);
router.get("/leaves/overview", sddOverview);
router.get("/leaves/pipeline", sddPipeline);
router.get("/movements", sddMovements);
router.patch("/leaves/:id/approve", sdd.approve);
router.patch("/leaves/:id/reject", sdd.reject);

export default router;
