import mongoose from "mongoose";

// Admin-marked window when a Lecturer isn't available to cover HOD
// approvals — skipped over in the seniority chain for any day it covers.
// See leavecontrol.js resolveActiveCoverer.
const lecturerUnavailabilitySchema = new mongoose.Schema(
  {
    lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: "Lecturer", required: true, index: true },
    fromDate: { type: String, required: true }, // "YYYY-MM-DD"
    toDate: { type: String, required: true },
    reason: String,
  },
  { timestamps: true }
);

export default mongoose.model("LecturerUnavailability", lecturerUnavailabilitySchema);
