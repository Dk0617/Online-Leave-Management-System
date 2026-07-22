import Leave from "../models/Leave.js";
import Troop from "../models/Troop.js";
import Student from "../models/Student.js";
import Substitute from "../models/Substitute.js";
import { writeAudit } from "../utils/audit.js";
import { isApproved } from "../utils/leaveStatus.js";
import { sendApprovalEmail, sendRejectionEmail } from "../utils/mailer.js";

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

// Troop-specific variant: for Cadets, the linked Personal Leave companion's
// troopStatus never cascades from the Academic Leave (whose troopStatus
// stays permanently "N/A" under the HOD -> Squadron routing) — Troop is
// never part of the Academic Leave's own routing at all, so this stage can
// only ever be decided directly on the companion. For Day Scholars the
// companion's troopStatus is identical to (and cascades from) the Academic
// Leave's, so it stays hidden there, same as every other role.
const HIDE_AUTO_PERSONAL_EXCEPT_CADET = {
  $or: [{ type: { $ne: "Personal Leave" } }, { linkedLeaveId: null }, { studentType: "CADET" }],
};

// A decision on a leave with a linkedLeaveId cascades to the linked leave
// wherever they share a status field (see decide() below), but the two
// records still have their own independent Reason and Supporting Document
// — HOD approving an Academic Leave, for instance, never actually sees the
// linked Personal Leave's own document even though their decision cascades
// to approve it too. Attaches a lightweight `linkedLeave` summary (just
// reason/attachment, not the full record) to each leave that has one, so
// the approver can review both sides of the pair from a single leave's
// detail view. Only used for Pending — History has no detail view to show
// it in, and attachmentData is heavy enough to be worth not fetching twice.
async function attachLinkedInfo(leaves) {
  const linkedIds = leaves.map((l) => l.linkedLeaveId).filter(Boolean);
  if (!linkedIds.length) return leaves;
  const linkedDocs = await Leave.find({ _id: { $in: linkedIds } })
    .select("reason attachmentName attachmentData type")
    .lean();
  const byId = new Map(linkedDocs.map((d) => [String(d._id), d]));
  for (const leave of leaves) {
    if (leave.linkedLeaveId) {
      const linked = byId.get(String(leave.linkedLeaveId));
      if (linked) {
        leave.linkedLeave = {
          type: linked.type,
          reason: linked.reason,
          attachmentName: linked.attachmentName,
          attachmentData: linked.attachmentData,
        };
      }
    }
  }
  return leaves;
}

// Applies a single-stage decision to a leave: saves the status/comment/
// timestamp, cascades to a linked Academic+Personal Leave pair, writes the
// audit entry, and fires the student-facing email. Shared by decide()
// (one leave at a time, from the approver clicking Approve/Reject) and
// eventcontrol.js's rejectOverlapping (many leaves at once, from an HOD
// bulk-rejecting everyone booked against a mandatory event day) so both
// paths stay in sync.
export async function applyDecision(
  leave,
  { statusField, commentField, atField, role, decision, comment, actorName }
) {
  leave[statusField] = decision;
  leave[commentField] = comment || "";
  leave[atField] = new Date().toLocaleString();
  await leave.save();

  // Academic Leave and its auto-created Personal Leave cascade a decision
  // between them wherever they share the same status field. For Day
  // Scholars that's both stages (HOD -> Troop Commander for each), so a
  // decision on either leave applies to both automatically. For Cadets the
  // two routes only share the Squadron Commander stage (Academic Leave:
  // HOD -> Squadron; Personal Leave: Troop -> Squadron -> SDD) — HOD and
  // Troop Commander each only ever decide on one side of the pair, and
  // never cascade across, so they see and decide on the linked Personal
  // Leave directly for Cadets (see troopPendingCadet/troopPending/
  // troopHistory's cadetVisibleFilter, and the sdd handler's
  // hideAutoPersonal: false).
  if (leave.linkedLeaveId) {
    const linked = await Leave.findById(leave.linkedLeaveId);
    if (linked && linked[statusField] === "Pending") {
      linked[statusField] = decision;
      linked[commentField] = comment || "";
      linked[atField] = leave[atField];
      await linked.save();
    }
  }

  // Not awaited: writeAudit already swallows its own errors and the caller
  // has nothing left to wait on once the decision itself is saved — same
  // reasoning as the fire-and-forget email send below.
  writeAudit(role, actorName, `leave_${decision.toLowerCase()}`, `leave id=${leave._id}`);

  // Fire-and-forget: not awaited, so the caller's response isn't held up on
  // an SMTP round-trip (which can take several seconds). A failed send is
  // only logged, never surfaced — the approver already got their success
  // response by the time this could fail.
  if (decision === "Approved" && isApproved(leave)) {
    (async () => {
      try {
        const student = await Student.findById(leave.studentId);
        if (student?.email) {
          await sendApprovalEmail(student.email, student.name, leave);
        }
      } catch (err) {
        console.error("Failed to send approval email:", err.message);
      }
    })();
  }

  if (decision === "Rejected") {
    (async () => {
      try {
        const student = await Student.findById(leave.studentId);
        if (student?.email) {
          await sendRejectionEmail(student.email, student.name, leave, role, leave[commentField]);
        }
      } catch (err) {
        console.error("Failed to send rejection email:", err.message);
      }
    })();
  }

  return leave;
}

