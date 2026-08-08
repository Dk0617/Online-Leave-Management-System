"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Home, LogIn, LogOut, Medal, XCircle } from "lucide-react";
import { StatTile, Badge, Button, Toast, SearchInput, SortableTh } from "@/src/components/ui";
import { ApprovalActions, LeaveDetailModal } from "@/src/components/leave";
import { BlockLeaveRosterModal, blockLeaveTone } from "@/src/components/blockLeave";
import { ExitDrilldownModal, ExitEntry, ClickableStatCard } from "@/src/components/exitStats";
import { LeaveListDrilldownModal } from "@/src/components/leaveStats";
import { useAuth } from "@/src/AuthContext";
import { useTroopPortal } from "@/src/hooks/useTroopPortal";
import { useDecisionToast } from "@/src/hooks/useDecisionToast";
import { useSearchFilter, useSort, sortRows, type SortDirection } from "@/src/hooks/useTableControls";
import { isToday } from "@/src/api";
import { BlockLeaveRequest, LEAVE_TYPE_LABELS, LeaveRequest } from "@/src/types";
import styles from "@/src/portal.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { user } = useAuth();
  const { allPending, history, movements, approve, reject, error, refresh } = portal;
  const intakesText = user?.intakes?.length ? user.intakes.map((i) => `Intake ${i}`).join(", ") : "no intakes assigned yet";
  const approvedTodayLeaves = history.filter((l) => l.troopStatus === "Approved" && isToday(l.troopApprovedAt));
  const rejectedTodayLeaves = history.filter((l) => l.troopStatus === "Rejected" && isToday(l.troopApprovedAt));
  const dsPendingLeaves = allPending.filter((l) => l.studentType === "DAY_SCHOLAR");
  const cdPendingLeaves = allPending.filter((l) => l.studentType === "CADET");
  const { query: pendingQuery, setQuery: setPendingQuery, filtered: searchedPending } = useSearchFilter(
    allPending,
    (l) => [l.studentName, l.indexNumber]
  );
  const pendingSort = useSort();
  const emergencyPending = searchedPending.filter((l) => l.priority === "emergency");
  const otherPending = searchedPending.filter((l) => l.priority !== "emergency");
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [drilldown, setDrilldown] = useState<{ title: string; entries: ExitEntry[] } | null>(null);
  const [leaveDrilldown, setLeaveDrilldown] = useState<{ title: string; leaves: LeaveRequest[] } | null>(null);
  const { toast, notify } = useDecisionToast();

  const today = todayStr();
  const todayExitEntries: ExitEntry[] = movements
    .filter((m) => m.direction === "Exit" && m.timestamp.startsWith(today))
    .map((m) => ({
      id: m.id,
      indexNumber: m.indexNumber,
      studentName: m.studentName,
      studentType: m.studentType,
      department: m.department,
      direction: "Exit",
      timestamp: m.timestamp,
    }));
  // Students who've actually returned to campus today, from the real gate
  // movement log.
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
  // A standing record (not just today's) of every student who returned
  // after their leave's own approved end date/time — gate staff still let
  // them in (see backend/controllers/gatecontrol.js logMovement), but it's
  // flagged here for oversight.
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
          <span>Couldn&apos;t load Troop data: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      )}
      <div className={styles.infoBanner}>
        <strong>Dual Role:</strong> You approve <strong>Day Scholar</strong> leaves at <em>Stage 2</em> (after
        HOD approval) and <strong>Officer Cadet</strong> leaves at <em>Stage 1</em> (direct from student) —
        except Officer Cadet <strong>Academic Leave</strong> itself, which skips you entirely and routes
        HOD → Squadron Commander instead. You&apos;ll still see its linked <strong>Personal Leave</strong> as
        its own separate application, since that one always comes to you first. Only students from your
        assigned intake(s) appear here — {intakesText}.
      </div>

      <div className={styles.statGrid}>
        <ClickableStatCard onClick={() => setLeaveDrilldown({ title: "Day Scholar Pending", leaves: dsPendingLeaves })}>
          <StatTile label="DS Pending (click for details)" value={dsPendingLeaves.length} tone="amber" icon={<Home size={20} />} />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setLeaveDrilldown({ title: "Officer Cadet Pending", leaves: cdPendingLeaves })}>
          <StatTile
            label="Officer Cadet Pending (click for details)"
            value={cdPendingLeaves.length}
            tone="amber"
            icon={<Medal size={20} />}
          />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setLeaveDrilldown({ title: "Approved Today", leaves: approvedTodayLeaves })}>
          <StatTile
            label="Approved Today (click for details)"
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
        <ClickableStatCard onClick={() => setDrilldown({ title: "Exits Today — Your Troop", entries: todayExitEntries })}>
          <StatTile label="Exits Today (click for details)" value={todayExitEntries.length} tone="blue" icon={<LogOut size={20} />} />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setDrilldown({ title: "Entries Today — Your Troop", entries: todayEntryEntries })}>
          <StatTile
            label="Entries Today (click for details)"
            value={todayEntryEntries.length}
            tone="green"
            icon={<LogIn size={20} />}
          />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setDrilldown({ title: "Late Returns — Your Troop", entries: lateReturnEntries })}>
          <StatTile
            label="Late Returns (click for details)"
            value={lateReturnEntries.length}
            tone="red"
            icon={<AlertTriangle size={20} />}
          />
        </ClickableStatCard>
      </div>

      {drilldown && (
        <ExitDrilldownModal
          title={drilldown.title}
          entries={drilldown.entries}
          onClose={() => setDrilldown(null)}
        />
      )}
      {leaveDrilldown && (
        <LeaveListDrilldownModal
          title={leaveDrilldown.title}
          leaves={leaveDrilldown.leaves}
          onClose={() => setLeaveDrilldown(null)}
        />
      )}

      <div className="mb-4 flex justify-end">
        <SearchInput
          value={pendingQuery}
          onChange={setPendingQuery}
          placeholder="Search pending by name or index…"
          className="w-full sm:w-72"
        />
      </div>

      {emergencyPending.length > 0 && (
        <>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--white)]">
            🚨 Emergency Leaves <Badge tone="red">{emergencyPending.length}</Badge>
          </h2>
          <div className="mb-6">
            <TroopPendingTable
              leaves={emergencyPending}
              onView={setSelected}
              onApprove={approve}
              onReject={reject}
              notify={notify}
              sort={pendingSort}
            />
          </div>
        </>
      )}

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">
        {emergencyPending.length > 0 ? "Other Pending — Your Troop" : "All Pending — Your Troop"}
      </h2>
      <TroopPendingTable
        leaves={otherPending}
        onView={setSelected}
        onApprove={approve}
        onReject={reject}
        notify={notify}
        sort={pendingSort}
      />

      {selected && <LeaveDetailModal leave={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// Emergency Leave gets its own section above everything else, same
// reasoning as hod/views.tsx PendingTable.
function TroopPendingTable({
  leaves,
  onView,
  onApprove,
  onReject,
  notify,
  sort,
}: {
  leaves: LeaveRequest[];
  onView: (l: LeaveRequest) => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, comment?: string) => Promise<void>;
  notify: (leave: LeaveRequest, decision: "Approved" | "Rejected") => void;
  sort: { sortKey?: string; sortDir: SortDirection; toggleSort: (key: string) => void };
}) {
  const sorted = sortRows(leaves, sort.sortKey, sort.sortDir, {
    student: (l) => l.studentName,
    studentType: (l) => l.studentType,
    type: (l) => l.type,
    from: (l) => l.startDate,
    to: (l) => l.endDate,
  });
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <SortableTh label="Student" sortKey="student" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh
              label="Type"
              sortKey="studentType"
              activeSortKey={sort.sortKey}
              sortDir={sort.sortDir}
              onSort={sort.toggleSort}
            />
            <SortableTh label="Leave Type" sortKey="type" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="From" sortKey="from" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="To" sortKey="to" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <th>Stage</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                {leaves.length === 0 ? "No pending applications." : "No applications match your search."}
              </td>
            </tr>
          ) : (
            sorted.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.studentName}
                  <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                </td>
                <td>
                  <Badge tone={l.studentType === "CADET" ? "purple" : "blue"}>
                    {l.studentType === "CADET" ? "Officer Cadet" : "Day Scholar"}
                  </Badge>
                </td>
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
                <td className="text-xs text-[var(--muted)]">
                  {l.studentType === "DAY_SCHOLAR" ? "Stage 2 (Final)" : "Stage 1 of 3"}
                </td>
                <td className="space-x-1.5 whitespace-nowrap">
                  <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => onView(l)}>
                    View
                  </Button>
                  <ApprovalActions
                    onApprove={() => onApprove(l.id)}
                    onReject={(remarks) => onReject(l.id, remarks)}
                    onSuccess={(decision) => notify(l, decision)}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DayScholarQueue({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { dayScholarPending, approve, reject } = portal;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const { toast, notify } = useDecisionToast();
  const { sortKey, sortDir, toggleSort } = useSort();
  const sortedPending = sortRows(dayScholarPending, sortKey, sortDir, {
    student: (l) => l.studentName,
    index: (l) => l.indexNumber,
    type: (l) => l.type,
    from: (l) => l.startDate,
    to: (l) => l.endDate,
  });

  return (
    <div>
      {toast && <Toast message={toast.message} tone={toast.tone} />}
      <div className={styles.infoBanner}>
        <strong>Day Scholar — Stage 2:</strong> These leaves have already been approved by the HOD. Your
        approval finalises it. Student can then download the PDF.
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <SortableTh label="Student" sortKey="student" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Index" sortKey="index" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Leave Type" sortKey="type" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="From" sortKey="from" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="To" sortKey="to" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th>HOD Decision</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPending.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No Day Scholar leaves awaiting approval.
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
                    <Badge tone="green">HOD Approved</Badge>
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

export function CadetQueue({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { cadetPending, approve, reject } = portal;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const { toast, notify } = useDecisionToast();
  const { sortKey, sortDir, toggleSort } = useSort();
  const sortedPending = sortRows(cadetPending, sortKey, sortDir, {
    student: (l) => l.studentName,
    index: (l) => l.indexNumber,
    type: (l) => l.type,
    from: (l) => l.startDate,
    to: (l) => l.endDate,
  });

  return (
    <div>
      {toast && <Toast message={toast.message} tone={toast.tone} />}
      <div className={styles.infoBanner}>
        <strong>Officer Cadet — Stage 1:</strong> After your approval, applications move to the Squadron Commander.
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <SortableTh label="Student" sortKey="student" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Index" sortKey="index" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Leave Type" sortKey="type" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="From" sortKey="from" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="To" sortKey="to" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPending.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  No Officer Cadet leaves awaiting approval.
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

type TroopHistoryEntry = ReturnType<typeof useTroopPortal>["history"][number];

function HistoryTable({
  rows,
  emptyMessage,
  sort,
}: {
  rows: TroopHistoryEntry[];
  emptyMessage: string;
  sort: { sortKey?: string; sortDir: SortDirection; toggleSort: (key: string) => void };
}) {
  const sorted = sortRows(rows, sort.sortKey, sort.sortDir, {
    student: (l) => l.studentName,
    intake: (l) => l.intake ?? "",
    type: (l) => l.type,
    from: (l) => l.startDate,
    decision: (l) => l.troopStatus,
  });
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <SortableTh label="Student" sortKey="student" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="Intake" sortKey="intake" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="Leave Type" sortKey="type" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="From" sortKey="from" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh
              label="Your Decision"
              sortKey="decision"
              activeSortKey={sort.sortKey}
              sortDir={sort.sortDir}
              onSort={sort.toggleSort}
            />
            <th>Reason</th>
            <th>Next Stage</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.studentName}
                  <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                </td>
                <td>{l.intake ? `Intake ${l.intake}` : "—"}</td>
                <td>{LEAVE_TYPE_LABELS[l.type]}</td>
                <td>{l.startDate}</td>
                <td>
                  <Badge tone={tone(l.troopStatus)}>{l.troopStatus}</Badge>
                </td>
                <td className="max-w-[200px] text-xs text-[var(--muted)]">{l.troopComment || "—"}</td>
                <td className="text-xs text-[var(--muted)]">
                  {l.troopStatus === "Rejected"
                    ? "Not Reached — rejected at Troop"
                    : l.studentType === "DAY_SCHOLAR"
                    ? "PDF Ready (if Approved)"
                    : "Squadron Commander"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function History({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { history } = portal;
  const dayScholarSource = history.filter((l) => l.studentType === "DAY_SCHOLAR");
  const cadetSource = history.filter((l) => l.studentType === "CADET");

  const { query: dsQuery, setQuery: setDsQuery, filtered: dayScholarHistory } = useSearchFilter(
    dayScholarSource,
    (l) => [l.studentName, l.indexNumber]
  );
  const { query: cdQuery, setQuery: setCdQuery, filtered: cadetHistory } = useSearchFilter(cadetSource, (l) => [
    l.studentName,
    l.indexNumber,
  ]);
  const dsSort = useSort();
  const cdSort = useSort();

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[var(--white)]">Day Scholar History</h2>
        <SearchInput value={dsQuery} onChange={setDsQuery} placeholder="Search by name or index number…" className="w-64" />
      </div>
      <HistoryTable rows={dayScholarHistory} emptyMessage="No Day Scholar history." sort={dsSort} />

      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[var(--white)]">Officer Cadet History</h2>
        <SearchInput value={cdQuery} onChange={setCdQuery} placeholder="Search by name or index number…" className="w-64" />
      </div>
      <HistoryTable rows={cadetHistory} emptyMessage="No Officer Cadet history." sort={cdSort} />
    </div>
  );
}

function recordStatus(l: LeaveRequest): "Fully Approved" | "Rejected" | "In Progress" {
  const statuses = [l.hodStatus, l.troopStatus, l.sqnStatus, l.sddStatus].filter((s) => s !== "N/A");
  if (statuses.some((s) => s === "Rejected")) return "Rejected";
  if (statuses.length > 0 && statuses.every((s) => s === "Approved")) return "Fully Approved";
  return "In Progress";
}

// Read-only archive: every leave from every student — cadets and day
// scholars, any type — regardless of who approves it. Matches the
// real-world practice of all leave paperwork ultimately being kept on
// file in the Troop Commander's office. Loaded on demand (not on every
// dashboard visit) since it's a system-wide, unbounded query.
export function AllRecords({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { records, recordsLoading, recordsLoaded, recordsError, loadRecords } = portal;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    if (!recordsLoaded && !recordsLoading) loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { query, setQuery, filtered } = useSearchFilter(records, (l) => [l.studentName, l.indexNumber]);
  const { sortKey, sortDir, toggleSort } = useSort();
  const sorted = sortRows(filtered, sortKey, sortDir, {
    student: (l) => l.studentName,
    studentType: (l) => l.studentType,
    type: (l) => l.type,
    from: (l) => l.startDate,
    to: (l) => l.endDate,
    status: (l) => recordStatus(l),
  });

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>All Records:</strong> Every leave application from every student — officer cadets and day scholars,
        every leave type — kept here for reference regardless of who approves it. Read-only.
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name or index number…" className="w-64" />
        <Button variant="secondary" className="!text-xs" onClick={() => loadRecords()} disabled={recordsLoading}>
          {recordsLoading ? "Loading…" : "🔄 Refresh"}
        </Button>
      </div>

      {recordsError && (
        <div className="mb-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          Couldn&apos;t load records: {recordsError}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <SortableTh label="Student" sortKey="student" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh
                label="Type"
                sortKey="studentType"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <SortableTh label="Leave Type" sortKey="type" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="From" sortKey="from" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="To" sortKey="to" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Status" sortKey="status" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsLoading && !recordsLoaded ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  Loading records…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No records found.
                </td>
              </tr>
            ) : (
              sorted.map((l) => {
                const status = recordStatus(l);
                return (
                  <tr key={l.id}>
                    <td>
                      {l.studentName}
                      <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                    </td>
                    <td>
                      <Badge tone={l.studentType === "CADET" ? "purple" : "blue"}>
                        {l.studentType === "CADET" ? "Officer Cadet" : "Day Scholar"}
                      </Badge>
                    </td>
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
                      <Badge tone={status === "Fully Approved" ? "green" : status === "Rejected" ? "red" : "amber"}>
                        {status}
                      </Badge>
                    </td>
                    <td>
                      <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => setSelected(l)}>
                        View
                      </Button>
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

// ==================================================================
// Block Leave — becomes visible here only once the HOD has already
// approved the whole roster; one Troop Commander decision then settles it
// for every student on it. See backend/models/BlockLeave.js.
// ==================================================================

export function BlockLeaveQueue({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { blockLeavePending, blockLeaveHistory, approveBlockLeave, rejectBlockLeave, error, refresh } = portal;
  const [viewing, setViewing] = useState<BlockLeaveRequest | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "green" | "red" } | null>(null);

  function notify(block: BlockLeaveRequest, decision: "Approved" | "Rejected") {
    setToast({
      message: `Block Leave ${decision} — ${block.department} (${block.students.length} students)`,
      tone: decision === "Approved" ? "green" : "red",
    });
    setTimeout(() => setToast(null), 5000);
  }

  return (
    <div>
      {toast && <Toast message={toast.message} tone={toast.tone} />}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          <span>Couldn&apos;t load Block Leave data: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      )}
      <div className={styles.infoBanner}>
        <strong>Block Leave:</strong> a roster of Day Scholars from one department, already approved by their
        HOD. Your decision here approves or rejects the whole roster at once — this is the final stage.
      </div>

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">Pending Block Leaves</h2>
      <div className="mb-8 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Department</th>
              <th>From</th>
              <th>To</th>
              <th>Students</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {blockLeavePending.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  No Block Leaves pending.
                </td>
              </tr>
            ) : (
              blockLeavePending.map((b) => (
                <tr key={b.id}>
                  <td>{b.department}</td>
                  <td>
                    {b.startDate} {b.startTime}
                  </td>
                  <td>
                    {b.endDate} {b.endTime}
                  </td>
                  <td>{b.students.length}</td>
                  <td className="max-w-[220px] text-xs text-[var(--muted)]">{b.reason}</td>
                  <td className="space-x-1.5 whitespace-nowrap">
                    <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => setViewing(b)}>
                      View Roster
                    </Button>
                    <ApprovalActions
                      onApprove={() => approveBlockLeave(b.id)}
                      onReject={(remarks) => rejectBlockLeave(b.id, remarks)}
                      onSuccess={(decision) => notify(b, decision)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">Block Leave History</h2>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Department</th>
              <th>From</th>
              <th>To</th>
              <th>Students</th>
              <th>HOD</th>
              <th>Your Decision</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {blockLeaveHistory.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No Block Leave history yet.
                </td>
              </tr>
            ) : (
              blockLeaveHistory.map((b) => (
                <tr key={b.id}>
                  <td>{b.department}</td>
                  <td>
                    {b.startDate} {b.startTime}
                  </td>
                  <td>
                    {b.endDate} {b.endTime}
                  </td>
                  <td>{b.students.length}</td>
                  <td>
                    <Badge tone={blockLeaveTone(b.hodStatus)}>{b.hodStatus}</Badge>
                  </td>
                  <td>
                    <Badge tone={blockLeaveTone(b.troopStatus)}>{b.troopStatus}</Badge>
                  </td>
                  <td>
                    <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => setViewing(b)}>
                      View Roster
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewing && <BlockLeaveRosterModal block={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
