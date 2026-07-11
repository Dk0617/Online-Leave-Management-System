import jwt from "jsonwebtoken";
import {
  ROLE_MODELS,
  Admin,
  Student,
  Hod,
  Troop,
  Squadran,
  Sdd,
  Gate,
  Intake,
  Leave,
  Movement,
  Notification,
  AuditEntry,
} from "./models.js";

// ==================================================================
// Shared helpers
// ==================================================================

// Fire-and-forget audit log write — never blocks or fails the calling request.
export async function writeAudit(role, user, action, details) {
  try {
    await AuditEntry.create({ role, user, action, details: details || "" });
  } catch (err) {
    console.error("Failed to write audit entry:", err.message);
  }
}

// Approval is four independent per-role status fields — see models.js Leave
// schema comment for why. Day Scholars only ever touch hodStatus+troopStatus;
// Cadets only ever touch troopStatus+sqnStatus+sddStatus.
export function isApproved(leave) {
  if (leave.studentType === "CADET") {
    return (
      leave.troopStatus === "Approved" &&
      leave.sqnStatus === "Approved" &&
      leave.sddStatus === "Approved"
    );
  }
  return leave.hodStatus === "Approved" && leave.troopStatus === "Approved";
}

export function isRejected(leave) {
  if (leave.studentType === "CADET") {
    return (
      leave.troopStatus === "Rejected" ||
      leave.sqnStatus === "Rejected" ||
      leave.sddStatus === "Rejected"
    );
  }
  return leave.hodStatus === "Rejected" || leave.troopStatus === "Rejected";
}

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ==================================================================
// Auth (login / change password)
// ==================================================================

export const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  for (const [role, Model] of Object.entries(ROLE_MODELS)) {
    const user = await Model.findOne({ username });
    if (!user) continue;

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await writeAudit(role, username, "login_failed", "");
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user._id, role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const { password: _pw, ...safeUser } = user.toObject();
    await writeAudit(role, username, "login_success", "");
    return res.json({
      token,
      user: { ...safeUser, role, mustChangePassword: !!user.mustChangePassword },
    });
  }

  return res.status(401).json({ message: "Invalid username or password" });
};

// Shared by every role — looks up the caller's own model via their token.
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Current and new password are required" });
  }
  if (newPassword.length < 4) {
    return res
      .status(400)
      .json({ message: "New password must be at least 4 characters" });
  }
  if (newPassword === currentPassword) {
    return res
      .status(400)
      .json({ message: "New password must be different from current password" });
  }

  const Model = ROLE_MODELS[req.user.role];
  const user = await Model.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  await Notification.create({
    role: req.user.role,
    username: user.username,
    name: user.name,
  });
  await writeAudit(req.user.role, user.username, "password_changed", "");

  res.json({ message: "Password updated" });
};

// ==================================================================
// Admin
// ==================================================================

// ── Dashboard-wide views ────────────────────────────────────────
export const listUsers = async (req, res) => {
  const result = {};
  for (const [role, Model] of Object.entries(ROLE_MODELS)) {
    result[role] = await Model.find().select("-password");
  }
  res.json(result);
};

export const listAllLeaves = async (req, res) => {
  const leaves = await Leave.find().sort({ createdAt: -1 });
  res.json(leaves);
};

// ── Intakes ──────────────────────────────────────────────────────
export const createIntake = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: "Intake code is required" });

  const existing = await Intake.findOne({ code });
  if (existing) return res.status(409).json({ message: "That intake already exists" });

  const created = await Intake.create({ code });
  await writeAudit("ADMIN", req.user.name, "intake_added", code);
  res.status(201).json(created);
};

export const listIntakes = async (req, res) => {
  res.json(await Intake.find().sort({ code: 1 }));
};

export const deleteIntake = async (req, res) => {
  await Intake.findOneAndDelete({ code: req.params.code });
  res.json({ message: "Deleted" });
};

