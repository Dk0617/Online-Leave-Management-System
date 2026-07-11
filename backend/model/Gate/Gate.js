import mongoose from "mongoose";
import { withPasswordAuth } from "../../utils/authPlugin.js";

const gateSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    post: { type: String, default: "Main Gate" },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

withPasswordAuth(gateSchema);

export default mongoose.model("Gate", gateSchema);
