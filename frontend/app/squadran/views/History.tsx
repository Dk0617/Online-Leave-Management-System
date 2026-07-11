import { Badge } from "@/src/components/ui/Badge";
import { useSquadranPortal } from "@/src/hooks/useSquadranPortal";
import { LEAVE_TYPE_LABELS } from "@/src/types";
import styles from "../squadran.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

export function History({ portal }: { portal: ReturnType<typeof useSquadranPortal> }) {
  const { history } = portal;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Leave Type</th>
            <th>From</th>
            <th>Your Decision</th>
            <th>Next Stage</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                No history.
              </td>
            </tr>
          ) : (
            history.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.studentName}
                  <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                </td>
                <td>{LEAVE_TYPE_LABELS[l.type]}</td>
                <td>{l.startDate}</td>
                <td>
                  <Badge tone={tone(l.sqnStatus)}>{l.sqnStatus}</Badge>
                </td>
                <td className="text-[var(--muted)]">Senior Deputy Dean (SDD)</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
