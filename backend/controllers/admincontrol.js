import { ROLE_MODELS } from "../utils/roleModels.js";
import Student from "../models/Student.js";
import Hod from "../models/HOD.js";
import Troop from "../models/Troop.js";
import Squadran from "../models/Squadran.js";
import Sdd from "../models/Sdd.js";
import Gate from "../models/Gate.js";
import Intake from "../models/Intake.js";
import Leave from "../models/Leave.js";
import Notification from "../models/Notification.js";
import AuditEntry from "../models/AuditEntry.js";
import { writeAudit } from "../utils/audit.js";

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Email-code login looks a user up by email across every role, so the same
// email can't be reused on a second account (which would make login-by-code
// ambiguous / silently log in to the wrong account). Checked in parallel —
// checking the 7 role collections one at a time turns every account
// create/update into 7 sequential round trips to the database.
async function isEmailTaken(email, excludeId) {
  if (!email) return false;
  const results = await Promise.all(
    Object.values(ROLE_MODELS).map((Model) => Model.findOne({ email, _id: { $ne: excludeId } }))
  );
  return results.some(Boolean);
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
  if (email && (await isEmailTaken(email))) {
    return res.status(409).json({ message: "That email is already used by another account" });
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

export const updateStudent = async (req, res) => {
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

  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: "Student not found" });

  if (indexNumber && indexNumber !== student.indexNumber) {
    const clash = await Student.findOne({ indexNumber, _id: { $ne: student._id } });
    if (clash) {
      return res
        .status(409)
        .json({ message: "A student with that index number already exists" });
    }
    student.indexNumber = indexNumber;
    student.username = indexNumber;
  }
  if (firstName) student.firstName = firstName;
  if (lastName) student.lastName = lastName;
  if (department !== undefined) student.department = department;
  if (email && email !== student.email && (await isEmailTaken(email, student._id))) {
    return res.status(409).json({ message: "That email is already used by another account" });
  }
  if (email !== undefined) student.email = email;
  if (mobile !== undefined) student.mobile = mobile;
  if (intake !== undefined) student.intake = intake;
  if (Array.isArray(troopIds)) student.troopIds = troopIds;
  if (studentType) {
    student.studentType = studentType;
    student.hodId = studentType === "DAY_SCHOLAR" ? hodId || undefined : undefined;
    student.sqnId = studentType === "CADET" ? sqnId || undefined : undefined;
  }
  if (password) {
    student.password = password;
    student.mustChangePassword = true;
  }

  await student.save();
  await writeAudit("ADMIN", req.user.name, "account_updated", `student ${student.indexNumber}`);
  const { password: _pw, ...safe } = student.toObject();
  res.json(safe);
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

  const { username, name, password, extra, email } = req.body;
  if (!username || !name) {
    return res.status(400).json({ message: "Username and name are required" });
  }

  const existing = await Model.findOne({ username });
  if (existing) return res.status(409).json({ message: "That username is already taken" });
  if (email && (await isEmailTaken(email))) {
    return res.status(409).json({ message: "That email is already used by another account" });
  }

  const doc = { username, name, password: password || genPassword(), email: email || undefined };
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

export const updateStaff = async (req, res) => {
  const resolved = staffModelFor(req, res);
  if (!resolved) return;
  const { role, Model } = resolved;

  const { username, name, password, extra, email } = req.body;
  const staff = await Model.findById(req.params.id);
  if (!staff) return res.status(404).json({ message: "Account not found" });

  if (username && username !== staff.username) {
    const clash = await Model.findOne({ username, _id: { $ne: staff._id } });
    if (clash) return res.status(409).json({ message: "That username is already taken" });
    staff.username = username;
  }
  if (name) staff.name = name;
  if (email && email !== staff.email && (await isEmailTaken(email, staff._id))) {
    return res.status(409).json({ message: "That email is already used by another account" });
  }
  if (email !== undefined) staff.email = email;
  const extraField = STAFF_EXTRA_FIELD[role];
  if (extraField && extra !== undefined) staff[extraField] = extra;
  if (password) {
    staff.password = password;
    staff.mustChangePassword = true;
  }

  await staff.save();
  await writeAudit("ADMIN", req.user.name, "account_updated", `${role.toLowerCase()} ${staff.username}`);
  const { password: _pw, ...safe } = staff.toObject();
  res.json(safe);
};

export const deleteStaff = async (req, res) => {
  const resolved = staffModelFor(req, res);
  if (!resolved) return;
  await resolved.Model.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};

// ── Troop (extra: intakes[] + edit) ────────────────────────────────
export const createTroop = async (req, res) => {
  const { username, name, password, intakes, email } = req.body;
  if (!username || !name) {
    return res.status(400).json({ message: "Username and name are required" });
  }
  if (!Array.isArray(intakes) || !intakes.length) {
    return res.status(400).json({ message: "Assign at least one intake to this officer" });
  }

  const existing = await Troop.findOne({ username });
  if (existing) return res.status(409).json({ message: "That username is already taken" });
  if (email && (await isEmailTaken(email))) {
    return res.status(409).json({ message: "That email is already used by another account" });
  }

  const created = await Troop.create({
    username,
    name,
    password: password || genPassword(),
    intakes,
    email: email || undefined,
  });
  await writeAudit("ADMIN", req.user.name, "account_created", `troop ${username}`);
  const { password: _pw, ...safe } = created.toObject();
  res.status(201).json(safe);
};

export const listTroops = async (req, res) => {
  res.json(await Troop.find().select("-password").sort({ createdAt: 1 }));
};

export const updateTroop = async (req, res) => {
  const { username, name, password, intakes, email } = req.body;
  const troop = await Troop.findById(req.params.id);
  if (!troop) return res.status(404).json({ message: "Troop Commander not found" });

  if (username && username !== troop.username) {
    const clash = await Troop.findOne({ username, _id: { $ne: troop._id } });
    if (clash) return res.status(409).json({ message: "That username is already taken" });
    troop.username = username;
  }
  if (name) troop.name = name;
  if (email && email !== troop.email && (await isEmailTaken(email, troop._id))) {
    return res.status(409).json({ message: "That email is already used by another account" });
  }
  if (email !== undefined) troop.email = email;
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
