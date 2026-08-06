import BlockLeave, { BLOCK_LEAVE_MIN_STUDENTS, BLOCK_LEAVE_MAX_STUDENTS } from "../models/BlockLeave.js";
import Student from "../models/Student.js";
import Hod from "../models/HOD.js";
import Troop from "../models/Troop.js";
import { generateVerifyCode } from "./studentcontrol.js";
import { writeAudit } from "../utils/audit.js";
import { sendApprovalEmail, sendRejectionEmail } from "../utils/mailer.js";

const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

function validateWindow(startDate, startTime, endDate, endTime) {
  if (!startDate || !startTime || !endDate || !endTime) {
    return "Start/end date and time are all required";
  }
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Invalid date/time";
  }
  if (end <= start) return "End date/time must be after start date/time";
  if (end.getTime() - start.getTime() > MAX_WINDOW_MS) {
    return "A Block Leave can only cover a single 24-hour window";
  }
  if (start < new Date()) return "Start date/time can't be in the past";
  return null;
}

// ── Student side ─────────────────────────────────────────────────────

// The one open (still-filling) roster for the student's own department, if
// any — the join screen either shows this to join, or lets the student
// start a brand new one when there isn't one.
export const openBlockLeave = async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ message: "Student not found" });
  if (student.studentType !== "DAY_SCHOLAR") {
    return res.json(null);
  }
  const open = await BlockLeave.findOne({ department: student.department, stage: "FILLING" });
  res.json(open);
};

export const createBlockLeave = async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ message: "Student not found" });
  if (student.studentType !== "DAY_SCHOLAR") {
    return res.status(403).json({ message: "Block Leave is only available to Day Scholars" });
  }

  const { startDate, startTime, endDate, endTime, reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ message: "A reason is required" });
  const windowError = validateWindow(startDate, startTime, endDate, endTime);
  if (windowError) return res.status(400).json({ message: windowError });

  const existing = await BlockLeave.findOne({ department: student.department, stage: "FILLING" });
  if (existing) {
    return res.status(409).json({
      message: "A Block Leave is already open for your department — join it instead of starting a new one.",
    });
  }

  const hod = await Hod.findOne({ department: student.department });
  if (!hod) {
    return res.status(400).json({
      message: `No HOD found for department "${student.department || "—"}". Ask admin to check that department names match exactly.`,
    });
  }
  const troops = await Troop.find({ intakes: student.intake }).select("_id");

  const created = await BlockLeave.create({
    department: student.department,
    hodId: hod._id,
    intakes: [student.intake],
    troopIds: troops.map((t) => t._id),
    startDate,
    startTime,
    endDate,
    endTime,
    reason: reason.trim(),
    students: [
      {
        no: 1,
        studentId: student._id,
        indexNumber: student.indexNumber,
        name: student.name,
        intake: student.intake,
        verifyCode: generateVerifyCode(),
      },
    ],
  });

  await writeAudit("STUDENT", student.username, "block_leave_started", `id=${created._id}`);
  res.status(201).json(created);
};

export const joinBlockLeave = async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ message: "Student not found" });
  if (student.studentType !== "DAY_SCHOLAR") {
    return res.status(403).json({ message: "Block Leave is only available to Day Scholars" });
  }

  const block = await BlockLeave.findById(req.params.id);
  if (!block) return res.status(404).json({ message: "Block Leave not found" });
  if (block.stage !== "FILLING") {
    return res.status(409).json({ message: "This Block Leave is no longer accepting students" });
  }
  if (block.department !== student.department) {
    return res.status(403).json({ message: "You can only join your own department's Block Leave" });
  }
  if (block.students.some((s) => String(s.studentId) === student._id.toString())) {
    return res.status(409).json({ message: "You've already joined this Block Leave" });
  }
  if (block.students.length >= BLOCK_LEAVE_MAX_STUDENTS) {
    return res.status(409).json({ message: "This Block Leave is already full" });
  }

  block.students.push({
    no: block.students.length + 1,
    studentId: student._id,
    indexNumber: student.indexNumber,
    name: student.name,
    intake: student.intake,
    verifyCode: generateVerifyCode(),
  });
  if (!block.intakes.includes(student.intake)) block.intakes.push(student.intake);
  const troops = await Troop.find({ intakes: student.intake }).select("_id");
  for (const t of troops) {
    if (!block.troopIds.some((id) => String(id) === String(t._id))) block.troopIds.push(t._id);
  }

  // Hits the cap — locks the roster and sends it for approval automatically
  // rather than leaving it stuck at 30/30 with nobody able to add an
  // (impossible) 31st student to trigger submission themselves.
  if (block.students.length >= BLOCK_LEAVE_MAX_STUDENTS) {
    block.stage = "SUBMITTED";
    block.submittedAt = new Date().toLocaleString();
    block.submittedByStudentId = student._id;
  }

  await block.save();
  await writeAudit("STUDENT", student.username, "block_leave_joined", `id=${block._id}, no=${block.students.length}`);
  res.json(block);
};

export const submitBlockLeave = async (req, res) => {
  const block = await BlockLeave.findById(req.params.id);
  if (!block) return res.status(404).json({ message: "Block Leave not found" });
  if (block.stage !== "FILLING") {
    return res.status(409).json({ message: "This Block Leave has already been submitted" });
  }
  if (!block.students.some((s) => String(s.studentId) === req.user.id)) {
    return res.status(403).json({ message: "Only a student on this Block Leave's roster can submit it" });
  }
  if (block.students.length < BLOCK_LEAVE_MIN_STUDENTS) {
    return res.status(400).json({
      message: `At least ${BLOCK_LEAVE_MIN_STUDENTS} students are needed before this can be submitted (currently ${block.students.length}).`,
    });
  }

  block.stage = "SUBMITTED";
  block.submittedAt = new Date().toLocaleString();
  block.submittedByStudentId = req.user.id;
  await block.save();

  await writeAudit("STUDENT", req.user.name, "block_leave_submitted", `id=${block._id}, count=${block.students.length}`);
  res.json(block);
};

