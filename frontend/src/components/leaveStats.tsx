"use client";

import { useState } from "react";
import { Badge } from "@/src/components/ui";
import { LeaveDetailModal } from "@/src/components/leave";
import { LEAVE_TYPE_LABELS, LeaveRequest } from "@/src/types";

function matchesQuery(l: LeaveRequest, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return l.studentName.toLowerCase().includes(q) || l.indexNumber.toLowerCase().includes(q);
}

// The drill-down behind every clickable Pending/Approved/Rejected stat
// tile — lists the actual leaves behind the number, with a search box, and
// opens the existing full LeaveDetailModal (same one used everywhere else)
// for accurate, complete details on whichever one is clicked.
export function LeaveListDrilldownModal({
  title,
  leaves,
  onClose,
}: {
  title: string;
  leaves: LeaveRequest[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const filtered = leaves.filter((l) => matchesQuery(l, query));

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(5,13,31,0.85)] backdrop-blur-sm">
        <div className="max-h-[85vh] w-[90%] max-w-[640px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
            <h3 className="text-[15px] font-bold text-[var(--white)]">
              {title} ({leaves.length})
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
              <p className="py-8 text-center text-sm text-[var(--muted)]">No matching leaves.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelected(l)}
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card2)] px-4 py-3 text-left transition-colors hover:border-[rgba(74,144,217,0.4)]"
                  >
                    <div>
                      <div className="text-sm font-bold text-[var(--white)]">{l.studentName}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {l.indexNumber} · {LEAVE_TYPE_LABELS[l.type]}
                        {l.priority === "emergency" && (
                          <span className="ml-1">
                            <Badge tone="red">Emergency</Badge>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[10px] text-[var(--muted)]">
                      {l.startDate} → {l.endDate}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {selected && <LeaveDetailModal leave={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
