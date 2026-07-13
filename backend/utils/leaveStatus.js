// Replaces the old ordered-stage workflow.js. Approval is now four
// independent per-role status fields on the Leave document — see
// model/Leave/Leave.js for why.
//
// Cadet Academic Leave is a special routing: Troop Commander alone (no HOD,
// no Squadron, no SDD) — filed in the Troop Commander's office, the same
// role HOD plays for a Day Scholar's Academic Leave. It's identified by
// sqnStatus === "N/A" on a CADET leave (every other cadet leave type always
// puts sqnStatus through Pending/Approved/Rejected, never N/A).

export function isApproved(leave) {
  if (leave.studentType === "CADET") {
    if (leave.sqnStatus === "N/A") {
      return leave.troopStatus === "Approved";
    }
    return (
      leave.troopStatus === "Approved" &&
      leave.sqnStatus === "Approved" &&
      leave.sddStatus === "Approved"
    );
  }
  return leave.hodStatus === "Approved" && leave.troopStatus === "Approved";
}

export function isRejected(leave) {
  if (leave.studentType === "CADET") {
    if (leave.sqnStatus === "N/A") {
      return leave.troopStatus === "Rejected";
    }
    return (
      leave.troopStatus === "Rejected" ||
      leave.sqnStatus === "Rejected" ||
      leave.sddStatus === "Rejected"
    );
  }
  return leave.hodStatus === "Rejected" || leave.troopStatus === "Rejected";
}

// Academic Leave is an academic excuse kept on file (HOD for Day Scholars,
// Troop Commander for Cadets), not an exit permit — it never produces a
// gate pass or downloadable PDF, even once fully approved. Its auto-created
// companion Personal Leave is the one students actually use to exit/re-enter
// campus.
export function isGateEligible(leave) {
  return isApproved(leave) && leave.type !== "Academic Leave";
}
