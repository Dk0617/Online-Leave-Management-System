import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Shared by every role schema: hashes password on save and adds comparePassword().
function withPasswordAuth(schema) {
  schema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
  });

  schema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
  };
}

// ---- Admin ----
const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);
withPasswordAuth(adminSchema);
export const Admin = mongoose.model("Admin", adminSchema);

// ---- Student ----
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
export const Student = mongoose.model("Student", studentSchema);

// ---- Hod ----
const hodSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    department: String,
    designation: { type: String, default: "Head of Department" },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);
withPasswordAuth(hodSchema);
export const Hod = mongoose.model("Hod", hodSchema);

// ---- Troop ----
const troopSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    intakes: { type: [String], default: [] },
    designation: { type: String, default: "Troop Commander" },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);
withPasswordAuth(troopSchema);
export const Troop = mongoose.model("Troop", troopSchema);

// ---- Squadran ----
const squadranSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    designation: { type: String, default: "Squadron Commander" },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);
withPasswordAuth(squadranSchema);
export const Squadran = mongoose.model("Squadran", squadranSchema);

// ---- Sdd ----
const sddSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    title: { type: String, default: "Senior Deputy Dean" },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);
withPasswordAuth(sddSchema);
export const Sdd = mongoose.model("Sdd", sddSchema);

// ---- Gate ----
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
export const Gate = mongoose.model("Gate", gateSchema);

// ---- Intake ----
const intakeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);
export const Intake = mongoose.model("Intake", intakeSchema);

// ---- Leave ----
// Approval is modeled as four independent per-role status fields rather than
// an ordered stage array: Day Scholars only ever touch hodStatus+troopStatus
// (the other two stay "N/A"); Cadets only ever touch troopStatus+sqnStatus+
// sddStatus (hodStatus stays "N/A"). Gate is not a stage here at all — it
// verifies against isApproved()/isRejected() (see controllers.js) and logs
// Exit/Entry separately in the Movement collection.
const STATUS_VALUES = ["Pending", "Approved", "Rejected", "N/A"];

const leaveSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    studentName: { type: String, required: true },
    indexNumber: { type: String, required: true },
    department: String,
    studentType: { type: String, enum: ["DAY_SCHOLAR", "CADET"], required: true },
    intake: String,
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: "Hod" },
    troopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Troop" }],
    sqnId: { type: mongoose.Schema.Types.ObjectId, ref: "Squadran" },

    type: { type: String, required: true },
    priority: { type: String, enum: ["normal", "emergency"], default: "normal" },
    startDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endDate: { type: String, required: true },
    endTime: { type: String, required: true },
    reason: { type: String, required: true },
    attachmentName: String,
    attachmentData: String, // base64, capped at 2MB client-side
    appliedDate: { type: String, required: true },

    hodStatus: { type: String, enum: STATUS_VALUES, default: "N/A" },
    troopStatus: { type: String, enum: STATUS_VALUES, default: "Pending" },
    sqnStatus: { type: String, enum: STATUS_VALUES, default: "N/A" },
    sddStatus: { type: String, enum: STATUS_VALUES, default: "N/A" },

    hodComment: String,
    troopComment: String,
    sqnComment: String,
    sddComment: String,

    hodApprovedAt: String,
    troopApprovedAt: String,
    sqnApprovedAt: String,
    sddApprovedAt: String,
  },
  { timestamps: true }
);
export const Leave = mongoose.model("Leave", leaveSchema);

// ---- Movement ----
const movementSchema = new mongoose.Schema(
  {
    indexNumber: { type: String, required: true, trim: true },
    studentName: String,
    studentType: { type: String, enum: ["DAY_SCHOLAR", "CADET"] },
    direction: { type: String, enum: ["Exit", "Entry"], required: true },
    leaveId: { type: mongoose.Schema.Types.ObjectId, ref: "Leave" },
    notes: String,
    loggedBy: { type: String, required: true },
  },
  { timestamps: true }
);
export const Movement = mongoose.model("Movement", movementSchema);

// ---- Notification ----
// Admin-visible feed of password-change events across every role.
const notificationSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    username: { type: String, required: true },
    name: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const Notification = mongoose.model("Notification", notificationSchema);

// ---- AuditEntry ----
const auditEntrySchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    user: { type: String, required: true },
    action: { type: String, required: true },
    details: String,
  },
  { timestamps: true }
);
export const AuditEntry = mongoose.model("AuditEntry", auditEntrySchema);

// Every role that can log in, and the Mongoose model that owns its accounts.
export const ROLE_MODELS = {
  ADMIN: Admin,
  STUDENT: Student,
  HOD: Hod,
  TROOP: Troop,
  SQUADRAN: Squadran,
  SDD: Sdd,
  GATE: Gate,
};
