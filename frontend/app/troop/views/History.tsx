import { Badge } from "@/src/components/ui/Badge";
import { useTroopPortal } from "@/src/hooks/useTroopPortal";
import { LEAVE_TYPE_LABELS } from "@/src/types";
import styles from "../troop.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

export function History({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { history } = portal;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Type</th>
            <th>Leave Type</th>
            <th>From</th>
            <th>Your Decision</th>
            <th>Next Stage</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                No history.
              </td>
            </tr>
          ) : (
            history.map((l) => (
              <tr key={l.id}>
                <td>{l.studentName}</td>
                <td>
                  <Badge tone={l.studentType === "CADET" ? "purple" : "blue"}>
                    {l.studentType === "CADET" ? "Cadet" : "DS"}
                  </Badge>
                </td>
                <td>{LEAVE_TYPE_LABELS[l.type]}</td>
                <td>{l.startDate}</td>
                <td>
                  <Badge tone={tone(l.troopStatus)}>{l.troopStatus}</Badge>
                </td>
                <td className="text-xs text-[var(--muted)]">
                  {l.studentType === "DAY_SCHOLAR" ? "PDF Ready (if Approved)" : "Squadron Commander"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
