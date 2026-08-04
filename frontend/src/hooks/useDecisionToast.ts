"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LEAVE_TYPE_LABELS, LeaveRequest } from "@/src/types";

const AUTO_DISMISS_MS = 5000;

export interface DecisionToastState {
  message: string;
  tone: "green" | "red";
}

// Shared by every approver portal (HOD/Troop/Squadron/SDD) — shows a
// transient confirmation naming the student right after Approve/Reject is
// clicked, since the row itself just disappears from the pending list once
// the portal hook's refresh() runs (see e.g. useHodPortal.approve/reject).
export function useDecisionToast() {
  const [toast, setToast] = useState<DecisionToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const notify = useCallback((leave: LeaveRequest, decision: "Approved" | "Rejected") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({
      message: `Leave ${decision} — ${leave.studentName} (${leave.indexNumber}) — ${LEAVE_TYPE_LABELS[leave.type]}`,
      tone: decision === "Approved" ? "green" : "red",
    });
    timerRef.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
  }, []);

  return { toast, notify };
}
