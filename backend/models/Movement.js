import mongoose from "mongoose";

const movementSchema = new mongoose.Schema(
  {
    indexNumber: { type: String, required: true, trim: true },
    studentName: String,
    studentType: { type: String, enum: ["DAY_SCHOLAR", "CADET"] },
    direction: { type: String, enum: ["Exit", "Entry"], required: true },
    leaveId: { type: mongoose.Schema.Types.ObjectId, ref: "Leave" },
    notes: String,
    loggedBy: { type: String, required: true },
    // Set on an Entry movement logged after 18:00 (or after the linked
    // leave's own approved end date/time) — gate staff still let the
    // student back in (see gatecontrol.js logMovement), but this flags the
    // late return for Troop/Squadron/SDD to see. Always false for Exit.
    lateEntry: { type: Boolean, default: false },
    // Set on an Exit movement logged before 06:00 — gate staff still let
    // the student out, but this flags it as a curfew violation the same
    // way lateEntry does for Entry. Always false for Entry.
    earlyExit: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Movement", movementSchema);
