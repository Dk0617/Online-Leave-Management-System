import BlockLeave, { BLOCK_LEAVE_MIN_STUDENTS, BLOCK_LEAVE_MAX_STUDENTS } from "../models/BlockLeave.js";
import Student from "../models/Student.js";
import Leave from "../models/Leave.js";
import Movement from "../models/Movement.js";
import Hod from "../models/HOD.js";
import Troop from "../models/Troop.js";
import EventDay, { MANDATORY_EVENT_CATEGORIES } from "../models/EventDay.js";
import { generateVerifyCode } from "./studentcontrol.js";
import { writeAudit } from "../utils/audit.js";
import { sendApprovalEmail, sendRejectionEmail } from "../utils/mailer.js";
import { isGateEligible, isRejected } from "../utils/leaveStatus.js";

const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

// Same notice period and campus curfew as an ordinary Personal Leave (see
// studentcontrol.js applyLeave) — a Block Leave is really just a Personal
// Leave shared by a whole roster, so every rule that applies to one applies
// here too, not just the 24-hour-window/reason basics.
const MIN_NOTICE_MS = 2 * 24 * 60 * 60 * 1000;
const CAMPUS_EXIT_EARLIEST_MINUTES = 6 * 60;
const CAMPUS_ENTRY_LATEST_MINUTES = 18 * 60;
function minutesFromTimeString(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function validateWindow(startDate, startTime, endDate, endTime) {
  if (!startDate || !startTime || !endDate || !endTime) {
    return "Start/end date and time are all required";
  }
  if (!/^\d{2}:(00|30)$/.test(startTime) || !/^\d{2}:(00|30)$/.test(endTime)) {
    return "Start and end time must be on the hour or half hour (e.g. 09:00 or 09:30).";
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
  if (start.getTime() - Date.now() < MIN_NOTICE_MS) {
    return "A Block Leave must be started at least 2 days before its start date — same notice period as an ordinary Personal Leave.";
  }
  if (minutesFromTimeString(startTime) < CAMPUS_EXIT_EARLIEST_MINUTES) {
    return "Start time must be 06.00 hrs or later — campus exit is only allowed from 06.00 hrs onward.";
  }
  if (minutesFromTimeString(endTime) > CAMPUS_ENTRY_LATEST_MINUTES) {
    return "End time must be 18.00 hrs or earlier — campus entry must be logged by 18.00 hrs.";
  }
  return null;
}

// A FILLING roster whose window has already passed without being
// submitted gets flipped to EXPIRED right here, the moment anything reads
// it — no separate cron job needed since every relevant screen (open
// roster, my block leaves) already queries through these two functions.
async function expireIfPast(block) {
  if (!block || block.stage !== "FILLING") return block;
  const windowEnd = new Date(`${block.endDate}T${block.endTime}`);
  if (windowEnd.getTime() < Date.now()) {
    block.stage = "EXPIRED";
    await block.save();
  }
  return block;
}

async function expireStaleFillingBlocks(blocks) {
  for (const block of blocks) {
    await expireIfPast(block);
  }
  return blocks;
}

// A student can't be committed to two overlapping leaves at once — same
// physical-presence constraint applyLeave enforces for an ordinary Leave
// (see studentcontrol.js), checked here against both their individual
// Leaves and any other Block Leave they're already a confirmed (JOINED)
// member of. Used before a student is newly committed to a Block Leave:
// creating one, joining one, or accepting an invitation to one.
async function findConflict(studentId, startDate, startTime, endDate, endTime, excludeBlockLeaveId) {
  const newStart = new Date(`${startDate}T${startTime}`);
  const newEnd = new Date(`${endDate}T${endTime}`);

  const leaveCandidates = await Leave.find({
    studentId,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  for (const candidate of leaveCandidates) {
    if (isRejected(candidate)) continue;
    const candidateStart = new Date(`${candidate.startDate}T${candidate.startTime}`);
    let candidateEnd = new Date(`${candidate.endDate}T${candidate.endTime}`);
    if (isGateEligible(candidate)) {
      const returnedEntry = await Movement.findOne({ leaveId: candidate._id, direction: "Entry" }).sort({
        createdAt: 1,
      });
      if (returnedEntry) candidateEnd = returnedEntry.createdAt;
    }
    if (candidateStart < newEnd && candidateEnd > newStart) {
      return `Already has a ${candidate.type} leave for ${candidate.startDate} ${candidate.startTime} – ${candidate.endDate} ${candidate.endTime} that overlaps with these dates/times.`;
    }
  }

  // $elemMatch, not two separate "students.x" conditions — otherwise Mongo
  // matches studentId against one roster entry and status against any other
  // (e.g. a different student's JOINED entry), not necessarily this
  // student's own.
  const blockCandidates = await BlockLeave.find({
    students: { $elemMatch: { studentId, status: "JOINED" } },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
    ...(excludeBlockLeaveId ? { _id: { $ne: excludeBlockLeaveId } } : {}),
  });
  for (const block of blockCandidates) {
    if (block.hodStatus === "Rejected" || block.troopStatus === "Rejected") continue;
    const blockStart = new Date(`${block.startDate}T${block.startTime}`);
    const blockEnd = new Date(`${block.endDate}T${block.endTime}`);
    if (blockStart < newEnd && blockEnd > newStart) {
      return `Already on another Block Leave (${block.department}) for ${block.startDate} ${block.startTime} – ${block.endDate} ${block.endTime} that overlaps with these dates/times.`;
    }
  }

  return null;
}

// A Workshop day (or other mandatory-attendance academic day) the HOD has
// marked blocks a Block Leave the same way it blocks an ordinary leave
// application (see studentcontrol.js applyLeave) — checked once against the
// whole roster's shared window, since every student on it shares the same
// department/HOD and the same dates.
async function findMandatoryEventConflict(hodId, startDate, endDate, startTime, endTime) {
  const newStart = new Date(`${startDate}T${startTime}`);
  const newEnd = new Date(`${endDate}T${endTime}`);
  const blockedDays = await EventDay.find({
    hodId,
    category: { $in: MANDATORY_EVENT_CATEGORIES },
    date: { $gte: startDate, $lte: endDate },
  });
  for (const blockedDay of blockedDays) {
    const dayStart = new Date(`${blockedDay.date}T${blockedDay.startTime || "00:00"}`);
    const dayEnd = new Date(`${blockedDay.date}T${blockedDay.endTime || "23:59"}`);
    if (dayStart < newEnd && dayEnd > newStart) {
      const windowText = blockedDay.startTime && blockedDay.endTime ? ` (${blockedDay.startTime}–${blockedDay.endTime})` : "";
      return `${blockedDay.date}${windowText} is a mandatory-attendance day ("${blockedDay.title}") set by your HOD — a Block Leave can't be started or joined for a window that overlaps it.`;
    }
  }
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
  let open = await BlockLeave.findOne({ department: student.department, stage: "FILLING" });
  open = await expireIfPast(open);
  // Once expired it's no longer "open" to join — a fresh Block Leave can
  // now be started for the department instead.
  res.json(open && open.stage === "FILLING" ? open : null);
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

  const eventConflict = await findMandatoryEventConflict(hod._id, startDate, endDate, startTime, endTime);
  if (eventConflict) return res.status(400).json({ message: eventConflict });

  const conflict = await findConflict(student._id, startDate, startTime, endDate, endTime);
  if (conflict) return res.status(400).json({ message: conflict });

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

  let block = await BlockLeave.findById(req.params.id);
  if (!block) return res.status(404).json({ message: "Block Leave not found" });
  block = await expireIfPast(block);
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

  const conflict = await findConflict(student._id, block.startDate, block.startTime, block.endDate, block.endTime, block._id);
  if (conflict) return res.status(400).json({ message: conflict });

  block.students.push({
    no: block.students.length + 1,
    studentId: student._id,
    indexNumber: student.indexNumber,
    name: student.name,
    intake: student.intake,
    verifyCode: generateVerifyCode(),
    status: "JOINED",
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
  let block = await BlockLeave.findById(req.params.id);
  if (!block) return res.status(404).json({ message: "Block Leave not found" });
  block = await expireIfPast(block);
  if (block.stage !== "FILLING") {
    return res.status(409).json({ message: "This Block Leave has already been submitted" });
  }
  if (!block.students.some((s) => String(s.studentId) === req.user.id && s.status === "JOINED")) {
    return res.status(403).json({ message: "Only a joined student on this Block Leave's roster can submit it" });
  }
  // Only students who've actually accepted (JOINED) count toward the
  // threshold — someone still-INVITED hasn't committed to attending, so
  // their reserved seat shouldn't let the roster submit prematurely.
  const joinedCount = block.students.filter((s) => s.status === "JOINED").length;
  if (joinedCount < BLOCK_LEAVE_MIN_STUDENTS) {
    return res.status(400).json({
      message: `At least ${BLOCK_LEAVE_MIN_STUDENTS} joined students are needed before this can be submitted (currently ${joinedCount}).`,
    });
  }

  block.stage = "SUBMITTED";
  block.submittedAt = new Date().toLocaleString();
  block.submittedByStudentId = req.user.id;
  await block.save();

  await writeAudit("STUDENT", req.user.name, "block_leave_submitted", `id=${block._id}, count=${joinedCount}`);
  res.json(block);
};

export const myBlockLeaves = async (req, res) => {
  const blocks = await BlockLeave.find({
    students: { $elemMatch: { studentId: req.user.id, status: "JOINED" } },
  }).sort({ createdAt: -1 });
  await expireStaleFillingBlocks(blocks);
  res.json(blocks);
};

// ── Invitations ──────────────────────────────────────────────────────
// A roster member picks another Day Scholar from their own department (see
// searchInvitableStudents) to invite instead of leaving the roster fully
// open — the invited student sees it as a pending invitation (see
// myBlockLeaveInvitations) and has to accept before they're actually
// committed to the roster, same as any other leave decision being theirs
// to make, not something another student can commit them to unilaterally.

export const searchInvitableStudents = async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ message: "Student not found" });

  const block = await BlockLeave.findById(req.params.id);
  if (!block) return res.status(404).json({ message: "Block Leave not found" });
  if (block.stage !== "FILLING") return res.json([]);
  if (!block.students.some((s) => String(s.studentId) === student._id.toString() && s.status === "JOINED")) {
    return res.status(403).json({ message: "Only a joined student on this Block Leave can invite others" });
  }

  const q = (req.query.q || "").toString().trim();
  if (q.length < 2) return res.json([]);

  const alreadyOnRoster = block.students.map((s) => s.studentId);
  const matches = await Student.find({
    _id: { $nin: alreadyOnRoster },
    department: student.department,
    studentType: "DAY_SCHOLAR",
    // firstName/lastName are the real stored fields — `name` is a virtual
    // computed from them (see models/Student.js) and can't be matched by a
    // database-level $regex, only read back off an already-loaded document.
    $or: [
      { firstName: { $regex: q, $options: "i" } },
      { lastName: { $regex: q, $options: "i" } },
      { indexNumber: { $regex: q, $options: "i" } },
    ],
  })
    .select("firstName lastName indexNumber intake")
    .limit(10);

  res.json(matches.map((m) => ({ id: m._id, name: m.name, indexNumber: m.indexNumber, intake: m.intake })));
};

export const inviteToBlockLeave = async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ message: "Student not found" });

  let block = await BlockLeave.findById(req.params.id);
  if (!block) return res.status(404).json({ message: "Block Leave not found" });
  block = await expireIfPast(block);
  if (block.stage !== "FILLING") {
    return res.status(409).json({ message: "This Block Leave is no longer accepting students" });
  }
  if (!block.students.some((s) => String(s.studentId) === student._id.toString() && s.status === "JOINED")) {
    return res.status(403).json({ message: "Only a joined student on this Block Leave can invite others" });
  }
  if (block.students.length >= BLOCK_LEAVE_MAX_STUDENTS) {
    return res.status(409).json({ message: "This Block Leave is already full" });
  }

  const { studentId } = req.body;
  const invitee = await Student.findById(studentId);
  if (!invitee) return res.status(404).json({ message: "Student not found" });
  if (invitee.studentType !== "DAY_SCHOLAR" || invitee.department !== block.department) {
    return res.status(400).json({ message: "You can only invite a Day Scholar from your own department" });
  }
  if (block.students.some((s) => String(s.studentId) === studentId)) {
    return res.status(409).json({ message: `${invitee.name} is already on this Block Leave's roster` });
  }

  block.students.push({
    no: block.students.length + 1,
    studentId: invitee._id,
    indexNumber: invitee.indexNumber,
    name: invitee.name,
    intake: invitee.intake,
    verifyCode: generateVerifyCode(),
    status: "INVITED",
  });
  await block.save();

  await writeAudit(
    "STUDENT",
    student.username,
    "block_leave_invited",
    `id=${block._id}, invited=${invitee.indexNumber}`
  );
  res.status(201).json(block);
};

