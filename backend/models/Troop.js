import mongoose from "mongoose";
import { withPasswordAuth } from "./authPlugin.js";

const troopSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    intakes: { type: [String], default: [] },
    designation: { type: String, default: "Troop Commander" },
    photo: String, // base64 data URL, downscaled client-side before upload
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

withPasswordAuth(troopSchema);

export default mongoose.model("Troop", troopSchema);
