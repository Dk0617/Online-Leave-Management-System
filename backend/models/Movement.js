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
  },
  { timestamps: true }
);

export default mongoose.model("Movement", movementSchema);