export const myBlockLeaves = async (req, res) => {
  const blocks = await BlockLeave.find({ "students.studentId": req.user.id }).sort({ createdAt: -1 });
  res.json(blocks);
};

// ── HOD side ─────────────────────────────────────────────────────────

export const hodBlockLeavePending = async (req, res) => {
  const blocks = await BlockLeave.find({ hodId: req.user.id, stage: "SUBMITTED", hodStatus: "Pending" }).sort({
    createdAt: -1,
  });
  res.json(blocks);
};

export const hodBlockLeaveHistory = async (req, res) => {
  const blocks = await BlockLeave.find({ hodId: req.user.id, hodStatus: { $ne: "Pending" } }).sort({
    createdAt: -1,
  });
  res.json(blocks);
};

async function decideBlockLeave(req, res, { role, decision, statusField, commentField, atField, scope, decidedByField }) {
  const { comment } = req.body;
  if (decision === "Rejected" && !comment?.trim()) {
    return res.status(400).json({ message: "A reason is required to reject a Block Leave" });
  }
  const block = await BlockLeave.findOne({ _id: req.params.id, ...scope });
  if (!block) return res.status(404).json({ message: "Block Leave not found" });
  if (block[statusField] !== "Pending") {
    return res.status(403).json({ message: "This Block Leave is not pending your decision" });
  }

  block[statusField] = decision;
  block[commentField] = comment || "";
  block[atField] = new Date().toLocaleString();
  if (decidedByField) block[decidedByField] = req.user.id;
  await block.save();

  writeAudit(role, req.user.name, `block_leave_${decision.toLowerCase()}`, `id=${block._id}`);

  // Fire-and-forget, same reasoning as leavecontrol.js applyDecision — the
  // approver's response doesn't wait on an SMTP round-trip per student.
  (async () => {
    try {
      const students = await Student.find({ _id: { $in: block.students.map((s) => s.studentId) } }).select(
        "email name"
      );
      const fakeLeave = { type: "Block Leave", startDate: block.startDate, endDate: block.endDate };
      for (const student of students) {
        if (!student.email) continue;
        if (decision === "Approved" && block.hodStatus === "Approved" && block.troopStatus === "Approved") {
          await sendApprovalEmail(student.email, student.name, fakeLeave);
        } else if (decision === "Rejected") {
          await sendRejectionEmail(student.email, student.name, fakeLeave, role, block[commentField]);
        }
      }
    } catch (err) {
      console.error("Failed to send Block Leave decision emails:", err.message);
    }
  })();

  res.json(block);
}

export const hodApproveBlockLeave = (req, res) =>
  decideBlockLeave(req, res, {
    role: "HOD",
    decision: "Approved",
    statusField: "hodStatus",
    commentField: "hodComment",
    atField: "hodApprovedAt",
    scope: { hodId: req.user.id },
  });

export const hodRejectBlockLeave = (req, res) =>
  decideBlockLeave(req, res, {
    role: "HOD",
    decision: "Rejected",
    statusField: "hodStatus",
    commentField: "hodComment",
    atField: "hodApprovedAt",
    scope: { hodId: req.user.id },
  });

// ── Troop side — same intake-based scoping as an ordinary Leave (see
// leavecontrol.js troopScopeFilter): any Troop Commander assigned to one of
// the roster's intakes can decide, and only becomes visible once the HOD
// has already approved. ──────────────────────────────────────────────────
async function troopBlockScopeFilter(req) {
  const troop = await Troop.findById(req.user.id);
  return { intakes: { $in: troop?.intakes || [] } };
}

export const troopBlockLeavePending = async (req, res) => {
  const scope = await troopBlockScopeFilter(req);
  const blocks = await BlockLeave.find({
    ...scope,
    stage: "SUBMITTED",
    hodStatus: "Approved",
    troopStatus: "Pending",
  }).sort({ createdAt: -1 });
  res.json(blocks);
};

export const troopBlockLeaveHistory = async (req, res) => {
  const scope = await troopBlockScopeFilter(req);
  const blocks = await BlockLeave.find({ ...scope, troopStatus: { $ne: "Pending" } }).sort({ createdAt: -1 });
  res.json(blocks);
};

export const troopApproveBlockLeave = async (req, res) => {
  const scope = await troopBlockScopeFilter(req);
  return decideBlockLeave(req, res, {
    role: "TROOP",
    decision: "Approved",
    statusField: "troopStatus",
    commentField: "troopComment",
    atField: "troopApprovedAt",
    scope,
    decidedByField: "decidedByTroopId",
  });
};

export const troopRejectBlockLeave = async (req, res) => {
  const scope = await troopBlockScopeFilter(req);
  return decideBlockLeave(req, res, {
    role: "TROOP",
    decision: "Rejected",
    statusField: "troopStatus",
    commentField: "troopComment",
    atField: "troopApprovedAt",
    scope,
    decidedByField: "decidedByTroopId",
  });
};

export { BLOCK_LEAVE_MIN_STUDENTS, BLOCK_LEAVE_MAX_STUDENTS };
