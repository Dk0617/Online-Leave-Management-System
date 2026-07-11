import { Badge } from "@/src/components/ui/Badge";
import { useSddPortal } from "@/src/hooks/useSddPortal";
import { LEAVE_TYPE_LABELS } from "@/src/types";
import styles from "../sdd.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

export function History({ portal }: { portal: ReturnType<typeof useSddPortal> }) {
  const { history } = portal;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Index</th>
            <th>Leave Type</th>
            <th>From</th>
            <th>Your Decision</th>
            <th>Date</th>
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
                <td>{l.indexNumber}</td>
                <td>{LEAVE_TYPE_LABELS[l.type]}</td>
                <td>{l.startDate}</td>
                <td>
                  <Badge tone={tone(l.sddStatus)}>{l.sddStatus}</Badge>
                </td>
                <td className="text-[var(--muted)]">{l.sddApprovedAt || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
