import Leave from "../models/Leave.js";
import Movement from "../models/Movement.js";
import Student from "../models/Student.js";
import { isGateEligible } from "../utils/leaveStatus.js";
import { writeAudit } from "../utils/audit.js";

function isCurrentlyValid(leave) {
  if (!isGateEligible(leave)) return false;
  const now = new Date();
  const start = new Date(`${leave.startDate}T${leave.startTime || "00:00"}`);
  const end = new Date(`${leave.endDate}T${leave.endTime || "23:59"}`);
  return now >= start && now <= end;
}

// Campus curfew: except Emergency Leave, students may only exit from 6:00 AM
// onward and must re-enter by 6:00 PM. Checked against the actual moment of
// the gate scan (not just the leave's own approved times) so it also catches
// a movement being logged well outside those hours.
const CAMPUS_EXIT_EARLIEST_MINUTES = 6 * 60;
const CAMPUS_ENTRY_LATEST_MINUTES = 18 * 60;
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// Every fully-approved, gate-eligible leave — Academic Leave is excluded
// even once approved (it's an academic excuse kept with the HOD, not an
// exit permit; its auto-created companion Personal Leave is the real
// pass). The gate dashboard's "Leave Passes" table and the on-leave-now/
// exit-entry stats are computed client-side from this list plus the
// movement log, mirroring gate_staff.html.
export const approvedLeaves = async (req, res) => {
  // Gate never displays the attachment file — excluding it here avoids
  // pulling every leave's base64 document (up to ~2.7MB each) over the
  // network on every single gate dashboard load.
  const leaves = await Leave.find().select("-attachmentData");
  res.json(leaves.filter(isGateEligible));
};

export const verifyByIndexNumber = async (req, res) => {
  const indexNumber = (req.params.indexNumber || "").toUpperCase();
  const leaves = await Leave.find({ indexNumber }).select("-attachmentData");
  if (!leaves.length) {
    return res.json({ found: false });
  }

  const studentPhoto = (await Student.findOne({ indexNumber }).select("photo"))?.photo;

  const valid = leaves.find(isCurrentlyValid);
  if (valid) return res.json({ found: true, valid: true, leave: valid, studentPhoto });

  const anyApproved = leaves.find(isGateEligible);
  if (anyApproved) {
    return res.json({ found: true, valid: false, reason: "not_active", leave: anyApproved, studentPhoto });
  }
  return res.json({ found: true, valid: false, reason: "not_approved", studentPhoto });
};

// Looked up by the "Gate Verification Code" printed on the student's PDF
// pass. Unlike index-number lookup, this ties a specific PDF document to
// one specific leave — and always returns the photo live from the Student
// record, never anything embedded in the PDF itself, so a copied or
// borrowed PDF can be caught by comparing the on-screen photo to the
// person physically presenting it.
export const verifyByCode = async (req, res) => {
  const code = (req.params.code || "").toUpperCase().trim();
  const leave = await Leave.findOne({ verifyCode: code }).select("-attachmentData");
  if (!leave) return res.json({ found: false });

  const studentPhoto = (await Student.findOne({ indexNumber: leave.indexNumber }).select("photo"))?.photo;

  if (isCurrentlyValid(leave)) {
    return res.json({ found: true, valid: true, leave, studentPhoto });
  }
  if (isGateEligible(leave)) {
    return res.json({ found: true, valid: false, reason: "not_active", leave, studentPhoto });
  }
  return res.json({ found: true, valid: false, reason: "not_approved", leave, studentPhoto });
};

// This is the real security choke point for exit/entry — the Verify tab
// only ever offers "Log Exit/Entry" once its own time-window check has
// passed, but this endpoint is also reachable directly from the separate
// Log Movement form (index number typed in with no prior verification), so
// the check has to live here too, not just in the Verify UI. Exit is
// strictly confined to the approved leave's date/time window (applies to
// both Day Scholar and Cadet passes) — a student can't be let out before
// their leave starts, or after it has already ended. On top of that, the
// campus curfew (6:00 AM exit earliest, 6:00 PM entry latest) is enforced
// against the actual moment of the scan for both Exit and Entry, except for
// Emergency Leave.
export const logMovement = async (req, res) => {
  const { indexNumber, direction, leaveId, notes } = req.body;
  if (!indexNumber || !["Exit", "Entry"].includes(direction)) {
    return res
      .status(400)
      .json({ message: "Index number and a valid direction are required" });
  }

  let leave;
  if (leaveId) {
    leave = await Leave.findById(leaveId).select("-attachmentData");
  } else {
    const candidates = await Leave.find({ indexNumber: indexNumber.toUpperCase() }).select("-attachmentData");
    leave = candidates.find(isCurrentlyValid) || candidates.find(isGateEligible) || null;
  }

  if (!leave || !isGateEligible(leave)) {
    return res.status(403).json({
      message: `${indexNumber} does not have a fully approved, currently gate-eligible leave pass.`,
    });
  }
  if (direction === "Exit" && !isCurrentlyValid(leave)) {
    return res.status(403).json({
      message: `Exit is only allowed within the approved leave period (${leave.startDate} ${leave.startTime} to ${leave.endDate} ${leave.endTime}). It is currently outside that window.`,
    });
  }
  if (leave.type !== "Emergency Leave") {
    const nowMinutes = minutesSinceMidnight(new Date());
    if (direction === "Exit" && nowMinutes < CAMPUS_EXIT_EARLIEST_MINUTES) {
      return res.status(403).json({ message: "Campus exit is only allowed from 6:00 AM onward." });
    }
    if (direction === "Entry" && nowMinutes > CAMPUS_ENTRY_LATEST_MINUTES) {
      return res.status(403).json({ message: "Campus entry must be logged by 6:00 PM." });
    }
  }

  const movement = await Movement.create({
    indexNumber: indexNumber.toUpperCase(),
    studentName: leave.studentName,
    studentType: leave.studentType,
    direction,
    leaveId: leave._id,
    notes,
    loggedBy: req.user.name,
  });

  await writeAudit("GATE", req.user.name, "movement_logged", `${direction} for ${indexNumber}`);
  res.status(201).json(movement);
};

export const listMovements = async (req, res) => {
  // Unbounded before — every gate dashboard load would re-fetch the entire
  // movement history, getting slower forever as it accumulates.
  res.json(await Movement.find().sort({ createdAt: -1 }).limit(500));
};

export const clearMovements = async (req, res) => {
  await Movement.deleteMany({});
  await writeAudit("GATE", req.user.name, "movement_log_cleared", "");
  res.json({ message: "Cleared" });
};
