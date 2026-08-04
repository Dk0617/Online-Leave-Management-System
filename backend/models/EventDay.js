import mongoose from "mongoose";

// A day an HOD marks on their calendar — either a mandatory-attendance
// Workshop, used to bulk-reject pending leave requests that overlap it
// instead of the HOD rejecting each one individually (see
// controllers/eventcontrol.js rejectOverlapping), or a purely informational
// day (a Poya day, a general holiday, or a day with no lectures), which
// doesn't offer that bulk action since there's nothing mandatory to
// protect — a Poya day in particular is itself a public holiday, so
// students are normally free to leave on it, not restricted.
export const EVENT_CATEGORIES = ["WORKSHOP", "POYA", "HOLIDAY", "NO_LECTURE", "OTHER"];

// Only Workshop is mandatory-attendance — the one category that blocks
// students from applying for ordinary leave on that date (see
// controllers/studentcontrol.js applyLeave). Emergency Leave is the one
// exception, same as the 2-day advance-notice rule elsewhere in that file.
export const MANDATORY_EVENT_CATEGORIES = ["WORKSHOP"];

const eventDaySchema = new mongoose.Schema(
  {
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: "Hod", required: true, index: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    title: { type: String, required: true },
    category: { type: String, enum: EVENT_CATEGORIES, default: "OTHER" },
  },
  { timestamps: true }
);

eventDaySchema.index({ hodId: 1, date: 1 });

export default mongoose.model("EventDay", eventDaySchema);
