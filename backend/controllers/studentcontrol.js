import crypto from "crypto";
import Student from "../models/Student.js";
import Leave from "../models/Leave.js";
import Movement from "../models/Movement.js";
import { writeAudit } from "../utils/audit.js";

// Academic Leave never requires a supporting document, for either student
// type — it's an academic excuse, not a campus-exit reason. Day Scholars
// otherwise require Medical + Other; Cadets require Medical + Personal +
// Other.
const DOC_REQUIRED_TYPES_DAY_SCHOLAR = ["Medical Leave", "Other"];
const DOC_REQUIRED_TYPES_CADET = ["Medical Leave", "Personal Leave", "Other"];
function requiresAttachment(type, studentType) {
  return (studentType === "CADET" ? DOC_REQUIRED_TYPES_CADET : DOC_REQUIRED_TYPES_DAY_SCHOLAR).includes(type);
}

// Campus curfew: except Emergency Leave, students may only exit from 06.00
// hrs onward and must be back by 18.00 hrs.
const CAMPUS_EXIT_EARLIEST_MINUTES = 6 * 60;
const CAMPUS_ENTRY_LATEST_MINUTES = 18 * 60;
function minutesFromTimeString(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ~2MB of raw file becomes ~2.7MB once base64-encoded.
const MAX_ATTACHMENT_BYTES = 2.7 * 1024 * 1024;
// Excludes ambiguous characters (0/O, 1/I/L) so gate staff can read/type it easily.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateVerifyCode() {
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

// Academic Leave always requires a companion Personal Leave (same dates) —
// for Day Scholars this is a standing policy; for Cadets it covers the
// "going home during a lecture-day period" case. These are two separate
// leave records, each with its own routing:
//   - Cadet Academic Leave: Troop Commander -> Squadron Commander (no SDD).
//     Cadet Personal Leave (this companion): Troop Commander -> Squadron
//     Commander -> Senior Deputy Dean — the normal full Cadet chain.
//   - Day Scholar Academic Leave: HOD -> Troop Commander. Day Scholar
//     Personal Leave (this companion): HOD -> Troop Commander, same as the
//     Academic Leave itself.
// Exempt from its own attachment rule since there's no separate upload
// step for it — it reuses whatever the student attached to the Academic
// Leave, if any.
async function createLinkedPersonalLeave(primary, student, hodIdForLeave) {
  const isCadet = student.studentType === "CADET";
  const linked = await Leave.create({
    studentId: student._id,
    studentName: student.name,
    indexNumber: student.indexNumber,
    department: student.department,
    studentType: student.studentType,
    intake: student.intake,
    hodId: hodIdForLeave,
    troopIds: student.troopIds,
    sqnId: isCadet ? student.sqnId : undefined,
    type: "Personal Leave",
    priority: primary.priority,
    startDate: primary.startDate,
    startTime: primary.startTime,
    endDate: primary.endDate,
    endTime: primary.endTime,
    reason: `Linked to Academic Leave (Ref LV-${primary._id}): ${primary.reason}`,
    address: primary.address,
    contactNumber: primary.contactNumber,
    attachmentName: primary.attachmentName,
    attachmentData: primary.attachmentData,
    appliedDate: primary.appliedDate,
    verifyCode: generateVerifyCode(),
    linkedLeaveId: primary._id,
    hodStatus: isCadet ? "N/A" : "Pending",
    troopStatus: "Pending",
    sqnStatus: isCadet ? "Pending" : "N/A",
    sddStatus: isCadet ? "Pending" : "N/A",
  });
  primary.linkedLeaveId = linked._id;
  await primary.save();
  return linked;
}

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
    address,
    contactNumber,
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
  if (!address || !address.trim()) missing.push("Address");
  if (!contactNumber || !contactNumber.trim()) missing.push("Contact Number");
  if (requiresAttachment(type, student.studentType) && !attachmentData) {
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

  // Every leave type except Emergency Leave must be submitted at least 2
  // days ahead of the leave's own start date/time — Emergency Leave is the
  // one deliberate exception, since it exists precisely for same-day needs.
  if (type !== "Emergency Leave") {
    const MIN_NOTICE_MS = 2 * 24 * 60 * 60 * 1000;
    const startDateTime = new Date(`${startDate}T${startTime}`);
    if (startDateTime.getTime() - Date.now() < MIN_NOTICE_MS) {
      return res.status(400).json({
        message:
          "This leave type must be applied for at least 2 days before the leave start date. Use Emergency Leave if you need to apply later than that.",
      });
    }
    if (minutesFromTimeString(startTime) < CAMPUS_EXIT_EARLIEST_MINUTES) {
      return res.status(400).json({
        message: "Leave start time must be 06.00 hrs or later — campus exit is only allowed from 06.00 hrs onward.",
      });
    }
    if (minutesFromTimeString(endTime) > CAMPUS_ENTRY_LATEST_MINUTES) {
      return res.status(400).json({
        message: "Leave end time must be 18.00 hrs or earlier — campus entry must be logged by 18.00 hrs.",
      });
    }
  }

  const isCadet = student.studentType === "CADET";
  const isEmergency = type === "Emergency Leave";
  const isAcademic = type === "Academic Leave";

  // Cadets never have an HOD in their routing at all (Academic Leave routes
  // Troop Commander -> Squadron Commander, every other type routes Troop ->
  // Squadron -> SDD). HOD only applies to Day Scholars.
  const hodIdForLeave = isCadet ? undefined : student.hodId;

  const leave = await Leave.create({
    studentId: student._id,
    studentName: student.name,
    indexNumber: student.indexNumber,
    department: student.department,
    studentType: student.studentType,
    intake: student.intake,
    hodId: hodIdForLeave,
    troopIds: student.troopIds,
    sqnId: isCadet ? student.sqnId : undefined,
    type,
    priority: isEmergency ? "emergency" : "normal",
    startDate,
    startTime,
    endDate,
    endTime,
    reason,
    address: address.trim(),
    contactNumber: contactNumber.trim(),
    attachmentName: attachmentName || undefined,
    attachmentData: attachmentData || undefined,
    appliedDate: new Date().toISOString().split("T")[0],
    verifyCode: generateVerifyCode(),
    hodStatus: isCadet ? "N/A" : "Pending",
    troopStatus: "Pending",
    sqnStatus: isCadet ? "Pending" : "N/A",
    sddStatus: isCadet && !isAcademic ? "Pending" : "N/A",
  });

  let linkedLeave = null;
  if (isAcademic) {
    linkedLeave = await createLinkedPersonalLeave(leave, student, hodIdForLeave);
  }

  await writeAudit(
    "STUDENT",
    student.username,
    "leave_submitted",
    `type=${type}, id=${leave._id}${isEmergency ? " [EMERGENCY]" : ""}${linkedLeave ? `, linked_personal=${linkedLeave._id}` : ""}`
  );
  res.status(201).json(leave);
};

export const myLeaves = async (req, res) => {
  // Newest application first (descending by submission date/time) — the
  // most recently applied leave always appears at the top of the dashboard.
  const leaves = await Leave.find({ studentId: req.user.id }).sort({ createdAt: -1 });
  res.json(leaves);
};

// Powers the "digital signature" section of the leave-pass PDF — the
// student's own client re-downloads the pass after gate staff have
// verified Exit / Re-Entry so the PDF can show who verified it and when,
// pulled live from the Movement log rather than trusted from the PDF.
export const leaveMovements = async (req, res) => {
  const leave = await Leave.findById(req.params.leaveId);
  if (!leave || String(leave.studentId) !== req.user.id) {
    return res.status(404).json({ message: "Leave not found" });
  }
  const movements = await Movement.find({ leaveId: leave._id }).sort({ createdAt: 1 });
  const exit = movements.find((m) => m.direction === "Exit");
  const entry = movements.find((m) => m.direction === "Entry");
  res.json({
    exit: exit ? { by: exit.loggedBy, at: exit.createdAt } : null,
    entry: entry ? { by: entry.loggedBy, at: entry.createdAt } : null,
  });
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