// ── Students ─────────────────────────────────────────────────────
export const createStudent = async (req, res) => {
  const {
    indexNumber,
    firstName,
    lastName,
    department,
    email,
    mobile,
    studentType,
    intake,
    troopIds,
    hodId,
    sqnId,
    password,
  } = req.body;

  if (!indexNumber || !firstName || !lastName) {
    return res
      .status(400)
      .json({ message: "Index number, first and last name are required" });
  }
  if (!studentType || !["DAY_SCHOLAR", "CADET"].includes(studentType)) {
    return res.status(400).json({ message: "A valid student type is required" });
  }
  if (!Array.isArray(troopIds) || troopIds.length < 1 || troopIds.length > 2) {
    return res
      .status(400)
      .json({ message: "Assign 1 or 2 Troop Commanders to this student" });
  }
  if (studentType === "DAY_SCHOLAR" && !hodId) {
    return res.status(400).json({ message: "A Day Scholar must be assigned an HOD" });
  }
  if (studentType === "CADET" && !sqnId) {
    return res
      .status(400)
      .json({ message: "A Cadet must be assigned a Squadron Commander" });
  }

  const existing = await Student.findOne({ username: indexNumber });
  if (existing) {
    return res
      .status(409)
      .json({ message: "A student with that index number already exists" });
  }

  const created = await Student.create({
    username: indexNumber,
    indexNumber,
    firstName,
    lastName,
    department,
    email,
    mobile,
    studentType,
    intake,
    troopIds,
    hodId: studentType === "DAY_SCHOLAR" ? hodId : undefined,
    sqnId: studentType === "CADET" ? sqnId : undefined,
    password: password || department || genPassword(),
  });

  await writeAudit("ADMIN", req.user.name, "account_created", `student ${indexNumber}`);
  const { password: _pw, ...safe } = created.toObject();
  res.status(201).json(safe);
};

export const listStudents = async (req, res) => {
  const students = await Student.find()
    .select("-password")
    .populate("troopIds", "name")
    .populate("hodId", "name department")
    .populate("sqnId", "name")
    .sort({ createdAt: 1 });
  res.json(students);
};

export const deleteStudent = async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};

// ── Generic staff accounts: HOD / Squadron / SDD / Gate ────────────
const STAFF_MODELS = { HOD: Hod, SQUADRAN: Squadran, SDD: Sdd, GATE: Gate };
const STAFF_EXTRA_FIELD = { HOD: "department", SQUADRAN: null, SDD: "title", GATE: "post" };

function staffModelFor(req, res) {
  const role = (req.params.role || "").toUpperCase();
  const Model = STAFF_MODELS[role];
  if (!Model) {
    res.status(400).json({ message: "Unknown staff role" });
    return null;
  }
  return { role, Model };
}

export const createStaff = async (req, res) => {
  const resolved = staffModelFor(req, res);
  if (!resolved) return;
  const { role, Model } = resolved;

  const { username, name, password, extra } = req.body;
  if (!username || !name) {
    return res.status(400).json({ message: "Username and name are required" });
  }

  const existing = await Model.findOne({ username });
  if (existing) return res.status(409).json({ message: "That username is already taken" });

  const doc = { username, name, password: password || genPassword() };
  const extraField = STAFF_EXTRA_FIELD[role];
  if (extraField && extra) doc[extraField] = extra;

  const created = await Model.create(doc);
  await writeAudit("ADMIN", req.user.name, "account_created", `${role.toLowerCase()} ${username}`);
  const { password: _pw, ...safe } = created.toObject();
  res.status(201).json(safe);
};

export const listStaff = async (req, res) => {
  const resolved = staffModelFor(req, res);
  if (!resolved) return;
  res.json(await resolved.Model.find().select("-password").sort({ createdAt: 1 }));
};

export const deleteStaff = async (req, res) => {
  const resolved = staffModelFor(req, res);
  if (!resolved) return;
  await resolved.Model.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};

// ── Troop (extra: intakes[] + edit) ────────────────────────────────
export const createTroop = async (req, res) => {
  const { username, name, password, intakes } = req.body;
  if (!username || !name) {
    return res.status(400).json({ message: "Username and name are required" });
  }
  if (!Array.isArray(intakes) || !intakes.length) {
    return res.status(400).json({ message: "Assign at least one intake to this officer" });
  }

  const existing = await Troop.findOne({ username });
  if (existing) return res.status(409).json({ message: "That username is already taken" });

  const created = await Troop.create({
    username,
    name,
    password: password || genPassword(),
    intakes,
  });
  await writeAudit("ADMIN", req.user.name, "account_created", `troop ${username}`);
  const { password: _pw, ...safe } = created.toObject();
  res.status(201).json(safe);
};

export const listTroops = async (req, res) => {
  res.json(await Troop.find().select("-password").sort({ createdAt: 1 }));
};

