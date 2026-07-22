"use client";

import { FormEvent, useState } from "react";
import { Card, StatTile, Badge, Button } from "@/src/components/ui";
import { ApprovalActions, LeaveDetailModal } from "@/src/components/leave";
import { LeaveListDrilldownModal } from "@/src/components/leaveStats";
import { ClickableStatCard } from "@/src/components/exitStats";
import { useHodPortal } from "@/src/hooks/useHodPortal";
import { isToday } from "@/src/api";
import { LEAVE_TYPE_LABELS, LeaveRequest } from "@/src/types";
import styles from "@/src/portal.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
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
  const { pending, history, approve, reject, error, refresh } = portal;
  const approvedTodayLeaves = history.filter((l) => l.hodStatus === "Approved" && isToday(l.hodApprovedAt));
  const rejectedTodayLeaves = history.filter((l) => l.hodStatus === "Rejected" && isToday(l.hodApprovedAt));
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [drilldown, setDrilldown] = useState<{ title: string; leaves: LeaveRequest[] } | null>(null);

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
          <StatTile label="Pending (click for details)" value={pending.length} tone="amber" />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setDrilldown({ title: "Approved Today", leaves: approvedTodayLeaves })}>
          <StatTile label="Approved Today (click for details)" value={approvedTodayLeaves.length} tone="green" />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setDrilldown({ title: "Rejected Today", leaves: rejectedTodayLeaves })}>
          <StatTile label="Rejected Today (click for details)" value={rejectedTodayLeaves.length} tone="red" />
        </ClickableStatCard>
        <StatTile label="Total" value={history.length + pending.length} />
      </div>

      {drilldown && (
        <LeaveListDrilldownModal
          title={drilldown.title}
          leaves={drilldown.leaves}
          onClose={() => setDrilldown(null)}
        />
      )}

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

