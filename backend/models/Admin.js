import mongoose from "mongoose";
import { withPasswordAuth } from "./authPlugin.js";

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

withPasswordAuth(adminSchema);

export default mongoose.model("Admin", adminSchema);
