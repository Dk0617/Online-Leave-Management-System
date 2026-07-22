import mongoose from "mongoose";

// Admin-marked window when an HOD is unavailable (e.g. on leave themselves)
// — while today's date falls within [fromDate, toDate], their Day Scholar /
// Cadet Academic Leave queue automatically falls to the highest-ranked
// available Lecturer in the seniority chain. See leavecontrol.js
// resolveActiveCoverer. No substitute is picked by hand here — that's the
// whole point of the fixed chain.
const hodUnavailabilitySchema = new mongoose.Schema(
  {
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: "Hod", required: true, index: true },
    fromDate: { type: String, required: true }, // "YYYY-MM-DD"
    toDate: { type: String, required: true },
    reason: String,
  },
  { timestamps: true }
);

export default mongoose.model("HodUnavailability", hodUnavailabilitySchema);
