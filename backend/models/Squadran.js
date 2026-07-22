import mongoose from "mongoose";
import { withPasswordAuth } from "./authPlugin.js";

const squadranSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    designation: { type: String, default: "Squadron Commander" },
    photo: String, // base64 data URL, downscaled client-side before upload
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

withPasswordAuth(squadranSchema);

export default mongoose.model("Squadran", squadranSchema);
