"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatTile, Badge, Button, Card } from "@/src/components/ui";
import { LeaveDetailModal } from "@/src/components/leave";
import { DigitalClock } from "@/src/components/DashboardShell";
import { useAuth } from "@/src/AuthContext";
import { useStudentPortal } from "@/src/hooks/useStudentPortal";
import { isApproved, isGateEligible, isRejected, isStageMoot, requiresAttachment } from "@/src/api";
import { downloadLeavePassPdf } from "@/src/pdf";
import { downscalePhoto } from "@/src/photo";
import { LEAVE_TYPE_LABELS, LeaveRequest, LeaveType } from "@/src/types";
import styles from "./student.module.css";

function statusBadge(status: string) {
  const tone = status === "Approved" ? "green" : status === "Rejected" ? "red" : status === "N/A" ? "gray" : "amber";
  return <Badge tone={tone}>{status}</Badge>;
}

// "N/A" means that actor isn't part of this leave's routing at all (e.g.
// Troop/SDD for a cadet's Academic Leave) — shown as a plain dash instead
// of a badge, so it reads as "not applicable" rather than "still pending".
// "moot" means the actor IS part of the routing but will never see it
// because an earlier stage already rejected the leave — shown as "Not
// Reached" instead of a stale "Pending" badge.
function statusOrDash(status: string, moot: boolean) {
  if (status === "N/A") return <span className="text-[var(--muted)]">—</span>;
  if (moot) return <Badge tone="gray">Not Reached</Badge>;
  return statusBadge(status);
}

// The dashboard shows one merged row per Academic Leave + linked Personal
// Leave pair. For Cadets the two routes only overlap at Squadron — Academic
// Leave's own troopStatus/sddStatus stay "N/A" forever (it never reaches
// Troop or SDD), even though the linked Personal Leave genuinely does go
// Troop -> Squadron -> SDD. Falling back to the companion's value whenever
// the primary's own is "N/A" shows that real progress instead of a
// permanent dash — Day Scholars are unaffected, since HOD/Troop are never
// "N/A" on their own Academic Leave to begin with.
function mergedStatus(
  primary: LeaveRequest,
  companion: LeaveRequest | undefined,
  field: "hodStatus" | "troopStatus" | "sqnStatus" | "sddStatus"
): string {
  if (primary[field] !== "N/A") return primary[field];
  return companion?.[field] ?? "N/A";
}

