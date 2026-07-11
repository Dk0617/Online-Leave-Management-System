"use client";

import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import { useGatePortal } from "@/src/hooks/useGatePortal";
import styles from "../gate.module.css";

export function MovementLog({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { movements, clearMovementLog } = portal;

  async function handleClear() {
    if (!confirm("Clear all movement logs?")) return;
    await clearMovementLog();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-white">Full Movement Log</span>
        <Button variant="secondary" className="!text-xs" onClick={handleClear}>
          Clear Log
        </Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Student</th>
              <th>Index</th>
              <th>Student Type</th>
              <th>Direction</th>
              <th>Notes</th>
              <th>Logged By</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No movements logged.
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id}>
                  <td className="font-mono text-xs">{new Date(m.timestamp).toLocaleString()}</td>
                  <td>{m.studentName}</td>
                  <td className="text-xs">{m.indexNumber}</td>
                  <td>{m.studentType === "CADET" ? "🎖️ Cadet" : "🏠 Day Scholar"}</td>
                  <td>
                    <Badge tone={m.direction === "Exit" ? "red" : "green"}>
                      {m.direction === "Exit" ? "🚪 Exit" : "🏫 Entry"}
                    </Badge>
                  </td>
                  <td className="text-xs text-[var(--muted)]">{m.notes || "—"}</td>
                  <td className="text-xs text-[var(--muted)]">{m.loggedBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
