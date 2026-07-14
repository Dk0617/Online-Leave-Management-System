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

function isValidMobile(mobile) {
  return /^\d{10}$/.test(mobile);
}

// At least 8 characters, one uppercase, one lowercase, one digit, and one
// special character — required for every password an admin sets by hand.
const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
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
  // Admin's dashboard only shows aggregate stats from this list, never the
  // attachment itself — excluding it avoids pulling every leave's base64
  // document (up to ~2.7MB each) over the network on every admin page load.
  const leaves = await Leave.find().select("-attachmentData").sort({ createdAt: -1 });
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

  if (!indexNumber || !firstName || !lastName || !department || !email || !mobile || !intake || !password) {
    return res.status(400).json({ message: "All fields are required to create a student account" });
  }
  if (!studentType || !["DAY_SCHOLAR", "CADET"].includes(studentType)) {
    return res.status(400).json({ message: "A valid student type is required" });
  }
  if (!Array.isArray(troopIds) || troopIds.length < 1 || troopIds.length > 2) {
    return res
      .status(400)
      .json({ message: "Assign 1 or 2 Troop Commanders to this student" });
  }
  if (!isValidMobile(mobile)) {
    return res.status(400).json({ message: "Mobile number must be exactly 10 digits, numbers only." });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
  }
  if (studentType === "DAY_SCHOLAR" && !hodId) {
    return res.status(400).json({ message: "A Day Scholar must be assigned an HOD" });
  }
  if (studentType === "CADET" && !sqnId) {
    return res
      .status(400)
      .json({ message: "An Officer Cadet must be assigned a Squadron Commander" });
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
    password,
  });

  await writeAudit("ADMIN", req.user.name, "account_created", `student ${indexNumber}`);
  const { password: _pw, ...safe } = created.toObject();
  res.status(201).json(safe);
};

export const listStudents = async (req, res) => {
  // Admin's account list never displays the photo either — same reasoning
  // as excluding attachmentData from leave lists.
  const students = await Student.find()
    .select("-password -photo")
    .populate("troopIds", "name")
    .populate("hodId", "name department")
    .populate("sqnId", "name")
    .sort({ createdAt: 1 });
  res.json(students);
};

export const updateStudent = async (req, res) => {
  const { firstName, lastName, email, mobile, troopIds, hodId, sqnId, password } = req.body;

  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: "Student not found" });

  // Index Number, Department, Intake, and Student Type are fixed at
  // creation and can never be changed afterwards — they're the identifiers
  // everything else (HOD/Troop/Squadron assignment, routing, historical
  // leave records) is keyed on, so editing them after the fact would silently
  // desync past records from the student's current assignment. Deliberately
  // not read from req.body here, so even a direct API call can't change them.
  if (firstName) student.firstName = firstName;
  if (lastName) student.lastName = lastName;
  if (email && email !== student.email && (await isEmailTaken(email, student._id))) {
    return res.status(409).json({ message: "That email is already used by another account" });
  }
  if (email !== undefined) student.email = email;
  if (mobile) {
    if (!isValidMobile(mobile)) {
      return res.status(400).json({ message: "Mobile number must be exactly 10 digits, numbers only." });
    }
    student.mobile = mobile;
  } else if (mobile !== undefined) {
    student.mobile = mobile;
  }
  if (Array.isArray(troopIds)) student.troopIds = troopIds;
  if (student.studentType === "DAY_SCHOLAR" && hodId) student.hodId = hodId;
  if (student.studentType === "CADET" && sqnId) student.sqnId = sqnId;
  if (password) {
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }
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
  const extraField = STAFF_EXTRA_FIELD[role];
  if (!username || !name || !email || !password || (extraField && !extra)) {
    return res.status(400).json({ message: "All fields are required to create an account" });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
  }

  const existing = await Model.findOne({ username });
  if (existing) return res.status(409).json({ message: "That username is already taken" });
  if (await isEmailTaken(email)) {
    return res.status(409).json({ message: "That email is already used by another account" });
  }

  const doc = { username, name, password, email };
  if (extraField) doc[extraField] = extra;

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
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }
    staff.password = password;
    staff.mustChangePassword = true;
  }

  await staff.save();
  await writeAudit("ADMIN", req.user.name, "account_updated", `${role.toLowerCase()} ${staff.username}`);
  const { password: _pw, ...safe } = staff.toObject();
  res.json(safe);
};

// Maps each staff role onto the Student field and Leave status field that
// reference it, so deletion can be blocked while students/leaves still
// depend on the account — deleting out from under them silently orphans
// the reference (Leave.hodId/sqnId keeps pointing at a document that no
// longer exists), leaving that leave stuck "Pending" at that stage forever
// with nobody able to log in and decide on it. SDD and Gate have no
// per-student assignment (SDD scopes globally by studentType: "CADET",
// Gate isn't referenced by students at all), so they're always safe to
// delete.
const STAFF_DEPENDENT_FIELDS = {
  HOD: { studentField: "hodId", leaveStatusField: "hodStatus" },
  SQUADRAN: { studentField: "sqnId", leaveStatusField: "sqnStatus" },
};

export const deleteStaff = async (req, res) => {
  const resolved = staffModelFor(req, res);
  if (!resolved) return;
  const { role, Model } = resolved;

  const dep = STAFF_DEPENDENT_FIELDS[role];
  if (dep) {
    const [studentCount, pendingLeaveCount] = await Promise.all([
      Student.countDocuments({ [dep.studentField]: req.params.id }),
      Leave.countDocuments({ [dep.studentField]: req.params.id, [dep.leaveStatusField]: "Pending" }),
    ]);
    if (studentCount > 0 || pendingLeaveCount > 0) {
      return res.status(409).json({
        message: `Can't delete — ${studentCount} student(s) and ${pendingLeaveCount} pending leave(s) are still assigned to this account. Those need to be moved to a different account or resolved before this one can be deleted.`,
      });
    }
  }

  await Model.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};

// ── Troop (extra: intakes[] + edit) ────────────────────────────────
export const createTroop = async (req, res) => {
  const { username, name, password, intakes, email } = req.body;
  if (!username || !name || !email || !password) {
    return res.status(400).json({ message: "All fields are required to create an account" });
  }
  if (!Array.isArray(intakes) || !intakes.length) {
    return res.status(400).json({ message: "Assign at least one intake to this officer" });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
  }

  const existing = await Troop.findOne({ username });
  if (existing) return res.status(409).json({ message: "That username is already taken" });
  if (await isEmailTaken(email)) {
    return res.status(409).json({ message: "That email is already used by another account" });
  }

  const created = await Troop.create({
    username,
    name,
    password,
    intakes,
    email,
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
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }
    troop.password = password;
    troop.mustChangePassword = true;
  }
  await troop.save();
  await writeAudit("ADMIN", req.user.name, "account_updated", `troop ${troop.username}`);
  const { password: _pw, ...safe } = troop.toObject();
  res.json(safe);
};

export const deleteTroop = async (req, res) => {
  const [studentCount, pendingLeaveCount] = await Promise.all([
    Student.countDocuments({ troopIds: req.params.id }),
    Leave.countDocuments({ troopIds: req.params.id, troopStatus: "Pending" }),
  ]);
  if (studentCount > 0 || pendingLeaveCount > 0) {
    return res.status(409).json({
      message: `Can't delete — ${studentCount} student(s) and ${pendingLeaveCount} pending leave(s) are still assigned to this account. Those need to be moved to a different account or resolved before this one can be deleted.`,
    });
  }
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