// Mirrors mergedStatus's primary-vs-companion fallback so the "moot" check
// runs against whichever leave the displayed status actually came from.
function mergedIsMoot(
  primary: LeaveRequest,
  companion: LeaveRequest | undefined,
  field: "hodStatus" | "troopStatus" | "sqnStatus" | "sddStatus"
): boolean {
  if (primary[field] !== "N/A") return isStageMoot(primary, field);
  return companion ? isStageMoot(companion, field) : false;
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useStudentPortal> }) {
  const { user } = useAuth();
  const { leaves, error, refresh } = portal;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  const isCadet = user?.studentType === "CADET";

  // Academic Leave and its auto-created Personal Leave are one application,
  // not two — the Personal Leave companion is hidden as its own row (and
  // excluded from the stat counts below); its status/PDF is folded into
  // the Academic Leave's row instead.
  const visibleLeaves = leaves.filter((l) => !(l.type === "Personal Leave" && l.linkedLeaveId));
  function companionOf(l: LeaveRequest): LeaveRequest | undefined {
    return l.linkedLeaveId ? leaves.find((x) => x.id === l.linkedLeaveId) : undefined;
  }

  const total = visibleLeaves.length;
  const approved = visibleLeaves.filter(isApproved).length;
  const rejected = visibleLeaves.filter(isRejected).length;
  const pending = total - approved - rejected;

  // Academic Leave and its linked Personal Leave are two separate, fully
  // independent downloadable PDFs — each shows its own actual type, reason,
  // and approval chain (Academic Leave's own PDF never has gate-verification
  // data since it's not an exit permit; the Personal Leave's does once it's
  // been used at the gate).
  async function downloadPdfFor(leave: LeaveRequest) {
    const verification = await portal.getMovements(leave.id).catch(() => undefined);
    await downloadLeavePassPdf(leave, portal.profile?.photo, verification);
  }

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          <span>Couldn&apos;t load your leaves: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      )}
      <div className={`${styles.flowBanner} ${isCadet ? "cadet" : ""}`}>
        <div className="text-xl">{isCadet ? "🎖️" : "🏠"}</div>
        <div>
          <strong className="text-[var(--white)]">
            {isCadet ? "Officer Cadet Leave Flow:" : "Day Scholar Leave Flow:"}
          </strong>{" "}
          {isCadet
            ? "Applications go → Troop Commander → Squadron Commander → Senior Deputy Dean → PDF download when fully approved. (Academic Leave instead goes HOD → Squadron Commander — see the table below.)"
            : "Your applications go → HOD → Troop Commander → PDF download available once both approve."}
        </div>
      </div>

      <div className={styles.statGrid}>
        <StatTile icon="📋" label="Total Applied" value={total} />
        <StatTile icon="⏳" label="Pending" value={pending} tone="amber" />
        <StatTile icon="✅" label="Fully Approved" value={approved} tone="green" />
        <StatTile icon="❌" label="Rejected" value={rejected} tone="red" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Applied</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              {isCadet ? (
                <>
                  <th>HOD</th>
                  <th>Troop Commander</th>
                  <th>Squadron Commander</th>
                  <th>Senior Deputy Dean</th>
                </>
              ) : (
                <>
                  <th>HOD</th>
                  <th>Troop Commander</th>
                </>
              )}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleLeaves.length === 0 ? (
              <tr>
                <td colSpan={isCadet ? 9 : 7} className="py-8 text-center text-[var(--muted)]">
                  No applications yet.
                </td>
              </tr>
            ) : (
              visibleLeaves.map((l) => {
                const companion = companionOf(l);
                // Academic Leave and its linked Personal Leave each get their
                // own PDF, downloadable independently once each is approved —
                // Academic Leave's own chain (HOD/Troop -> Squadron) is
                // separate from the Personal Leave's (which is the actual
                // gate pass, requiring isGateEligible rather than just
                // isApproved). A standalone leave (no companion) just gets
                // the one PDF, as before.
                const academicPdfReady = companion ? isApproved(l) : false;
                const personalOrStandalonePdfReady = companion ? isGateEligible(companion) : isApproved(l);
                return (
                  <tr key={l.id}>
                    <td className={companion ? "!border-l-4 !border-l-[var(--sky)]" : ""}>{l.appliedDate}</td>
                    <td>
                      {LEAVE_TYPE_LABELS[l.type]}
                      {companion && " + Personal Leave"}
                      {l.priority === "emergency" && (
                        <span className="ml-1">
                          <Badge tone="red">Emergency</Badge>
                        </span>
                      )}
                    </td>
                    <td>{l.startDate}</td>
                    <td>{l.endDate}</td>
                    {isCadet ? (
                      // Cadet Academic Leave routes HOD -> Squadron only (Troop
                      // and SDD stay "N/A" on the Academic Leave itself) — merged
                      // with the linked Personal Leave's own Troop/SDD progress
                      // so this row reflects the real exit-permit chain, not just
                      // the Academic Leave's shorter one. Every other cadet leave
                      // type routes Troop -> Squadron -> SDD directly (HOD stays
                      // "N/A" for those, no companion to merge from).
                      <>
                        <td>{statusOrDash(mergedStatus(l, companion, "hodStatus"), mergedIsMoot(l, companion, "hodStatus"))}</td>
                        <td>{statusOrDash(mergedStatus(l, companion, "troopStatus"), mergedIsMoot(l, companion, "troopStatus"))}</td>
                        <td>{statusOrDash(mergedStatus(l, companion, "sqnStatus"), mergedIsMoot(l, companion, "sqnStatus"))}</td>
                        <td>{statusOrDash(mergedStatus(l, companion, "sddStatus"), mergedIsMoot(l, companion, "sddStatus"))}</td>
                      </>
                    ) : (
                      <>
                        <td>{statusOrDash(mergedStatus(l, companion, "hodStatus"), mergedIsMoot(l, companion, "hodStatus"))}</td>
                        <td>{statusOrDash(mergedStatus(l, companion, "troopStatus"), mergedIsMoot(l, companion, "troopStatus"))}</td>
                      </>
                    )}
                    <td className="space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelected(l)}
                        className="rounded-md border border-[rgba(74,144,217,0.2)] bg-[rgba(74,144,217,0.15)] px-2.5 py-1 text-[11px] font-bold text-[var(--sky)]"
                      >
                        View
                      </button>
                      {academicPdfReady && (
                        <button
                          onClick={() => downloadPdfFor(l)}
                          className="rounded-md border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.15)] px-2.5 py-1 text-[11px] font-bold text-[var(--gold)]"
                        >
                          📥 Academic PDF
                        </button>
                      )}
                      {personalOrStandalonePdfReady && (
                        <button
                          onClick={() => downloadPdfFor(companion ?? l)}
                          className="rounded-md border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.15)] px-2.5 py-1 text-[11px] font-bold text-[var(--gold)]"
                        >
                          📥 {companion ? "Personal PDF" : "PDF"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <LeaveDetailModal
          leave={selected}
          onClose={() => setSelected(null)}
          pdfActions={(() => {
            const companion = companionOf(selected);
            const actions: { label: string; onClick: () => void }[] = [];
            if (companion) {
              if (isApproved(selected)) {
                actions.push({ label: "Academic PDF", onClick: () => downloadPdfFor(selected) });
              }
              if (isGateEligible(companion)) {
                actions.push({ label: "Personal PDF", onClick: () => downloadPdfFor(companion) });
              }
            } else if (isApproved(selected)) {
              actions.push({ label: "Download PDF", onClick: () => downloadPdfFor(selected) });
            }
            return actions;
          })()}
        />
      )}
    </div>
  );
}

const LEAVE_TYPES: LeaveType[] = [
  "Medical Leave",
  "Personal Leave",
  "Academic Leave",
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
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // Academic Leave always applies together with a linked Personal Leave —
  // two separate leave records, each with its own reason/attachment.
  const [personalReason, setPersonalReason] = useState("");
  const [personalFile, setPersonalFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill from the student's own profile so it doesn't need to be
  // retyped every time — still editable in case the contact number for
  // this particular leave differs.
  useEffect(() => {
    if (portal.profile?.mobile) {
      setContactNumber((prev) => prev || portal.profile!.mobile!);
    }
  }, [portal.profile]);

  const isEmergency = type === "Emergency Leave";
  const isAcademic = type === "Academic Leave";
  const docRequired = type ? requiresAttachment(type, isCadet ? "CADET" : "DAY_SCHOLAR") : false;
  const today = new Date().toISOString().split("T")[0];
  const minStartDate = isEmergency
    ? today
    : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const missing: string[] = [];
    if (!type) missing.push("Leave Type");
    if (!startDate) missing.push("Start Date");
    if (!startTime) missing.push("Start Time");
    if (!endDate) missing.push("End Date");
    if (!endTime) missing.push("End Time");
    if (!reason.trim()) missing.push("Reason");
    if (!address.trim()) missing.push("Address");
    if (!contactNumber.trim()) missing.push("Contact Number");
    if (docRequired && !file) missing.push("Supporting Document");
    if (isAcademic && !personalReason.trim()) missing.push("Personal Leave Reason");
    if (missing.length) {
      setError(`Please complete: ${missing.join(", ")}`);
      return;
    }
    if (!/^\d{10}$/.test(contactNumber.trim())) {
      setError("Contact number must be exactly 10 digits, numbers only.");
      return;
    }
    const startMinutePart = Number(startTime.split(":")[1]);
    const endMinutePart = Number(endTime.split(":")[1]);
    if ((startMinutePart !== 0 && startMinutePart !== 30) || (endMinutePart !== 0 && endMinutePart !== 30)) {
      setError("Start and end time must be on the hour or half hour (e.g. 09:00 or 09:30).");
      return;
    }
   if (!isEmergency && startDate && startDate < minStartDate) {
      setError("Leave must be applied at least 2 days before the start date. Use Emergency Leave if this is urgent.");
      return;
    }
    if (new Date(`${endDate}T${endTime}`) < new Date(`${startDate}T${startTime}`)) {
      setError("End date/time must be after start date/time.");
      return;
    }
    if (!isEmergency) {
      const MIN_NOTICE_MS = 2 * 24 * 60 * 60 * 1000;
      if (new Date(`${startDate}T${startTime}`).getTime() - Date.now() < MIN_NOTICE_MS) {
        setError(
          "This leave type must be applied for at least 2 days before the leave start date. Use Emergency Leave if you need to apply later than that."
        );
        return;
      }
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);
      if (startHour * 60 + startMinute < 6 * 60) {
        setError("Leave start time must be 06.00 hrs or later — campus exit is only allowed from 06.00 hrs onward.");
        return;
      }
      if (endHour * 60 + endMinute > 18 * 60) {
        setError("Leave end time must be 18.00 hrs or earlier — campus entry must be logged by 18.00 hrs.");
        return;
      }
    }
    if (file && file.size > MAX_FILE_BYTES) {
      setError("File too large (max 2MB). Please choose a smaller file.");
      return;
    }
    if (personalFile && personalFile.size > MAX_FILE_BYTES) {
      setError("Personal Leave file too large (max 2MB). Please choose a smaller file.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const attachmentData = file ? await fileToDataUrl(file) : undefined;
      const personalAttachmentData = personalFile ? await fileToDataUrl(personalFile) : undefined;
      await portal.applyLeave({
        type: type as LeaveType,
        startDate,
        startTime,
        endDate,
        endTime,
        reason: reason.trim(),
        address: address.trim(),
        contactNumber: contactNumber.trim(),
        attachmentName: file?.name,
        attachmentData,
        ...(isAcademic
          ? {
              personalReason: personalReason.trim(),
              personalAttachmentName: personalFile?.name,
              personalAttachmentData,
            }
          : {}),
      });
      setType("");
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setReason("");
      setAddress("");
      setContactNumber("");
      setFile(null);
      setPersonalReason("");
      setPersonalFile(null);
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
              <strong className="text-[var(--white)]">Officer Cadet flow:</strong> Troop Commander → Squadron Commander → SDD.
              PDF available after all 3 approve.
            </>
          ) : (
            <>
              <strong className="text-[var(--white)]">Day Scholar flow:</strong> HOD → Troop Commander. PDF available
              after both approve.
            </>
          )}
        </div>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">📋 Leave Details</h2>

        <div className="mb-4 flex items-center gap-4 rounded-xl border border-[rgba(74,144,217,0.2)] bg-[rgba(74,144,217,0.06)] p-3.5">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[var(--orange)]">
            {portal.profile?.photo ? (
              <img src={portal.profile.photo} alt="Your photo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--card2)] text-center text-[9px] text-[var(--muted)]">
                No Photo
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-[var(--white)]">{user?.name}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted)]">
              📍{" "}
              <span className="truncate">
                {address.trim() || "Enter your address below to preview it here"}
              </span>
            </div>
          </div>
          <DigitalClock />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={styles.label}>
              Leave Type<span className="ml-0.5 text-[var(--err)]">*</span>
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
            <div className="rounded-lg border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.1)] px-3.5 py-2.5 text-xs text-[var(--err-soft)]">
              🚨 <strong>Emergency Leave</strong> is routed immediately to your first-level approver and
              prioritized ahead of normal requests. Use this only for genuine emergencies.
            </div>
          )}

          {isAcademic && (
            <div className="rounded-lg border border-[rgba(74,144,217,0.35)] bg-[rgba(74,144,217,0.1)] px-3.5 py-2.5 text-xs text-[var(--sky)]">
              ℹ️ <strong>Academic Leave</strong> always applies together with a linked <strong>Personal Leave</strong>{" "}
              for the same dates — two separate applications, each with its own reason below, and each downloadable
              as its own PDF once approved. Academic Leave&apos;s PDF is not a gate pass; the linked Personal
              Leave&apos;s is what you&apos;ll actually use to exit/re-enter campus.
              {isCadet
                ? " For officer cadets, Academic Leave is approved by your HOD, then your Squadron Commander (no SDD). The linked Personal Leave goes through the normal Troop Commander → Squadron Commander → SDD chain."
                : " For Day Scholars, both Academic Leave and the linked Personal Leave go through HOD then Troop Commander as usual."}
            </div>
          )}

          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>
                Start Date<span className="ml-0.5 text-[var(--err)]">*</span>
              </label>
              <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>
                Start Time<span className="ml-0.5 text-[var(--err)]">*</span>
              </label>
              <input
                type="time"
                lang="en-GB"
                step={1800}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.label}>
                End Date<span className="ml-0.5 text-[var(--err)]">*</span>
              </label>
              <input type="date" min={today} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>
                End Time<span className="ml-0.5 text-[var(--err)]">*</span>
              </label>
              <input
                type="time"
                lang="en-GB"
                step={1800}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          {isAcademic ? (
            <div className="relative overflow-hidden rounded-lg border border-[rgba(74,144,217,0.3)] bg-[rgba(74,144,217,0.05)] py-4 pl-6 pr-4">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-[var(--sky)]" />

              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sky)]">
                🎓 Academic Leave
              </div>
              <label className={styles.label}>
                Reason<span className="ml-0.5 text-[var(--err)]">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Describe your academic reason…"
                className={styles.input}
              />
              <div className="mt-2 flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[rgba(74,144,217,0.35)] bg-[rgba(74,144,217,0.08)] px-4 py-2 text-xs font-bold text-[var(--sky)]">
                  📎 Upload Document
                  <input
                    type="file"
                    accept=".pdf,.jpg,.png,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
                <span className="truncate text-xs text-[var(--muted)]">{file ? file.name : "No file chosen"}</span>
                <Badge tone="gray">Optional</Badge>
              </div>

              <div className="my-4 border-t border-[rgba(74,144,217,0.2)]" />

              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sky)]">
                🧳 Personal Leave (linked)
              </div>
              <label className={styles.label}>
                Reason<span className="ml-0.5 text-[var(--err)]">*</span>
              </label>
              <textarea
                value={personalReason}
                onChange={(e) => setPersonalReason(e.target.value)}
                rows={3}
                placeholder="Describe your reason for leaving campus…"
                className={styles.input}
              />
              <div className="mt-2 flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[rgba(74,144,217,0.35)] bg-[rgba(74,144,217,0.08)] px-4 py-2 text-xs font-bold text-[var(--sky)]">
                  📎 Upload Document
                  <input
                    type="file"
                    accept=".pdf,.jpg,.png,.doc,.docx"
                    onChange={(e) => setPersonalFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
                <span className="truncate text-xs text-[var(--muted)]">
                  {personalFile ? personalFile.name : "No file chosen"}
                </span>
                <Badge tone="gray">Optional</Badge>
              </div>
            </div>
          ) : (
            <div>
              <label className={styles.label}>
                Reason<span className="ml-0.5 text-[var(--err)]">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Describe your reason…"
                className={styles.input}
              />
            </div>
          )}

          <div>
            <label className={styles.label}>
              Current Address During Leave<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="Address while on leave…"
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>
              Contact Number<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <input
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="e.g. 0771234567"
              inputMode="numeric"
              maxLength={10}
              className={styles.input}
            />
          </div>

          {!isAcademic && (
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <label className={styles.label} style={{ marginBottom: 0 }}>
                  Supporting Document
                </label>
                <Badge tone={docRequired ? "red" : "gray"}>{docRequired ? "Required" : "Optional"}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[rgba(74,144,217,0.35)] bg-[rgba(74,144,217,0.08)] px-4 py-2 text-xs font-bold text-[var(--sky)]">
                  📎 Upload Document
                  <input
                    type="file"
                    accept=".pdf,.jpg,.png,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
                <span className="truncate text-xs text-[var(--muted)]">
                  {file ? file.name : "No file chosen"}
                </span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-[var(--err)]">{error}</p>}

          <Button type="submit" variant="accent" disabled={submitting}>
            {submitting ? "Submitting…" : "📤 Submit Leave Application"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function Profile({ portal }: { portal: ReturnType<typeof useStudentPortal> }) {
  const { profile, updateProfile, updatePhoto, loading, error, refresh } = portal;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setEmail(profile.email ?? "");
    setMobile(profile.mobile ?? "");
  }, [profile]);

  if (!profile) {
    if (error) {
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[var(--err)]">
          <span>Couldn&apos;t load your profile: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      );
    }
    return <div className="text-sm text-[var(--muted)]">{loading ? "Loading your profile…" : "No profile data."}</div>;
  }

  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      setMessage("Please upload a JPG or PNG image.");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setMessage("Photo too large — please use an image under 1.5MB.");
      return;
    }
    try {
      const dataUrl = await downscalePhoto(file);
      await updatePhoto(dataUrl);
      setMessage("📷 Profile photo updated!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update photo");
    }
    e.target.value = "";
  }

  async function handleRemovePhoto() {
    if (!profile?.photo) {
      setMessage("No photo to remove.");
      return;
    }
    if (!confirm("Remove your profile photo?")) return;
    try {
      await updatePhoto(null);
      setMessage("Photo removed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to remove photo");
    }
  }

  async function handleSave() {
    if (mobile.trim() && !/^\d{10}$/.test(mobile.trim())) {
      setMessage("Mobile number must be exactly 10 digits, numbers only.");
      return;
    }
    try {
      await updateProfile({ firstName, lastName, email, mobile });
      setMessage("Profile saved!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save profile");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-bold text-[var(--white)]">👤 Personal Information</h2>

      <div className={styles.photoRow}>
        <div className={styles.photoPreview}>
          {profile.photo ? <img src={profile.photo} alt="Profile" /> : initials}
        </div>
        <div className="flex-1">
          <p className="mb-2.5 text-xs leading-relaxed text-[var(--muted)]">
            Upload a clear passport-style photo. This photo appears on your official Leave Pass PDF and your
            dashboard avatar.
          </p>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(74,144,217,0.35)] bg-[rgba(74,144,217,0.08)] px-4 py-2 text-xs font-bold text-[var(--sky)]">
            📷 Upload Photo
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handlePhotoChange} />
          </label>
          <button
            onClick={handleRemovePhoto}
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3.5 py-2 text-xs font-bold text-[var(--err-soft)]"
          >
            🗑️ Remove
          </button>
        </div>
      </div>

      <div className={`${styles.formGrid} mb-4`}>
        <div>
          <label className={styles.label}>First Name</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={styles.input} />
        </div>
        <div>
          <label className={styles.label}>Last Name</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={styles.input} />
        </div>
        <div>
          <label className={styles.label}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} />
        </div>
        <div>
          <label className={styles.label}>Mobile</label>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            maxLength={10}
            className={styles.input}
          />
        </div>
        <div>
          <label className={styles.label}>Index Number</label>
          <input value={profile.indexNumber} readOnly className={`${styles.input} opacity-60`} />
        </div>
        <div>
          <label className={styles.label}>Department</label>
          <input value={profile.department ?? ""} readOnly className={`${styles.input} opacity-60`} />
        </div>
      </div>

      {message && <p className="mb-3 text-xs text-[var(--sky)]">{message}</p>}
      <Button variant="primary" onClick={handleSave}>
        💾 Save Changes
      </Button>
    </Card>
  );
}
