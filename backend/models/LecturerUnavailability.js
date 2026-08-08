import mongoose from "mongoose";

// Admin-marked window when one specific named lecturer — a member of one
// department's covering account, see models/Lecturer.js — isn't available
// to cover that department's HOD. Skipped over in the seniority chain for
// any day it covers. See leavecontrol.js resolveActiveMemberForDepartment.
const lecturerUnavailabilitySchema = new mongoose.Schema(
  {
    lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: "Lecturer", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fromDate: { type: String, required: true }, // "YYYY-MM-DD"
    toDate: { type: String, required: true },
    reason: String,
  },
  { timestamps: true }
);

export default mongoose.model("LecturerUnavailability", lecturerUnavailabilitySchema);
