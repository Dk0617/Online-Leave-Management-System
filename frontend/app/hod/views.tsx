"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardList, Eye, Hourglass, LogIn, Pencil, XCircle } from "lucide-react";
import { StatTile, Badge, Button, Toast, SearchInput, SortableTh } from "@/src/components/ui";
import { ApprovalActions, LeaveDetailModal } from "@/src/components/leave";
import { LeaveListDrilldownModal } from "@/src/components/leaveStats";
import { BlockLeaveRosterModal, blockLeaveTone } from "@/src/components/blockLeave";
import { ExitDrilldownModal, ExitEntry, ClickableStatCard } from "@/src/components/exitStats";
import { TimeSelect } from "@/src/components/TimeSelect";
import { EventCalendarView } from "@/src/components/eventCalendar";
import { useHodPortal } from "@/src/hooks/useHodPortal";
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

// What to show in the "was ..." tooltip for a corrected leave — only the
// time can differ now (see backend/controllers/leavecontrol.js
// hodCorrectDateTime, which locks the date), but this stays defensive
// about older corrections made before that restriction existed.
function correctionNote(
  currentDate: string,
  currentTime: string,
  originalDate?: string,
  originalTime?: string
): string | null {
  if (!originalDate || !originalTime) return null;
  const dateChanged = originalDate !== currentDate;
  const timeChanged = originalTime !== currentTime;
  if (!dateChanged && !timeChanged) return null;
  if (dateChanged && timeChanged) return `${originalDate} ${originalTime}`;
  return dateChanged ? originalDate : originalTime;
}

function EditedMark({ note }: { note: string | null }) {
  if (!note) return null;
  return (
    <span
      title={`Edited by HOD — was ${note}`}
      className="ml-1.5 inline-flex items-center rounded-full bg-[rgba(245,158,11,0.12)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--warn)] ring-1 ring-inset ring-[rgba(245,158,11,0.25)]"
    >
      <span aria-hidden>✏️</span>
    </span>
  );
}

