"use client";

import { useEffect, useState } from "react";
import { StatTile, Badge, Button } from "@/src/components/ui";
import { ApprovalActions, LeaveDetailModal } from "@/src/components/leave";
import { ExitDrilldownModal, ExitEntry, ClickableStatCard } from "@/src/components/exitStats";
import { useAuth } from "@/src/AuthContext";
import { useTroopPortal } from "@/src/hooks/useTroopPortal";
import { isApproved } from "@/src/api";
import { LEAVE_TYPE_LABELS, LeaveRequest } from "@/src/types";
import styles from "@/src/portal.module.css";

function tone(status: string) {
  return status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { user } = useAuth();
  const { allPending, history, movements, approve, reject, error, refresh } = portal;
  const intakesText = user?.intakes?.length ? user.intakes.map((i) => `Intake ${i}`).join(", ") : "no intakes assigned yet";
  const approvedByMe = history.filter((l) => l.troopStatus === "Approved").length;
  const rejectedByMe = history.filter((l) => l.troopStatus === "Rejected").length;
  const dsPending = allPending.filter((l) => l.studentType === "DAY_SCHOLAR").length;
  const cdPending = allPending.filter((l) => l.studentType === "CADET").length;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [drilldown, setDrilldown] = useState<{ title: string; entries: ExitEntry[] } | null>(null);

  const today = todayStr();
  const tomorrow = tomorrowStr();
  const todayExitEntries: ExitEntry[] = movements
    .filter((m) => m.direction === "Exit" && m.timestamp.startsWith(today))
    .map((m) => ({
      id: m.id,
      indexNumber: m.indexNumber,
      studentName: m.studentName,
      studentType: m.studentType,
      department: m.department,
      direction: "Exit",
      timestamp: m.timestamp,
    }));
  const tomorrowExitEntries: ExitEntry[] = history
    .filter((l) => isApproved(l) && l.startDate === tomorrow)
    .map((l) => ({
      id: l.id,
      indexNumber: l.indexNumber,
      studentName: l.studentName,
      studentType: l.studentType,
      department: l.department,
      direction: "Exit",
      plannedDate: `${l.startDate} ${l.startTime}`,
    }));

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          <span>Couldn&apos;t load Troop data: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      )}
      <div className={styles.infoBanner}>
        <strong>Dual Role:</strong> You approve <strong>Day Scholar</strong> leaves at <em>Stage 2</em> (after
        HOD approval) and <strong>Officer Cadet</strong> leaves at <em>Stage 1</em> (direct from student) —
        except Officer Cadet <strong>Academic Leave</strong> itself, which skips you entirely and routes
        HOD → Squadron Commander instead. You&apos;ll still see its linked <strong>Personal Leave</strong> as
        its own separate application, since that one always comes to you first. Only students from your
        assigned intake(s) appear here — {intakesText}.
      </div>

      <div className={styles.statGrid}>
        <StatTile label="DS Pending" value={dsPending} tone="amber" />
        <StatTile label="Officer Cadet Pending" value={cdPending} tone="amber" />
        <StatTile label="Approved" value={approvedByMe} tone="green" />
        <StatTile label="Rejected" value={rejectedByMe} tone="red" />
        <ClickableStatCard onClick={() => setDrilldown({ title: "Exits Today — Your Troop", entries: todayExitEntries })}>
          <StatTile label="Exits Today (click for details)" value={todayExitEntries.length} tone="blue" />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setDrilldown({ title: "Exits Tomorrow — Your Troop", entries: tomorrowExitEntries })}>
          <StatTile label="Exits Tomorrow (click for details)" value={tomorrowExitEntries.length} tone="blue" />
        </ClickableStatCard>
      </div>

      {drilldown && (
        <ExitDrilldownModal
          title={drilldown.title}
          entries={drilldown.entries}
          onClose={() => setDrilldown(null)}
        />
      )}

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">All Pending — Your Troop</h2>
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
                      {l.studentType === "CADET" ? "Officer Cadet" : "Day Scholar"}
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
                  <td className="space-x-1.5 whitespace-nowrap">
                    <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => setSelected(l)}>
                      View
                    </Button>
                    <ApprovalActions onApprove={() => approve(l.id)} onReject={(remarks) => reject(l.id, remarks)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && <LeaveDetailModal leave={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export function DayScholarQueue({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { dayScholarPending, approve, reject } = portal;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

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
                  <td className="space-x-1.5 whitespace-nowrap">
                    <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => setSelected(l)}>
                      View
                    </Button>
                    <ApprovalActions onApprove={() => approve(l.id)} onReject={(remarks) => reject(l.id, remarks)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && <LeaveDetailModal leave={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export function CadetQueue({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { cadetPending, approve, reject } = portal;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Officer Cadet — Stage 1:</strong> After your approval, applications move to the Squadron Commander.
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
                  No Officer Cadet leaves awaiting approval.
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
                  <td className="space-x-1.5 whitespace-nowrap">
                    <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => setSelected(l)}>
                      View
                    </Button>
                    <ApprovalActions onApprove={() => approve(l.id)} onReject={(remarks) => reject(l.id, remarks)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && <LeaveDetailModal leave={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

type TroopHistoryEntry = ReturnType<typeof useTroopPortal>["history"][number];

function matchesSearch(l: TroopHistoryEntry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return l.studentName.toLowerCase().includes(q) || l.indexNumber.toLowerCase().includes(q);
}

function HistoryTable({ rows, emptyMessage }: { rows: TroopHistoryEntry[]; emptyMessage: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Intake</th>
            <th>Leave Type</th>
            <th>From</th>
            <th>Your Decision</th>
            <th>Next Stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.studentName}
                  <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                </td>
                <td>{l.intake ? `Intake ${l.intake}` : "—"}</td>
                <td>{LEAVE_TYPE_LABELS[l.type]}</td>
                <td>{l.startDate}</td>
                <td>
                  <Badge tone={tone(l.troopStatus)}>{l.troopStatus}</Badge>
                </td>
                <td className="text-xs text-[var(--muted)]">
                  {l.troopStatus === "Rejected"
                    ? "Not Reached — rejected at Troop"
                    : l.studentType === "DAY_SCHOLAR"
                    ? "PDF Ready (if Approved)"
                    : "Squadron Commander"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function History({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { history } = portal;
  const [dsQuery, setDsQuery] = useState("");
  const [cdQuery, setCdQuery] = useState("");

  const dayScholarHistory = history.filter(
    (l) => l.studentType === "DAY_SCHOLAR" && matchesSearch(l, dsQuery)
  );
  const cadetHistory = history.filter((l) => l.studentType === "CADET" && matchesSearch(l, cdQuery));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[var(--white)]">Day Scholar History</h2>
        <div className="w-64">
          <input
            value={dsQuery}
            onChange={(e) => setDsQuery(e.target.value)}
            placeholder="🔍 Search by name or index number..."
            className={styles.input}
          />
        </div>
      </div>
      <HistoryTable rows={dayScholarHistory} emptyMessage="No Day Scholar history." />

      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[var(--white)]">Officer Cadet History</h2>
        <div className="w-64">
          <input
            value={cdQuery}
            onChange={(e) => setCdQuery(e.target.value)}
            placeholder="🔍 Search by name or index number..."
            className={styles.input}
          />
        </div>
      </div>
      <HistoryTable rows={cadetHistory} emptyMessage="No Officer Cadet history." />
    </div>
  );
}

function recordStatus(l: LeaveRequest): "Fully Approved" | "Rejected" | "In Progress" {
  const statuses = [l.hodStatus, l.troopStatus, l.sqnStatus, l.sddStatus].filter((s) => s !== "N/A");
  if (statuses.some((s) => s === "Rejected")) return "Rejected";
  if (statuses.length > 0 && statuses.every((s) => s === "Approved")) return "Fully Approved";
  return "In Progress";
}

// Read-only archive: every leave from every student — cadets and day
// scholars, any type — regardless of who approves it. Matches the
// real-world practice of all leave paperwork ultimately being kept on
// file in the Troop Commander's office. Loaded on demand (not on every
// dashboard visit) since it's a system-wide, unbounded query.
export function AllRecords({ portal }: { portal: ReturnType<typeof useTroopPortal> }) {
  const { records, recordsLoading, recordsLoaded, recordsError, loadRecords } = portal;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    if (!recordsLoaded && !recordsLoading) loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = records.filter((l) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return l.studentName.toLowerCase().includes(q) || l.indexNumber.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>All Records:</strong> Every leave application from every student — officer cadets and day scholars,
        every leave type — kept here for reference regardless of who approves it. Read-only.
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="w-64">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Search by name or index number..."
            className={styles.input}
          />
        </div>
        <Button variant="secondary" className="!text-xs" onClick={() => loadRecords()} disabled={recordsLoading}>
          {recordsLoading ? "Loading…" : "🔄 Refresh"}
        </Button>
      </div>

      {recordsError && (
        <div className="mb-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          Couldn&apos;t load records: {recordsError}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Type</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsLoading && !recordsLoaded ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  Loading records…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No records found.
                </td>
              </tr>
            ) : (
              filtered.map((l) => {
                const status = recordStatus(l);
                return (
                  <tr key={l.id}>
                    <td>
                      {l.studentName}
                      <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                    </td>
                    <td>
                      <Badge tone={l.studentType === "CADET" ? "purple" : "blue"}>
                        {l.studentType === "CADET" ? "Officer Cadet" : "Day Scholar"}
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
                    <td>
                      <Badge tone={status === "Fully Approved" ? "green" : status === "Rejected" ? "red" : "amber"}>
                        {status}
                      </Badge>
                    </td>
                    <td>
                      <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => setSelected(l)}>
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && <LeaveDetailModal leave={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
