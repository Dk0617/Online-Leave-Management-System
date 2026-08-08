import mongoose from "mongoose";
import { withPasswordAuth } from "./authPlugin.js";

// One shared login per department, used to cover that department's HOD
// approvals when the HOD is unavailable — not an individual lecturer's own
// account. Admin maintains a named roster of that department's lecturers
// here (each with a Senior/Junior tier + rank); the system works out on its
// own which named lecturer is the currently active coverer on a given day
// (see controllers/leavecontrol.js resolveActiveMemberForDepartment) —
// nobody picks a specific substitute by hand, and whoever knows the
// department's one shared password can log in as "whichever named lecturer
// is active today."
const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tier: { type: String, enum: ["SENIOR", "JUNIOR"], required: true },
  rank: { type: Number, required: true },
});

const lecturerSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    // The shared account's own label (e.g. "IT Dept Covering Lecturers") —
    // shown wherever this login itself needs a display name, distinct from
    // whichever named member the system currently resolves as active.
    name: { type: String, required: true },
    email: { type: String, index: true },
    // Exactly one covering account per department — resolveActiveCoverer
    // looks a department up by this field, so a duplicate would make that
    // lookup ambiguous.
    department: { type: String, required: true, unique: true },
    members: { type: [memberSchema], default: [] },
    photo: String, // base64 data URL, downscaled client-side before upload
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

withPasswordAuth(lecturerSchema);

export default mongoose.model("Lecturer", lecturerSchema);
