"use client";

import { ReactNode, useState } from "react";
import { Badge } from "@/src/components/ui";

// A single row in an exit-count drill-down: either a movement that already
// happened (has `timestamp`) or a planned exit read straight off an
// approved leave that hasn't started yet (has `plannedDate` instead) — see
// gate/troop/squadran views.tsx for how each builds this list.
export interface ExitEntry {
  id: string;
  indexNumber: string;
  studentName: string;
  studentType?: "DAY_SCHOLAR" | "CADET";
  department?: string;
  direction: "Exit" | "Entry";
  timestamp?: string;
  plannedDate?: string;
}

function matchesQuery(e: ExitEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return e.studentName.toLowerCase().includes(q) || e.indexNumber.toLowerCase().includes(q);
}

export function ExitDrilldownModal({
  title,
  entries,
  onClose,
}: {
  title: string;
  entries: ExitEntry[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = entries.filter((e) => matchesQuery(e, query));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(5,13,31,0.85)] backdrop-blur-sm">
      <div className="max-h-[85vh] w-[90%] max-w-[640px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <h3 className="text-[15px] font-bold text-[var(--white)]">
            {title} ({entries.length})
          </h3>
          <button onClick={onClose} className="text-xl leading-none text-[var(--muted)] hover:text-[var(--white)]">
            ✕
          </button>
        </div>
        <div className="px-6 py-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Search by name or index number..."
            className="mb-4 w-full rounded-lg border border-[var(--border)] bg-[var(--card2)] px-3 py-2 text-sm text-[var(--white)] outline-none focus:border-[var(--sky)]"
          />
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">No matching students.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card2)] px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-bold text-[var(--white)]">{e.studentName}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {e.indexNumber}
                      {e.department && ` · ${e.department}`}
                      {e.studentType && ` · ${e.studentType === "CADET" ? "🎖️ Officer Cadet" : "🏠 Day Scholar"}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge tone={e.direction === "Exit" ? "red" : "green"}>
                      {e.direction === "Exit" ? "🚪 Exit" : "🏫 Entry"}
                    </Badge>
                    <div className="mt-1 text-[10px] text-[var(--muted)]">
                      {e.plannedDate ? `Planned: ${e.plannedDate}` : e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wraps a StatTile-shaped card so it's clickable, without changing
// StatTile itself (used elsewhere with no click behavior at all).
export function ClickableStatCard({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left transition-transform hover:-translate-y-0.5"
    >
      {children}
    </button>
  );
}
