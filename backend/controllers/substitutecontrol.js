import HodUnavailability from "../models/HodUnavailability.js";
import LecturerUnavailability from "../models/LecturerUnavailability.js";
import Hod from "../models/HOD.js";
import Lecturer from "../models/Lecturer.js";
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
  const today = new Date().toISOString().split("T")[0];
  if (today > row.toDate) {
    return res.status(400).json({ message: "This cover has already ended." });
  }
  const hodName = row.hodId?.name || "HOD";
  if (row.fromDate >= today) {
    await row.deleteOne();
    await writeAudit("ADMIN", req.user.name, "hod_unavailability_ended_early", `${hodName} — cover cancelled before taking effect`);
    return res.json({ ok: true, removed: true });
  }
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
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
