"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Card, Badge, Button } from "@/src/components/ui";
import { TimeSelect } from "@/src/components/TimeSelect";
import { EVENT_CATEGORY_LABELS, EventCategory, EventDay, LEAVE_TYPE_LABELS, LeaveRequest, MANDATORY_EVENT_CATEGORIES } from "@/src/types";
import styles from "@/src/portal.module.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// Only Workshop is mandatory-attendance (red — the one worth protecting
// with the bulk-reject action). Poya Day is a public holiday in its own
// right, so it's colored the same green as Holiday, not red — students
// are normally free to leave on it, nothing to restrict.
// Exported so the student's own leave-application calendar (see
// DateRangeCalendar.tsx) can mark the exact same Poya/Holiday/Workshop days
// with the exact same colors — one source of truth instead of two calendars
// silently drifting apart on what a given day means.
export const CATEGORY_CELL_CLASS: Record<EventCategory, string> = {
  WORKSHOP: "border-[var(--err)] bg-[rgba(239,68,68,0.12)] text-[var(--err)]",
  POYA: "border-[#22c55e] bg-[rgba(34,197,94,0.12)] text-[#22c55e]",
  HOLIDAY: "border-[#22c55e] bg-[rgba(34,197,94,0.12)] text-[#22c55e]",
  NO_LECTURE: "border-[var(--sky)] bg-[rgba(74,144,217,0.12)] text-[var(--sky)]",
  OTHER: "border-[var(--border)] bg-[rgba(148,163,184,0.12)] text-[var(--muted)]",
};
export const CATEGORY_BADGE_TONE: Record<EventCategory, "red" | "green" | "blue" | "gray"> = {
  WORKSHOP: "red",
  POYA: "green",
  HOLIDAY: "green",
  NO_LECTURE: "blue",
  OTHER: "gray",
};

// Sourced from PublicHolidays.lk and CalendarLabs.com (cross-checked against
// each other) — shown automatically on every calendar, nothing to add or
// maintain.
export const SRI_LANKA_2026_HOLIDAYS: { date: string; title: string; category: EventCategory }[] = [
  { date: "2026-01-03", title: "Duruthu Full Moon Poya Day", category: "POYA" },
  { date: "2026-01-15", title: "Tamil Thai Pongal Day", category: "HOLIDAY" },
  { date: "2026-02-01", title: "Nawam Full Moon Poya Day", category: "POYA" },
  { date: "2026-02-04", title: "Independence Day", category: "HOLIDAY" },
  { date: "2026-02-15", title: "Mahasivarathri Day", category: "HOLIDAY" },
  { date: "2026-03-02", title: "Madin Full Moon Poya Day", category: "POYA" },
  { date: "2026-03-21", title: "Id-Ul-Fitr", category: "HOLIDAY" },
  { date: "2026-04-01", title: "Bak Full Moon Poya Day", category: "POYA" },
  { date: "2026-04-03", title: "Good Friday", category: "HOLIDAY" },
  { date: "2026-04-13", title: "Day Prior to Sinhala & Tamil New Year", category: "HOLIDAY" },
  { date: "2026-04-14", title: "Sinhala and Tamil New Year Day", category: "HOLIDAY" },
  { date: "2026-05-01", title: "May Day / Vesak Full Moon Poya Day", category: "POYA" },
  { date: "2026-05-02", title: "Day Following Vesak Full Moon Poya Day", category: "HOLIDAY" },
  { date: "2026-05-28", title: "Id-Ul-Alha", category: "HOLIDAY" },
  { date: "2026-05-30", title: "Adhi Full Moon Poya Day", category: "POYA" },
  { date: "2026-06-29", title: "Poson Full Moon Poya Day", category: "POYA" },
  { date: "2026-07-29", title: "Esala Full Moon Poya Day", category: "POYA" },
  { date: "2026-08-26", title: "Milad-un-Nabi", category: "HOLIDAY" },
  { date: "2026-08-27", title: "Nikini Full Moon Poya Day", category: "POYA" },
  { date: "2026-09-26", title: "Binara Full Moon Poya Day", category: "POYA" },
  { date: "2026-10-25", title: "Vap Full Moon Poya Day", category: "POYA" },
  { date: "2026-11-08", title: "Deepavali Festival Day", category: "HOLIDAY" },
  { date: "2026-11-24", title: "Il Full Moon Poya Day", category: "POYA" },
  { date: "2026-12-23", title: "Unduvap Full Moon Poya Day", category: "POYA" },
  { date: "2026-12-25", title: "Christmas Day", category: "HOLIDAY" },
];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// A day on the calendar, whichever source it came from: a Sri Lanka Poya
// day/national holiday (fixed, read-only, always present) or a real
// EventDay document (a department's Workshop day, created by that
// department's Admin — see adminCreateEvent in backend/controllers/
// eventcontrol.js).
interface CalendarEntry {
  date: string;
  title: string;
  category: EventCategory;
  isSystem: boolean;
  id?: string;
  startTime?: string;
  endTime?: string;
}