export const myBlockLeaveInvitations = async (req, res) => {
  const blocks = await BlockLeave.find({
    students: { $elemMatch: { studentId: req.user.id, status: "INVITED" } },
    stage: "FILLING",
  }).sort({ createdAt: -1 });
  await expireStaleFillingBlocks(blocks);
  // Re-filter after expiry — an invitation to a roster that just expired is
  // no longer something to accept/decline.
  res.json(blocks.filter((b) => b.stage === "FILLING"));
};

export const respondToBlockLeaveInvite = async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ message: "Student not found" });

  let block = await BlockLeave.findById(req.params.id);
  if (!block) return res.status(404).json({ message: "Block Leave not found" });
  const entry = block.students.find((s) => String(s.studentId) === student._id.toString() && s.status === "INVITED");
  if (!entry) return res.status(404).json({ message: "You have no pending invitation to this Block Leave" });
  block = await expireIfPast(block);
  if (block.stage !== "FILLING") {
    return res.status(409).json({ message: "This Block Leave is no longer accepting students" });
  }

  const { accept } = req.body;
  if (!accept) {
    block.students = block.students.filter((s) => String(s.studentId) !== student._id.toString());
    await block.save();
    await writeAudit("STUDENT", student.username, "block_leave_invite_declined", `id=${block._id}`);
    return res.json({ ok: true });
  }

  // Re-check conflicts at accept time, not just when invited — time has
  // passed, and the student may have picked up another leave since.
  const conflict = await findConflict(student._id, block.startDate, block.startTime, block.endDate, block.endTime, block._id);
  if (conflict) return res.status(400).json({ message: conflict });

  entry.status = "JOINED";
  if (!block.intakes.includes(student.intake)) block.intakes.push(student.intake);
  const troops = await Troop.find({ intakes: student.intake }).select("_id");
  for (const t of troops) {
    if (!block.troopIds.some((id) => String(id) === String(t._id))) block.troopIds.push(t._id);
  }
  if (block.students.length >= BLOCK_LEAVE_MAX_STUDENTS) {
    block.stage = "SUBMITTED";
    block.submittedAt = new Date().toLocaleString();
    block.submittedByStudentId = student._id;
  }
  await block.save();

  await writeAudit("STUDENT", student.username, "block_leave_invite_accepted", `id=${block._id}`);
  res.json(block);
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