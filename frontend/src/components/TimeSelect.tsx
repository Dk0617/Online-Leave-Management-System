"use client";

const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

// Every time-of-day field in the app only ever accepts an on-the-hour or
// half-hour value (see the `/^\d{2}:(00|30)$/` check in
// backend/controllers/studentcontrol.js, eventcontrol.js, and
// leavecontrol.js) — a plain dropdown of exactly those slots, in
// unambiguous 24-hour digital text (14:00, not 2:00 PM), is both simpler
// and impossible to misread than a native <input type="time">, whose
// AM/PM-vs-24-hour display depends on the browser/OS locale and can't be
// forced from here.
export function TimeSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">Select time…</option>
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