async function decide(req, res, { statusField, commentField, atField, role, decision, scopeFilter }) {
  const { comment } = req.body;
  if (decision === "Rejected" && !comment?.trim()) {
    return res.status(400).json({ message: "A reason is required to reject a leave" });
  }
  const scope = await scopeFilter(req);
  const leave = await Leave.findOne({ _id: req.params.id, ...scope });
  if (!leave) return res.status(404).json({ message: "Leave not found" });
  if (leave[statusField] !== "Pending") {
    return res.status(403).json({ message: "This leave is not pending your decision" });
  }

  await applyDecision(leave, {
    statusField,
    commentField,
    atField,
    role,
    decision,
    comment,
    actorName: req.user.name,
  });

  res.json(leave);
}

// Shared shape for HOD / Squadron / SDD — each owns exactly one status
// field and (except SDD) scopes by an ownership id on the student/leave.
//
// hideAutoPersonal defaults to true: for HOD/Squadron, the Academic Leave
// and its linked Personal Leave companion share the exact same routing at
// that stage, so the companion is hidden and the cascade in decide() keeps
// it in sync — the approver only ever needs to act on the Academic Leave.
// SDD passes hideAutoPersonal: false, because for Cadets the companion
// diverges at the SDD stage: Academic Leave stops at Squadron (sddStatus
// stays "N/A", never reaches SDD), but the linked Personal Leave continues
// on to SDD for its own final decision — hiding it here would leave it
// stuck at "Pending" forever with nobody able to act on it.
function buildRoleHandlers({
  role,
  statusField,
  commentField,
  atField,
  scopeFilter,
  pendingExtraFilter,
  hideAutoPersonal = true,
}) {
  const autoPersonalFilter = hideAutoPersonal ? HIDE_AUTO_PERSONAL : {};
  return {
    pending: async (req, res) => {
      const scope = await scopeFilter(req);
      const leaves = await Leave.find({
        ...scope,
        ...autoPersonalFilter,
        ...(pendingExtraFilter || {}),
        [statusField]: "Pending",
      }).lean();
      res.json(sortByPriorityThenNewest(await attachLinkedInfo(leaves)));
    },
    history: async (req, res) => {
      // History views never show the attachment (no LeaveDetailModal here,
      // only Pending does) — excluded since History grows forever, unlike
      // Pending which naturally stays small (items leave it once decided).
      const scope = await scopeFilter(req);
      const leaves = await Leave.find({ ...scope, ...autoPersonalFilter, [statusField]: { $ne: "Pending" } })
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
// Widens the plain "hodId: req.user.id" scope to also include any HOD
// whose queue this HOD is currently covering, admin-assigned via
// substitutecontrol.js (e.g. the covered HOD is on leave themselves). A
// substitution only applies while today's date falls within its
// [fromDate, toDate] window.
async function hodScopeFilter(req) {
  const today = new Date().toISOString().split("T")[0];
  const activeSubs = await Substitute.find({
    substituteHodId: req.user.id,
    fromDate: { $lte: today },
    toDate: { $gte: today },
  }).select("hodId");
  const hodIds = [req.user.id, ...activeSubs.map((s) => String(s.hodId))];
  return { hodId: { $in: hodIds } };
}

export const hod = buildRoleHandlers({
  role: "HOD",
  statusField: "hodStatus",
  commentField: "hodComment",
  atField: "hodApprovedAt",
  scopeFilter: hodScopeFilter,
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
  hideAutoPersonal: false,
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

export const troopPending = async (req, res) => {
  const scope = await troopScopeFilter(req);
  const leaves = await Leave.find({
    ...scope,
    troopStatus: "Pending",
    $and: [
      HIDE_AUTO_PERSONAL_EXCEPT_CADET,
      { $or: [{ studentType: "CADET" }, { studentType: "DAY_SCHOLAR", hodStatus: "Approved" }] },
    ],
  });
  res.json(sortByPriorityThenNewest(leaves));
};

export const troopHistory = async (req, res) => {
  // No LeaveDetailModal on the History view — safe to drop the attachment.
  const scope = await troopScopeFilter(req);
  const leaves = await Leave.find({
    ...scope,
    ...HIDE_AUTO_PERSONAL_EXCEPT_CADET,
    troopStatus: { $in: ["Approved", "Rejected"] },
  })
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
