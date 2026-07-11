"use client";

import { Badge } from "@/src/components/ui/Badge";
import { ApprovalActions } from "@/src/components/leave/ApprovalActions";
import { useSddPortal } from "@/src/hooks/useSddPortal";
import { LEAVE_TYPE_LABELS } from "@/src/types";
import styles from "../sdd.module.css";

export function Pending({ portal }: { portal: ReturnType<typeof useSddPortal> }) {
  const { pending, approve, reject } = portal;

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>All applications below have cleared Troop Commander and Squadron Commander review. Only your
        decision remains.</strong>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Index</th>
              <th>Dept</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Reason</th>
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
                  <td>{l.department}</td>
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
                  <td>{l.reason.length > 35 ? `${l.reason.slice(0, 35)}…` : l.reason}</td>
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
