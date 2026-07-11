"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { useGatePortal, VerifyResult } from "@/src/hooks/useGatePortal";
import { LEAVE_TYPE_LABELS, LeaveRequest } from "@/src/types";
import styles from "../gate.module.css";

export function Verify({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { verify, logMovement } = portal;
  const [indexNumber, setIndexNumber] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (!indexNumber.trim()) return;
    setLoading(true);
    try {
      const res = await verify(indexNumber.trim().toUpperCase());
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  async function quickLog(direction: "Exit" | "Entry") {
    if (!result?.leave) return;
    const leave = result.leave as unknown as LeaveRequest;
    await logMovement({ indexNumber: leave.indexNumber, direction, leaveId: leave.id, notes: "Verified at gate" });
    await handleVerify();
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-sm font-bold text-white">🔍 Verify Leave Pass</h2>
      <p className="mb-4 text-xs text-[var(--muted)]">
        Enter a student&apos;s index number to check if they have a valid approved leave pass.
      </p>
      <div className="mb-4 flex gap-2">
        <input
          value={indexNumber}
          onChange={(e) => setIndexNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          placeholder="Enter index number e.g. SC/2021/001"
          className={styles.input}
        />
        <Button variant="primary" onClick={handleVerify} disabled={loading}>
          🔍 Verify
        </Button>
      </div>

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
              <div className="mb-2 text-lg font-bold text-[#f87171]">❌ No Leave Found</div>
              <p className="text-xs text-[var(--muted)]">
                No leave application found for index number <strong>{indexNumber}</strong>.
              </p>
            </>
          )}
          {result.found && result.valid && result.leave && (
            <>
              <div className="mb-3 text-lg font-bold text-[#4ade80]">✅ Valid Leave Pass</div>
              <VerifyRows leave={result.leave as unknown as LeaveRequest} />
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
              <div className="mb-2 text-lg font-bold text-[#f87171]">⚠️ Leave Pass Not Active</div>
              <p className="mb-2 text-xs text-[var(--muted)]">
                Student has an approved leave but it is not currently active.
              </p>
              <VerifyRows leave={result.leave as unknown as LeaveRequest} minimal />
            </>
          )}
          {result.found && !result.valid && result.reason === "not_approved" && (
            <>
              <div className="mb-2 text-lg font-bold text-[#f87171]">❌ No Valid Leave Pass</div>
              <p className="text-xs text-[var(--muted)]">
                Student <strong>{indexNumber}</strong> does not have a fully approved leave pass. Entry/Exit
                not permitted on leave grounds.
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function VerifyRows({ leave, minimal }: { leave: LeaveRequest; minimal?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
      <Row label="Student" value={leave.studentName} />
      <Row label="Index" value={leave.indexNumber} />
      {!minimal && <Row label="Type" value={leave.studentType === "CADET" ? "🎖️ Cadet" : "🏠 Day Scholar"} />}
      {!minimal && <Row label="Leave Type" value={LEAVE_TYPE_LABELS[leave.type]} />}
      <Row label="Valid From" value={`${leave.startDate} ${leave.startTime}`} />
      <Row label="Valid To" value={`${leave.endDate} ${leave.endTime}`} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-[var(--muted)]">{label}</div>
      <div className="font-semibold text-white">{value}</div>
    </div>
  );
}
