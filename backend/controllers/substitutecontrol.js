import HodUnavailability from "../models/HodUnavailability.js";
import LecturerUnavailability from "../models/LecturerUnavailability.js";
import Hod from "../models/HOD.js";
import Lecturer from "../models/Lecturer.js";
import Leave from "../models/Leave.js";
import ActingHodAssignment from "../models/ActingHodAssignment.js";
import { localDateStr } from "./leavecontrol.js";
import { writeAudit } from "../utils/audit.js";

// Admin-only management of the two inputs that feed the HOD seniority-chain
// cover: which HODs are unavailable on which days, and which Lecturers are
// unavailable on which days. See leavecontrol.js resolveActiveCoverer for
// how these combine with the fixed Lecturer seniority order to decide who
// actually gets HOD-level access on a given day.

export const listHodUnavailability = async (req, res) => {
  const rows = await HodUnavailability.find().populate("hodId", "name department").sort({ fromDate: -1 });
  res.json(rows);
};

export const createHodUnavailability = async (req, res) => {
  const { hodId, fromDate, toDate, reason } = req.body;
  if (!hodId || !fromDate || !toDate) {
    return res.status(400).json({ message: "HOD and both dates are required" });
  }
  if (toDate < fromDate) {
    return res.status(400).json({ message: "End date can't be before start date" });
  }
  const hod = await Hod.findById(hodId);
  if (!hod) return res.status(404).json({ message: "HOD not found" });

  const row = await HodUnavailability.create({ hodId, fromDate, toDate, reason });
  await writeAudit("ADMIN", req.user.name, "hod_unavailability_added", `${hod.name} from ${fromDate} to ${toDate}`);
  res.status(201).json(row);
};

export const deleteHodUnavailability = async (req, res) => {
  const row = await HodUnavailability.findByIdAndDelete(req.params.id);
  if (!row) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
};

// The manual "switch it back" admin needs once an HOD is available again,
// rather than waiting for toDate to pass on its own — hodScopeFilter (see
// leavecontrol.js) checks today's date against [fromDate, toDate] live on
// every request, so shortening toDate to before today hands the queue back
// to the real HOD immediately, no separate "who covers" flag to flip.
// Truncates rather than deletes so the audit trail still shows the cover
// really was in effect from fromDate up to the day it was switched off —
// unless it never actually started yet, in which case there's no history
// worth keeping a stub record for.
export const endHodUnavailabilityNow = async (req, res) => {
  const row = await HodUnavailability.findById(req.params.id).populate("hodId", "name department");
  if (!row) return res.status(404).json({ message: "Not found" });
  const today = localDateStr();
  if (today > row.toDate) {
    return res.status(400).json({ message: "This cover has already ended." });
  }
  const hodName = row.hodId?.name || "HOD";
  if (row.fromDate >= today) {
    await row.deleteOne();
    await writeAudit("ADMIN", req.user.name, "hod_unavailability_ended_early", `${hodName} — cover cancelled before taking effect`);
    return res.json({ ok: true, removed: true });
  }
  const yesterday = shiftDate(today, -1);
  row.toDate = yesterday;
  await row.save();
  await writeAudit("ADMIN", req.user.name, "hod_unavailability_ended_early", `${hodName} — cover switched back as of ${today}`);
  res.json(row);
};

// lecturerId now identifies a department's shared covering account, not an
// individual — enriched here with that account's department and the
// specific named roster member (memberId) this row is actually about,
// since the raw document alone can't show either.
export const listLecturerUnavailability = async (req, res) => {
  const rows = await LecturerUnavailability.find().populate("lecturerId", "department members").sort({ fromDate: -1 });
  const enriched = rows.map((r) => {
    const lecturer = r.lecturerId;
    const member = lecturer?.members?.id?.(r.memberId);
    return {
      id: r._id,
      lecturerId: lecturer?._id,
      department: lecturer?.department,
      memberId: r.memberId,
      memberName: member?.name,
      memberTier: member?.tier,
      memberRank: member?.rank,
      fromDate: r.fromDate,
      toDate: r.toDate,
      reason: r.reason,
    };
  });
  res.json(enriched);
};

export const createLecturerUnavailability = async (req, res) => {
  const { lecturerId, memberId, fromDate, toDate, reason } = req.body;
  if (!lecturerId || !memberId || !fromDate || !toDate) {
    return res.status(400).json({ message: "Department account, lecturer, and both dates are required" });
  }
  if (toDate < fromDate) {
    return res.status(400).json({ message: "End date can't be before start date" });
  }
  const lecturer = await Lecturer.findById(lecturerId);
  if (!lecturer) return res.status(404).json({ message: "Lecturer account not found" });
  const member = lecturer.members.id(memberId);
  if (!member) return res.status(404).json({ message: "Roster member not found" });

  const row = await LecturerUnavailability.create({ lecturerId, memberId, fromDate, toDate, reason });
  await writeAudit(
    "ADMIN",
    req.user.name,
    "lecturer_unavailability_added",
    `${member.name} (${lecturer.department}) from ${fromDate} to ${toDate}`
  );
  res.status(201).json(row);
};

