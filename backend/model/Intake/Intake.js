import mongoose from "mongoose";

const intakeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Intake", intakeSchema);
