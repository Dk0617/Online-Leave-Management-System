import Leave from "../models/Leave.js";
import EventDay from "../models/EventDay.js";
import Hod from "../models/HOD.js";
import Admin from "../models/Admin.js";
import { applyDecision } from "./leavecontrol.js";
import { writeAudit } from "../utils/audit.js";

// A blocked event day defaults to the full day (00:00-23:59) when it has no
// explicit hours set — keeps any mandatory event created before startTime/
// endTime existed blocking exactly as it always did. See EventDay.js.
export function eventWindow(event) {
  return {
    start: new Date(`${event.date}T${event.startTime || "00:00"}`),
    end: new Date(`${event.date}T${event.endTime || "23:59"}`),
  };
}

// Event days (mandatory-attendance Workshop days, plus the informational
// Poya/Holiday/No Lecture/Other categories still carried on old entries) are
// created by each department's Admin (see adminCreateEvent below) — the HOD
// only views their department's calendar here and can bulk-reject every
// leave currently pending their decision that overlaps a workshop, instead
// of rejecting each one individually.

export const listEvents = async (req, res) => {
  const events = await EventDay.find({ hodId: req.user.id }).sort({ date: 1 });
  res.json(events);
};

function eventTimeError(startTime, endTime) {
  if (!startTime || !endTime) return "Start time and end time are required.";
  if (!/^\d{2}:(00|30)$/.test(startTime) || !/^\d{2}:(00|30)$/.test(endTime)) {
    return "Start and end time must be on the hour or half hour (e.g. 09:00 or 09:30).";
  }
  if (endTime <= startTime) return "End time must be after start time.";
  return null;
}

// An Admin account manages exactly one department (Admin.department) and
// creates/deletes that department's Workshop days here — but EventDay still
// keys off hodId (see EventDay.js, applyLeave, hodScopeFilter), so an
// event's real owner stays that department's Hod document rather than the
// Admin account itself, leaving every downstream query untouched.
async function resolveDeptHod(req, res) {
  const admin = await Admin.findById(req.user.id);
  if (!admin?.department) {
    res.status(400).json({ message: "Your admin account has no department set — contact the system owner." });
    return null;
  }
  const hod = await Hod.findOne({ department: admin.department });
  if (!hod) {
    res.status(400).json({ message: `No HOD account found for department "${admin.department}".` });
    return null;
  }
  return hod;
}

export const adminListEvents = async (req, res) => {
  // Read-only, so a department-less admin account (e.g. a general System
  // Administrator login, not one of the per-department ones) gets an empty
  // calendar here rather than a hard error — useAdminPortal's refresh()
  // fetches this in the same Promise.all as every other admin screen's
  // data, so throwing here would blank the admin's entire dashboard just
  // because they have no Calendar tab to use anyway. Creating/deleting an
  // event still requires a real department (see resolveDeptHod below).
  const admin = await Admin.findById(req.user.id);
  const hod = admin?.department ? await Hod.findOne({ department: admin.department }) : null;
  if (!hod) return res.json([]);
  const events = await EventDay.find({ hodId: hod._id }).sort({ date: 1 });
  res.json(events);
};

// Every event an Admin marks is a mandatory Workshop — the only category
// with any real effect (blocking student leave applications during its
// hours). The informational categories (Poya/Holiday/No Lecture/Other)
// still exist on the model/schema for older entries and the read-only Sri
// Lanka calendar shown on the frontend, but are no longer choosable here.
export const adminCreateEvent = async (req, res) => {
  const { date, title, startTime, endTime } = req.body;
  if (!date || !title?.trim()) {
    return res.status(400).json({ message: "Date and title are required" });
  }
  const timeError = eventTimeError(startTime, endTime);
  if (timeError) return res.status(400).json({ message: timeError });

  const hod = await resolveDeptHod(req, res);
  if (!hod) return;

  const event = await EventDay.create({
    hodId: hod._id,
    date,
    title: title.trim(),
    category: "WORKSHOP",
    startTime,
    endTime,
  });
  await writeAudit("ADMIN", req.user.name, "event_created", `${title.trim()} (${hod.department}) on ${date}`);
  res.status(201).json(event);
};

export const adminDeleteEvent = async (req, res) => {
  const hod = await resolveDeptHod(req, res);
  if (!hod) return;
  const event = await EventDay.findOneAndDelete({ _id: req.params.id, hodId: hod._id });
  if (!event) return res.status(404).json({ message: "Event not found" });
  await writeAudit("ADMIN", req.user.name, "event_deleted", `${event.title} (${hod.department}) on ${event.date}`);
  res.json({ ok: true });
};

// Rejects the leaves the HOD picked after reviewing the full overlapping
// list on the frontend (see hod/views.tsx EventCalendar's review modal) —
// the HOD can exclude specific requests (e.g. an Emergency Leave) from the
// bulk action, and those stay untouched, continuing on to their next
// approval stage exactly as if nothing happened. `leaveIds` is trusted only
// as a starting point: still re-checked here against hodId/hodStatus/date
// so a tampered request can't reject leaves outside this HOD's own
// event-day scope. Each rejected leave's hodComment records the event's
// title as the reason, and the student gets the same rejection email/
// guidance as an individually-rejected leave (see applyDecision).
export const rejectOverlapping = async (req, res) => {
  const event = await EventDay.findOne({ _id: req.params.id, hodId: req.user.id });
  if (!event) return res.status(404).json({ message: "Event not found" });

  const { leaveIds } = req.body;
  if (!Array.isArray(leaveIds) || !leaveIds.length) {
    return res.status(400).json({ message: "Select at least one leave to reject" });
  }

  const dateCandidates = await Leave.find({
    _id: { $in: leaveIds },
    hodId: req.user.id,
    hodStatus: "Pending",
    startDate: { $lte: event.date },
    endDate: { $gte: event.date },
  });
  // Date range narrows candidates via the index; the event's actual hours
  // (or the whole-day default for an event with none set) decide which of
  // those candidates truly overlap it — same rule applyLeave enforces
  // against new applications, so a leave that no longer overlaps a
  // time-limited workshop isn't swept up here either.
  const { start: eventStart, end: eventEnd } = eventWindow(event);
  const leaves = dateCandidates.filter((leave) => {
    const leaveStart = new Date(`${leave.startDate}T${leave.startTime}`);
    const leaveEnd = new Date(`${leave.endDate}T${leave.endTime}`);
    return leaveStart < eventEnd && leaveEnd > eventStart;
  });

  for (const leave of leaves) {
    await applyDecision(leave, {
      statusField: "hodStatus",
      commentField: "hodComment",
      atField: "hodApprovedAt",
      role: "HOD",
      decision: "Rejected",
      comment: `Mandatory event — ${event.title}`,
      actorName: req.user.name,
    });
  }

  res.json({ rejectedCount: leaves.length });
};
