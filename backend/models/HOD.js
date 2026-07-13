import mongoose from "mongoose";
import { withPasswordAuth } from "./authPlugin.js";

const hodSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    department: String,
    email: { type: String, index: true },
    designation: { type: String, default: "Head of Department" },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

withPasswordAuth(hodSchema);

export default mongoose.model("Hod", hodSchema);
