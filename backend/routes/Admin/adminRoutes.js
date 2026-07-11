import express from "express";
import { verifyToken, requireRole } from "../../middleware/auth.js";
import {
  listUsers,
  listAllLeaves,
  createIntake,
  listIntakes,
  deleteIntake,
  createStudent,
  listStudents,
  deleteStudent,
  createStaff,
  listStaff,
  deleteStaff,
  createTroop,
  listTroops,
  updateTroop,
  deleteTroop,
  listNotifications,
  markNotificationRead,
  listAudit,
  clearAudit,
} from "../../controllers/admincontrol.js";

const router = express.Router();

router.use(verifyToken, requireRole("ADMIN"));

router.get("/users", listUsers);
router.get("/leaves", listAllLeaves);

router.get("/intakes", listIntakes);
router.post("/intakes", createIntake);
router.delete("/intakes/:code", deleteIntake);

router.get("/students", listStudents);
router.post("/students", createStudent);
router.delete("/students/:id", deleteStudent);

router.get("/troop", listTroops);
router.post("/troop", createTroop);
router.patch("/troop/:id", updateTroop);
router.delete("/troop/:id", deleteTroop);

// Generic HOD / Squadron / SDD / Gate account management
router.get("/staff/:role", listStaff);
router.post("/staff/:role", createStaff);
router.delete("/staff/:role/:id", deleteStaff);

router.get("/notifications", listNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

router.get("/audit", listAudit);
router.delete("/audit", clearAudit);

export default router;
