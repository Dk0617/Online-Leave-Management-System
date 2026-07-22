"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { StatTile, Badge, Button, Card } from "@/src/components/ui";
import { ExitDrilldownModal, ExitEntry, ClickableStatCard } from "@/src/components/exitStats";
import { useGatePortal, VerifyResult } from "@/src/hooks/useGatePortal";
import { LEAVE_TYPE_LABELS, LeaveRequest, LeaveType } from "@/src/types";
import styles from "@/src/portal.module.css";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
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

// Most time-critical for gate staff first; Academic Leave is never
// gate-eligible (see backend isGateEligible) so it won't actually appear,
// but is kept here in case that ever changes.
const LEAVE_TYPE_ORDER: LeaveType[] = ["Emergency Leave", "Medical Leave", "Personal Leave", "Academic Leave"];

export function Dashboard({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { approvedLeaves, movements, error, refresh } = portal;
  const today = todayStr();
  const tomorrow = tomorrowStr();
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

  const tomorrowExitEntries: ExitEntry[] = approvedLeaves
    .filter((l) => l.startDate === tomorrow)
    .map((l) => ({
      id: l.id,
      indexNumber: l.indexNumber,
      studentName: l.studentName,
      studentType: l.studentType,
      department: l.department,
      direction: "Exit",
      plannedDate: `${l.startDate} ${l.startTime}`,
    }));

  function lastMovementFor(indexNumber: string, leaveId: string) {
    const forLeave = movements.filter((m) => m.leaveId === leaveId || m.indexNumber === indexNumber);
    if (!forLeave.length) return null;
    return [...forLeave].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];
  }

  const onLeaveNow = approvedLeaves.filter((l) => lastMovementFor(l.indexNumber, l.id)?.direction === "Exit");

  // Whichever departure time is closest to right now (whether it's a few
  // minutes away or a few minutes ago) sits at the top; departures far in
  // the past or far in the future sink toward the bottom.
  const now = Date.now();
  function byClosenessToNow(a: LeaveRequest, b: LeaveRequest) {
    const aDist = Math.abs(+new Date(`${a.startDate}T${a.startTime}`) - now);
    const bDist = Math.abs(+new Date(`${b.startDate}T${b.startTime}`) - now);
    return aDist - bDist;
  }

  const leavesByType = LEAVE_TYPE_ORDER.map((type) => ({
    type,
    leaves: approvedLeaves.filter((l) => l.type === type).sort(byClosenessToNow),
  })).filter((group) => group.leaves.length > 0);

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
        <StatTile label="On Leave Now" value={onLeaveNow.length} tone="amber" />
        <ClickableStatCard onClick={() => setDrilldown({ title: "Exits Today", entries: todayExitEntries })}>
          <StatTile label="Exits Today (click for details)" value={todayExitEntries.length} />
        </ClickableStatCard>
        <ClickableStatCard onClick={() => setDrilldown({ title: "Exits Tomorrow", entries: tomorrowExitEntries })}>
          <StatTile label="Exits Tomorrow (click for details)" value={tomorrowExitEntries.length} tone="blue" />
        </ClickableStatCard>
        <StatTile label="Entries Today" value={todayMovements.filter((m) => m.direction === "Entry").length} tone="green" />
        <StatTile label="Approved Passes" value={approvedLeaves.length} tone="blue" />
      </div>

      {drilldown && (
        <ExitDrilldownModal
          title={drilldown.title}
          entries={drilldown.entries}
          onClose={() => setDrilldown(null)}
        />
      )}

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">Leave Passes — Exit / Entry &amp; Validity Status</h2>
      {leavesByType.length === 0 ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] py-8 text-center text-sm text-[var(--muted)]">
          No approved leave passes in system.
        </div>
      ) : (
        leavesByType.map((group) => (
          <div key={group.type} className="mb-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              {LEAVE_TYPE_LABELS[group.type]} ({group.leaves.length})
            </h3>
            <LeavePassTable leaves={group.leaves} lastMovementFor={lastMovementFor} />
          </div>
        ))
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
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Type</th>
            <th>From (Exit)</th>
            <th>To (Entry)</th>
            <th>Status</th>
            <th>Validity</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((l) => {
            const last = lastMovementFor(l.indexNumber, l.id);
            const state = validity(l);
            return (
              <tr key={l.id}>
                <td>
                  {l.studentName}
                  <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                </td>
                <td>{l.studentType === "CADET" ? "🎖️ Officer Cadet" : "🏠 Day Scholar"}</td>
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
    const blockReason =
      sequenceBlockReason(direction, leave.indexNumber, movements) || curfewBlockReason(direction, leave.type);
    if (blockReason) {
      setError(blockReason);
      return;
    }
    setError(null);
    loggingRef.current = true;
    setLoggingDirection(direction);
    try {
      await logMovement({ indexNumber: leave.indexNumber, direction, leaveId: leave.id, notes: "Verified at gate" });
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
                  {loggingDirection === "Entry" ? "Logging…" : "🏫 Log Entry"}
                </Button>
              </div>
            </>
          )}
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
