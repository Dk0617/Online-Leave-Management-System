import mongoose from "mongoose";

// A mandatory-attendance day an HOD marks on their calendar (e.g. a
// workshop) — used to bulk-reject pending leave requests that overlap it
// instead of the HOD rejecting each one individually. See
// controllers/eventcontrol.js rejectOverlapping.
const eventDaySchema = new mongoose.Schema(
  {
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: "Hod", required: true, index: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    title: { type: String, required: true },
  },
  { timestamps: true }
);

eventDaySchema.index({ hodId: 1, date: 1 });

export default mongoose.model("EventDay", eventDaySchema);
