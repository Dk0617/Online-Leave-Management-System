"use client";

import { useState } from "react";
import { Badge } from "@/src/components/ui";
import { CATEGORY_BADGE_TONE, CATEGORY_CELL_CLASS, SRI_LANKA_2026_HOLIDAYS } from "@/src/components/eventCalendar";
import { EVENT_CATEGORY_LABELS, EventCategory, EventDay } from "@/src/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseYmd(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

// A day on the calendar, whichever source it came from — mirrors the exact
// same overlay eventCalendar.tsx builds for the Admin/HOD calendars (Sri
// Lanka's Poya/holiday calendar, then this department's own Workshop days
// layered on top), so a student sees precisely the same picture when
// picking dates as the HOD sees when deciding on their leave.
interface CalendarEntry {
  date: string;
  title: string;
  category: EventCategory;
  isSystem: boolean;
  startTime?: string;
  endTime?: string;
}

// A click-to-select date range: first click sets the anchor day, a second
// click completes the range (auto-ordered regardless of click order), and
// the next click after that starts a fresh range — same interaction model
// as most date-range pickers. The selected range is also listed as a table
// below the grid so the student can double check exactly which days are
// covered before submitting, per the request that this "be a calendar and a
// table" together, not just two date inputs.
export function DateRangeCalendar({
  startDate,
  endDate,
  onChange,
  minDate,
  blockedDays = [],
}: {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  minDate: string;
  blockedDays?: EventDay[];
}) {
  const initial = startDate ? parseYmd(startDate) : new Date();
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [anchor, setAnchor] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Sri Lanka's national Poya/holiday calendar first, then this
  // department's own Workshop days layered on top — same overlay rule as
  // eventCalendar.tsx: the department's own entry wins on the rare date
  // where both would otherwise collide, since it's the more specific,
  // actionable one for a student actually picking dates to apply for.
  const eventsByDate = new Map<string, CalendarEntry>();
  for (const h of SRI_LANKA_2026_HOLIDAYS) {
    eventsByDate.set(h.date, { ...h, isSystem: true });
  }
  for (const b of blockedDays) {
    eventsByDate.set(b.date, {
      date: b.date,
      title: b.title,
      category: b.category,
      isSystem: false,
      startTime: b.startTime,
      endTime: b.endTime,
    });
  }

  function handleClick(date: string) {
    if (date < minDate) return;
    if (!anchor) {
      setAnchor(date);
      onChange(date, date);
    } else {
      const [s, e] = date < anchor ? [date, anchor] : [anchor, date];
      onChange(s, e);
      setAnchor(null);
    }
  }

  const rangeDays: string[] = [];
  if (startDate && endDate) {
    let d = parseYmd(startDate);
    const end = parseYmd(endDate);
    while (d <= end) {
      rangeDays.push(ymd(d));
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }
  }

  return (
    <div>
      <div className="max-w-sm rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--white)] hover:bg-[rgba(74,144,217,0.08)]"
          >
            ‹
          </button>
          <div className="text-sm font-bold text-[var(--white)]">
            {MONTH_NAMES[month]} {year}
          </div>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--white)] hover:bg-[rgba(74,144,217,0.08)]"
          >
            ›
          </button>
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
            const disabled = date < minDate;
            const event = eventsByDate.get(date);
            const inRange = Boolean(startDate && endDate && date >= startDate && date <= endDate);
            const isEdge = date === startDate || date === endDate || date === anchor;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => handleClick(date)}
                title={
                  event
                    ? `${event.title} (${EVENT_CATEGORY_LABELS[event.category]})${
                        event.startTime && event.endTime ? ` ${event.startTime}–${event.endTime}` : ""
                      }`
                    : undefined
                }
                className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                  disabled
                    ? "cursor-not-allowed text-[var(--muted)] opacity-30"
                    : event
                    ? `font-bold ${CATEGORY_CELL_CLASS[event.category]}`
                    : inRange
                    ? "bg-[rgba(74,144,217,0.18)] text-[var(--white)]"
                    : "text-[var(--white)] hover:bg-[rgba(74,144,217,0.08)]"
                } ${isEdge ? "ring-2 ring-[var(--sky)]" : ""}`}
              >
                {day}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-[var(--muted)]">
          {anchor
            ? "Now click the day you'll return — or click the same day again for a one-day leave."
            : startDate && endDate
            ? "Click any day to pick a new range."
            : "Click a day to start your leave range."}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded border border-[var(--err)] bg-[rgba(239,68,68,0.12)]" /> Workshop
            (mandatory)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded border border-[#22c55e] bg-[rgba(34,197,94,0.12)]" /> Poya / Holiday
          </span>
        </div>
      </div>

      {rangeDays.length > 0 && (
        <div className="mt-4 max-w-sm overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-[var(--border)] px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--sky)]">
                  Day
                </th>
                <th className="border-b border-[var(--border)] px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--sky)]">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {rangeDays.map((d) => {
                const event = eventsByDate.get(d);
                return (
                  <tr key={d}>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-[var(--white)]">
                      {WEEKDAY_FULL[parseYmd(d).getDay()]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-[var(--white)]">
                      {d}
                      {event && (
                        <span className="ml-2" title={event.title}>
                          <Badge tone={CATEGORY_BADGE_TONE[event.category]}>{EVENT_CATEGORY_LABELS[event.category]}</Badge>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
