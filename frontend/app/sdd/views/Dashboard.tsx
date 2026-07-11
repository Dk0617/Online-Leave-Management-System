"use client";

import { StatTile } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";
import { ApprovalActions } from "@/src/components/leave/ApprovalActions";
import { useSddPortal } from "@/src/hooks/useSddPortal";
import { LEAVE_TYPE_LABELS } from "@/src/types";
import styles from "../sdd.module.css";

export function Dashboard({ portal }: { portal: ReturnType<typeof useSddPortal> }) {
  const { pending, history, pipeline, approve, reject } = portal;
  const approvedByMe = history.filter((l) => l.sddStatus === "Approved").length;
  const rejectedByMe = history.filter((l) => l.sddStatus === "Rejected").length;

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
        <StatTile label="In Pipeline" value={pipeline.length} />
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] px-4 py-2.5 text-xs text-[#4ade80]">
        ⭐ Your approval grants the official leave pass. All 3 stages must be complete before a cadet can exit
        campus.
      </div>

      <h2 className="mb-3 text-sm font-bold text-white">Ready for Final Approval</h2>
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
                  <td>
                    <ApprovalActions onApprove={() => approve(l.id)} onReject={(remarks) => reject(l.id, remarks)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
