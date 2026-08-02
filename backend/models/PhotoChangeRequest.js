import mongoose from "mongoose";

// A student's request to change their profile photo after the one-time
// self-service set has already been used (see Student.photoLocked) —
// needs Admin approval before it actually replaces Student.photo. See
// controllers/studentcontrol.js requestPhotoChange and
// controllers/admincontrol.js approvePhotoRequest/rejectPhotoRequest.
const photoChangeRequestSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    requestedPhoto: { type: String, required: true }, // base64 data URL
    reason: String,
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
    decidedBy: String,
    decidedAt: String,
    decisionReason: String,
  },
  { timestamps: true }
);

export default mongoose.model("PhotoChangeRequest", photoChangeRequestSchema);