export function Dashboard({
  portal,
  asLecturer,
}: {
  portal: ReturnType<typeof useHodPortal>;
  // Set by the Lecturer portal (see app/lecturer/page.tsx), which reuses
  // this same screen — swaps the HOD-specific "your department" framing
  // for one that makes sense when you're only here because you're
  // currently covering someone else's queue.
  asLecturer?: boolean;
}) {
  const { pending, history, movements, approve, reject, correctDateTime, error, refresh } = portal;
  const approvedTodayLeaves = history.filter((l) => l.hodStatus === "Approved" && isToday(l.hodApprovedAt));
  const rejectedTodayLeaves = history.filter((l) => l.hodStatus === "Rejected" && isToday(l.hodApprovedAt));
  const { query: pendingQuery, setQuery: setPendingQuery, filtered: searchedPending } = useSearchFilter(
    pending,
    (l) => [l.studentName, l.indexNumber]
  );
  const pendingSort = useSort();
  const emergencyPending = searchedPending.filter((l) => l.priority === "emergency");
  const otherPending = searchedPending.filter((l) => l.priority !== "emergency");
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [correcting, setCorrecting] = useState<LeaveRequest | null>(null);
  const [drilldown, setDrilldown] = useState<{ title: string; leaves: LeaveRequest[] } | null>(null);
  const [movementDrilldown, setMovementDrilldown] = useState<{ title: string; entries: ExitEntry[] } | null>(null);
  // Date/time correction is an HOD-only action (see hodRoutes.js) — hidden
  // entirely for a Lecturer covering the queue, rather than exposing a
  // button that would just 403.
  const onCorrect = asLecturer ? undefined : setCorrecting;
  const { toast, notify } = useDecisionToast();

  // Students from this department who've actually returned to campus
  // today, from the real gate movement log.
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

  return (
    <div>
      {toast && <Toast message={toast.message} tone={toast.tone} />}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          <span>Couldn&apos;t load HOD data: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      )}
      <div className={styles.infoBanner}>
        {asLecturer ? (
          <>
            <strong>Your Role:</strong> You only see leaves here while you&apos;re actively covering an HOD who
            is marked unavailable — you approve their <strong>Day Scholar</strong> leave applications at Stage
            1 and their <strong>Officer Cadet Academic Leave</strong>, exactly as that HOD normally would. If
            no HOD is currently unavailable (or someone more senior than you is covering instead), this list
            will be empty.
          </>
        ) : (
          <>
            <strong>Your Role:</strong> You approve <strong>Day Scholar</strong> leave applications at Stage 1
            — after your approval, they move to the Troop Commander. You also approve{" "}
            <strong>Officer Cadet Academic Leave</strong> (matched to your department), which skips Troop
            Commander entirely and moves straight to the Squadron Commander instead. Only students in your
            department appear here.
          </>
        )}
      </div>

      <div className={styles.statGrid}>
        <ClickableStatCard onClick={() => setDrilldown({ title: "Pending", leaves: pending })}>
          <StatTile label="Pending (click for details)" value={pending.length} tone="amber" icon={<Hourglass size={20} />} />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setDrilldown({ title: "Approved Today", leaves: approvedTodayLeaves })}>
          <StatTile
            label="Approved Today (click for details)"
            value={approvedTodayLeaves.length}
            tone="green"
            icon={<CheckCircle2 size={20} />}
          />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setDrilldown({ title: "Rejected Today", leaves: rejectedTodayLeaves })}>
          <StatTile
            label="Rejected Today (click for details)"
            value={rejectedTodayLeaves.length}
            tone="red"
            icon={<XCircle size={20} />}
          />
        </ClickableStatCard>
        <StatTile label="Total" value={history.length + pending.length} icon={<ClipboardList size={20} />} />
        <ClickableStatCard
          onClick={() => setMovementDrilldown({ title: "Entries Today — Your Department", entries: todayEntryEntries })}
        >
          <StatTile
            label="Entries Today (click for details)"
            value={todayEntryEntries.length}
            tone="green"
            icon={<LogIn size={20} />}
          />
        </ClickableStatCard>
      </div>

      {drilldown && (
        <LeaveListDrilldownModal
          title={drilldown.title}
          leaves={drilldown.leaves}
          onClose={() => setDrilldown(null)}
        />
      )}
      {movementDrilldown && (
        <ExitDrilldownModal
          title={movementDrilldown.title}
          entries={movementDrilldown.entries}
          onClose={() => setMovementDrilldown(null)}
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
            <PendingTable
              leaves={emergencyPending}
              onView={setSelected}
              onApprove={approve}
              onReject={reject}
              onCorrect={onCorrect}
              notify={notify}
              sort={pendingSort}
            />
          </div>
        </>
      )}

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">
        {emergencyPending.length > 0 ? "Other Pending Applications" : "Pending Applications"}
      </h2>
      <PendingTable
        leaves={otherPending}
        onView={setSelected}
        onApprove={approve}
        onReject={reject}
        onCorrect={onCorrect}
        notify={notify}
        sort={pendingSort}
      />

      {selected && <LeaveDetailModal leave={selected} onClose={() => setSelected(null)} />}
      {correcting && (
        <CorrectDateTimeModal
          leave={correcting}
          onSave={async (input) => {
            await correctDateTime(correcting.id, input);
            setCorrecting(null);
          }}
          onClose={() => setCorrecting(null)}
        />
      )}
    </div>
  );
}

