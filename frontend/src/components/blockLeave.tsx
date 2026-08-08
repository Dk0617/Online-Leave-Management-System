"use client";

import { BlockLeaveRequest } from "@/src/types";

export function blockLeaveTone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

// Full No/Index/Name roster for one Block Leave — shared by the HOD and
// Troop Commander queues (see hod/views.tsx, troop/views.tsx) since both
// need the same "who's actually on this roster" detail view before
// deciding, or just to review it in History afterward.
export function BlockLeaveRosterModal({ block, onClose }: { block: BlockLeaveRequest; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(5,13,31,0.85)] backdrop-blur-sm">
      <div className="max-h-[85vh] w-[90%] max-w-[560px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--white)]">{block.department} Block Leave</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {block.startDate} {block.startTime} → {block.endDate} {block.endTime} · {block.students.length} student
              {block.students.length === 1 ? "" : "s"}
            </p>
          </div>
          <button onClick={onClose} className="text-xl leading-none text-[var(--muted)] hover:text-[var(--white)]">
            ✕
          </button>
        </div>
        <div className="px-6 py-4">
          <div className="mb-3 text-xs text-[var(--muted)]">
            <strong className="text-[var(--white)]">Reason:</strong> {block.reason}
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-3 py-2">No.</th>
                  <th className="px-3 py-2">Index Number</th>
                  <th className="px-3 py-2">Name</th>
                </tr>
              </thead>
              <tbody>
                {block.students
                  .slice()
                  .sort((a, b) => a.no - b.no)
                  .map((s) => (
                    <tr key={s.studentId} className="border-t border-[rgba(255,255,255,0.05)]">
                      <td className="px-3 py-2 text-[var(--white)]">{s.no}</td>
                      <td className="px-3 py-2 text-[var(--white)]">{s.indexNumber}</td>
                      <td className="px-3 py-2 text-[var(--white)]">{s.name}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
