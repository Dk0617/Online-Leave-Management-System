"use client";

import { Badge } from "@/src/components/ui/Badge";
import { ApprovalActions } from "@/src/components/leave/ApprovalActions";
import { useTroopPortal } from "@/src/hooks/useTroopPortal";
import { LEAVE_TYPE_LABELS } from "@/src/types";
import styles from "../troop.module.css";

export function CadetQueue({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { cadetPending, approve, reject } = portal;

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Cadet — Stage 1:</strong> After your approval, applications move to the Squadron Commander.
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Index</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cadetPending.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  No Cadet leaves awaiting approval.
                </td>
              </tr>
            ) : (
              cadetPending.map((l) => (
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
