import express from "express";
import { verifyToken, requireRole } from "../../middleware/auth.js";
import {
  approvedLeaves,
  verifyByIndexNumber,
  logMovement,
  listMovements,
  clearMovements,
} from "../../controllers/gatecontrol.js";

const router = express.Router();

router.use(verifyToken, requireRole("GATE"));

router.get("/leaves", approvedLeaves);
router.get("/verify/:indexNumber", verifyByIndexNumber);
router.post("/movements", logMovement);
router.get("/movements", listMovements);
router.delete("/movements", clearMovements);

export default router;
