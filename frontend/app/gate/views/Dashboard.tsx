import { StatTile } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";
import { useGatePortal } from "@/src/hooks/useGatePortal";
import { isApproved } from "@/src/lib/leaveStatus";
import { LEAVE_TYPE_LABELS } from "@/src/types";
import styles from "../gate.module.css";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function validity(l: { startDate: string; startTime: string; endDate: string; endTime: string }) {
  const now = new Date();
  const start = new Date(`${l.startDate}T${l.startTime || "00:00"}`);
  const end = new Date(`${l.endDate}T${l.endTime || "23:59"}`);
  if (now < start) return "upcoming" as const;
  if (now > end) return "expired" as const;
  return "valid" as const;
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { approvedLeaves, movements } = portal;
  const today = todayStr();
  const todayMovements = movements.filter((m) => m.timestamp.startsWith(today));

  function lastMovementFor(indexNumber: string, leaveId: string) {
    const forLeave = movements.filter((m) => m.leaveId === leaveId || m.indexNumber === indexNumber);
    if (!forLeave.length) return null;
    return [...forLeave].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];
  }

  const onLeaveNow = approvedLeaves.filter((l) => lastMovementFor(l.indexNumber, l.id)?.direction === "Exit");

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Gate Staff Role:</strong> Verify student leave passes, log exits and entries, and monitor who
        is currently on leave. Students must have a fully approved leave pass before exiting campus.
      </div>

      <div className={styles.statGrid}>
        <StatTile label="On Leave Now" value={onLeaveNow.length} tone="amber" />
        <StatTile label="Exits Today" value={todayMovements.filter((m) => m.direction === "Exit").length} />
        <StatTile label="Entries Today" value={todayMovements.filter((m) => m.direction === "Entry").length} tone="green" />
        <StatTile label="Approved Passes" value={approvedLeaves.length} tone="blue" />
      </div>

      <h2 className="mb-3 text-sm font-bold text-white">Leave Passes — Exit / Entry &amp; Validity Status</h2>
      <div className="mb-6 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Type</th>
              <th>Leave Type</th>
              <th>From (Exit)</th>
              <th>To (Entry)</th>
              <th>Status</th>
              <th>Validity</th>
            </tr>
          </thead>
          <tbody>
            {approvedLeaves.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No approved leave passes in system.
                </td>
              </tr>
            ) : (
              approvedLeaves.map((l) => {
                const last = lastMovementFor(l.indexNumber, l.id);
                const state = validity(l);
                return (
                  <tr key={l.id}>
                    <td>
                      {l.studentName}
                      <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                    </td>
                    <td>{l.studentType === "CADET" ? "🎖️ Cadet" : "🏠 Day Scholar"}</td>
                    <td>{LEAVE_TYPE_LABELS[l.type]}</td>
                    <td className="font-mono text-xs">
                      {l.startDate} {l.startTime}
                    </td>
                    <td className="font-mono text-xs">
                      {l.endDate} {l.endTime}
                    </td>
                    <td>
                      {!last ? (
                        <Badge tone="gray">Not Yet Exited</Badge>
                      ) : last.direction === "Exit" ? (
                        <Badge tone="red">Exited (Out)</Badge>
                      ) : (
                        <Badge tone="green">Returned</Badge>
                      )}
                    </td>
                    <td>
                      <Badge tone={state === "valid" ? "green" : state === "upcoming" ? "amber" : "red"}>
                        {state === "valid" ? "Valid" : state === "upcoming" ? "Upcoming" : "Expired"}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-sm font-bold text-white">Recent Movements</h2>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Student</th>
              <th>Index</th>
              <th>Type</th>
              <th>Direction</th>
              <th>Logged By</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  No movements logged today.
                </td>
              </tr>
            ) : (
              movements.slice(0, 10).map((m) => (
                <tr key={m.id}>
                  <td className="font-mono text-xs">{new Date(m.timestamp).toLocaleTimeString()}</td>
                  <td>{m.studentName}</td>
                  <td className="text-xs">{m.indexNumber}</td>
                  <td>{m.studentType === "CADET" ? "🎖️ Cadet" : "🏠 Day Scholar"}</td>
                  <td>
                    <Badge tone={m.direction === "Exit" ? "red" : "green"}>
                      {m.direction === "Exit" ? "🚪 Exit" : "🏫 Entry"}
                    </Badge>
                  </td>
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
