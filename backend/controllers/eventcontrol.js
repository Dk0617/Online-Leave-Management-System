import Leave from "../models/Leave.js";
import EventDay, { EVENT_CATEGORIES, MANDATORY_EVENT_CATEGORIES } from "../models/EventDay.js";
import { applyDecision } from "./leavecontrol.js";

// A blocked event day defaults to the full day (00:00-23:59) when it has no
// explicit hours set — keeps any mandatory event created before startTime/
// endTime existed blocking exactly as it always did. See EventDay.js.
export function eventWindow(event) {
  return {
    start: new Date(`${event.date}T${event.startTime || "00:00"}`),
    end: new Date(`${event.date}T${event.endTime || "23:59"}`),
  };
}

// HOD-only calendar: workshop days (mandatory attendance — can be used to
// bulk-reject every leave currently pending the HOD's decision that
// overlaps the date, instead of rejecting each one individually) as well
// as Poya days, holidays, and no-lecture days (purely informational —
// nothing to protect, so no bulk-reject action makes sense for those; a
// Poya day is itself a public holiday, so students are normally free to
// leave on it).

export const listEvents = async (req, res) => {
  const events = await EventDay.find({ hodId: req.user.id }).sort({ date: 1 });
  res.json(events);
};

export const createEvent = async (req, res) => {
  const { date, title, category, startTime, endTime } = req.body;
  if (!date || !title?.trim()) {
    return res.status(400).json({ message: "Date and title are required" });
  }
  if (category && !EVENT_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: "Invalid category" });
  }
  const resolvedCategory = category || "OTHER";
  // Only mandatory categories (Workshop) actually block students, so only
  // those require a real time window — informational categories (Poya,
  // Holiday, etc.) stay whole-day/no-time as before.
  const isMandatory = MANDATORY_EVENT_CATEGORIES.includes(resolvedCategory);
  if (isMandatory) {
    if (!startTime || !endTime) {
      return res.status(400).json({ message: "Start time and end time are required for a mandatory event." });
    }
    if (!/^\d{2}:(00|30)$/.test(startTime) || !/^\d{2}:(00|30)$/.test(endTime)) {
      return res.status(400).json({
        message: "Start and end time must be on the hour or half hour (e.g. 09:00 or 09:30).",
      });
    }
    if (endTime <= startTime) {
      return res.status(400).json({ message: "End time must be after start time." });
    }
  }
  const event = await EventDay.create({
    hodId: req.user.id,
    date,
    title: title.trim(),
    category: resolvedCategory,
    startTime: isMandatory ? startTime : undefined,
    endTime: isMandatory ? endTime : undefined,
  });
  res.status(201).json(event);
};

export const deleteEvent = async (req, res) => {
  const event = await EventDay.findOneAndDelete({ _id: req.params.id, hodId: req.user.id });
  if (!event) return res.status(404).json({ message: "Event not found" });
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
