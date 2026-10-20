import Leave from "../models/Leave.js";
import Troop from "../models/Troop.js";
import Student from "../models/Student.js";
import Hod from "../models/HOD.js";
import Lecturer from "../models/Lecturer.js";
import ActingHodAssignment from "../models/ActingHodAssignment.js";
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
  { statusField, commentField, atField, role, decision, comment, actorName, approver }
) {
  leave[statusField] = decision;
  leave[commentField] = comment || "";
  leave[atField] = new Date().toLocaleString();
  if (approver && statusField === "hodStatus") leave.hodApprover = approver;
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
      if (approver && statusField === "hodStatus") linked.hodApprover = approver;
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
          // Name the Acting HOD in the email when they made the HOD-stage call.
          const emailRole =
            statusField === "hodStatus" && leave.hodApprover?.role === "ACTING_HOD" ? "ACTING_HOD" : role;
          await sendRejectionEmail(student.email, student.name, leave, emailRole, leave[commentField]);
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

  const { actorName, approver, error } = await resolveActor(req);
  if (error) return res.status(400).json({ message: error });
  await applyDecision(leave, {
    statusField,
    commentField,
    atField,
    role,
    decision,
    comment,
    actorName,
    approver,
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
// Acting HOD routing: when Admin assigns one or more lecturers as Acting HOD
// for a department on a date (ActingHodAssignment), that assignment is the
// record that the department's HOD is not available that day, and the
// department's HOD-stage queue opens to its shared Acting HOD login
// (models/Lecturer.js). Each decision made through that login records which
// of the assigned lecturers made it (sent as actingMemberId).

// Server-local calendar date, so "today" flips at local midnight rather
// than UTC midnight.
export function localDateStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Lecturers on an assignment — reads the first version's single-lecturer
// fields as a one-member list.
export function assignedMembers(assignment) {
  if (!assignment) return [];
  if (assignment.members?.length) {
    return assignment.members.map((m) => ({ memberId: String(m.memberId), name: m.name, tier: m.tier }));
  }
  if (assignment.memberId) {
    return [{ memberId: String(assignment.memberId), name: assignment.memberName, tier: assignment.memberTier }];
  }
  return [];
}

// Today's Acting HOD assignment for a department's shared login, or null
// when Admin hasn't assigned anyone (i.e. the HOD is handling it).
async function resolveActingHod(lecturerAccount, dateStr = localDateStr()) {
  if (!lecturerAccount) return { hod: null, assignment: null };
  const hod = await Hod.findOne({ department: lecturerAccount.department });
  const assignment = hod
    ? await ActingHodAssignment.findOne({ department: lecturerAccount.department, date: dateStr })
    : null;
  return { hod, assignment: assignedMembers(assignment).length ? assignment : null };
}

export async function hodScopeFilter(req) {
  if (req.user.role === "LECTURER") {
    const lecturerAccount = await Lecturer.findById(req.user.id);
    const { hod, assignment } = await resolveActingHod(lecturerAccount);
    if (!hod || !assignment) return { hodId: { $in: [] } };
    // Department restriction (their own HOD queue only) and Day Scholars
    // only: Cadet leaves are never handled by an Acting HOD — they wait for
    // the regular HOD.
    return { hodId: hod._id, studentType: "DAY_SCHOLAR" };
  }
  return { hodId: req.user.id };
}

// Name for the audit log/emails, plus the approver snapshot stored on the
// leave (Leave.hodApprover) for the PDF. For the shared Acting HOD login,
// the deciding lecturer must be one of today's assigned lecturers.
async function resolveActor(req) {
  const decidedAt = new Date().toLocaleString();
  if (req.user.role === "HOD") {
    const hod = await Hod.findById(req.user.id);
    return {
      actorName: req.user.name,
      approver: { name: req.user.name, role: "HOD", department: hod?.department, decidedAt },
    };
  }
  if (req.user.role === "LECTURER") {
    const lecturerAccount = await Lecturer.findById(req.user.id);
    const { assignment } = await resolveActingHod(lecturerAccount);
    const member = assignedMembers(assignment).find((m) => m.memberId === String(req.body.actingMemberId || ""));
    if (!member) return { error: "Select which assigned lecturer you are before approving or rejecting." };
    const tierLabel = member.tier === "SENIOR" ? "Senior Lecturer" : "Junior Lecturer";
    return {
      actorName: `${member.name} (Acting HOD, ${tierLabel}, ${lecturerAccount.department})`,
      approver: {
        name: member.name,
        role: "ACTING_HOD",
        department: lecturerAccount.department,
        decidedAt,
        memberId: member.memberId,
      },
    };
  }
  return { actorName: req.user.name, approver: null };
}

// Powers the Acting HOD dashboard: whether the HOD is out today (an Acting
// HOD assignment exists), which lecturers are assigned today, and the
// department's assignments for the next 30 days.
export const coverStatus = async (req, res) => {
  const lecturerAccount = await Lecturer.findById(req.user.id);
  if (!lecturerAccount) return res.status(404).json({ message: "Account not found" });

  const today = localDateStr();
  const { hod, assignment } = await resolveActingHod(lecturerAccount, today);
  const end = new Date();
  end.setDate(end.getDate() + 30);
  const upcoming = await ActingHodAssignment.find({
    department: lecturerAccount.department,
    date: { $gte: today, $lte: localDateStr(end) },
  }).sort({ date: 1 });

  res.json({
    department: lecturerAccount.department,
    hodName: hod?.name,
    hodUnavailable: !!assignment,
    activeMembers: assignedMembers(assignment).map((m) => ({ id: m.memberId, name: m.name, tier: m.tier, rank: 0 })),
    // Whole department roster, for picking "I am" on the History tab even
    // on days this lecturer isn't assigned.
    roster: [...lecturerAccount.members]
      .sort((a, b) => (a.tier === b.tier ? a.rank - b.rank : a.tier === "SENIOR" ? -1 : 1))
      .map((m) => ({ id: String(m._id), name: m.name, tier: m.tier, rank: m.rank })),
    assignments: upcoming
      .map((a) => ({ id: String(a._id), date: a.date, members: assignedMembers(a).map((m) => ({ name: m.name, tier: m.tier })) }))
      .filter((a) => a.members.length),
  });
};

// History for the shared Acting HOD login: only the leaves the selected
// roster lecturer (?memberId=) personally approved or rejected — never
// another lecturer's decisions, even though they share the login.
export const actingHodHistory = async (req, res) => {
  const lecturerAccount = await Lecturer.findById(req.user.id);
  const memberId = String(req.query.memberId || "");
  const member = /^[a-f0-9]{24}$/i.test(memberId) ? lecturerAccount?.members.id(memberId) : null;
  if (!member) return res.json([]);
  const leaves = await Leave.find({
    $and: [HIDE_AUTO_PERSONAL],
    studentType: "DAY_SCHOLAR",
    hodStatus: { $in: ["Approved", "Rejected"] },
    "hodApprover.role": "ACTING_HOD",
    // Older Acting HOD decisions saved only the name, not the lecturer id.
    $or: [{ "hodApprover.memberId": member._id }, { "hodApprover.memberId": { $exists: false }, "hodApprover.name": member.name }],
    "hodApprover.department": lecturerAccount.department,
  })
    .select("-attachmentData")
    .sort({ createdAt: -1 });
  res.json(leaves);
};

export const hod = buildRoleHandlers({
  role: "HOD",
  statusField: "hodStatus",
  commentField: "hodComment",
  atField: "hodApprovedAt",
  scopeFilter: hodScopeFilter,
});

// Lets the HOD correct a student's own date/time entry mistake (e.g. they
// meant 08:00 not 18:00) before approving, instead of having to reject and
// send them back to reapply. Only touches a leave still Pending at the HOD
// stage — once decided, the record should reflect what was actually
// approved/rejected, not be editable after the fact. Cascades to the
// linked Academic+Personal Leave companion (see studentcontrol.js
// createLinkedPersonalLeave) since they're meant to share the same dates.
export const hodCorrectDateTime = async (req, res) => {
  const { startDate, startTime, endDate, endTime } = req.body;
  if (!startDate || !startTime || !endDate || !endTime) {
    return res.status(400).json({ message: "Start/end date and time are all required" });
  }
  if (!/^\d{2}:(00|30)$/.test(startTime) || !/^\d{2}:(00|30)$/.test(endTime)) {
    return res.status(400).json({
      message: "Start and end time must be on the hour or half hour (e.g. 09:00 or 09:30).",
    });
  }
  if (new Date(`${endDate}T${endTime}`) <= new Date(`${startDate}T${startTime}`)) {
    return res.status(400).json({ message: "End date/time must be after start date/time — they can't be the same" });
  }

  const leave = await Leave.findOne({ _id: req.params.id, hodId: req.user.id });
  if (!leave) return res.status(404).json({ message: "Leave not found" });
  if (leave.hodStatus !== "Pending") {
    return res.status(403).json({ message: "This leave is not pending your decision" });
  }
  // One correction only, ever — a second edit on top of a first would let a
  // mistake in the correction itself go uncaught, with no record of what it
  // actually looked like in between. If this one wasn't right, reject the
  // application instead and have the student reapply correctly.
  if (leave.dateTimeCorrectedByHod) {
    return res.status(403).json({
      message: "This leave's date/time has already been corrected once — it can't be edited again. Reject it instead if it's still wrong.",
    });
  }
  // This tool exists to fix a time-of-day typo (e.g. the student meant
  // 08:00, not 18:00) — not to reschedule the leave. The dates themselves
  // are locked to whatever the student actually applied for, so the HOD can
  // never move a leave to a different day, only correct the time on the
  // day(s) already applied for.
  if (startDate !== leave.startDate || endDate !== leave.endDate) {
    return res.status(400).json({
      message: "The date can't be changed here — only the time. Reject the application if the date itself is wrong.",
    });
  }
  // Same campus curfew the student's own application was held to at submit
  // time (see studentcontrol.js applyLeave) — a correction can't be used to
  // sneak a leave outside it. Emergency Leave stays exempt, same as there.
  if (leave.type !== "Emergency Leave") {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    if (startHour * 60 + startMinute < 6 * 60) {
      return res.status(400).json({ message: "Corrected start time must be 06:00 or later — campus exit is only allowed from 06:00 onward." });
    }
    if (endHour * 60 + endMinute > 18 * 60) {
      return res.status(400).json({ message: "Corrected end time must be 18:00 or earlier — campus entry must be logged by 18:00." });
    }
  }

  leave.originalStartDate = leave.startDate;
  leave.originalStartTime = leave.startTime;
  leave.originalEndDate = leave.endDate;
  leave.originalEndTime = leave.endTime;
  leave.dateTimeCorrectedByHod = true;
  leave.startDate = startDate;
  leave.startTime = startTime;
  leave.endDate = endDate;
  leave.endTime = endTime;
  await leave.save();

  if (leave.linkedLeaveId) {
    const linked = await Leave.findById(leave.linkedLeaveId);
    if (linked) {
      if (!linked.dateTimeCorrectedByHod) {
        linked.originalStartDate = linked.startDate;
        linked.originalStartTime = linked.startTime;
        linked.originalEndDate = linked.endDate;
        linked.originalEndTime = linked.endTime;
      }
      linked.dateTimeCorrectedByHod = true;
      linked.startDate = startDate;
      linked.startTime = startTime;
      linked.endDate = endDate;
      linked.endTime = endTime;
      await linked.save();
    }
  }

  await writeAudit("HOD", req.user.name, "leave_datetime_corrected", `leave id=${leave._id}`);
  res.json(leave);
};

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
