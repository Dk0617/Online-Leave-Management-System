import mongoose from "mongoose";
 
// One Block Leave covers a single 24-hour window shared by every student on
// its roster — Day Scholars from the same department join it one at a time
// (see backend/controllers/blockleavecontrol.js) instead of each of them
// filing their own individual leave. It only ever needs one HOD decision and
// one Troop Commander decision to settle the whole roster at once.
export const BLOCK_LEAVE_MIN_STUDENTS = 5;
export const BLOCK_LEAVE_MAX_STUDENTS = 30;
 
const STATUS_VALUES = ["Pending", "Approved", "Rejected"];
 
// No _id of its own — a roster row is only ever read/written as part of its
// parent BlockLeave document, never addressed independently.
const rosterEntrySchema = new mongoose.Schema(
  {
    no: { type: Number, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    indexNumber: { type: String, required: true },
    name: { type: String, required: true },
    intake: String,
    // Printed per-student on the combined pass, same purpose as
    // Leave.verifyCode — lets Gate staff confirm identity for whichever of
    // these students they're looking at, independent of the others.
    verifyCode: { type: String, required: true },
    // JOINED: self-joined, or invited-and-accepted — counts toward the
    // BLOCK_LEAVE_MIN_STUDENTS submit threshold and shows up as a normal
    // roster row. INVITED: another roster member picked this student (see
    // blockleavecontrol.js inviteToBlockLeave) but they haven't accepted or
    // declined yet — reserves a seat toward BLOCK_LEAVE_MAX_STUDENTS without
    // counting toward the submit threshold, and doesn't appear as a
    // committed member until they respond.
    status: { type: String, enum: ["JOINED", "INVITED"], default: "JOINED" },
  },
  { _id: false }
);
 
const blockLeaveSchema = new mongoose.Schema(
  {
    department: { type: String, required: true },
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: "Hod", required: true },
    // Union of every joined student's intake/assigned Troop Commanders —
    // students in the same department can still come from different
    // intakes, so Troop's pending queue (scoped by intake, same as an
    // ordinary Leave — see leavecontrol.js troopScopeFilter) needs the full
    // set, not just whoever joined first.
    intakes: { type: [String], default: [] },
    troopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Troop" }],
 
    startDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endDate: { type: String, required: true },
    endTime: { type: String, required: true },
    reason: { type: String, required: true },
 
    students: { type: [rosterEntrySchema], default: [] },
 
    // FILLING: roster still open for students to join. SUBMITTED: locked in
    // (either a joined student chose to submit once the 5-student minimum
    // was reached, or the 30-student cap was hit and it auto-submitted) and
    // now routing through hodStatus -> troopStatus like a normal leave.
    // EXPIRED: was still FILLING when its own start window passed without
    // being submitted. CANCELLED: the student who started the roster
    // (students[0]) cancelled it before either approver had decided — see
    // blockleavecontrol.js cancelBlockLeave.
    stage: { type: String, enum: ["FILLING", "SUBMITTED", "EXPIRED", "CANCELLED"], default: "FILLING" },
    submittedAt: String,
    submittedByStudentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    // Set only by cancelBlockLeave — mirrors submittedAt's plain-string
    // timestamp style rather than a Date, consistent with the rest of this
    // schema's timestamp fields.
    cancelledAt: String,
 
    hodStatus: { type: String, enum: STATUS_VALUES, default: "Pending" },
    hodComment: String,
    hodApprovedAt: String,
 
    troopStatus: { type: String, enum: STATUS_VALUES, default: "Pending" },
    troopComment: String,
    troopApprovedAt: String,
    // Which of the (possibly several) Troop Commanders in troopIds actually
    // made the call — troopScopeFilter-style queries let any of them act,
    // same as an ordinary Leave's 1-2 assigned Troop Commanders.
    decidedByTroopId: { type: mongoose.Schema.Types.ObjectId, ref: "Troop" },
  },
  { timestamps: true }
);
 
// One open (FILLING) roster per department at a time — this is the query
// students hit every time they open the Block Leave screen.
blockLeaveSchema.index({ department: 1, stage: 1 });
blockLeaveSchema.index({ hodId: 1, hodStatus: 1 });
blockLeaveSchema.index({ intakes: 1, troopStatus: 1 });
blockLeaveSchema.index({ "students.studentId": 1 });
 
export default mongoose.model("BlockLeave", blockLeaveSchema);
 