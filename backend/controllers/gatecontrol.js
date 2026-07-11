import Leave from "../model/Leave/Leave.js";
import Movement from "../model/Movement/Movement.js";
import { isApproved } from "../utils/leaveStatus.js";
import { writeAudit } from "../utils/audit.js";

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
