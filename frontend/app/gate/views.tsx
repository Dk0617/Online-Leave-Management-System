"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { AlertTriangle, DoorOpen, FileText, LogIn, LogOut } from "lucide-react";
import { StatTile, Badge, Button, Card, SearchInput } from "@/src/components/ui";
import { ExitDrilldownModal, ExitEntry, ClickableStatCard } from "@/src/components/exitStats";
import { useGatePortal, VerifyResult } from "@/src/hooks/useGatePortal";
import { useSearchFilter } from "@/src/hooks/useTableControls";
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

  // Only students who've actually exited and/or entered — an approved pass
  // nobody has used yet has nothing to show here (that's what "Approved
  // Passes" above already counts). Same paired Departure/Actual Entry view
  // as the full Movement Log, so a late entry or early exit is just as
  // visible here as it is there.
  const movementRows = pairMovements(movements, approvedLeaves);
  const { query: movementQuery, setQuery: setMovementQuery, filtered: searchedMovementRows } = useSearchFilter(
    movementRows,
    (r) => [r.studentName, r.indexNumber]
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
          Student Movements — Exit / Entry ({searchedMovementRows.length})
        </h2>
        <SearchInput
          value={movementQuery}
          onChange={setMovementQuery}
          placeholder="Search by name or index number…"
          className="w-full sm:w-72"
        />
      </div>
      {movementRows.length === 0 ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] py-8 text-center text-sm text-[var(--muted)]">
          No students have exited or entered yet.
        </div>
      ) : searchedMovementRows.length === 0 ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] py-8 text-center text-sm text-[var(--muted)]">
          No movements match your search.
        </div>
      ) : (
        <PairedMovementTable rows={searchedMovementRows} emptyMessage="No students have exited or entered yet." />
      )}
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
  // Set right after a successful log that turned out to be past curfew —
  // shown as a one-time info banner, not something that gated the click
  // that produced it (see quickLog below: it's always a single click).
  const [flaggedNotice, setFlaggedNotice] = useState<string | null>(null);
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
    setFlaggedNotice(null);
  }

  async function runVerify(rawQuery: string, viaMode: "code" | "index") {
    if (!rawQuery.trim()) return;
    setLoading(true);
    setError(null);
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
    setFlaggedNotice(null);
    await runVerify(query, mode);
  }

  function handleScanned(code: string) {
    setScannerOpen(false);
    setMode("code");
    setQuery(code);
    setFlaggedNotice(null);
    runVerify(code, "code");
  }

  // One click, always logs — a curfew violation is recorded and flagged
  // (see the info banner it leaves behind below), never blocked or held
  // for a second confirmation click. Only the Exit/Entry sequence check
  // (can't log twice in the same direction in a row) still stops the
  // click outright, since that's catching a mis-click, not a real event.
  async function quickLog(direction: "Exit" | "Entry") {
    if (!result?.leave || loggingRef.current) return;
    const leave = result.leave as unknown as LeaveRequest;
    const sequenceReason = sequenceBlockReason(direction, leave.indexNumber, movements);
    if (sequenceReason) {
      setError(sequenceReason);
      return;
    }
    setError(null);
    setFlaggedNotice(null);
    loggingRef.current = true;
    setLoggingDirection(direction);
    try {
      const movement = await logMovement({
        indexNumber: leave.indexNumber,
        direction,
        leaveId: leave.id,
        notes: "Verified at gate",
      });
      if (movement.earlyExit) {
        setFlaggedNotice(`⚠️ Exit logged — before 6:00 AM curfew. Flagged as EARLY EXIT in the movement log.`);
      } else if (movement.lateEntry) {
        setFlaggedNotice(`⚠️ Entry logged — past 6:00 PM curfew (or leave had already ended). Flagged as LATE ENTRY in the movement log.`);
      }
      await runVerify(query, mode);
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
          {result.found && result.valid && result.leave && (() => {
            const leave = result.leave as unknown as LeaveRequest;
            const exitHint = curfewBlockReason("Exit", leave.type);
            const entryHint = curfewBlockReason("Entry", leave.type);
            return (
              <>
                <div className="mb-3 text-lg font-bold text-[var(--ok)]">✅ Valid Leave Pass</div>
                <VerifyRows leave={leave} photo={result.studentPhoto} />
                {(exitHint || entryHint) && (
                  <p className="mt-2 text-[11px] text-[var(--warn)]">
                    ⚠️ It&apos;s currently outside the 6:00 AM–6:00 PM curfew window — logging {exitHint ? "an exit" : "an entry"} now will still go through, flagged as a violation.
                  </p>
                )}
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
                    {loggingDirection === "Entry" ? "Logging…" : "🏫 Log Entry"}
                  </Button>
                </div>
                {flaggedNotice && <p className="mt-2 text-[11px] font-semibold text-[var(--warn)]">{flaggedNotice}</p>}
              </>
            );
          })()}
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
                    {loggingDirection === "Entry" ? "Logging…" : "🏫 Log Entry (Late)"}
                  </Button>
                </div>
                {flaggedNotice && <p className="mt-2 text-[11px] font-semibold text-[var(--warn)]">{flaggedNotice}</p>}
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

// One row per leave, not per movement — the Exit and Entry that belong to
// the same leave pass are paired up here so gate staff see a single
// Departure → Actual Entry story per student instead of two disconnected
// rows they'd have to mentally match up themselves. A student who's only
// exited so far (no Entry yet) still gets one row, just with Actual Entry
// blank and status "Out". Whole-row highlight (not just a badge) is what
// makes an early exit or late entry actually jump out while scanning the
// list, per the request that these "immediately identify" a violation.
interface PairedMovementRow {
  leaveId: string;
  studentName: string;
  indexNumber: string;
  studentType?: LeaveRequest["studentType"];
  leaveType?: LeaveRequest["type"];
  departure: string | null;
  expectedReturn: string;
  actualEntry: string | null;
  loggedBy: string;
  earlyExit: boolean;
  lateEntry: boolean;
  status: "Normal" | "LATE ENTRY" | "EARLY EXIT" | "LATE ENTRY + EARLY EXIT" | "Out";
}

function pairMovements(
  movements: ReturnType<typeof useGatePortal>["movements"],
  approvedLeaves: LeaveRequest[]
): PairedMovementRow[] {
  const byLeave = new Map<string, typeof movements>();
  for (const m of movements) {
    if (!m.leaveId) continue;
    const list = byLeave.get(m.leaveId) ?? [];
    list.push(m);
    byLeave.set(m.leaveId, list);
  }

  const byTime = (a: { timestamp: string }, b: { timestamp: string }) => +new Date(a.timestamp) - +new Date(b.timestamp);

  return Array.from(byLeave.entries())
    .map(([leaveId, ms]) => {
      const exit = ms.filter((m) => m.direction === "Exit").sort(byTime)[0];
      const entry = ms.filter((m) => m.direction === "Entry").sort(byTime)[0];
      const rep = entry ?? exit;
      const leave = approvedLeaves.find((l) => l.id === leaveId);
      const earlyExit = !!exit?.earlyExit;
      const lateEntry = !!entry?.lateEntry;
      const status: PairedMovementRow["status"] =
        earlyExit && lateEntry
          ? "LATE ENTRY + EARLY EXIT"
          : earlyExit
          ? "EARLY EXIT"
          : lateEntry
          ? "LATE ENTRY"
          : exit && !entry
          ? "Out"
          : "Normal";
      return {
        leaveId,
        studentName: rep.studentName,
        indexNumber: rep.indexNumber,
        studentType: rep.studentType,
        leaveType: leave?.type,
        departure: exit?.timestamp ?? null,
        expectedReturn: leave ? `${leave.endDate} ${leave.endTime}` : "—",
        actualEntry: entry?.timestamp ?? null,
        loggedBy: rep.loggedBy,
        earlyExit,
        lateEntry,
        status,
      };
    })
    .sort((a, b) => +new Date(b.departure ?? b.actualEntry ?? 0) - +new Date(a.departure ?? a.actualEntry ?? 0));
}

const MOVEMENT_STATUS_TONE: Record<PairedMovementRow["status"], "green" | "red" | "amber" | "gray"> = {
  Normal: "green",
  "LATE ENTRY": "red",
  "EARLY EXIT": "red",
  "LATE ENTRY + EARLY EXIT": "red",
  Out: "amber",
};

// Shared by the Dashboard (filtered to today isn't required — every row
// here already only exists because a real Exit/Entry happened) and the
// full Movement Log — one row per leave that's actually seen movement,
// never a leave that's merely approved-and-unused. Whole-row highlight
// (not just a badge) is what makes an early exit or late entry actually
// jump out while scanning the list.
function PairedMovementTable({ rows, emptyMessage }: { rows: PairedMovementRow[]; emptyMessage: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Leave Type</th>
            <th>Departure</th>
            <th>Expected Return</th>
            <th>Actual Entry</th>
            <th>Status</th>
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
            rows.map((r) => {
              const violation = r.earlyExit || r.lateEntry;
              return (
                <tr key={r.leaveId} className={violation ? "!bg-[rgba(239,68,68,0.12)]" : undefined}>
                  <td className={`whitespace-nowrap ${violation ? "text-[var(--err)]" : ""}`}>
                    {violation && "⚠️ "}
                    {r.studentName}
                    <span className="ml-1.5" title={r.studentType === "CADET" ? "Officer Cadet" : "Day Scholar"}>
                      {r.studentType === "CADET" ? "🎖️" : "🏠"}
                    </span>
                    <div className={violation ? "text-xs text-[var(--err-soft)]" : "text-xs text-[var(--muted)]"}>
                      {r.indexNumber}
                    </div>
                  </td>
                  <td>{r.leaveType ? LEAVE_TYPE_LABELS[r.leaveType] : "—"}</td>
                  <td className="font-mono text-xs">
                    {r.departure ? new Date(r.departure).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="font-mono text-xs">{r.expectedReturn.split(" ")[1] ?? "—"}</td>
                  <td className="font-mono text-xs">
                    {r.actualEntry
                      ? new Date(r.actualEntry).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                  <td>
                    <Badge tone={MOVEMENT_STATUS_TONE[r.status]}>{r.status}</Badge>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function MovementLog({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { movements, approvedLeaves, clearMovementLog } = portal;
  const [error, setError] = useState<string | null>(null);

  async function handleClear() {
    if (!confirm("Clear all movement logs?")) return;
    try {
      await clearMovementLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear movement log");
    }
  }

  const rows = pairMovements(movements, approvedLeaves);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-[var(--white)]">Movement Log</span>
        <Button variant="secondary" className="!text-xs" onClick={handleClear}>
          Clear Log
        </Button>
      </div>
      {error && <p className="mb-3 text-xs text-[var(--err)]">{error}</p>}
      <PairedMovementTable rows={rows} emptyMessage="No movements logged." />
    </div>
  );
}
