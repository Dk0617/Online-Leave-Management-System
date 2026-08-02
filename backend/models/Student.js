import mongoose from "mongoose";
import { withPasswordAuth } from "./authPlugin.js";

const studentSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true }, // = indexNumber
    password: { type: String, required: true },
    indexNumber: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    department: String,
    email: { type: String, index: true },
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
    // Set the first time the student sets a photo themselves (see
    // studentcontrol.js updatePhoto) — once true, any further change has
    // to go through a PhotoChangeRequest for Admin approval instead of
    // being self-service, so a lost/stolen ID photo can't be swapped out
    // unilaterally by whoever's logged in.
    photoLocked: { type: Boolean, default: false },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

studentSchema.virtual("name").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

withPasswordAuth(studentSchema);

export default mongoose.model("Student", studentSchema);