// Emergency Leave always gets its own section above everything else — an
// approver scanning the page shouldn't have to hunt for it mixed in with
// routine applications. Shared by the emergency and "other" sections above
// so both render identically apart from which leaves they're given.
function PendingTable({
  leaves,
  onView,
  onApprove,
  onReject,
  onCorrect,
  notify,
  sort,
}: {
  leaves: LeaveRequest[];
  onView: (l: LeaveRequest) => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, comment?: string) => Promise<void>;
  onCorrect?: (l: LeaveRequest) => void;
  notify: (leave: LeaveRequest, decision: "Approved" | "Rejected") => void;
  sort: { sortKey?: string; sortDir: SortDirection; toggleSort: (key: string) => void };
}) {
  const sorted = sortRows(leaves, sort.sortKey, sort.sortDir, {
    student: (l) => l.studentName,
    index: (l) => l.indexNumber,
    type: (l) => l.type,
    from: (l) => l.startDate,
    to: (l) => l.endDate,
    applied: (l) => l.appliedDate,
  });
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <SortableTh label="Student" sortKey="student" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="Index" sortKey="index" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="Leave Type" sortKey="type" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="From" sortKey="from" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="To" sortKey="to" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="Applied" sortKey="applied" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                {leaves.length === 0 ? "No applications." : "No applications match your search."}
              </td>
            </tr>
          ) : (
            sorted.map((l) => (
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
                <td className="whitespace-nowrap">
                  {l.startDate}
                  <EditedMark note={correctionNote(l.startDate, l.startTime, l.originalStartDate, l.originalStartTime)} />
                </td>
                <td className="whitespace-nowrap">
                  {l.endDate}
                  <EditedMark note={correctionNote(l.endDate, l.endTime, l.originalEndDate, l.originalEndTime)} />
                </td>
                <td>{l.appliedDate}</td>
                <td className="space-x-1.5 whitespace-nowrap">
                  <Button variant="secondary" className="!h-8 !w-8 !p-0" title="View" onClick={() => onView(l)}>
                    <Eye size={16} />
                  </Button>
                  {onCorrect && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="!h-8 !w-8 !p-0"
                      title="Edit Date/Time"
                      onClick={() => onCorrect(l)}
                    >
                      <Pencil size={16} />
                    </Button>
                  )}
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

// Lets the HOD fix a student's date/time entry mistake before approving —
// e.g. they meant 08:00 not 18:00 — instead of rejecting and making them
// reapply from scratch. Mirrors the same validation the student's own
// Apply Leave form uses (see student/views.tsx ApplyLeave), since this is
// effectively editing that same submission.
function CorrectDateTimeModal({
  leave,
  onSave,
  onClose,
}: {
  leave: LeaveRequest;
  onSave: (input: { startDate: string; startTime: string; endDate: string; endTime: string }) => Promise<void>;
  onClose: () => void;
}) {
  // The date itself can't be corrected here — only the time (see
  // backend/controllers/leavecontrol.js hodCorrectDateTime, which rejects
  // any date change) — so these are fixed, not state.
  const startDate = leave.startDate;
  const endDate = leave.endDate;
  const [startTime, setStartTime] = useState(leave.startTime);
  const [endTime, setEndTime] = useState(leave.endTime);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (!/^\d{2}:(00|30)$/.test(startTime) || !/^\d{2}:(00|30)$/.test(endTime)) {
      setError("Start and end time must be on the hour or half hour (e.g. 09:00 or 09:30).");
      return;
    }
    if (new Date(`${endDate}T${endTime}`) <= new Date(`${startDate}T${startTime}`)) {
      setError("End date/time must be after start date/time — they can't be the same.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({ startDate, startTime, endDate, endTime });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the correction");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(5,13,31,0.85)] backdrop-blur-sm">
      <div className="w-[90%] max-w-[440px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h3 className="mb-1 text-[15px] font-bold text-[var(--white)]">Correct Time</h3>
        <p className="mb-4 text-xs text-[var(--muted)]">
          {leave.studentName} ({leave.indexNumber}) — use this only to fix a time-of-day mistake (e.g. the
          student meant 08:00, not 18:00). The date itself is locked to what they applied for — reject the
          application instead if the date is wrong.
        </p>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className={styles.label}>Start Date</label>
            <div className={`${styles.input} !cursor-not-allowed opacity-60`}>{startDate}</div>
          </div>
          <div>
            <label className={styles.label}>Start Time</label>
            <TimeSelect value={startTime} onChange={setStartTime} className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>End Date</label>
            <div className={`${styles.input} !cursor-not-allowed opacity-60`}>{endDate}</div>
          </div>
          <div>
            <label className={styles.label}>End Time</label>
            <TimeSelect value={endTime} onChange={setEndTime} className={styles.input} />
          </div>
        </div>
        {error && <p className="mb-3 text-xs text-[var(--err)]">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving…" : "Save Correction"}
          </Button>
        </div>
      </div>
    </div>
  );
}

type HodHistoryEntry = ReturnType<typeof useHodPortal>["history"][number];

function HodHistoryTable({
  rows,
  emptyMessage,
  sort,
}: {
  rows: HodHistoryEntry[];
  emptyMessage: string;
  sort: { sortKey?: string; sortDir: SortDirection; toggleSort: (key: string) => void };
}) {
  const sorted = sortRows(rows, sort.sortKey, sort.sortDir, {
    student: (l) => l.studentName,
    index: (l) => l.indexNumber,
    type: (l) => l.type,
    from: (l) => l.startDate,
    to: (l) => l.endDate,
    decision: (l) => l.hodStatus,
  });
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <SortableTh label="Student" sortKey="student" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="Index" sortKey="index" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="Type" sortKey="type" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="From" sortKey="from" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
            <SortableTh label="To" sortKey="to" activeSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.toggleSort} />
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
              <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((l) => {
              // Cadet Academic Leave skips Troop Commander entirely (routed to
              // Squadron instead) — troopStatus stays "N/A" forever for it,
              // unlike a Day Scholar leave where "N/A" means "not reached yet".
              const isCadetAcademic = l.studentType === "CADET";
              return (
                <tr key={l.id}>
                  <td>{l.studentName}</td>
                  <td>{l.indexNumber}</td>
                  <td>{LEAVE_TYPE_LABELS[l.type]}</td>
                  <td className="whitespace-nowrap">
                    {l.startDate}
                    <EditedMark note={correctionNote(l.startDate, l.startTime, l.originalStartDate, l.originalStartTime)} />
                  </td>
                  <td className="whitespace-nowrap">
                    {l.endDate}
                    <EditedMark note={correctionNote(l.endDate, l.endTime, l.originalEndDate, l.originalEndTime)} />
                  </td>
                  <td>
                    <Badge tone={tone(l.hodStatus)}>{l.hodStatus}</Badge>
                  </td>
                  <td className="max-w-[200px] text-[var(--muted)]">{l.hodComment || "—"}</td>
                  <td className="text-[var(--muted)]">
                    {l.hodStatus === "Rejected" ? (
                      <Badge tone="gray">Not Reached — rejected at HOD</Badge>
                    ) : isCadetAcademic ? (
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
      <HodHistoryTable rows={dayScholarHistory} emptyMessage="No Day Scholar history." sort={dsSort} />

      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[var(--white)]">Officer Cadet History</h2>
        <SearchInput value={cdQuery} onChange={setCdQuery} placeholder="Search by name or index number…" className="w-64" />
      </div>
      <HodHistoryTable rows={cadetHistory} emptyMessage="No Officer Cadet history." sort={cdSort} />
    </div>
  );
}

// ==================================================================
// Event Calendar — mark mandatory-attendance days (e.g. a workshop) and
// bulk-reject any leave still pending the HOD's decision that overlaps
// them, instead of rejecting each one individually.
// ==================================================================

// Read-only here — Admin now creates/removes each department's Workshop
// days (see app/admin/views.tsx Calendar). The HOD only reviews what's
// marked and can still bulk-reject pending leaves overlapping a workshop —
// see EventCalendarView's onRejectOverlapping.
export function EventCalendar({ portal }: { portal: ReturnType<typeof useHodPortal> }) {
  const { events, pending, rejectOverlapping } = portal;
  return (
    <EventCalendarView
      events={events}
      editable={false}
      pending={pending}
      onRejectOverlapping={rejectOverlapping}
      infoBanner={
        <>
          <strong>Event Calendar:</strong> Sri Lanka&apos;s Poya days and national holidays (niwadu dawasa)
          are shown here automatically. Your department&apos;s Admin marks mandatory{" "}
          <strong>Workshop</strong> days — students can&apos;t apply for ordinary leave during that window,
          but are free to once it ends, even on the same day. Any Day Scholar or Officer Cadet Academic
          Leave still pending your decision that overlaps that window can be reviewed and rejected in bulk
          below — you&apos;ll see the full list first and can exclude specific requests (Emergency Leave is
          excluded by default) before confirming.
        </>
      }
    />
  );
}

// ==================================================================
// Block Leave — one HOD decision settles the whole roster at once. See
// backend/models/BlockLeave.js.
// ==================================================================

export function BlockLeaveQueue({ portal }: { portal: ReturnType<typeof useHodPortal> }) {
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
        <strong>Block Leave:</strong> a Day Scholar starts one and others in your department join it — once
        submitted, your decision here approves or rejects the whole roster at once, then it moves on to a
        Troop Commander for a second decision covering everyone.
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
              <th>Your Decision</th>
              <th>Troop Commander</th>
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
                    {b.hodStatus === "Rejected" ? (
                      <Badge tone="gray">Not Reached</Badge>
                    ) : (
                      <Badge tone={blockLeaveTone(b.troopStatus)}>{b.troopStatus}</Badge>
                    )}
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
