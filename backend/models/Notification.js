import mongoose from "mongoose";

// Admin-visible feed of password-change events across every role.
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
