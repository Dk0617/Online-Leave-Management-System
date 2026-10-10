import mongoose from "mongoose";

// Admin's hand-picked Acting HOD for one department on one date — one named
// Senior/Junior lecturer from that department's covering account roster
// (see models/Lecturer.js). Only takes effect while that department's HOD is
// marked unavailable for the same date (see models/HodUnavailability.js and
// leavecontrol.js hodScopeFilter). Name/tier are snapshotted so the record
// still reads correctly if the roster member is later edited or removed.
const actingHodAssignmentSchema = new mongoose.Schema(
  {
    lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: "Lecturer", required: true },
    department: { type: String, required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, required: true },
    memberName: { type: String, required: true },
    memberTier: { type: String, enum: ["SENIOR", "JUNIOR"], required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    assignedBy: String,
  },
  { timestamps: true }
);

// Exactly one Acting HOD per department per day.
actingHodAssignmentSchema.index({ department: 1, date: 1 }, { unique: true });

export default mongoose.model("ActingHodAssignment", actingHodAssignmentSchema);
