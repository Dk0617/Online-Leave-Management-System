// Replaces the old ordered-stage workflow.js. Approval is now four
// independent per-role status fields on the Leave document — see
// model/Leave/Leave.js for why.
//
// Cadets never touch hodStatus (always "N/A") — every Cadet leave routes
// Troop Commander -> Squadron Commander. Cadet Academic Leave stops there
// (sddStatus stays "N/A"); every other Cadet leave type continues on to
// Senior Deputy Dean. It's identified by sddStatus === "N/A" on a CADET
// leave (every non-Academic Cadet leave type always puts sddStatus through
// Pending/Approved/Rejected, never N/A).

export function isApproved(leave) {
  if (leave.studentType === "CADET") {
    if (leave.sddStatus === "N/A") {
      return leave.troopStatus === "Approved" && leave.sqnStatus === "Approved";
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
    if (leave.sddStatus === "N/A") {
      return leave.troopStatus === "Rejected" || leave.sqnStatus === "Rejected";
    }
    return (
      leave.troopStatus === "Rejected" ||
      leave.sqnStatus === "Rejected" ||
      leave.sddStatus === "Rejected"
    );
  }
  return leave.hodStatus === "Rejected" || leave.troopStatus === "Rejected";
}

// Academic Leave is an academic excuse kept on file with the approver (HOD
// for Day Scholars, Squadron Commander for Cadets), not an exit permit — it
// never produces a gate pass or downloadable PDF, even once fully approved.
// Its auto-created companion Personal Leave is the one students actually
// use to exit/re-enter campus.
export function isGateEligible(leave) {
  return isApproved(leave) && leave.type !== "Academic Leave";
}
