"use client";

import { ChangeEvent, useState } from "react";
import { Card, Button } from "@/src/components/ui";
import { useAuth } from "@/src/AuthContext";
import { downscalePhoto } from "@/src/photo";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(-2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-[var(--white)]">{value}</div>
    </div>
  );
}

// A shared "My Profile" screen for every staff role (HOD/Troop/Squadron/
// SDD/Gate/Admin/Lecturer) — mainly the photo upload that shows up as the
// header avatar (see DashboardShell), plus a read-only look at the
// account's own details. Students have their own richer Profile page
// (app/student/views.tsx) with editable name/email/mobile, since they're
// the one role that self-manages that info; staff accounts are otherwise
// managed by Admin, so this stays photo-only.
export function MyProfile() {
  const { user, updatePhoto } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

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
    setUploading(true);
    setMessage(null);
    try {
      const dataUrl = await downscalePhoto(file);
      await updatePhoto(dataUrl);
      setMessage("📷 Profile photo updated!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update photo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemovePhoto() {
    if (!user?.photo) {
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

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-bold text-[var(--white)]">👤 My Profile</h2>

      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--orange)] bg-gradient-to-br from-[var(--navy2)] to-[var(--blue)] text-xl font-bold text-white">
          {user.photo ? (
            <img src={user.photo} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            initialsOf(user.name)
          )}
        </div>
        <div>
          <p className="mb-2.5 text-xs leading-relaxed text-[var(--muted)]">
            This photo appears next to your name in the header of every page.
          </p>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(74,144,217,0.35)] bg-[rgba(74,144,217,0.08)] px-4 py-2 text-xs font-bold text-[var(--sky)]">
            {uploading ? "Uploading…" : "📷 Upload Photo"}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={uploading}
            />
          </label>
          <Button variant="danger" className="ml-2 !px-3.5 !py-2 !text-xs" onClick={handleRemovePhoto}>
            🗑️ Remove
          </Button>
        </div>
      </div>

      {message && <p className="mb-4 text-xs text-[var(--sky)]">{message}</p>}

      <div className="grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
        <Field label="Name" value={user.name} />
        <Field label="Username" value={user.username} />
        <Field label="Department" value={user.department} />
        <Field label="Designation" value={user.designation} />
        <Field label="Title" value={user.title} />
        <Field label="Post" value={user.post} />
        {user.intakes?.length ? <Field label="Intakes" value={user.intakes.join(", ")} /> : null}
      </div>
    </Card>
  );
}
