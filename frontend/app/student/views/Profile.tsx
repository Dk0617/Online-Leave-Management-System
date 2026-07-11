"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { useStudentPortal } from "@/src/hooks/useStudentPortal";
import styles from "../student.module.css";

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
