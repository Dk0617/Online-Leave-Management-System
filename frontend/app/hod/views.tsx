"use client";

import { useState } from "react";
import { StatTile, Badge, Button } from "@/src/components/ui";
import { ApprovalActions, LeaveDetailModal } from "@/src/components/leave";
import { useHodPortal } from "@/src/hooks/useHodPortal";
import { LEAVE_TYPE_LABELS, LeaveRequest } from "@/src/types";
import styles from "@/src/portal.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useHodPortal> }) {
  const { pending, history, approve, reject, error, refresh } = portal;
  const approvedByMe = history.filter((l) => l.hodStatus === "Approved").length;
  const rejectedByMe = history.filter((l) => l.hodStatus === "Rejected").length;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          <span>Couldn&apos;t load HOD data: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      )}
      <div className={styles.infoBanner}>
        <strong>Your Role:</strong> You approve <strong>Day Scholar</strong> leave applications at Stage 1 —
        after your approval, they move to the Troop Commander. You also approve <strong>Officer Cadet Academic
        Leave</strong> (matched to your department), which skips Troop Commander entirely and moves straight
        to the Squadron Commander instead. Only students in your department appear here.
      </div>

      <div className={styles.statGrid}>
        <StatTile label="Pending" value={pending.length} tone="amber" />
        <StatTile label="Approved" value={approvedByMe} tone="green" />
        <StatTile label="Rejected" value={rejectedByMe} tone="red" />
        <StatTile label="Total" value={history.length + pending.length} />
      </div>

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">Pending Applications</h2>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Index</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Applied</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No applications.
                </td>
              </tr>
            ) : (
              pending.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.studentName}
                    <div className="text-[10px] text-[var(--muted)]">
                      {l.studentType === "CADET" ? "🎖️ Officer Cadet" : "🏠 Day Scholar"}
                    </div>
                  </td>
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
                  <td>{l.appliedDate}</td>
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

type HodHistoryEntry = ReturnType<typeof useHodPortal>["history"][number];

function matchesSearch(l: HodHistoryEntry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return l.studentName.toLowerCase().includes(q) || l.indexNumber.toLowerCase().includes(q);
}

function HodHistoryTable({ rows, emptyMessage }: { rows: HodHistoryEntry[]; emptyMessage: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Index</th>
            <th>Type</th>
            <th>From</th>
            <th>To</th>
            <th>Your Decision</th>
            <th>Next Stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((l) => {
              // Cadet Academic Leave skips Troop Commander entirely (routed to
              // Squadron instead) — troopStatus stays "N/A" forever for it,
              // unlike a Day Scholar leave where "N/A" means "not reached yet".
              const isCadetAcademic = l.studentType === "CADET";
              return (
                <tr key={l.id}>
                  <td>{l.studentName}</td>
                  <td>{l.indexNumber}</td>
                  <td>{LEAVE_TYPE_LABELS[l.type]}</td>
                  <td>{l.startDate}</td>
                  <td>{l.endDate}</td>
                  <td>
                    <Badge tone={tone(l.hodStatus)}>{l.hodStatus}</Badge>
                  </td>
                  <td className="text-[var(--muted)]">
                    {isCadetAcademic ? (
                      <Badge tone={tone(l.sqnStatus)}>Squadron: {l.sqnStatus}</Badge>
                    ) : (
                      <Badge tone={tone(l.troopStatus)}>
                        {l.troopStatus === "N/A" ? "Pending at Troop" : l.troopStatus}
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function History({ portal }: { portal: ReturnType<typeof useHodPortal> }) {
  const { history } = portal;
  const [dsQuery, setDsQuery] = useState("");
  const [cdQuery, setCdQuery] = useState("");

  const dayScholarHistory = history.filter(
    (l) => l.studentType === "DAY_SCHOLAR" && matchesSearch(l, dsQuery)
  );
  const cadetHistory = history.filter((l) => l.studentType === "CADET" && matchesSearch(l, cdQuery));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[var(--white)]">Day Scholar History</h2>
        <div className="w-64">
          <input
            value={dsQuery}
            onChange={(e) => setDsQuery(e.target.value)}
            placeholder="🔍 Search by name or index number..."
            className={styles.input}
          />
        </div>
      </div>
      <HodHistoryTable rows={dayScholarHistory} emptyMessage="No Day Scholar history." />

      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[var(--white)]">Officer Cadet History</h2>
        <div className="w-64">
          <input
            value={cdQuery}
            onChange={(e) => setCdQuery(e.target.value)}
            placeholder="🔍 Search by name or index number..."
            className={styles.input}
          />
        </div>
      </div>
      <HodHistoryTable rows={cadetHistory} emptyMessage="No Officer Cadet history." />
    </div>
  );
}