export const updateTroop = async (req, res) => {
  const { username, name, password, intakes } = req.body;
  const troop = await Troop.findById(req.params.id);
  if (!troop) return res.status(404).json({ message: "Troop Commander not found" });

  if (username && username !== troop.username) {
    const clash = await Troop.findOne({ username, _id: { $ne: troop._id } });
    if (clash) return res.status(409).json({ message: "That username is already taken" });
    troop.username = username;
  }
  if (name) troop.name = name;
  if (Array.isArray(intakes)) troop.intakes = intakes;
  if (password) {
    troop.password = password;
    troop.mustChangePassword = true;
  }
  await troop.save();
  await writeAudit("ADMIN", req.user.name, "account_updated", `troop ${troop.username}`);
  const { password: _pw, ...safe } = troop.toObject();
  res.json(safe);
};

export const deleteTroop = async (req, res) => {
  await Troop.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};

// ── Password-change notifications ──────────────────────────────────
export const listNotifications = async (req, res) => {
  res.json(await Notification.find().sort({ createdAt: -1 }));
};

export const markNotificationRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ message: "Marked read" });
};

// ── Audit log ───────────────────────────────────────────────────────
export const listAudit = async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role: role.toUpperCase() } : {};
  const entries = await AuditEntry.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json(entries);
};

export const clearAudit = async (req, res) => {
  await AuditEntry.deleteMany({});
  await writeAudit("ADMIN", req.user.name, "audit_log_cleared", "");
  res.json({ message: "Cleared" });
};

// ==================================================================
// Student
// ==================================================================

const DOC_REQUIRED_TYPES = ["Medical Leave", "Academic Leave", "Other"];
// ~2MB of raw file becomes ~2.7MB once base64-encoded.
const MAX_ATTACHMENT_BYTES = 2.7 * 1024 * 1024;

export const applyLeave = async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ message: "Student not found" });

  const {
    type,
    startDate,
    startTime,
    endDate,
    endTime,
    reason,
    attachmentName,
    attachmentData,
  } = req.body;

  const missing = [];
  if (!type) missing.push("Leave Type");
  if (!startDate) missing.push("Start Date");
  if (!startTime) missing.push("Start Time");
  if (!endDate) missing.push("End Date");
  if (!endTime) missing.push("End Time");
  if (!reason) missing.push("Reason");
  if (DOC_REQUIRED_TYPES.includes(type) && !attachmentData) {
    missing.push("Supporting Document");
  }
  if (missing.length) {
    return res
      .status(400)
      .json({ message: `Please complete: ${missing.join(", ")}` });
  }
  if (new Date(`${endDate}T${endTime}`) < new Date(`${startDate}T${startTime}`)) {
    return res
      .status(400)
      .json({ message: "End date/time must be after start date/time" });
  }
  if (attachmentData && Buffer.byteLength(attachmentData, "utf8") > MAX_ATTACHMENT_BYTES) {
    return res.status(400).json({ message: "Attachment too large (max 2MB)" });
  }

  const isCadet = student.studentType === "CADET";
  const isEmergency = type === "Emergency Leave";

  const leave = await Leave.create({
    studentId: student._id,
    studentName: student.name,
    indexNumber: student.indexNumber,
    department: student.department,
    studentType: student.studentType,
    intake: student.intake,
    hodId: student.hodId,
    troopIds: student.troopIds,
    sqnId: student.sqnId,
    type,
    priority: isEmergency ? "emergency" : "normal",
    startDate,
    startTime,
    endDate,
    endTime,
    reason,
    attachmentName: attachmentName || undefined,
    attachmentData: attachmentData || undefined,
    appliedDate: new Date().toISOString().split("T")[0],
    hodStatus: isCadet ? "N/A" : "Pending",
    troopStatus: "Pending",
    sqnStatus: isCadet ? "Pending" : "N/A",
    sddStatus: isCadet ? "Pending" : "N/A",
  });

  await writeAudit(
    "STUDENT",
    student.username,
    "leave_submitted",
    `type=${type}, id=${leave._id}${isEmergency ? " [EMERGENCY]" : ""}`
  );
  res.status(201).json(leave);
};

export const myLeaves = async (req, res) => {
  const leaves = await Leave.find({ studentId: req.user.id }).sort({ createdAt: -1 });
  res.json(leaves);
};

export const getProfile = async (req, res) => {
  const student = await Student.findById(req.user.id).select("-password");
  if (!student) return res.status(404).json({ message: "Student not found" });
  res.json(student);
};

