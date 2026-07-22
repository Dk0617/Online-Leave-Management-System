import mongoose from "mongoose";
import { withPasswordAuth } from "./authPlugin.js";

// A Senior or Junior Lecturer — the campus-wide fallback chain for HOD
// approvals when the HOD themselves is unavailable (see
// controllers/leavecontrol.js resolveActiveCoverer). Seniority is tier
// (Senior always outranks Junior) then rank ascending within that tier —
// e.g. Senior rank 1 is tried before Senior rank 2, and every Senior is
// tried before any Junior.
const lecturerSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    department: String,
    tier: { type: String, enum: ["SENIOR", "JUNIOR"], required: true },
    rank: { type: Number, required: true },
    photo: String, // base64 data URL, downscaled client-side before upload
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

withPasswordAuth(lecturerSchema);

export default mongoose.model("Lecturer", lecturerSchema);
