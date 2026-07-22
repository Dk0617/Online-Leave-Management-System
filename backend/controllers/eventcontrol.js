import Leave from "../models/Leave.js";
import EventDay from "../models/EventDay.js";
import { applyDecision } from "./leavecontrol.js";

// HOD-only: mandatory-attendance calendar days (e.g. a workshop) used to
// bulk-reject every leave currently pending the HOD's decision that
// overlaps the date, instead of rejecting each one individually.

export const listEvents = async (req, res) => {
  const events = await EventDay.find({ hodId: req.user.id }).sort({ date: 1 });
  res.json(events);
};

export const createEvent = async (req, res) => {
  const { date, title } = req.body;
  if (!date || !title?.trim()) {
    return res.status(400).json({ message: "Date and title are required" });
  }
  const event = await EventDay.create({ hodId: req.user.id, date, title: title.trim() });
  res.status(201).json(event);
};

export const deleteEvent = async (req, res) => {
  const event = await EventDay.findOneAndDelete({ _id: req.params.id, hodId: req.user.id });
  if (!event) return res.status(404).json({ message: "Event not found" });
  res.json({ ok: true });
};

// Rejects every leave still pending this HOD's decision whose date range
// covers the event's date. Each leave's hodComment records the event's
// title as the reason, and the student gets the same rejection email/
// guidance as an individually-rejected leave (see applyDecision).
export const rejectOverlapping = async (req, res) => {
  const event = await EventDay.findOne({ _id: req.params.id, hodId: req.user.id });
  if (!event) return res.status(404).json({ message: "Event not found" });

  const leaves = await Leave.find({
    hodId: req.user.id,
    hodStatus: "Pending",
    startDate: { $lte: event.date },
    endDate: { $gte: event.date },
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