export const updateProfile = async (req, res) => {
  const { firstName, lastName, email, mobile } = req.body;
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ message: "Student not found" });

  if (firstName) student.firstName = firstName;
  if (lastName) student.lastName = lastName;
  if (email !== undefined) student.email = email;
  if (mobile !== undefined) student.mobile = mobile;
  await student.save();

  const { password: _pw, ...safe } = student.toObject();
  res.json(safe);
};

export const updatePhoto = async (req, res) => {
  const { photo } = req.body; // base64 data URL, already downscaled client-side
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ message: "Student not found" });

  student.photo = photo || undefined;
  await student.save();
  res.json({ message: "Photo updated" });
};

// ==================================================================
// Leave approval workflow — HOD / Squadron / SDD / Troop
// ==================================================================

function sortByPriorityThenNewest(leaves) {
  return leaves.sort((a, b) => {
    const pa = a.priority === "emergency" ? 1 : 0;
    const pb = b.priority === "emergency" ? 1 : 0;
    if (pb !== pa) return pb - pa;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

async function decide(req, res, { statusField, commentField, atField, role, decision, scopeFilter }) {
  const { comment } = req.body;
  const scope = await scopeFilter(req);
  const leave = await Leave.findOne({ _id: req.params.id, ...scope });
  if (!leave) return res.status(404).json({ message: "Leave not found" });
  if (leave[statusField] !== "Pending") {
    return res.status(403).json({ message: "This leave is not pending your decision" });
  }

  leave[statusField] = decision;
  leave[commentField] = comment || "";
  leave[atField] = new Date().toLocaleString();
  await leave.save();

  await writeAudit(role, req.user.name, `leave_${decision.toLowerCase()}`, `leave id=${leave._id}`);
  res.json(leave);
}

// Shared shape for HOD / Squadron / SDD — each owns exactly one status
// field and (except SDD) scopes by an ownership id on the student/leave.
function buildRoleHandlers({ role, statusField, commentField, atField, scopeFilter, pendingExtraFilter }) {
  return {
    pending: async (req, res) => {
      const scope = await scopeFilter(req);
      const leaves = await Leave.find({
        ...scope,
        ...(pendingExtraFilter || {}),
        [statusField]: "Pending",
      });
      res.json(sortByPriorityThenNewest(leaves));
    },
    history: async (req, res) => {
      const scope = await scopeFilter(req);
      const leaves = await Leave.find({ ...scope, [statusField]: { $ne: "Pending" } }).sort({
        createdAt: -1,
      });
      res.json(leaves);
    },
    approve: (req, res) =>
      decide(req, res, { statusField, commentField, atField, role, decision: "Approved", scopeFilter }),
    reject: (req, res) =>
      decide(req, res, { statusField, commentField, atField, role, decision: "Rejected", scopeFilter }),
  };
}

// ── HOD — Day Scholar leaves assigned to this HOD ───────────────────
export const hod = buildRoleHandlers({
  role: "HOD",
  statusField: "hodStatus",
  commentField: "hodComment",
  atField: "hodApprovedAt",
  scopeFilter: async (req) => ({ hodId: req.user.id }),
});

// ── Squadron Commander — Cadet leaves, only after Troop has approved ─
export const squadran = buildRoleHandlers({
  role: "SQUADRAN",
  statusField: "sqnStatus",
  commentField: "sqnComment",
  atField: "sqnApprovedAt",
  scopeFilter: async (req) => ({ sqnId: req.user.id }),
  pendingExtraFilter: { troopStatus: "Approved" },
});

// ── Senior Deputy Dean — every Cadet, no per-SDD ownership ──────────
export const sdd = buildRoleHandlers({
  role: "SDD",
  statusField: "sddStatus",
  commentField: "sddComment",
  atField: "sddApprovedAt",
  scopeFilter: async () => ({}),
  pendingExtraFilter: { troopStatus: "Approved", sqnStatus: "Approved" },
});

export const sddOverview = async (req, res) => {
  const leaves = await Leave.find({ studentType: "CADET" }).sort({ createdAt: -1 });
  res.json(leaves);
};

export const sddPipeline = async (req, res) => {
  const leaves = await Leave.find({
    studentType: "CADET",
    $or: [{ troopStatus: "Pending" }, { sqnStatus: "Pending" }],
  });
  res.json(leaves);
};

// ── Troop Commander — dual queue (Day Scholar stage 2, Cadet stage 1),
// scoped by assigned intakes rather than a fixed unit ────────────────
async function troopScopeFilter(req) {
  const troop = await Troop.findById(req.user.id);
  return { intake: { $in: troop?.intakes || [] } };
}

export const troopPendingDayScholar = async (req, res) => {
  const scope = await troopScopeFilter(req);
  const leaves = await Leave.find({
    ...scope,
    studentType: "DAY_SCHOLAR",
    hodStatus: "Approved",
    troopStatus: "Pending",
  });
  res.json(sortByPriorityThenNewest(leaves));
};

export const troopPendingCadet = async (req, res) => {
  const scope = await troopScopeFilter(req);
  const leaves = await Leave.find({ ...scope, studentType: "CADET", troopStatus: "Pending" });
  res.json(sortByPriorityThenNewest(leaves));
};

export const troopPending = async (req, res) => {
  const scope = await troopScopeFilter(req);
  const leaves = await Leave.find({
    ...scope,
    troopStatus: "Pending",
    $or: [{ studentType: "CADET" }, { studentType: "DAY_SCHOLAR", hodStatus: "Approved" }],
  });
  res.json(sortByPriorityThenNewest(leaves));
};

export const troopHistory = async (req, res) => {
  const scope = await troopScopeFilter(req);
  const leaves = await Leave.find({ ...scope, troopStatus: { $ne: "Pending" } }).sort({
    createdAt: -1,
  });
  res.json(leaves);
};

export const troopApprove = (req, res) =>
  decide(req, res, {
    statusField: "troopStatus",
    commentField: "troopComment",
    atField: "troopApprovedAt",
    role: "TROOP",
    decision: "Approved",
    scopeFilter: troopScopeFilter,
  });

export const troopReject = (req, res) =>
  decide(req, res, {
    statusField: "troopStatus",
    commentField: "troopComment",
    atField: "troopApprovedAt",
    role: "TROOP",
    decision: "Rejected",
    scopeFilter: troopScopeFilter,
  });

// ==================================================================
// Gate
// ==================================================================

function isCurrentlyValid(leave) {
  if (!isApproved(leave)) return false;
  const now = new Date();
  const start = new Date(`${leave.startDate}T${leave.startTime || "00:00"}`);
  const end = new Date(`${leave.endDate}T${leave.endTime || "23:59"}`);
  return now >= start && now <= end;
}

// Every fully-approved leave — the gate dashboard's "Leave Passes" table
// and the on-leave-now/exit-entry stats are all computed client-side from
// this list plus the movement log, mirroring gate_staff.html.
export const approvedLeaves = async (req, res) => {
  const leaves = await Leave.find();
  res.json(leaves.filter(isApproved));
};

export const verifyByIndexNumber = async (req, res) => {
  const indexNumber = (req.params.indexNumber || "").toUpperCase();
  const leaves = await Leave.find({ indexNumber });
  if (!leaves.length) {
    return res.json({ found: false });
  }

  const valid = leaves.find(isCurrentlyValid);
  if (valid) return res.json({ found: true, valid: true, leave: valid });

  const anyApproved = leaves.find(isApproved);
  if (anyApproved) {
    return res.json({ found: true, valid: false, reason: "not_active", leave: anyApproved });
  }
  return res.json({ found: true, valid: false, reason: "not_approved" });
};

export const logMovement = async (req, res) => {
  const { indexNumber, direction, leaveId, notes } = req.body;
  if (!indexNumber || !["Exit", "Entry"].includes(direction)) {
    return res
      .status(400)
      .json({ message: "Index number and a valid direction are required" });
  }

  const leave = leaveId
    ? await Leave.findById(leaveId)
    : await Leave.findOne({ indexNumber: indexNumber.toUpperCase() });

  const movement = await Movement.create({
    indexNumber: indexNumber.toUpperCase(),
    studentName: leave?.studentName || "Unknown",
    studentType: leave?.studentType,
    direction,
    leaveId: leave?._id,
    notes,
    loggedBy: req.user.name,
  });

  await writeAudit("GATE", req.user.name, "movement_logged", `${direction} for ${indexNumber}`);
  res.status(201).json(movement);
};

export const listMovements = async (req, res) => {
  res.json(await Movement.find().sort({ createdAt: -1 }));
};

export const clearMovements = async (req, res) => {
  await Movement.deleteMany({});
  await writeAudit("GATE", req.user.name, "movement_log_cleared", "");
  res.json({ message: "Cleared" });
};
