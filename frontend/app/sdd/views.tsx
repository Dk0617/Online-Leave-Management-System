"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Hourglass, Loader2, LogIn, XCircle } from "lucide-react";
import { StatTile, Badge, Button, Toast, SearchInput, SortableTh } from "@/src/components/ui";
import { ApprovalActions, LeaveDetailModal } from "@/src/components/leave";
import { LeaveListDrilldownModal } from "@/src/components/leaveStats";
import { ExitDrilldownModal, ExitEntry, ClickableStatCard } from "@/src/components/exitStats";
import { useSddPortal } from "@/src/hooks/useSddPortal";
import { useDecisionToast } from "@/src/hooks/useDecisionToast";
import { useSearchFilter, useSort, sortRows } from "@/src/hooks/useTableControls";
import { isApproved, isRejected, isToday } from "@/src/api";
import { LEAVE_TYPE_LABELS, LeaveRequest } from "@/src/types";
import styles from "@/src/portal.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useSddPortal> }) {
  const { pending, history, pipeline, movements, approve, reject, error, refresh } = portal;
  const approvedTodayLeaves = history.filter((l) => l.sddStatus === "Approved" && isToday(l.sddApprovedAt));
  const rejectedTodayLeaves = history.filter((l) => l.sddStatus === "Rejected" && isToday(l.sddApprovedAt));
  const { query: pendingQuery, setQuery: setPendingQuery, filtered: searchedPending } = useSearchFilter(
    pending,
    (l) => [l.studentName, l.indexNumber]
  );
  const { sortKey: pendingSortKey, sortDir: pendingSortDir, toggleSort: togglePendingSort } = useSort();
  const sortedPending = sortRows(searchedPending, pendingSortKey, pendingSortDir, {
    student: (l) => l.studentName,
    index: (l) => l.indexNumber,
    type: (l) => l.type,
    from: (l) => l.startDate,
    to: (l) => l.endDate,
  });
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [leaveDrilldown, setLeaveDrilldown] = useState<{ title: string; leaves: LeaveRequest[] } | null>(null);
  const [movementDrilldown, setMovementDrilldown] = useState<{ title: string; entries: ExitEntry[] } | null>(null);
  const { toast, notify } = useDecisionToast();

  // Officer cadets who've actually returned to campus today, from the real
  // gate movement log.
  const today = todayStr();
  const todayEntryEntries: ExitEntry[] = movements
    .filter((m) => m.direction === "Entry" && m.timestamp.startsWith(today))
    .map((m) => ({
      id: m.id,
      indexNumber: m.indexNumber,
      studentName: m.studentName,
      studentType: m.studentType,
      department: m.department,
      direction: "Entry",
      timestamp: m.timestamp,
      lateEntry: m.lateEntry,
    }));
  // A standing record (not just today's) of every officer cadet who
  // returned after their leave's own approved end date/time — gate staff
  // still let them in (see backend/controllers/gatecontrol.js
  // logMovement), but it's flagged here for oversight.
  const lateReturnEntries: ExitEntry[] = movements
    .filter((m) => m.direction === "Entry" && m.lateEntry)
    .map((m) => ({
      id: m.id,
      indexNumber: m.indexNumber,
      studentName: m.studentName,
      studentType: m.studentType,
      department: m.department,
      direction: "Entry",
      timestamp: m.timestamp,
      lateEntry: true,
    }));

  return (
    <div>
      {toast && <Toast message={toast.message} tone={toast.tone} />}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          <span>Couldn&apos;t load SDD data: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      )}
      <div className={styles.infoBanner}>
        <strong>Final Authority — Officer Cadet Leaves Only:</strong> Applications reach you only after <em>both</em>{" "}
        the Troop Commander and Squadron Commander have approved. Your approval is the final step — the officer
        cadet can then download an official leave pass PDF.
      </div>

      <div className={styles.statGrid}>
        <ClickableStatCard onClick={() => setLeaveDrilldown({ title: "Awaiting You", leaves: pending })}>
          <StatTile label="Awaiting You (click for details)" value={pending.length} tone="amber" icon={<Hourglass size={20} />} />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setLeaveDrilldown({ title: "Fully Approved Today", leaves: approvedTodayLeaves })}>
          <StatTile
            label="Fully Approved Today (click for details)"
            value={approvedTodayLeaves.length}
            tone="green"
            icon={<CheckCircle2 size={20} />}
          />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setLeaveDrilldown({ title: "Rejected Today", leaves: rejectedTodayLeaves })}>
          <StatTile
            label="Rejected Today (click for details)"
            value={rejectedTodayLeaves.length}
            tone="red"
            icon={<XCircle size={20} />}
          />
        </ClickableStatCard>
        <StatTile label="In Progress" value={pipeline.length} icon={<Loader2 size={20} />} />
        <ClickableStatCard
          onClick={() => setMovementDrilldown({ title: "Entries Today — Officer Cadets", entries: todayEntryEntries })}
        >
          <StatTile
            label="Entries Today (click for details)"
            value={todayEntryEntries.length}
            tone="green"
            icon={<LogIn size={20} />}
          />
        </ClickableStatCard>
        <ClickableStatCard
          onClick={() => setMovementDrilldown({ title: "Late Returns — Officer Cadets", entries: lateReturnEntries })}
        >
          <StatTile
            label="Late Returns (click for details)"
            value={lateReturnEntries.length}
            tone="red"
            icon={<AlertTriangle size={20} />}
          />
        </ClickableStatCard>
      </div>

      {leaveDrilldown && (
        <LeaveListDrilldownModal
          title={leaveDrilldown.title}
          leaves={leaveDrilldown.leaves}
          onClose={() => setLeaveDrilldown(null)}
        />
      )}
      {movementDrilldown && (
        <ExitDrilldownModal
          title={movementDrilldown.title}
          entries={movementDrilldown.entries}
          onClose={() => setMovementDrilldown(null)}
        />
      )}

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] px-4 py-2.5 text-xs text-[var(--ok)]">
        ⭐ Your approval grants the official leave pass. All 3 stages must be complete before an officer cadet can exit
        campus.
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[var(--white)]">Ready for Final Approval</h2>
        <SearchInput
          value={pendingQuery}
          onChange={setPendingQuery}
          placeholder="Search by name or index number…"
          className="w-full sm:w-72"
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <SortableTh label="Student" sortKey="student" activeSortKey={pendingSortKey} sortDir={pendingSortDir} onSort={togglePendingSort} />
              <SortableTh label="Index" sortKey="index" activeSortKey={pendingSortKey} sortDir={pendingSortDir} onSort={togglePendingSort} />
              <SortableTh label="Leave Type" sortKey="type" activeSortKey={pendingSortKey} sortDir={pendingSortDir} onSort={togglePendingSort} />
              <SortableTh label="From" sortKey="from" activeSortKey={pendingSortKey} sortDir={pendingSortDir} onSort={togglePendingSort} />
              <SortableTh label="To" sortKey="to" activeSortKey={pendingSortKey} sortDir={pendingSortDir} onSort={togglePendingSort} />
              <th>Troop</th>
              <th>Squadron</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPending.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                  {pending.length === 0 ? "No applications awaiting your approval." : "No applications match your search."}
                </td>
              </tr>
            ) : (
              sortedPending.map((l) => (
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
                    <ApprovalActions
                      onApprove={() => approve(l.id)}
                      onReject={(remarks) => reject(l.id, remarks)}
                      onSuccess={(decision) => notify(l, decision)}
                    />
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
  const { query, setQuery, filtered } = useSearchFilter(history, (l) => [l.studentName, l.indexNumber]);
  const { sortKey, sortDir, toggleSort } = useSort();
  const sorted = sortRows(filtered, sortKey, sortDir, {
    student: (l) => l.studentName,
    index: (l) => l.indexNumber,
    type: (l) => l.type,
    from: (l) => l.startDate,
    decision: (l) => l.sddStatus,
  });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name or index number…" className="w-64" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <SortableTh label="Student" sortKey="student" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Index" sortKey="index" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Leave Type" sortKey="type" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="From" sortKey="from" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Your Decision" sortKey="decision" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th>Reason</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  {history.length === 0 ? "No history." : "No history matches your search."}
                </td>
              </tr>
            ) : (
              sorted.map((l) => (
              <tr key={l.id}>
                <td>{l.studentName}</td>
                <td>{l.indexNumber}</td>
                <td>{LEAVE_TYPE_LABELS[l.type]}</td>
                <td>{l.startDate}</td>
                <td>
                  <Badge tone={tone(l.sddStatus)}>{l.sddStatus}</Badge>
                </td>
                <td className="max-w-[200px] text-[var(--muted)]">{l.sddComment || "—"}</td>
                <td className="text-[var(--muted)]">{l.sddApprovedAt || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function Overview({ portal }: { portal: ReturnType<typeof useSddPortal> }) {
  const { overview } = portal;

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Full System Overview:</strong> All officer cadet leaves in the system across all stages.
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
                  No officer cadet leave applications in system.
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