// ==================================================================
// Event Calendar — mark mandatory-attendance days (e.g. a workshop) and
// bulk-reject any leave still pending the HOD's decision that overlaps
// them, instead of rejecting each one individually.
// ==================================================================

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EventCalendar({ portal }: { portal: ReturnType<typeof useHodPortal> }) {
  const { events, pending, addEvent, removeEvent, rejectOverlapping } = portal;
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventsByDate = new Map(events.map((e) => [e.date, e]));
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!selectedDate || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await addEvent(selectedDate, title.trim());
      setTitle("");
      setSelectedDate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add event");
    } finally {
      setSubmitting(false);
    }
  }

  function overlappingLeaves(date: string): LeaveRequest[] {
    return pending.filter((l) => l.startDate <= date && l.endDate >= date);
  }

  const [reviewEvent, setReviewEvent] = useState<{ id: string; date: string; title: string } | null>(null);

  async function handleConfirmReject(leaveIds: string[]) {
    if (!reviewEvent) return;
    setRejectingId(reviewEvent.id);
    setConfirmMsg(null);
    setError(null);
    try {
      const count = await rejectOverlapping(reviewEvent.id, leaveIds);
      setConfirmMsg(
        count === 0
          ? "No pending leaves overlapped this date."
          : `Rejected ${count} pending leave${count === 1 ? "" : "s"}.`
      );
      setReviewEvent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject overlapping leaves");
    } finally {
      setRejectingId(null);
    }
  }

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Event Calendar:</strong> Mark mandatory-attendance days here — e.g. a workshop every
        student in your department must attend. Any Day Scholar or Officer Cadet Academic Leave still
        pending your decision that overlaps that date can then be reviewed and rejected in bulk — you&apos;ll
        see the full list first and can exclude specific requests (e.g. an Emergency Leave) before
        confirming.
      </div>

      <Card className="mb-6 max-w-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            className="!px-3 !py-1.5"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            ‹
          </Button>
          <h3 className="text-sm font-bold text-[var(--white)]">
            {MONTH_NAMES[month]} {year}
          </h3>
          <Button
            type="button"
            variant="secondary"
            className="!px-3 !py-1.5"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            ›
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[var(--muted)]">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const date = ymd(new Date(year, month, day));
            const event = eventsByDate.get(date);
            const isToday = date === ymd(today);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDate(date)}
                title={event?.title}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg border px-0.5 py-1 text-xs transition-all ${
                  event
                    ? "border-[var(--err)] bg-[rgba(239,68,68,0.12)] font-bold text-[var(--err)]"
                    : isToday
                    ? "border-[var(--sky)] text-[var(--sky)]"
                    : "border-[var(--border)] text-[var(--white)] hover:bg-[rgba(74,144,217,0.08)]"
                } ${selectedDate === date ? "ring-2 ring-[var(--sky)]" : ""}`}
              >
                <span>{day}</span>
                {event && (
                  <span className="w-full truncate px-0.5 text-[8px] font-semibold leading-none">
                    {event.title}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDate && (
        <Card className="mb-6 p-5">
          <h3 className="mb-3 text-sm font-bold text-[var(--white)]">{selectedDate}</h3>
          {eventsByDate.has(selectedDate) ? (
            <p className="text-xs text-[var(--muted)]">
              Already marked: {eventsByDate.get(selectedDate)!.title}
            </p>
          ) : (
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <label className={styles.label}>Event Title</label>
                <input
                  autoFocus
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mandatory Workshop"
                />
              </div>
              <Button type="submit" disabled={submitting || !title.trim()}>
                {submitting ? "Adding…" : "Mark as Event Day"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSelectedDate(null)}>
                Cancel
              </Button>
            </form>
          )}
          {error && <p className="mt-2 text-[11px] text-[var(--err)]">{error}</p>}
        </Card>
      )}

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">Marked Event Days</h2>
      {confirmMsg && (
        <div className="mb-3 rounded-lg border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)] px-4 py-2 text-xs text-[var(--ok)]">
          {confirmMsg}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Pending Overlaps</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[var(--muted)]">
                  No event days marked yet.
                </td>
              </tr>
            ) : (
              events.map((e) => {
                const count = overlappingLeaves(e.date).length;
                return (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>{e.title}</td>
                    <td>
                      <Badge tone={count > 0 ? "amber" : "gray"}>{count}</Badge>
                    </td>
                    <td className="space-x-1.5 whitespace-nowrap">
                      <Button
                        variant="danger"
                        className="!px-2.5 !py-1 !text-[11px]"
                        disabled={count === 0 || rejectingId === e.id}
                        onClick={() => setReviewEvent({ id: e.id, date: e.date, title: e.title })}
                      >
                        {rejectingId === e.id ? "Rejecting…" : `Review & Reject (${count})`}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-2.5 !py-1 !text-[11px]"
                        onClick={() => removeEvent(e.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {reviewEvent && (
        <ReviewRejectModal
          event={reviewEvent}
          leaves={overlappingLeaves(reviewEvent.date)}
          submitting={rejectingId === reviewEvent.id}
          onConfirm={handleConfirmReject}
          onClose={() => setReviewEvent(null)}
        />
      )}
    </div>
  );
}

// Shown before a bulk reject actually happens — lists every leave that
// overlaps the event date so the HOD can uncheck anything that shouldn't
// be rejected (e.g. an Emergency Leave that genuinely needs to go through).
// Anything left checked when "Reject Selected" is clicked gets rejected;
// anything unchecked is left completely untouched and continues on to its
// next approval stage normally.
function ReviewRejectModal({
  event,
  leaves,
  submitting,
  onConfirm,
  onClose,
}: {
  event: { id: string; date: string; title: string };
  leaves: LeaveRequest[];
  submitting: boolean;
  onConfirm: (leaveIds: string[]) => void;
  onClose: () => void;
}) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedIds = leaves.filter((l) => !excluded.has(l.id)).map((l) => l.id);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(5,13,31,0.85)] backdrop-blur-sm">
      <div className="max-h-[85vh] w-[90%] max-w-[560px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <h3 className="text-[15px] font-bold text-[var(--white)]">
            Review Before Rejecting — {event.title}
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {event.date} · Uncheck any leave you want to keep (e.g. an Emergency Leave) — it will stay
            pending and continue on normally. Everything left checked gets rejected.
          </p>
        </div>
        <div className="px-6 py-4">
          {leaves.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">No pending leaves overlap this date.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {leaves.map((l) => (
                <label
                  key={l.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card2)] px-4 py-3"
                >
                  <input
                    type="checkbox"
                    checked={!excluded.has(l.id)}
                    onChange={() => toggle(l.id)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--white)]">
                      {l.studentName}
                      {l.priority === "emergency" && <Badge tone="red">Emergency</Badge>}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {l.indexNumber} · {LEAVE_TYPE_LABELS[l.type]} · {l.startDate} to {l.endDate}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t border-[var(--border)] px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={selectedIds.length === 0 || submitting}
            onClick={() => onConfirm(selectedIds)}
          >
            {submitting ? "Rejecting…" : `Reject Selected (${selectedIds.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
