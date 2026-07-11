"use client";

import { StatTile, Badge } from "@/src/components/ui";
import { ApprovalActions } from "@/src/components/leave";
import { useAuth } from "@/src/AuthContext";
import { useTroopPortal } from "@/src/hooks";
import { LEAVE_TYPE_LABELS } from "@/src/types";
import styles from "@/src/portal.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { user } = useAuth();
  const { allPending, history, approve, reject } = portal;
  const intakesText = user?.intakes?.length ? user.intakes.map((i) => `Intake ${i}`).join(", ") : "no intakes assigned yet";
  const approvedByMe = history.filter((l) => l.troopStatus === "Approved").length;
  const rejectedByMe = history.filter((l) => l.troopStatus === "Rejected").length;
  const dsPending = allPending.filter((l) => l.studentType === "DAY_SCHOLAR").length;
  const cdPending = allPending.filter((l) => l.studentType === "CADET").length;

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Dual Role:</strong> You approve <strong>Day Scholar</strong> leaves at <em>Stage 2</em> (after
        HOD approval) and <strong>Cadet</strong> leaves at <em>Stage 1</em> (direct from student). Only
        students from your assigned intake(s) appear here — {intakesText}.
      </div>

      <div className={styles.statGrid}>
        <StatTile label="DS Pending" value={dsPending} tone="amber" />
        <StatTile label="Cadet Pending" value={cdPending} tone="amber" />
        <StatTile label="Approved" value={approvedByMe} tone="green" />
        <StatTile label="Rejected" value={rejectedByMe} tone="red" />
      </div>

      <h2 className="mb-3 text-sm font-bold text-white">All Pending — Your Troop</h2>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Type</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Stage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allPending.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No pending applications.
                </td>
              </tr>
            ) : (
              allPending.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.studentName}
                    <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                  </td>
                  <td>
                    <Badge tone={l.studentType === "CADET" ? "purple" : "blue"}>
                      {l.studentType === "CADET" ? "Cadet" : "Day Scholar"}
                    </Badge>
                  </td>
                  <td>
                    {LEAVE_TYPE_LABELS[l.type]}
                    {l.priority === "emergency" && (
                      <span className="ml-1">
                        <Badge tone="red">Emergency</Badge>
                      </span>
                    )}
                  </td>
                  <td>{l.startDate}</td>
                  <td>{l.endDate}</td>
                  <td className="text-xs text-[var(--muted)]">
                    {l.studentType === "DAY_SCHOLAR" ? "Stage 2 (Final)" : "Stage 1 of 3"}
                  </td>
                  <td>
                    <ApprovalActions onApprove={() => approve(l.id)} onReject={(remarks) => reject(l.id, remarks)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DayScholarQueue({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { dayScholarPending, approve, reject } = portal;

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Day Scholar — Stage 2:</strong> These leaves have already been approved by the HOD. Your
        approval finalises it. Student can then download the PDF.
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Index</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>HOD Decision</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dayScholarPending.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No Day Scholar leaves awaiting approval.
                </td>
              </tr>
            ) : (
              dayScholarPending.map((l) => (
                <tr key={l.id}>
                  <td>{l.studentName}</td>
                  <td>{l.indexNumber}</td>
                  <td>
                    {LEAVE_TYPE_LABELS[l.type]}
                    {l.priority === "emergency" && (
                      <span className="ml-1">
                        <Badge tone="red">Emergency</Badge>
                      </span>
                    )}
                  </td>
                  <td>{l.startDate}</td>
                  <td>{l.endDate}</td>
                  <td>
                    <Badge tone="green">HOD Approved</Badge>
                  </td>
                  <td>
                    <ApprovalActions onApprove={() => approve(l.id)} onReject={(remarks) => reject(l.id, remarks)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CadetQueue({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { cadetPending, approve, reject } = portal;

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Cadet — Stage 1:</strong> After your approval, applications move to the Squadron Commander.
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Index</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cadetPending.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  No Cadet leaves awaiting approval.
                </td>
              </tr>
            ) : (
              cadetPending.map((l) => (
                <tr key={l.id}>
                  <td>{l.studentName}</td>
                  <td>{l.indexNumber}</td>
                  <td>
                    {LEAVE_TYPE_LABELS[l.type]}
                    {l.priority === "emergency" && (
                      <span className="ml-1">
                        <Badge tone="red">Emergency</Badge>
                      </span>
                    )}
                  </td>
                  <td>{l.startDate}</td>
                  <td>{l.endDate}</td>
                  <td>
                    <ApprovalActions onApprove={() => approve(l.id)} onReject={(remarks) => reject(l.id, remarks)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
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
