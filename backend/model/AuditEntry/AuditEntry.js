import mongoose from "mongoose";

const auditEntrySchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    user: { type: String, required: true },
    action: { type: String, required: true },
    details: String,
  },
  { timestamps: true }
);

export default mongoose.model("AuditEntry", auditEntrySchema);
