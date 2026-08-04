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
    // Set on an Entry movement logged after the linked leave's own approved
    // end date/time — gate staff still let the student back in (see
    // gatecontrol.js logMovement), but this flags the late return for
    // Troop/Squadron/SDD to see. Always false for Exit movements.
    lateEntry: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Movement", movementSchema);
