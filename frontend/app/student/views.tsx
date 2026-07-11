"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatTile, Badge, Button, Card } from "@/src/components/ui";
import { LeaveDetailModal } from "@/src/components/leave";
import { useAuth } from "@/src/AuthContext";
import { useStudentPortal } from "@/src/hooks/useStudentPortal";
import { isApproved, isRejected } from "@/src/api";
import { downloadLeavePassPdf } from "@/src/pdf";
import { DOC_REQUIRED_TYPES, LEAVE_TYPE_LABELS, LeaveRequest, LeaveType } from "@/src/types";
import styles from "./student.module.css";

function statusBadge(status: string) {
  const tone = status === "Approved" ? "green" : status === "Rejected" ? "red" : status === "N/A" ? "gray" : "amber";
  return <Badge tone={tone}>{status}</Badge>;
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useStudentPortal> }) {
  const { user } = useAuth();
  const { leaves } = portal;
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  const isCadet = user?.studentType === "CADET";
  const total = leaves.length;
  const approved = leaves.filter(isApproved).length;
  const rejected = leaves.filter(isRejected).length;
  const pending = total - approved - rejected;

  return (
    <div>
      <div className={`${styles.flowBanner} ${isCadet ? "cadet" : ""}`}>
        <div className="text-xl">{isCadet ? "🎖️" : "🏠"}</div>
        <div>
          <strong className="text-white">
            {isCadet ? "Cadet Leave Flow:" : "Day Scholar Leave Flow:"}
          </strong>{" "}
          {isCadet
            ? "Applications go → Troop Commander → Squadron Commander → Senior Deputy Dean → PDF download when fully approved."
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
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                  No applications yet.
                </td>
              </tr>
            ) : (
              leaves.map((l) => (
                <tr key={l.id}>
                  <td>{l.appliedDate}</td>
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
                  {isCadet ? (
                    <>
                      <td>{statusBadge(l.troopStatus)}</td>
                      <td>{statusBadge(l.sqnStatus)}</td>
                      <td>{statusBadge(l.sddStatus)}</td>
                    </>
                  ) : (
                    <>
                      <td>{statusBadge(l.hodStatus)}</td>
                      <td>{statusBadge(l.troopStatus)}</td>
                    </>
                  )}
                  <td className="space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => setSelected(l)}
                      className="rounded-md border border-[rgba(74,144,217,0.2)] bg-[rgba(74,144,217,0.15)] px-2.5 py-1 text-[11px] font-bold text-[var(--sky)]"
                    >
                      View
                    </button>
                    {isApproved(l) && (
                      <button
                        onClick={() => downloadLeavePassPdf(l, portal.profile?.photo)}
                        className="rounded-md border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.15)] px-2.5 py-1 text-[11px] font-bold text-[var(--gold)]"
                      >
                        📥 PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <LeaveDetailModal
          leave={selected}
          onClose={() => setSelected(null)}
          onDownloadPdf={
            isApproved(selected) ? () => downloadLeavePassPdf(selected, portal.profile?.photo) : undefined
          }
        />
      )}
    </div>
  );
}

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

function downscalePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = 400;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export function Profile({ portal }: { portal: ReturnType<typeof useStudentPortal> }) {
  const { profile, updateProfile, updatePhoto } = portal;
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

  if (!profile) return null;

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
    await updatePhoto(null);
    setMessage("Photo removed.");
  }

  async function handleSave() {
    await updateProfile({ firstName, lastName, email, mobile });
    setMessage("Profile saved!");
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-bold text-white">👤 Personal Information</h2>

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
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3.5 py-2 text-xs font-bold text-[#fca5a5]"
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
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} className={styles.input} />
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
