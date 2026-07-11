import mongoose from "mongoose";

// Approval is modeled as four independent per-role status fields rather than
// an ordered stage array: Day Scholars only ever touch hodStatus+troopStatus
// (the other two stay "N/A"); Cadets only ever touch troopStatus+sqnStatus+
// sddStatus (hodStatus stays "N/A"). Gate is not a stage here at all — it
// verifies against isApproved()/isRejected() (see utils/leaveStatus.js) and
// logs Exit/Entry separately in the Movement collection.
const STATUS_VALUES = ["Pending", "Approved", "Rejected", "N/A"];

const leaveSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    studentName: { type: String, required: true },
    indexNumber: { type: String, required: true },
    department: String,
    studentType: { type: String, enum: ["DAY_SCHOLAR", "CADET"], required: true },
    intake: String,
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: "Hod" },
    troopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Troop" }],
    sqnId: { type: mongoose.Schema.Types.ObjectId, ref: "Squadran" },

    type: { type: String, required: true },
    priority: { type: String, enum: ["normal", "emergency"], default: "normal" },
    startDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endDate: { type: String, required: true },
    endTime: { type: String, required: true },
    reason: { type: String, required: true },
    attachmentName: String,
    attachmentData: String, // base64, capped at 2MB client-side
    appliedDate: { type: String, required: true },

    hodStatus: { type: String, enum: STATUS_VALUES, default: "N/A" },
    troopStatus: { type: String, enum: STATUS_VALUES, default: "Pending" },
    sqnStatus: { type: String, enum: STATUS_VALUES, default: "N/A" },
    sddStatus: { type: String, enum: STATUS_VALUES, default: "N/A" },

    hodComment: String,
    troopComment: String,
    sqnComment: String,
    sddComment: String,

    hodApprovedAt: String,
    troopApprovedAt: String,
    sqnApprovedAt: String,
    sddApprovedAt: String,
  },
  { timestamps: true }
);

export default mongoose.model("Leave", leaveSchema);
