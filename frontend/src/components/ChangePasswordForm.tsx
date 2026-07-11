"use client";

import { useState } from "react";
import { Button, Card } from "@/src/components/ui";
import { useAuth } from "@/src/AuthContext";

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--sky)]";
const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]";

export function ChangePasswordForm({ forced = false, onDone }: { forced?: boolean; onDone?: () => void }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!current || !next || !confirm) {
      setMessage({ text: "Please fill in all fields.", ok: false });
      return;
    }
    if (next.length < 4) {
      setMessage({ text: "New password must be at least 4 characters.", ok: false });
      return;
    }
    if (next !== confirm) {
      setMessage({ text: "Passwords do not match.", ok: false });
      return;
    }
    if (next === current) {
      setMessage({ text: "New password must be different from current password.", ok: false });
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(current, next);
      setMessage({ text: "Password updated!", ok: true });
      setCurrent("");
      setNext("");
      setConfirm("");
      onDone?.();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to update password", ok: false });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      {forced && (
        <div className="mb-4 rounded-lg border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] px-3.5 py-2.5 text-xs font-semibold text-[#fbbf24]">
          🔒 This is your first login (or your password was reset). You must set a new password before you can
          use the system.
        </div>
      )}
      <h2 className="mb-4 text-sm font-bold text-white">🔑 Update Password</h2>
      <div className="mb-3.5">
        <label className={labelClass}>Current Password</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
      </div>
      <div className="mb-3.5">
        <label className={labelClass}>New Password</label>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
      </div>
      <div className="mb-4">
        <label className={labelClass}>Confirm New Password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
      </div>
      {message && (
        <p className={`mb-3 text-xs ${message.ok ? "text-[var(--sky)]" : "text-[#f87171]"}`}>{message.text}</p>
      )}
      <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
        🔐 Update Password
      </Button>
    </Card>
  );
}
