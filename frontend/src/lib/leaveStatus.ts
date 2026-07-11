// Frontend mirror of backend/utils/leaveStatus.js — keep the two in sync.
import { LeaveRequest } from "@/src/types";

export function isApproved(leave: LeaveRequest): boolean {
  if (leave.studentType === "CADET") {
    return (
      leave.troopStatus === "Approved" &&
      leave.sqnStatus === "Approved" &&
      leave.sddStatus === "Approved"
    );
  }
  return leave.hodStatus === "Approved" && leave.troopStatus === "Approved";
}

export function isRejected(leave: LeaveRequest): boolean {
  if (leave.studentType === "CADET") {
    return (
      leave.troopStatus === "Rejected" ||
      leave.sqnStatus === "Rejected" ||
      leave.sddStatus === "Rejected"
    );
  }
  return leave.hodStatus === "Rejected" || leave.troopStatus === "Rejected";
}
