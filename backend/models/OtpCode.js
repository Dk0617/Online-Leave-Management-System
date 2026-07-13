import mongoose from "mongoose";

// One-time login codes for the email-code sign-in flow. codeHash is a
// bcrypt hash of the 6-digit code (never stored in plain text); role +
// userId record who this code will log in as once verified.
const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    role: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("OtpCode", otpSchema);
