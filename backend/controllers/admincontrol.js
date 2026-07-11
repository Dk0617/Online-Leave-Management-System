import { ROLE_MODELS } from "../utils/roleModels.js";
import Student from "../model/Student/Student.js";
import Hod from "../model/Hod/HOD.js";
import Troop from "../model/Troop/Troop.js";
import Squadran from "../model/Squadran/Squadran.js";
import Sdd from "../model/SDD/Sdd.js";
import Gate from "../model/Gate/Gate.js";
import Intake from "../model/Intake/Intake.js";
import Leave from "../model/Leave/Leave.js";
import Notification from "../model/Notification/Notification.js";
import AuditEntry from "../model/AuditEntry/AuditEntry.js";
import { writeAudit } from "../utils/audit.js";

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

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
