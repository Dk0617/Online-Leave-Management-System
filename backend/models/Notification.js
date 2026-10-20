import mongoose from "mongoose";

// Legacy: the old admin "Password Changes" feed. Nothing writes here any
// more — password changes go to the audit log (see utils/audit.js). Kept
// only so utils/migratePasswordNotifications.js can move old rows across.
const notificationSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    username: { type: String, required: true },
    name: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
