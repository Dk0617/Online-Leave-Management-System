"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { StatTile, Badge, Button, Card } from "@/src/components/ui";
import { useGatePortal, VerifyResult } from "@/src/hooks/useGatePortal";
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

export function Dashboard({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { approvedLeaves, movements, error, refresh } = portal;
  const today = todayStr();
  const todayMovements = movements.filter((m) => m.timestamp.startsWith(today));

  function lastMovementFor(indexNumber: string, leaveId: string) {
    const forLeave = movements.filter((m) => m.leaveId === leaveId || m.indexNumber === indexNumber);
    if (!forLeave.length) return null;
    return [...forLeave].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];
  }

  const onLeaveNow = approvedLeaves.filter((l) => lastMovementFor(l.indexNumber, l.id)?.direction === "Exit");

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
      </div>

      <div className={styles.statGrid}>
        <StatTile label="On Leave Now" value={onLeaveNow.length} tone="amber" />
        <StatTile label="Exits Today" value={todayMovements.filter((m) => m.direction === "Exit").length} />
        <StatTile label="Entries Today" value={todayMovements.filter((m) => m.direction === "Entry").length} tone="green" />
        <StatTile label="Approved Passes" value={approvedLeaves.length} tone="blue" />
      </div>

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">Leave Passes — Exit / Entry &amp; Validity Status</h2>
      <div className="mb-6 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Type</th>
              <th>Leave Type</th>
              <th>From (Exit)</th>
              <th>To (Entry)</th>
              <th>Status</th>
              <th>Validity</th>
            </tr>
          </thead>
          <tbody>
            {approvedLeaves.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No approved leave passes in system.
                </td>
              </tr>
            ) : (
              approvedLeaves.map((l) => {
                const last = lastMovementFor(l.indexNumber, l.id);
                const state = validity(l);
                return (
                  <tr key={l.id}>
                    <td>
                      {l.studentName}
                      <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                    </td>
                    <td>{l.studentType === "CADET" ? "🎖️ Cadet" : "🏠 Day Scholar"}</td>
                    <td>{LEAVE_TYPE_LABELS[l.type]}</td>
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
              })
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">Recent Movements</h2>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Student</th>
              <th>Index</th>
              <th>Type</th>
              <th>Direction</th>
              <th>Logged By</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  No movements logged today.
                </td>
              </tr>
            ) : (
              movements.slice(0, 10).map((m) => (
                <tr key={m.id}>
                  <td className="font-mono text-xs">{new Date(m.timestamp).toLocaleTimeString()}</td>
                  <td>{m.studentName}</td>
                  <td className="text-xs">{m.indexNumber}</td>
                  <td>{m.studentType === "CADET" ? "🎖️ Cadet" : "🏠 Day Scholar"}</td>
                  <td>
                    <Badge tone={m.direction === "Exit" ? "red" : "green"}>
                      {m.direction === "Exit" ? "🚪 Exit" : "🏫 Entry"}
                    </Badge>
                  </td>
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

export function Verify({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { verify, verifyByCode, logMovement } = portal;
  const [mode, setMode] = useState<"code" | "index">("code");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!result?.leave) return;
    const leave = result.leave as unknown as LeaveRequest;
    try {
      await logMovement({ indexNumber: leave.indexNumber, direction, leaveId: leave.id, notes: "Verified at gate" });
      await handleVerify();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log movement");
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
                <Button variant="danger" className="!text-xs" onClick={() => quickLog("Exit")}>
                  🚪 Log Exit
                </Button>
                <Button variant="success" className="!text-xs" onClick={() => quickLog("Entry")}>
                  🏫 Log Entry
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
        {!minimal && <Row label="Type" value={leave.studentType === "CADET" ? "🎖️ Cadet" : "🏠 Day Scholar"} />}
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

export function LogMovement({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { logMovement } = portal;
  const [indexNumber, setIndexNumber] = useState("");
  const [direction, setDirection] = useState<"Exit" | "Entry">("Exit");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(dir: "Exit" | "Entry") {
    if (!indexNumber.trim()) {
      setError("Enter student index number");
      return;
    }
    setError(null);
    try {
      await logMovement({ indexNumber: indexNumber.trim().toUpperCase(), direction: dir, notes: notes.trim() || undefined });
      setResult(`✅ ${dir} logged at ${new Date().toLocaleTimeString()} for ${indexNumber}`);
      setIndexNumber("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log movement");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-bold text-[var(--white)]">📝 Log Student Movement</h2>
      <div className="mb-3.5">
        <label className={styles.label}>Student Index Number</label>
        <input value={indexNumber} onChange={(e) => setIndexNumber(e.target.value)} placeholder="e.g. SC/2021/001" className={styles.input} />
      </div>
      <div className="mb-3.5">
        <label className={styles.label}>Direction</label>
        <select value={direction} onChange={(e) => setDirection(e.target.value as "Exit" | "Entry")} className={styles.input}>
          <option value="Exit">Exit (Leaving Campus)</option>
          <option value="Entry">Entry (Returning to Campus)</option>
        </select>
      </div>
      <div className="mb-4">
        <label className={styles.label}>Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any remarks…" className={styles.input} />
      </div>
      {error && <p className="mb-3 text-xs text-[var(--err)]">{error}</p>}
      <div className="flex gap-2.5">
        <Button variant="danger" className="flex-1" onClick={() => handleSubmit("Exit")}>
          🚪 Log EXIT
        </Button>
        <Button variant="success" className="flex-1" onClick={() => handleSubmit("Entry")}>
          🏫 Log ENTRY
        </Button>
      </div>
      {result && <p className="mt-3.5 text-xs text-[var(--muted)]">{result}</p>}
    </Card>
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
                  <td>{m.studentType === "CADET" ? "🎖️ Cadet" : "🏠 Day Scholar"}</td>
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
