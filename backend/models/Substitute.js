import mongoose from "mongoose";

// Admin-assigned HOD cover — while today's date falls within [fromDate,
// toDate], substituteHodId can see and decide on hodId's Day Scholar /
// Cadet Academic Leave queue too (in addition to their own), for cases like
// the covered HOD being on leave themselves. See leavecontrol.js
// hodScopeFilter.
const substituteSchema = new mongoose.Schema(
  {
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: "Hod", required: true, index: true },
    substituteHodId: { type: mongoose.Schema.Types.ObjectId, ref: "Hod", required: true, index: true },
    fromDate: { type: String, required: true }, // "YYYY-MM-DD"
    toDate: { type: String, required: true },
    reason: String,
  },
  { timestamps: true }
);

export default mongoose.model("Substitute", substituteSchema);
