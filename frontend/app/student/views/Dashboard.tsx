"use client";

import { useState } from "react";
import { StatTile } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";
import { LeaveDetailModal } from "@/src/components/leave/LeaveDetailModal";
import { useAuth } from "@/src/context/AuthContext";
import { useStudentPortal } from "@/src/hooks/useStudentPortal";
import { isApproved, isRejected } from "@/src/lib/leaveStatus";
import { downloadLeavePassPdf } from "@/src/lib/pdf";
import { LeaveRequest, LEAVE_TYPE_LABELS } from "@/src/types";
import styles from "../student.module.css";

function statusBadge(status: string) {
  const tone = status === "Approved" ? "green" : status === "Rejected" ? "red" : status === "N/A" ? "gray" : "amber";
  return <Badge tone={tone}>{status}</Badge>;
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useStudentPortal> }) {
  const { user } = useAuth();
  const { leaves } = portal;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  const isCadet = user?.studentType === "CADET";
  const total = leaves.length;
  const approved = leaves.filter(isApproved).length;
  const rejected = leaves.filter(isRejected).length;
  const pending = total - approved - rejected;

  return (
    <div>
      <div className={`${styles.flowBanner} ${isCadet ? "cadet" : ""}`}>
        <div className="text-xl">{isCadet ? "🎖️" : "🏠"}</div>
        <div>
          <strong className="text-white">
            {isCadet ? "Cadet Leave Flow:" : "Day Scholar Leave Flow:"}
          </strong>{" "}
          {isCadet
            ? "Applications go → Troop Commander → Squadron Commander → Senior Deputy Dean → PDF download when fully approved."
            : "Your applications go → HOD → Troop Commander → PDF download available once both approve."}
        </div>
      </div>

      <div className={styles.statGrid}>
        <StatTile icon="📋" label="Total Applied" value={total} />
        <StatTile icon="⏳" label="Pending" value={pending} tone="amber" />
        <StatTile icon="✅" label="Fully Approved" value={approved} tone="green" />
        <StatTile icon="❌" label="Rejected" value={rejected} tone="red" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Applied</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              {isCadet ? (
                <>
                  <th>Troop Commander</th>
                  <th>Squadron Commander</th>
                  <th>Senior Deputy Dean</th>
                </>
              ) : (
                <>
                  <th>HOD</th>
                  <th>Troop Commander</th>
                </>
              )}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                  No applications yet.
                </td>
              </tr>
            ) : (
              leaves.map((l) => (
                <tr key={l.id}>
                  <td>{l.appliedDate}</td>
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
                  {isCadet ? (
                    <>
                      <td>{statusBadge(l.troopStatus)}</td>
                      <td>{statusBadge(l.sqnStatus)}</td>
                      <td>{statusBadge(l.sddStatus)}</td>
                    </>
                  ) : (
                    <>
                      <td>{statusBadge(l.hodStatus)}</td>
                      <td>{statusBadge(l.troopStatus)}</td>
                    </>
                  )}
                  <td className="space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => setSelected(l)}
                      className="rounded-md border border-[rgba(74,144,217,0.2)] bg-[rgba(74,144,217,0.15)] px-2.5 py-1 text-[11px] font-bold text-[var(--sky)]"
                    >
                      View
                    </button>
                    {isApproved(l) && (
                      <button
                        onClick={() => downloadLeavePassPdf(l, portal.profile?.photo)}
                        className="rounded-md border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.15)] px-2.5 py-1 text-[11px] font-bold text-[var(--gold)]"
                      >
                        📥 PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <LeaveDetailModal
          leave={selected}
          onClose={() => setSelected(null)}
          onDownloadPdf={
            isApproved(selected) ? () => downloadLeavePassPdf(selected, portal.profile?.photo) : undefined
          }
        />
      )}
    </div>
  );
}
