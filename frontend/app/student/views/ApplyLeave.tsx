"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { useAuth } from "@/src/context/AuthContext";
import { useStudentPortal } from "@/src/hooks/useStudentPortal";
import { DOC_REQUIRED_TYPES, LEAVE_TYPE_LABELS, LeaveType } from "@/src/types";
import styles from "../student.module.css";

const LEAVE_TYPES: LeaveType[] = [
  "Medical Leave",
  "Personal Leave",
  "Family Emergency",
  "Academic Leave",
  "Other",
  "Emergency Leave",
];

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export function ApplyLeave({
  portal,
  onDone,
}: {
  portal: ReturnType<typeof useStudentPortal>;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const isCadet = user?.studentType === "CADET";

  const [type, setType] = useState<LeaveType | "">("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEmergency = type === "Emergency Leave";
  const docRequired = type ? DOC_REQUIRED_TYPES.includes(type) : false;
  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const missing: string[] = [];
    if (!type) missing.push("Leave Type");
    if (!startDate) missing.push("Start Date");
    if (!startTime) missing.push("Start Time");
    if (!endDate) missing.push("End Date");
    if (!endTime) missing.push("End Time");
    if (!reason.trim()) missing.push("Reason");
    if (docRequired && !file) missing.push("Supporting Document");
    if (missing.length) {
      setError(`Please complete: ${missing.join(", ")}`);
      return;
    }
    if (new Date(`${endDate}T${endTime}`) < new Date(`${startDate}T${startTime}`)) {
      setError("End date/time must be after start date/time.");
      return;
    }
    if (file && file.size > MAX_FILE_BYTES) {
      setError("File too large (max 2MB). Please choose a smaller file.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const attachmentData = file ? await fileToDataUrl(file) : undefined;
      await portal.applyLeave({
        type: type as LeaveType,
        startDate,
        startTime,
        endDate,
        endTime,
        reason: reason.trim(),
        attachmentName: file?.name,
        attachmentData,
      });
      setType("");
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setReason("");
      setFile(null);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit leave application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className={`${styles.flowBanner} ${isCadet ? "cadet" : ""}`}>
        <div className="text-xl">ℹ️</div>
        <div>
          {isCadet ? (
            <>
              <strong className="text-white">Cadet flow:</strong> Troop Commander → Squadron Commander → SDD.
              PDF available after all 3 approve.
            </>
          ) : (
            <>
              <strong className="text-white">Day Scholar flow:</strong> HOD → Troop Commander. PDF available
              after both approve.
            </>
          )}
        </div>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-white">📋 Leave Details</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={styles.label}>
              Leave Type<span className="ml-0.5 text-[#f87171]">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className={styles.input}
            >
              <option value="">Select type…</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LEAVE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {isEmergency && (
            <div className="rounded-lg border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.1)] px-3.5 py-2.5 text-xs text-[#fca5a5]">
              🚨 <strong>Emergency Leave</strong> is routed immediately to your first-level approver and
              prioritized ahead of normal requests. Use this only for genuine emergencies.
            </div>
          )}

          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>
                Start Date<span className="ml-0.5 text-[#f87171]">*</span>
              </label>
              <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>
                Start Time<span className="ml-0.5 text-[#f87171]">*</span>
              </label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>
                End Date<span className="ml-0.5 text-[#f87171]">*</span>
              </label>
              <input type="date" min={today} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>
                End Time<span className="ml-0.5 text-[#f87171]">*</span>
              </label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={styles.input} />
            </div>
          </div>

          <div>
            <label className={styles.label}>
              Reason<span className="ml-0.5 text-[#f87171]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Describe your reason…"
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>
              Supporting Document{docRequired ? <span className="ml-0.5 text-[#f87171]">*</span> : " (optional)"}
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.png,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-[var(--muted)]"
            />
          </div>

          {error && <p className="text-sm text-[#f87171]">{error}</p>}

          <Button type="submit" variant="accent" disabled={submitting}>
            {submitting ? "Submitting…" : "📤 Submit Leave Application"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
