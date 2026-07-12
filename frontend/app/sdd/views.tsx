"use client";

import { useState } from "react";
import { StatTile, Badge, Button } from "@/src/components/ui";
import { ApprovalActions, LeaveDetailModal } from "@/src/components/leave";
import { useSddPortal } from "@/src/hooks/useSddPortal";
import { isApproved, isRejected } from "@/src/api";
import { LEAVE_TYPE_LABELS, LeaveRequest } from "@/src/types";
import styles from "@/src/portal.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useSddPortal> }) {
  const { pending, history, pipeline, approve, reject } = portal;
  const approvedByMe = history.filter((l) => l.sddStatus === "Approved").length;
  const rejectedByMe = history.filter((l) => l.sddStatus === "Rejected").length;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Final Authority — Cadet Leaves Only:</strong> Applications reach you only after <em>both</em>{" "}
        the Troop Commander and Squadron Commander have approved. Your approval is the final step — the cadet
        can then download an official leave pass PDF.
      </div>

      <div className={styles.statGrid}>
        <StatTile label="Awaiting You" value={pending.length} tone="amber" />
        <StatTile label="Fully Approved" value={approvedByMe} tone="green" />
        <StatTile label="Rejected" value={rejectedByMe} tone="red" />
        <StatTile label="In Progress" value={pipeline.length} />
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] px-4 py-2.5 text-xs text-[var(--ok)]">
        ⭐ Your approval grants the official leave pass. All 3 stages must be complete before a cadet can exit
        campus.
      </div>

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">Ready for Final Approval</h2>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Index</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Troop</th>
              <th>Squadron</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                  No applications awaiting your approval.
                </td>
              </tr>
            ) : (
              pending.map((l) => (
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
                    <Badge tone="green">Approved</Badge>
                  </td>
                  <td>
                    <Badge tone="green">Approved</Badge>
                  </td>
                  <td className="space-x-1.5 whitespace-nowrap">
                    <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => setSelected(l)}>
                      View
                    </Button>
                    <ApprovalActions onApprove={() => approve(l.id)} onReject={(remarks) => reject(l.id, remarks)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && <LeaveDetailModal leave={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export function History({ portal }: { portal: ReturnType<typeof useSddPortal> }) {
  const { history } = portal;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Index</th>
            <th>Leave Type</th>
            <th>From</th>
            <th>Your Decision</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                No history.
              </td>
            </tr>
          ) : (
            history.map((l) => (
              <tr key={l.id}>
                <td>{l.studentName}</td>
                <td>{l.indexNumber}</td>
                <td>{LEAVE_TYPE_LABELS[l.type]}</td>
                <td>{l.startDate}</td>
                <td>
                  <Badge tone={tone(l.sddStatus)}>{l.sddStatus}</Badge>
                </td>
                <td className="text-[var(--muted)]">{l.sddApprovedAt || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Overview({ portal }: { portal: ReturnType<typeof useSddPortal> }) {
  const { overview } = portal;

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Full System Overview:</strong> All cadet leaves in the system across all stages.
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Index</th>
              <th>Leave Type</th>
              <th>Applied</th>
              <th>Troop</th>
              <th>Squadron</th>
              <th>SDD</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {overview.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                  No cadet leave applications in system.
                </td>
              </tr>
            ) : (
              overview.map((l) => {
                const overall = isApproved(l) ? "Fully Approved" : isRejected(l) ? "Rejected" : "In Progress";
                return (
                  <tr key={l.id}>
                    <td>{l.studentName}</td>
                    <td>{l.indexNumber}</td>
                    <td>
                      {LEAVE_TYPE_LABELS[l.type]}
                      {l.priority === "emergency" && (
                        <span className="ml-1">
                          <Badge tone="red">🚨</Badge>
                        </span>
                      )}
                    </td>
                    <td>{l.appliedDate}</td>
                    <td>
                      <Badge tone={tone(l.troopStatus)}>{l.troopStatus}</Badge>
                    </td>
                    <td>
                      <Badge tone={tone(l.sqnStatus)}>{l.sqnStatus}</Badge>
                    </td>
                    <td>
                      <Badge tone={tone(l.sddStatus)}>{l.sddStatus}</Badge>
                    </td>
                    <td
                      className={
                        overall === "Fully Approved"
                          ? "text-[var(--ok)]"
                          : overall === "Rejected"
                          ? "text-[var(--err)]"
                          : "text-[var(--muted)]"
                      }
                    >
                      {overall}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
