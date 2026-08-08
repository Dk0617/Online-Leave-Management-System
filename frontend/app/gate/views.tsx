"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { AlertTriangle, DoorOpen, FileText, LogIn, LogOut } from "lucide-react";
import { StatTile, Badge, Button, Card, SearchInput, SortableTh } from "@/src/components/ui";
import { ExitDrilldownModal, ExitEntry, ClickableStatCard } from "@/src/components/exitStats";
import { useGatePortal, VerifyResult } from "@/src/hooks/useGatePortal";
import { useSearchFilter, useSort, sortRows } from "@/src/hooks/useTableControls";
import { LEAVE_TYPE_LABELS, LeaveRequest } from "@/src/types";
import styles from "@/src/portal.module.css";

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

// Campus curfew: except Emergency Leave, students may only exit from 6:00 AM
// onward and must re-enter by 6:00 PM. Mirrors the backend check in
// gatecontrol.js logMovement — this is just a faster client-side echo of it
// for a snappier UX; the backend remains the authoritative enforcement.
function curfewBlockReason(direction: "Exit" | "Entry", leaveType: string): string | null {
  if (leaveType === "Emergency Leave") return null;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (direction === "Exit" && nowMinutes < 6 * 60) {
    return "Campus exit is only allowed from 6:00 AM onward.";
  }
  if (direction === "Entry" && nowMinutes > 18 * 60) {
    return "Campus entry must be logged by 6:00 PM.";
  }
  return null;
}

