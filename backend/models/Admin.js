import mongoose from "mongoose";
import { withPasswordAuth } from "./authPlugin.js";

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    // Which department this admin account manages — one admin per
    // department (e.g. 6 departments, 6 admins). Drives Event Calendar
    // scoping (see controllers/eventcontrol.js adminListEvents/
    // adminCreateEvent) so each admin only creates/sees workshop days for
    // their own department, matching that department's HOD document.
    department: String,
    photo: String, // base64 data URL, downscaled client-side before upload
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

withPasswordAuth(adminSchema);

export default mongoose.model("Admin", adminSchema);
