import Leave from "../models/Leave.js";
import Troop from "../models/Troop.js";
import Student from "../models/Student.js";
import { writeAudit } from "../utils/audit.js";
import { isApproved } from "../utils/leaveStatus.js";
import { sendApprovalEmail } from "../utils/mailer.js";

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

  if (decision === "Approved" && isApproved(leave)) {
    try {
      const student = await Student.findById(leave.studentId);
      if (student?.email) {
        await sendApprovalEmail(student.email, student.name, leave);
      }
    } catch (err) {
      console.error("Failed to send approval email:", err.message);
    }
  }

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
