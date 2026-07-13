import mongoose from "mongoose";
import { withPasswordAuth } from "./authPlugin.js";

const sddSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    title: { type: String, default: "Senior Deputy Dean" },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

withPasswordAuth(sddSchema);

export default mongoose.model("Sdd", sddSchema);
