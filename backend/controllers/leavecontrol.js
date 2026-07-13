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

// Excludes the auto-created Personal Leave companion from approver-facing
// lists (a standalone Personal Leave, with no linkedLeaveId, still shows
// normally) — since decide() below cascades a decision to both records
// together, approvers only ever need to see and act on the Academic Leave;
// showing the companion too would look like a second, redundant approval
// step for what is really one procedure.
const HIDE_AUTO_PERSONAL = { $or: [{ type: { $ne: "Personal Leave" } }, { linkedLeaveId: null }] };

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

  // Academic Leave and its auto-created Personal Leave are one approval
  // procedure, not two: they share the exact same routing (same approvers,
  // same order), so a decision on either one applies automatically to the
  // other too — the approver never has to act on both separately.
  if (leave.linkedLeaveId) {
    const linked = await Leave.findById(leave.linkedLeaveId);
    if (linked && linked[statusField] === "Pending") {
      linked[statusField] = decision;
      linked[commentField] = comment || "";
      linked[atField] = leave[atField];
      await linked.save();
    }
  }

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
        ...HIDE_AUTO_PERSONAL,
        ...(pendingExtraFilter || {}),
        [statusField]: "Pending",
      });
      res.json(sortByPriorityThenNewest(leaves));
    },
    history: async (req, res) => {
      // History views never show the attachment (no LeaveDetailModal here,
      // only Pending does) — excluded since History grows forever, unlike
      // Pending which naturally stays small (items leave it once decided).
      const scope = await scopeFilter(req);
      const leaves = await Leave.find({ ...scope, ...HIDE_AUTO_PERSONAL, [statusField]: { $ne: "Pending" } })
        .select("-attachmentData")
        .sort({ createdAt: -1 });
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

// ── Squadron Commander — Cadet leaves. Normally only after Troop has
// approved; Academic Leave skips Troop entirely and goes through HOD
// instead (troopStatus stays "N/A", hodStatus carries the first-stage
// decision for that routing) — either way, whichever field is actually
// "in play" for this leave must be Approved before Squadron sees it.
export const squadran = buildRoleHandlers({
  role: "SQUADRAN",
  statusField: "sqnStatus",
  commentField: "sqnComment",
  atField: "sqnApprovedAt",
  scopeFilter: async (req) => ({ sqnId: req.user.id }),
  pendingExtraFilter: {
    troopStatus: { $in: ["Approved", "N/A"] },
    hodStatus: { $in: ["Approved", "N/A"] },
  },
});

// ── Senior Deputy Dean — every Cadet, no per-SDD ownership. Scoped to
// CADET explicitly: sddStatus sits at "N/A" (not "Pending") for every Day
// Scholar leave, which would otherwise leak into the $ne-"Pending" history
// query below. ────────────────────────────────────────────────────────
export const sdd = buildRoleHandlers({
  role: "SDD",
  statusField: "sddStatus",
  commentField: "sddComment",
  atField: "sddApprovedAt",
  scopeFilter: async () => ({ studentType: "CADET" }),
  pendingExtraFilter: { troopStatus: "Approved", sqnStatus: "Approved" },
});

export const sddOverview = async (req, res) => {
  // System-wide (every cadet leave) and never shows the attachment — no
  // LeaveDetailModal on this view.
  const leaves = await Leave.find({ studentType: "CADET", ...HIDE_AUTO_PERSONAL })
    .select("-attachmentData")
    .sort({ createdAt: -1 });
  res.json(leaves);
};

export const sddPipeline = async (req, res) => {
  // sddStatus stays "N/A" for Cadet Academic Leave (HOD -> Squadron only,
  // no SDD step) — excluded here so the "In Progress" count doesn't include
  // leaves that will never actually reach SDD.
  const leaves = await Leave.find({
    studentType: "CADET",
    sddStatus: { $ne: "N/A" },
    $or: [{ troopStatus: "Pending" }, { sqnStatus: "Pending" }],
  }).select("-attachmentData");
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
  // No LeaveDetailModal on the History view — safe to drop the attachment.
  const scope = await troopScopeFilter(req);
  const leaves = await Leave.find({ ...scope, troopStatus: { $in: ["Approved", "Rejected"] } })
    .select("-attachmentData")
    .sort({ createdAt: -1 });
  res.json(leaves);
};

// "All Records" archive — every leave from every student, cadet or day
// scholar, any type, regardless of who approves it or whether Troop is
// even part of that chain. Read-only reference view: all leave paperwork
// is ultimately kept on file in the Troop Commander's office. Excludes
// attachmentData since this is an unbounded, system-wide query — Troop
// already has full document access via their own Pending/History tabs for
// leaves they're actually part of approving.
export const troopAllRecords = async (req, res) => {
  const leaves = await Leave.find().select("-attachmentData").sort({ createdAt: -1 });
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