// A student is either on campus or out on leave — Exit/Entry must
// alternate. Mirrors the backend check in gatecontrol.js logMovement.
function sequenceBlockReason(
  direction: "Exit" | "Entry",
  indexNumber: string,
  movements: { indexNumber: string; direction: "Exit" | "Entry"; timestamp: string }[]
): string | null {
  const last = [...movements]
    .filter((m) => m.indexNumber === indexNumber)
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];
  if (direction === "Entry" && (!last || last.direction !== "Exit")) {
    return `${indexNumber} has not exited campus yet — cannot log Entry before Exit. Did you mean to click Log Exit?`;
  }
  if (direction === "Exit" && last?.direction === "Exit") {
    return `${indexNumber} has already exited and not yet returned — cannot log another Exit. Did you mean to click Log Entry?`;
  }
  return null;
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { approvedLeaves, movements, error, refresh } = portal;
  const today = todayStr();
  const todayMovements = movements.filter((m) => m.timestamp.startsWith(today));
  const [drilldown, setDrilldown] = useState<{ title: string; entries: ExitEntry[] } | null>(null);

  const todayExitEntries: ExitEntry[] = todayMovements
    .filter((m) => m.direction === "Exit")
    .map((m) => ({
      id: m.id,
      indexNumber: m.indexNumber,
      studentName: m.studentName,
      studentType: m.studentType,
      department: approvedLeaves.find((l) => l.id === m.leaveId)?.department,
      direction: "Exit",
      timestamp: m.timestamp,
    }));

  const todayEntryEntries: ExitEntry[] = todayMovements
    .filter((m) => m.direction === "Entry")
    .map((m) => ({
      id: m.id,
      indexNumber: m.indexNumber,
      studentName: m.studentName,
      studentType: m.studentType,
      department: approvedLeaves.find((l) => l.id === m.leaveId)?.department,
      direction: "Entry",
      timestamp: m.timestamp,
      lateEntry: m.lateEntry,
    }));

  function lastMovementFor(indexNumber: string, leaveId: string) {
    const forLeave = movements.filter((m) => m.leaveId === leaveId || m.indexNumber === indexNumber);
    if (!forLeave.length) return null;
    return [...forLeave].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];
  }

  const onLeaveNow = approvedLeaves.filter((l) => lastMovementFor(l.indexNumber, l.id)?.direction === "Exit");

  // Still out, but their approved leave window has already ended — they're
  // overdue and haven't been logged back in yet. Distinct from the
  // Troop/Squadron/SDD "Late Returns" tile (see backend
  // gatecontrol.js/models/Movement.js lateEntry), which only fires after
  // the student has actually come back — this is the "before they've even
  // returned" visibility gate staff need.
  const overdueLeaves = onLeaveNow.filter((l) => validity(l) === "expired");
  const overdueEntries: ExitEntry[] = overdueLeaves.map((l) => ({
    id: l.id,
    indexNumber: l.indexNumber,
    studentName: l.studentName,
    studentType: l.studentType,
    department: l.department,
    direction: "Exit",
    plannedDate: `${l.endDate} ${l.endTime}`,
  }));

  // Order received, not grouped by leave type — Mongo ObjectIds are
  // time-ordered, so a plain string sort on `id` gives the exact order
  // these applications came in without needing a separate timestamp field.
  const orderedLeaves = [...approvedLeaves].sort((a, b) => a.id.localeCompare(b.id));
  const { query: leaveQuery, setQuery: setLeaveQuery, filtered: searchedLeaves } = useSearchFilter(
    orderedLeaves,
    (l) => [l.studentName, l.indexNumber]
  );

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          <span>Couldn&apos;t load gate data: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      )}
      <div className={styles.infoBanner}>
        <strong>Gate Staff Role:</strong> Verify student leave passes, log exits and entries, and monitor who
        is currently on leave. Students must have a fully approved leave pass before exiting campus.
        <strong> Campus curfew:</strong> except Emergency Leave, exit is only allowed from 6:00 AM onward and
        entry must be logged by 6:00 PM — the system blocks logging outside those hours.
      </div>

      <div className={styles.statGrid}>
        <StatTile label="On Leave Now" value={onLeaveNow.length} tone="amber" icon={<DoorOpen size={20} />} />
        <ClickableStatCard onClick={() => setDrilldown({ title: "Exits Today", entries: todayExitEntries })}>
          <StatTile label="Exits Today (click for details)" value={todayExitEntries.length} icon={<LogOut size={20} />} />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setDrilldown({ title: "Entries Today", entries: todayEntryEntries })}>
          <StatTile
            label="Entries Today (click for details)"
            value={todayEntryEntries.length}
            tone="green"
            icon={<LogIn size={20} />}
          />
        </ClickableStatCard>
        <StatTile label="Approved Passes" value={approvedLeaves.length} tone="blue" icon={<FileText size={20} />} />
        <ClickableStatCard onClick={() => setDrilldown({ title: "Overdue — Still Out", entries: overdueEntries })}>
          <StatTile label="Overdue (click for details)" value={overdueEntries.length} tone="red" icon={<AlertTriangle size={20} />} />
        </ClickableStatCard>
      </div>

      {drilldown && (
        <ExitDrilldownModal
          title={drilldown.title}
          entries={drilldown.entries}
          onClose={() => setDrilldown(null)}
        />
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[var(--white)]">
          Leave Passes — Exit / Entry &amp; Validity Status ({searchedLeaves.length})
        </h2>
        <SearchInput
          value={leaveQuery}
          onChange={setLeaveQuery}
          placeholder="Search by name or index number…"
          className="w-full sm:w-72"
        />
      </div>
      {orderedLeaves.length === 0 ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] py-8 text-center text-sm text-[var(--muted)]">
          No approved leave passes in system.
        </div>
      ) : searchedLeaves.length === 0 ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] py-8 text-center text-sm text-[var(--muted)]">
          No leave passes match your search.
        </div>
      ) : (
        <LeavePassTable leaves={searchedLeaves} lastMovementFor={lastMovementFor} />
      )}
    </div>
  );
}

