"use client";

import { useState } from "react";
import { StatTile, Badge, Button } from "@/src/components/ui";
import { ApprovalActions, LeaveDetailModal } from "@/src/components/leave";
import { useSquadranPortal } from "@/src/hooks/useSquadranPortal";
import { LEAVE_TYPE_LABELS, LeaveRequest } from "@/src/types";
import styles from "@/src/portal.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useSquadranPortal> }) {
  const { pending, history, approve, reject, error, refresh } = portal;
  const approvedByMe = history.filter((l) => l.sqnStatus === "Approved").length;
  const rejectedByMe = history.filter((l) => l.sqnStatus === "Rejected").length;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          <span>Couldn&apos;t load Squadron data: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      )}
      <div className={styles.infoBanner}>
        <strong>Your Role:</strong> You review <strong>Cadet</strong> leave applications at Stage 2. Most
        applications arrive here after the Troop Commander approves, then move to the Senior Deputy Dean
        (SDD) for final clearance. <strong>Academic Leave</strong> is an exception — it skips Troop Commander
        entirely (routed via HOD instead) and your approval is the final step, with no SDD stage after.
      </div>

      <div className={styles.statGrid}>
        <StatTile label="Pending" value={pending.length} tone="amber" />
        <StatTile label="Approved" value={approvedByMe} tone="green" />
        <StatTile label="Rejected" value={rejectedByMe} tone="red" />
        <StatTile label="Total" value={history.length + pending.length} />
      </div>

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">Pending — Awaiting Squadron</h2>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Index</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Previous Stage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No pending applications.
                </td>
              </tr>
            ) : (
              pending.map((l) => {
                const isAcademicViaHod = l.troopStatus === "N/A";
                return (
                  <tr key={l.id}>
                    <td>{l.studentName}</td>
                    <td>{l.indexNumber}</td>
                    <td>
                      {LEAVE_TYPE_LABELS[l.type]}
                      {l.priority === "emergency" && (
                        <span className="ml-1">
                          <Badge tone="red">Emergency</Badge>
                        </span>
                      )}
                    </td>
                    <td>{l.startDate}</td>
                    <td>{l.endDate}</td>
                    <td>
                      <Badge tone="green">{isAcademicViaHod ? "HOD Approved" : "Troop Approved"}</Badge>
                    </td>
                    <td className="space-x-1.5 whitespace-nowrap">
                      <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => setSelected(l)}>
                        View
                      </Button>
                      <ApprovalActions onApprove={() => approve(l.id)} onReject={(remarks) => reject(l.id, remarks)} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && <LeaveDetailModal leave={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export function History({ portal }: { portal: ReturnType<typeof useSquadranPortal> }) {
  const { history } = portal;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Leave Type</th>
            <th>From</th>
            <th>Your Decision</th>
            <th>Next Stage</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                No history.
              </td>
            </tr>
          ) : (
            history.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.studentName}
                  <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                </td>
                <td>{LEAVE_TYPE_LABELS[l.type]}</td>
                <td>{l.startDate}</td>
                <td>
                  <Badge tone={tone(l.sqnStatus)}>{l.sqnStatus}</Badge>
                </td>
                <td className="text-[var(--muted)]">
                  {l.troopStatus === "N/A" ? "None — final stage" : "Senior Deputy Dean (SDD)"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