export const deleteLecturerUnavailability = async (req, res) => {
  const row = await LecturerUnavailability.findByIdAndDelete(req.params.id);
  if (!row) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
};

// ── Per-date HOD availability ─────────────────────────────────────────
// Marks an HOD available again on one specific date. Any unavailability
// window covering that date is split around it (or removed if it was that
// single day), so the rest of the window and every past decision stay as
// they were.
function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

export const markHodAvailable = async (req, res) => {
  const { hodId, date } = req.body;
  if (!hodId || !date) return res.status(400).json({ message: "HOD and date are required" });
  const hod = await Hod.findById(hodId);
  if (!hod) return res.status(404).json({ message: "HOD not found" });

  const rows = await HodUnavailability.find({ hodId, fromDate: { $lte: date }, toDate: { $gte: date } });
  if (!rows.length) return res.status(400).json({ message: `${hod.name} is already available on ${date}` });

  for (const row of rows) {
    const { fromDate, toDate, reason } = row;
    if (fromDate < date && toDate > date) {
      row.toDate = shiftDate(date, -1);
      await row.save();
      await HodUnavailability.create({ hodId, fromDate: shiftDate(date, 1), toDate, reason });
    } else if (fromDate < date) {
      row.toDate = shiftDate(date, -1);
      await row.save();
    } else if (toDate > date) {
      row.fromDate = shiftDate(date, 1);
      await row.save();
    } else {
      await row.deleteOne();
    }
  }
  await writeAudit("ADMIN", req.user.name, "hod_marked_available", `${hod.name} on ${date}`);
  res.json({ ok: true });
};

// ── Acting HOD assignments ────────────────────────────────────────────
export const listActingHodAssignments = async (req, res) => {
  const rows = await ActingHodAssignment.find().sort({ date: -1 });
  res.json(rows);
};

// Assigns (or reassigns) one roster lecturer as Acting HOD for one
// department on one date — or every date in [date, toDate] when toDate is
// given.
export const assignActingHod = async (req, res) => {
  const { lecturerId, memberId, date, toDate } = req.body;
  if (!lecturerId || !memberId || !date) {
    return res.status(400).json({ message: "Department, lecturer and date are required" });
  }
  const lastDate = toDate || date;
  if (lastDate < date) return res.status(400).json({ message: "End date can't be before start date" });

  const lecturer = await Lecturer.findById(lecturerId);
  if (!lecturer) return res.status(404).json({ message: "Department Acting HOD account not found" });
  const member = lecturer.members.id(memberId);
  if (!member) return res.status(404).json({ message: "Lecturer not found in this department's roster" });

  const dates = [];
  for (let d = date; d <= lastDate && dates.length <= 366; d = shiftDate(d, 1)) dates.push(d);

  for (const d of dates) {
    await ActingHodAssignment.findOneAndUpdate(
      { department: lecturer.department, date: d },
      {
        lecturerId: lecturer._id,
        department: lecturer.department,
        memberId: member._id,
        memberName: member.name,
        memberTier: member.tier,
        date: d,
        assignedBy: req.user.name,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }
  await writeAudit(
    "ADMIN",
    req.user.name,
    "acting_hod_assigned",
    `${member.name} (${lecturer.department}) on ${date}${lastDate !== date ? ` to ${lastDate}` : ""}`
  );
  res.status(201).json({ ok: true, count: dates.length });
};

export const deleteActingHodAssignment = async (req, res) => {
  const row = await ActingHodAssignment.findByIdAndDelete(req.params.id);
  if (!row) return res.status(404).json({ message: "Not found" });
  await writeAudit("ADMIN", req.user.name, "acting_hod_unassigned", `${row.memberName} (${row.department}) on ${row.date}`);
  res.json({ message: "Deleted" });
};

// Admin alert: every date from today through the next 30 days where a
// department's HOD is marked unavailable but no Acting HOD is assigned, with
// how many leaves are waiting on that HOD right now.
export const listActingHodGaps = async (req, res) => {
  const today = localDateStr();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  const endStr = localDateStr(end);

  const rows = await HodUnavailability.find({ toDate: { $gte: today }, fromDate: { $lte: endStr } }).populate(
    "hodId",
    "name department"
  );
  const gaps = [];
  for (const row of rows) {
    const hod = row.hodId;
    if (!hod?.department) continue;
    const from = row.fromDate > today ? row.fromDate : today;
    const to = row.toDate < endStr ? row.toDate : endStr;
    const assigned = await ActingHodAssignment.find({ department: hod.department, date: { $gte: from, $lte: to } }).select(
      "date"
    );
    const assignedDates = new Set(assigned.map((a) => a.date));
    const missing = [];
    for (let d = from; d <= to; d = shiftDate(d, 1)) if (!assignedDates.has(d)) missing.push(d);
    if (!missing.length) continue;
    const pendingCount = await Leave.countDocuments({ hodId: hod._id, hodStatus: "Pending" });
    gaps.push({ hodId: String(hod._id), hodName: hod.name, department: hod.department, dates: missing, pendingCount });
  }
  res.json(gaps);
};