function LeavePassTable({
  leaves,
  lastMovementFor,
}: {
  leaves: LeaveRequest[];
  lastMovementFor: (indexNumber: string, leaveId: string) => { direction: "Exit" | "Entry" } | null;
}) {
  const { sortKey, sortDir, toggleSort } = useSort();
  // Status/Validity are derived per row (need lastMovementFor/validity), not
  // raw fields — computed once here so both the sort accessors and the
  // render below share the same values instead of recomputing per row twice.
  const rows = leaves.map((l) => {
    const last = lastMovementFor(l.indexNumber, l.id);
    const state = validity(l);
    return { leave: l, last, state, isOverdue: last?.direction === "Exit" && state === "expired" };
  });
  const sortedRows = sortRows(rows, sortKey, sortDir, {
    student: (r) => r.leave.studentName,
    studentType: (r) => r.leave.studentType,
    type: (r) => r.leave.type,
    from: (r) => r.leave.startDate,
    to: (r) => r.leave.endDate,
    status: (r) => (r.last ? r.last.direction : ""),
    validity: (r) => r.state,
  });
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <SortableTh label="Student" sortKey="student" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortableTh label="Type" sortKey="studentType" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortableTh label="Leave Type" sortKey="type" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortableTh label="From (Exit)" sortKey="from" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortableTh label="To (Entry)" sortKey="to" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortableTh label="Status" sortKey="status" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortableTh label="Validity" sortKey="validity" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map(({ leave: l, last, state, isOverdue }) => {
            return (
              <tr key={l.id} className={isOverdue ? "bg-[rgba(239,68,68,0.1)]" : undefined}>
                <td className={isOverdue ? "text-[var(--err)]" : undefined}>
                  {isOverdue && "⚠️ "}
                  {l.studentName}
                  <div className={isOverdue ? "text-xs text-[var(--err-soft)]" : "text-xs text-[var(--muted)]"}>
                    {l.indexNumber}
                  </div>
                </td>
                <td>{l.studentType === "CADET" ? "🎖️ Officer Cadet" : "🏠 Day Scholar"}</td>
                <td>
                  {LEAVE_TYPE_LABELS[l.type]}
                  {l.priority === "emergency" && (
                    <span className="ml-1">
                      <Badge tone="red">Emergency</Badge>
                    </span>
                  )}
                </td>
                <td className="font-mono text-xs">
                  {l.startDate} {l.startTime}
                </td>
                <td className={isOverdue ? "font-mono text-xs font-bold text-[var(--err)]" : "font-mono text-xs"}>
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
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Verify({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { verify, verifyByCode, logMovement, movements } = portal;
  const [mode, setMode] = useState<"code" | "index">("code");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingDirection, setLoggingDirection] = useState<"Exit" | "Entry" | null>(null);
  // Set after a curfew-blocked Entry attempt — clicking Log Entry again
  // while this is set confirms and logs it as a late entry instead of
  // blocking it a second time. Exit has no equivalent: it stays a hard
  // block, see quickLog below. Cleared on every fresh verification so it
  // never carries over to a different student.
  const [pendingCurfewOverride, setPendingCurfewOverride] = useState(false);
  // A ref (not state) so it's set synchronously on the very first click —
  // state updates are batched/async and wouldn't block a same-tick second
  // click from also passing the guard.
  const loggingRef = useRef(false);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setHasCamera(false);
      return;
    }
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => setHasCamera(devices.some((d) => d.kind === "videoinput")))
      .catch(() => setHasCamera(false));
  }, []);

  function switchMode(next: "code" | "index") {
    setMode(next);
    setQuery("");
    setResult(null);
    setPendingCurfewOverride(false);
  }

  async function runVerify(rawQuery: string, viaMode: "code" | "index") {
    if (!rawQuery.trim()) return;
    setLoading(true);
    setError(null);
    setPendingCurfewOverride(false);
    try {
      const res =
        viaMode === "code" ? await verifyByCode(rawQuery.trim()) : await verify(rawQuery.trim().toUpperCase());
      setResult(res);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Failed to verify");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    await runVerify(query, mode);
  }

  function handleScanned(code: string) {
    setScannerOpen(false);
    setMode("code");
    setQuery(code);
    runVerify(code, "code");
  }

  async function quickLog(direction: "Exit" | "Entry") {
    if (!result?.leave || loggingRef.current) return;
    const leave = result.leave as unknown as LeaveRequest;
    const sequenceReason = sequenceBlockReason(direction, leave.indexNumber, movements);
    if (sequenceReason) {
      setError(sequenceReason);
      setPendingCurfewOverride(false);
      return;
    }
    const curfewReason = curfewBlockReason(direction, leave.type);
    const confirmLate = direction === "Entry" && pendingCurfewOverride;
    // Exit past curfew stays a hard block every time — letting someone out
    // early is a preventable mistake, not a "they're stuck outside"
    // problem. Entry gets one warning, then a second click confirms it.
    if (curfewReason && !confirmLate) {
      setError(
        direction === "Entry"
          ? `${curfewReason} Click "Log Entry" again to confirm and record this as a late entry.`
          : curfewReason
      );
      setPendingCurfewOverride(direction === "Entry");
      return;
    }
    setError(null);
    setPendingCurfewOverride(false);
    loggingRef.current = true;
    setLoggingDirection(direction);
    try {
      await logMovement({
        indexNumber: leave.indexNumber,
        direction,
        leaveId: leave.id,
        notes: "Verified at gate",
        confirmLate: confirmLate || undefined,
      });
      await handleVerify();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log movement");
    } finally {
      loggingRef.current = false;
      setLoggingDirection(null);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-sm font-bold text-[var(--white)]">🔍 Verify Leave Pass</h2>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Use the <strong>Gate Verification Code</strong> printed on the student&apos;s PDF pass. It looks up the
        student&apos;s photo live from the system — not from the PDF — so always compare that photo with the
        person in front of you before allowing exit or entry. This catches a copied or borrowed PDF.
      </p>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => switchMode("code")}
          className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
            mode === "code"
              ? "bg-[var(--orange)] text-white"
              : "bg-[var(--card2)] text-[var(--muted)] hover:text-[var(--white)]"
          }`}
        >
          🔑 By Verification Code
        </button>
        <button
          type="button"
          onClick={() => switchMode("index")}
          className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
            mode === "index"
              ? "bg-[var(--orange)] text-white"
              : "bg-[var(--card2)] text-[var(--muted)] hover:text-[var(--white)]"
          }`}
        >
          🪪 By Index Number
        </button>
        {hasCamera && (
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="rounded-lg bg-[rgba(37,99,176,0.15)] px-3 py-1.5 font-semibold text-[var(--sky)] transition-colors hover:bg-[rgba(37,99,176,0.28)]"
          >
            📷 Scan QR Code
          </button>
        )}
      </div>

      {scannerOpen && <QrScanner onScan={handleScanned} onClose={() => setScannerOpen(false)} />}

      <div className="mb-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          placeholder={mode === "code" ? "Code from the PDF, e.g. K7M2QX" : "Enter index number e.g. SC/2021/001"}
          className={styles.input}
        />
        <Button variant="primary" onClick={handleVerify} disabled={loading}>
          🔍 Verify
        </Button>
      </div>

      {error && <p className="mb-3 text-xs text-[var(--err)]">{error}</p>}

      {result && (
        <div
          className={`rounded-xl border p-4 ${
            result.found && result.valid
              ? "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.06)]"
              : "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)]"
          }`}
        >
          {!result.found && (
            <>
              <div className="mb-2 text-lg font-bold text-[var(--err)]">❌ No Leave Found</div>
              <p className="text-xs text-[var(--muted)]">
                {mode === "code" ? (
                  <>
                    No leave application matches verification code <strong>{query}</strong>. Do not allow
                    exit/entry — this pass could be fake or altered.
                  </>
                ) : (
                  <>
                    No leave application found for index number <strong>{query}</strong>.
                  </>
                )}
              </p>
            </>
          )}
          {result.found && result.valid && result.leave && (
            <>
              <div className="mb-3 text-lg font-bold text-[var(--ok)]">✅ Valid Leave Pass</div>
              <VerifyRows leave={result.leave as unknown as LeaveRequest} photo={result.studentPhoto} />
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  className="!text-xs"
                  disabled={loggingDirection !== null}
                  onClick={() => quickLog("Exit")}
                >
                  {loggingDirection === "Exit" ? "Logging…" : "🚪 Log Exit"}
                </Button>
                <Button
                  variant="success"
                  className="!text-xs"
                  disabled={loggingDirection !== null}
                  onClick={() => quickLog("Entry")}
                >
                  {loggingDirection === "Entry"
                    ? "Logging…"
                    : pendingCurfewOverride
                    ? "⚠️ Confirm Late Entry"
                    : "🏫 Log Entry"}
                </Button>
              </div>
            </>
          )}
          {result.found && !result.valid && result.reason === "late_return" && result.leave && (() => {
            const leave = result.leave as unknown as LeaveRequest;
            return (
              <>
                <div className="mb-2 text-lg font-bold text-[var(--warn)]">⚠️ Returning Late</div>
                <p className="mb-2 text-xs text-[var(--muted)]">
                  This student&apos;s approved leave period already ended ({leave.endDate} {leave.endTime}).
                  They can still be let back in — logging this records it as a late return, visible to
                  their Troop Commander
                  {leave.studentType === "CADET" ? ", Squadron Commander, and Senior Deputy Dean" : ""}.
                </p>
                <VerifyRows leave={leave} photo={result.studentPhoto} minimal />
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="success"
                    className="!text-xs"
                    disabled={loggingDirection !== null}
                    onClick={() => quickLog("Entry")}
                  >
                    {loggingDirection === "Entry"
                      ? "Logging…"
                      : pendingCurfewOverride
                      ? "⚠️ Confirm Late Entry"
                      : "🏫 Log Entry (Late)"}
                  </Button>
                </div>
              </>
            );
          })()}
          {result.found && !result.valid && result.reason === "not_active" && result.leave && (
            <>
              <div className="mb-2 text-lg font-bold text-[var(--err)]">⚠️ Leave Pass Not Active</div>
              <p className="mb-2 text-xs text-[var(--muted)]">
                Student has an approved leave but it is not currently active.
              </p>
              <VerifyRows leave={result.leave as unknown as LeaveRequest} photo={result.studentPhoto} minimal />
            </>
          )}
          {result.found && !result.valid && result.reason === "not_approved" && (
            <>
              <div className="mb-2 text-lg font-bold text-[var(--err)]">❌ No Valid Leave Pass</div>
              <p className="text-xs text-[var(--muted)]">
                Student <strong>{query}</strong> does not have a fully approved leave pass. Entry/Exit not
                permitted on leave grounds.
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// Reads a QR code using the device's own camera (getUserMedia + jsQR decoding
// entirely in the browser) — no dedicated barcode-scanner hardware required.
// If the camera can't be opened for any reason, it shows an error and closes
// itself; manual code entry in the parent form is unaffected either way.
function QrScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameId: number;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      if (video && ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          stopped = true;
          onScan(code.data);
          return;
        }
      }
      frameId = requestAnimationFrame(tick);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        frameId = requestAnimationFrame(tick);
      })
      .catch(() => setError("Could not open the camera. Enter the code manually below instead."));

    return () => {
      stopped = true;
      if (frameId) cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-[var(--border)] bg-black">
      {error ? (
        <div className="flex items-center justify-between gap-3 bg-[rgba(239,68,68,0.1)] p-3 text-xs text-[var(--err)]">
          <span>{error}</span>
          <Button variant="secondary" className="!text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <div className="relative">
          <video ref={videoRef} muted playsInline className="max-h-64 w-full object-contain" />
          <div className="absolute inset-x-0 top-2 flex justify-center">
            <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold text-white">
              Point the camera at the QR code on the student&apos;s pass
            </span>
          </div>
          <div className="absolute bottom-2 right-2">
            <Button variant="secondary" className="!text-xs" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function VerifyRows({ leave, minimal, photo }: { leave: LeaveRequest; minimal?: boolean; photo?: string }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0">
        <div className="mb-1 text-center text-[9px] uppercase tracking-wide text-[var(--muted)]">
          Photo on File
        </div>
        {photo ? (
          <img
            src={photo}
            alt="Student on file"
            className="h-24 w-24 rounded-lg border-2 border-[var(--orange)] object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] px-1 text-center text-[9px] text-[var(--muted)]">
            No Photo On File
          </div>
        )}
      </div>
      <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <Row label="Student" value={leave.studentName} />
        <Row label="Index" value={leave.indexNumber} />
        {!minimal && <Row label="Type" value={leave.studentType === "CADET" ? "🎖️ Officer Cadet" : "🏠 Day Scholar"} />}
        {!minimal && <Row label="Leave Type" value={LEAVE_TYPE_LABELS[leave.type]} />}
        <Row label="Valid From" value={`${leave.startDate} ${leave.startTime}`} />
        <Row label="Valid To" value={`${leave.endDate} ${leave.endTime}`} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-[var(--muted)]">{label}</div>
      <div className="font-semibold text-[var(--white)]">{value}</div>
    </div>
  );
}

export function MovementLog({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { movements, clearMovementLog } = portal;
  const [error, setError] = useState<string | null>(null);

  async function handleClear() {
    if (!confirm("Clear all movement logs?")) return;
    try {
      await clearMovementLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear movement log");
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-[var(--white)]">Full Movement Log</span>
        <Button variant="secondary" className="!text-xs" onClick={handleClear}>
          Clear Log
        </Button>
      </div>
      {error && <p className="mb-3 text-xs text-[var(--err)]">{error}</p>}
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
                  <td>{m.studentType === "CADET" ? "🎖️ Officer Cadet" : "🏠 Day Scholar"}</td>
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
