import { Badge } from "@/src/components/ui/Badge";
import { useSddPortal } from "@/src/hooks/useSddPortal";
import { isApproved, isRejected } from "@/src/lib/leaveStatus";
import { LEAVE_TYPE_LABELS } from "@/src/types";
import styles from "../sdd.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

export function Overview({ portal }: { portal: ReturnType<typeof useSddPortal> }) {
  const { overview } = portal;

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Full System Overview:</strong> All cadet leaves in the system across all stages.
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Index</th>
              <th>Leave Type</th>
              <th>Applied</th>
              <th>Troop</th>
              <th>Squadron</th>
              <th>SDD</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {overview.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                  No cadet leave applications in system.
                </td>
              </tr>
            ) : (
              overview.map((l) => {
                const overall = isApproved(l) ? "Fully Approved" : isRejected(l) ? "Rejected" : "In Progress";
                return (
                  <tr key={l.id}>
                    <td>{l.studentName}</td>
                    <td>{l.indexNumber}</td>
                    <td>
                      {LEAVE_TYPE_LABELS[l.type]}
                      {l.priority === "emergency" && (
                        <span className="ml-1">
                          <Badge tone="red">🚨</Badge>
                        </span>
                      )}
                    </td>
                    <td>{l.appliedDate}</td>
                    <td>
                      <Badge tone={tone(l.troopStatus)}>{l.troopStatus}</Badge>
                    </td>
                    <td>
                      <Badge tone={tone(l.sqnStatus)}>{l.sqnStatus}</Badge>
                    </td>
                    <td>
                      <Badge tone={tone(l.sddStatus)}>{l.sddStatus}</Badge>
                    </td>
                    <td
                      className={
                        overall === "Fully Approved"
                          ? "text-[#4ade80]"
                          : overall === "Rejected"
                          ? "text-[#f87171]"
                          : "text-[var(--muted)]"
                      }
                    >
                      {overall}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
