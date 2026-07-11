import { Badge } from "@/src/components/ui/Badge";
import { useHodPortal } from "@/src/hooks/useHodPortal";
import { LEAVE_TYPE_LABELS } from "@/src/types";
import styles from "../hod.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

export function History({ portal }: { portal: ReturnType<typeof useHodPortal> }) {
  const { history } = portal;

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
          {history.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                No history.
              </td>
            </tr>
          ) : (
            history.map((l) => (
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
                  <Badge tone={tone(l.troopStatus)}>{l.troopStatus === "N/A" ? "Pending at Troop" : l.troopStatus}</Badge>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
