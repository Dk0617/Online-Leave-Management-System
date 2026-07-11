import express from "express";
import jwt from "jsonwebtoken";
import {
  login,
  changePassword,
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
  applyLeave,
  myLeaves,
  getProfile,
  updateProfile,
  updatePhoto,
  hod,
  squadran,
  sdd,
  sddOverview,
  sddPipeline,
  troopPendingDayScholar,
  troopPendingCadet,
  troopPending,
  troopHistory,
  troopApprove,
  troopReject,
  approvedLeaves,
  verifyByIndexNumber,
  logMovement,
  listMovements,
  clearMovements,
} from "./controllers.js";

// ==================================================================
// Auth middleware
// ==================================================================

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role, name }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden for this role" });
    }
    next();
  };
}

// ==================================================================
// /api/auth
// ==================================================================

export const authRouter = express.Router();
authRouter.post("/login", login);
authRouter.post("/change-password", verifyToken, changePassword);

// ==================================================================
// /api/admin
// ==================================================================

export const adminRouter = express.Router();
adminRouter.use(verifyToken, requireRole("ADMIN"));

adminRouter.get("/users", listUsers);
adminRouter.get("/leaves", listAllLeaves);

adminRouter.get("/intakes", listIntakes);
adminRouter.post("/intakes", createIntake);
adminRouter.delete("/intakes/:code", deleteIntake);

adminRouter.get("/students", listStudents);
adminRouter.post("/students", createStudent);
adminRouter.delete("/students/:id", deleteStudent);

adminRouter.get("/troop", listTroops);
adminRouter.post("/troop", createTroop);
adminRouter.patch("/troop/:id", updateTroop);
adminRouter.delete("/troop/:id", deleteTroop);

// Generic HOD / Squadron / SDD / Gate account management
adminRouter.get("/staff/:role", listStaff);
adminRouter.post("/staff/:role", createStaff);
adminRouter.delete("/staff/:role/:id", deleteStaff);

adminRouter.get("/notifications", listNotifications);
adminRouter.patch("/notifications/:id/read", markNotificationRead);

adminRouter.get("/audit", listAudit);
adminRouter.delete("/audit", clearAudit);

// ==================================================================
// /api/student
// ==================================================================

export const studentRouter = express.Router();
studentRouter.use(verifyToken, requireRole("STUDENT"));

studentRouter.post("/leaves", applyLeave);
studentRouter.get("/leaves", myLeaves);

studentRouter.get("/profile", getProfile);
studentRouter.patch("/profile", updateProfile);
studentRouter.patch("/photo", updatePhoto);

// ==================================================================
// /api/hod
// ==================================================================

export const hodRouter = express.Router();
hodRouter.use(verifyToken, requireRole("HOD"));

hodRouter.get("/leaves/pending", hod.pending);
hodRouter.get("/leaves/history", hod.history);
hodRouter.patch("/leaves/:id/approve", hod.approve);
hodRouter.patch("/leaves/:id/reject", hod.reject);

// ==================================================================
// /api/troop
// ==================================================================

export const troopRouter = express.Router();
troopRouter.use(verifyToken, requireRole("TROOP"));

troopRouter.get("/leaves/pending", troopPending);
troopRouter.get("/leaves/pending/dayscholar", troopPendingDayScholar);
troopRouter.get("/leaves/pending/cadet", troopPendingCadet);
troopRouter.get("/leaves/history", troopHistory);
troopRouter.patch("/leaves/:id/approve", troopApprove);
troopRouter.patch("/leaves/:id/reject", troopReject);

// ==================================================================
// /api/squadran
// ==================================================================

export const squadranRouter = express.Router();
squadranRouter.use(verifyToken, requireRole("SQUADRAN"));

squadranRouter.get("/leaves/pending", squadran.pending);
squadranRouter.get("/leaves/history", squadran.history);
squadranRouter.patch("/leaves/:id/approve", squadran.approve);
squadranRouter.patch("/leaves/:id/reject", squadran.reject);

// ==================================================================
// /api/sdd
// ==================================================================

export const sddRouter = express.Router();
sddRouter.use(verifyToken, requireRole("SDD"));

sddRouter.get("/leaves/pending", sdd.pending);
sddRouter.get("/leaves/history", sdd.history);
sddRouter.get("/leaves/overview", sddOverview);
sddRouter.get("/leaves/pipeline", sddPipeline);
sddRouter.patch("/leaves/:id/approve", sdd.approve);
sddRouter.patch("/leaves/:id/reject", sdd.reject);

// ==================================================================
// /api/gate
// ==================================================================

export const gateRouter = express.Router();
gateRouter.use(verifyToken, requireRole("GATE"));

gateRouter.get("/leaves", approvedLeaves);
gateRouter.get("/verify/:indexNumber", verifyByIndexNumber);
gateRouter.post("/movements", logMovement);
gateRouter.get("/movements", listMovements);
gateRouter.delete("/movements", clearMovements);