// Shared by both the Admin calendar (editable: creates/deletes this
// department's Workshop days) and the HOD/Lecturer calendar (read-only:
// just shows what Admin marked, plus — HOD only — the bulk
// review-and-reject-overlapping-leaves action). Keeping one component
// avoids the two views drifting apart on the actual date-blocking rules.
export function EventCalendarView({
  events,
  editable,
  pending,
  onAdd,
  onRemove,
  onRejectOverlapping,
  infoBanner,
}: {
  events: EventDay[];
  editable: boolean;
  pending?: LeaveRequest[];
  onAdd?: (date: string, title: string, startTime: string, endTime: string) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
  onRejectOverlapping?: (id: string, leaveIds: string[]) => Promise<number>;
  infoBanner: ReactNode;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Sri Lanka's national Poya/holiday calendar first, then this
  // department's own Workshop days layered on top — the department's own
  // entry wins on the rare date where both would otherwise collide, since
  // it's the more specific, actionable one.
  const eventsByDate = new Map<string, CalendarEntry>();
  for (const h of SRI_LANKA_2026_HOLIDAYS) {
    eventsByDate.set(h.date, { ...h, isSystem: true });
  }
  for (const e of events) {
    eventsByDate.set(e.date, {
      date: e.date,
      title: e.title,
      category: e.category,
      isSystem: false,
      id: e.id,
      startTime: e.startTime,
      endTime: e.endTime,
    });
  }
  const sortedEntries = Array.from(eventsByDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!onAdd || !selectedDate || !title.trim()) return;
    if (!startTime || !endTime) {
      setError("Start time and end time are required.");
      return;
    }
    if (endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(selectedDate, title.trim(), startTime, endTime);
      setTitle("");
      setStartTime("");
      setEndTime("");
      setSelectedDate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add event");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    if (!onRemove) return;
    setRemovingId(id);
    setError(null);
    try {
      await onRemove(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove event");
    } finally {
      setRemovingId(null);
    }
  }

  // Mirrors the backend's eventWindow/overlap logic (see
  // backend/controllers/eventcontrol.js) — an event with no hours set
  // defaults to blocking the whole day, same as before this field existed.
  function overlappingLeaves(entry: { date: string; startTime?: string; endTime?: string }): LeaveRequest[] {
    const eventStart = new Date(`${entry.date}T${entry.startTime || "00:00"}`);
    const eventEnd = new Date(`${entry.date}T${entry.endTime || "23:59"}`);
    return (pending ?? []).filter((l) => {
      const leaveStart = new Date(`${l.startDate}T${l.startTime}`);
      const leaveEnd = new Date(`${l.endDate}T${l.endTime}`);
      return leaveStart < eventEnd && leaveEnd > eventStart;
    });
  }

  const [reviewEvent, setReviewEvent] = useState<
    { id: string; date: string; title: string; startTime?: string; endTime?: string } | null
  >(null);

  async function handleConfirmReject(leaveIds: string[]) {
    if (!reviewEvent || !onRejectOverlapping) return;
    setRejectingId(reviewEvent.id);
    setConfirmMsg(null);
    setError(null);
    try {
      const count = await onRejectOverlapping(reviewEvent.id, leaveIds);
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
      <div className={styles.infoBanner}>{infoBanner}</div>

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
                title={
                  event
                    ? `${event.title} (${EVENT_CATEGORY_LABELS[event.category]})${
                        event.startTime && event.endTime ? ` ${event.startTime}–${event.endTime}` : ""
                      }`
                    : undefined
                }
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg border px-0.5 py-1 text-xs transition-all ${
                  event
                    ? `font-bold ${CATEGORY_CELL_CLASS[event.category]}`
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

      {selectedDate && (eventsByDate.has(selectedDate) || (editable && onAdd)) && (
        <Card className="mb-6 p-5">
          <h3 className="mb-3 text-sm font-bold text-[var(--white)]">{selectedDate}</h3>
          {eventsByDate.has(selectedDate) ? (
            <p className="text-xs text-[var(--muted)]">
              {eventsByDate.get(selectedDate)!.isSystem ? "Sri Lanka calendar: " : "Already marked: "}
              {eventsByDate.get(selectedDate)!.title} ({EVENT_CATEGORY_LABELS[eventsByDate.get(selectedDate)!.category]})
              {eventsByDate.get(selectedDate)!.startTime && eventsByDate.get(selectedDate)!.endTime && (
                <> · {eventsByDate.get(selectedDate)!.startTime}–{eventsByDate.get(selectedDate)!.endTime}</>
              )}
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
              <div className="min-w-[130px]">
                <label className={styles.label}>Start Time</label>
                <TimeSelect value={startTime} onChange={setStartTime} className={styles.input} />
              </div>
              <div className="min-w-[130px]">
                <label className={styles.label}>End Time</label>
                <TimeSelect value={endTime} onChange={setEndTime} className={styles.input} />
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
              <th>Category</th>
              {pending && <th>Pending Overlaps</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.length === 0 ? (
              <tr>
                <td colSpan={pending ? 5 : 4} className="py-8 text-center text-[var(--muted)]">
                  No event days.
                </td>
              </tr>
            ) : (
              sortedEntries.map((e) => {
                const count = overlappingLeaves(e).length;
                const isMandatory = !e.isSystem && MANDATORY_EVENT_CATEGORIES.includes(e.category);
                return (
                  <tr key={e.isSystem ? `system-${e.date}` : e.id}>
                    <td>
                      {e.date}
                      {e.startTime && e.endTime && (
                        <div className="text-[10px] text-[var(--muted)]">
                          {e.startTime}–{e.endTime}
                        </div>
                      )}
                    </td>
                    <td>{e.title}</td>
                    <td>
                      <Badge tone={CATEGORY_BADGE_TONE[e.category]}>{EVENT_CATEGORY_LABELS[e.category]}</Badge>
                    </td>
                    {pending && (
                      <td>
                        {isMandatory ? (
                          <Badge tone={count > 0 ? "amber" : "gray"}>{count}</Badge>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">—</span>
                        )}
                      </td>
                    )}
                    <td className="space-x-1.5 whitespace-nowrap">
                      {e.isSystem ? (
                        <Badge tone="gray">Sri Lanka Calendar</Badge>
                      ) : (
                        <>
                          {isMandatory && onRejectOverlapping && (
                            <Button
                              variant="danger"
                              className="!px-2.5 !py-1 !text-[11px]"
                              disabled={count === 0 || rejectingId === e.id}
                              onClick={() =>
                                setReviewEvent({ id: e.id!, date: e.date, title: e.title, startTime: e.startTime, endTime: e.endTime })
                              }
                            >
                              {rejectingId === e.id ? "Rejecting…" : `Review & Reject (${count})`}
                            </Button>
                          )}
                          {editable && onRemove && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="!px-2.5 !py-1 !text-[11px]"
                              disabled={removingId === e.id}
                              onClick={() => handleRemove(e.id!)}
                            >
                              {removingId === e.id ? "Removing…" : "Remove"}
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {reviewEvent && onRejectOverlapping && (
        <ReviewRejectModal
          event={reviewEvent}
          leaves={overlappingLeaves(reviewEvent)}
          submitting={rejectingId === reviewEvent.id}
          onConfirm={handleConfirmReject}
          onClose={() => setReviewEvent(null)}
        />
      )}
    </div>
  );
}

function ReviewRejectModal({
  event,
  leaves,
  submitting,
  onConfirm,
  onClose,
}: {
  event: { id: string; date: string; title: string; startTime?: string; endTime?: string };
  leaves: LeaveRequest[];
  submitting: boolean;
  onConfirm: (leaveIds: string[]) => void;
  onClose: () => void;
}) {
  // Emergency Leave is exempt from mandatory-event blocking by default — a
  // genuine emergency still has to go out even on a workshop day — so it
  // starts pre-excluded (kept) here. The HOD can still manually check one
  // back in if they really do want to reject it too.
  const [excluded, setExcluded] = useState<Set<string>>(
    () => new Set(leaves.filter((l) => l.priority === "emergency").map((l) => l.id))
  );

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
            {event.date}
            {event.startTime && event.endTime && ` · ${event.startTime}–${event.endTime}`} · Emergency Leave
            is unchecked by default — it stays valid on a mandatory event day and will continue on
            normally. Uncheck anything else you want to keep too. Everything left checked gets rejected.
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
