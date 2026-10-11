import mongoose from "mongoose";

// Admin's Acting HOD pick for one department on one date. Making an
// assignment is itself how Admin records that the department's HOD is not
// available that day — for that date, the department's HOD-stage approvals
// go to the department's shared Acting HOD login (models/Lecturer.js), used
// by the one or more roster lecturers listed here. Names/tiers are
// snapshotted so the record still reads correctly if the roster changes.
const assignedMemberSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    tier: { type: String, enum: ["SENIOR", "JUNIOR"], required: true },
  },
  { _id: false }
);

const actingHodAssignmentSchema = new mongoose.Schema(
  {
    lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: "Lecturer", required: true },
    department: { type: String, required: true },
    members: { type: [assignedMemberSchema], default: [] },
    // Single-lecturer fields from the first version of this feature; read
    // as a one-member list by assignedMembers() in leavecontrol.js.
    memberId: mongoose.Schema.Types.ObjectId,
    memberName: String,
    memberTier: { type: String, enum: ["SENIOR", "JUNIOR"] },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    assignedBy: String,
  },
  { timestamps: true }
);

// One assignment (with any number of lecturers) per department per day.
actingHodAssignmentSchema.index({ department: 1, date: 1 }, { unique: true });

export default mongoose.model("ActingHodAssignment", actingHodAssignmentSchema);
