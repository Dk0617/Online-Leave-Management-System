import mongoose from "mongoose";
import { withPasswordAuth } from "../../utils/authPlugin.js";

const studentSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true }, // = indexNumber
    password: { type: String, required: true },
    indexNumber: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    department: String,
    email: String,
    mobile: String,
    studentType: {
      type: String,
      enum: ["DAY_SCHOLAR", "CADET"],
      required: true,
    },
    intake: { type: String, required: true },
    troopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Troop" }],
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: "Hod" },
    sqnId: { type: mongoose.Schema.Types.ObjectId, ref: "Squadran" },
    photo: String, // base64 data URL, downscaled client-side before upload
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

studentSchema.virtual("name").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

withPasswordAuth(studentSchema);

export default mongoose.model("Student", studentSchema);
