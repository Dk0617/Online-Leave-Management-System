// Replaces the old ordered-stage workflow.js. Approval is now four
// independent per-role status fields on the Leave document — see
// model/Leave/Leave.js for why.

export function isApproved(leave) {
  if (leave.studentType === "CADET") {
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
    return (
      leave.troopStatus === "Rejected" ||
      leave.sqnStatus === "Rejected" ||
      leave.sddStatus === "Rejected"
    );
  }
  return leave.hodStatus === "Rejected" || leave.troopStatus === "Rejected";
}
