"use client";

import { ReactNode, useState } from "react";
import { LeaveRequest, LEAVE_TYPE_LABELS, LeaveStatus } from "@/src/types";
import { isApproved } from "@/src/api";
import { Button, Badge } from "@/src/components/ui";

// ==================================================================
// Timeline
// ==================================================================

export interface TimelineStep {
  label: string;
  status: "done" | "active" | "wait" | "reject";
}

const TIMELINE_DOT_CLASS: Record<TimelineStep["status"], string> = {
  done: "bg-[#22c55e] border-[#22c55e] text-white",
  active:
    "bg-[var(--blue)] border-[var(--sky)] text-white shadow-[0_0_0_4px_rgba(74,144,217,0.2)]",
  wait: "bg-[var(--card2)] text-[var(--muted)] border-[var(--border)]",
  reject: "bg-[#ef4444] border-[#ef4444] text-white",
};

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex items-start gap-0">
      {steps.map((s, i) => (
        <div key={i} className="relative flex flex-1 flex-col items-center">
          {i < steps.length - 1 && (
            <div className="absolute left-1/2 top-[14px] h-[2px] w-full bg-[var(--border)]" />
          )}
          <div
            className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold ${TIMELINE_DOT_CLASS[s.status]}`}
          >
            {s.status === "done" ? "✓" : s.status === "reject" ? "✕" : i + 1}
          </div>
          <div className="mt-1.5 max-w-[70px] text-center text-[10px] text-[var(--muted)]">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================================================================
// ApprovalActions
// ==================================================================

export function ApprovalActions({
  onApprove,
  onReject,
}: {
  onApprove: () => void;
  onReject: (remarks: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [remarks, setRemarks] = useState("");

  if (rejecting) {
    return (
      <div className="flex w-56 flex-col gap-2">
        <input
          autoFocus
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Reason for rejection"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card2)] px-2 py-1.5 text-xs text-[var(--white)] outline-none focus:border-[var(--sky)]"
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setRejecting(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!remarks.trim()}
            onClick={() => onReject(remarks.trim())}
          >
            Confirm Reject
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button variant="danger" onClick={() => setRejecting(true)}>
        Reject
      </Button>
      <Button variant="success" onClick={onApprove}>
        Approve
      </Button>
    </div>
  );
}

// ==================================================================
// LeaveDetailModal
// ==================================================================

function statusTone(status: LeaveStatus): "gray" | "amber" | "green" | "red" {
  if (status === "Approved") return "green";
  if (status === "Rejected") return "red";
  if (status === "N/A") return "gray";
  return "amber";
}

function stepStatus(status: LeaveStatus, gate: boolean): TimelineStep["status"] {
  if (!gate) return "wait";
  if (status === "Approved") return "done";
  if (status === "Rejected") return "reject";
  return "active";
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-[rgba(74,144,217,0.06)] py-2 text-sm last:border-none">
      <span className="min-w-[130px] shrink-0 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </span>
      <span className="text-[13px] text-white">{value}</span>
    </div>
  );
}

export function LeaveDetailModal({
  leave,
  onClose,
  onDownloadPdf,
}: {
  leave: LeaveRequest;
  onClose: () => void;
  onDownloadPdf?: () => void;
}) {
  const isCadet = leave.studentType === "CADET";
  const approved = isApproved(leave);

  const steps: TimelineStep[] = isCadet
    ? [
        { label: "Applied", status: "done" },
        { label: "Troop Cmdr", status: stepStatus(leave.troopStatus, true) },
        { label: "Squadron", status: stepStatus(leave.sqnStatus, leave.troopStatus === "Approved") },
        {
          label: "SDD",
          status: stepStatus(
            leave.sddStatus,
            leave.troopStatus === "Approved" && leave.sqnStatus === "Approved"
          ),
        },
        { label: "PDF Ready", status: approved ? "done" : "wait" },
      ]
    : [
        { label: "Applied", status: "done" },
        { label: "HOD", status: stepStatus(leave.hodStatus, true) },
        { label: "Troop Cmdr", status: stepStatus(leave.troopStatus, leave.hodStatus === "Approved") },
        { label: "PDF Ready", status: approved ? "done" : "wait" },
      ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(5,13,31,0.85)] backdrop-blur-sm">
      <div className="max-h-[85vh] w-[90%] max-w-[520px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <h3 className="text-[15px] font-bold text-white">Leave Application Details</h3>
          <button onClick={onClose} className="text-xl leading-none text-[var(--muted)] hover:text-white">
            ✕
          </button>
        </div>
        <div className="px-6 py-5">
          <div className="mb-4">
            <Timeline steps={steps} />
          </div>

          <Row
            label="Leave Type"
            value={
              <>
                {LEAVE_TYPE_LABELS[leave.type]}
                {leave.priority === "emergency" && (
                  <span className="ml-2">
                    <Badge tone="red">Emergency</Badge>
                  </span>
                )}
              </>
            }
          />
          <Row label="From" value={`${leave.startDate} ${leave.startTime}`} />
          <Row label="To" value={`${leave.endDate} ${leave.endTime}`} />
          <Row label="Reason" value={leave.reason} />
          <Row
            label="Supporting Document"
            value={
              leave.attachmentData ? (
                <a href={leave.attachmentData} download={leave.attachmentName} className="text-[var(--sky)]">
                  📎 {leave.attachmentName}
                </a>
              ) : (
                <span className="text-[var(--muted)]">None</span>
              )
            }
          />
          <Row label="Applied On" value={leave.appliedDate} />

          {!isCadet ? (
            <>
              <Row
                label="HOD"
                value={
                  <>
                    <Badge tone={statusTone(leave.hodStatus)}>{leave.hodStatus}</Badge>
                    {leave.hodComment && (
                      <em className="ml-2 text-xs text-[var(--muted)]">{leave.hodComment}</em>
                    )}
                  </>
                }
              />
              <Row
                label="Troop Commander"
                value={
                  <>
                    <Badge tone={statusTone(leave.troopStatus)}>{leave.troopStatus}</Badge>
                    {leave.troopComment && (
                      <em className="ml-2 text-xs text-[var(--muted)]">{leave.troopComment}</em>
                    )}
                  </>
                }
              />
            </>
          ) : (
            <>
              <Row
                label="Troop Commander"
                value={<Badge tone={statusTone(leave.troopStatus)}>{leave.troopStatus}</Badge>}
              />
              <Row
                label="Squadron Cmdr"
                value={<Badge tone={statusTone(leave.sqnStatus)}>{leave.sqnStatus}</Badge>}
              />
              <Row
                label="Senior Deputy Dean"
                value={<Badge tone={statusTone(leave.sddStatus)}>{leave.sddStatus}</Badge>}
              />
            </>
          )}

          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {approved && onDownloadPdf && (
              <Button variant="accent" onClick={onDownloadPdf}>
                📥 Download PDF
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
