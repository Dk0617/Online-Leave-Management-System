"use client";

import { ChangeEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, Role } from "@/src/types";
import { useAuth } from "@/src/AuthContext";
import { downscalePhoto } from "@/src/photo";

export interface NavItem {
  key: string;
  label: string;
  icon: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(-2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

// The header's own avatar — every role can click it to upload their photo
// (shared self-service endpoint, see logauthcontrol.js updateMyPhoto),
// instead of needing a dedicated Profile page like Students already have.
function HeaderAvatar({ user }: { user: AuthUser }) {
  const { updatePhoto } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      setError("Please upload a JPG or PNG image.");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setError("Photo too large — under 1.5MB please.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await downscalePhoto(file);
      await updatePhoto(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update photo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="relative">
      <label
        title="Click to update your photo"
        className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-[var(--orange)] bg-gradient-to-br from-[var(--navy2)] to-[var(--blue)] text-xs font-bold text-white"
      >
        {uploading ? "…" : user.photo ? (
          <img src={user.photo} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          initialsOf(user.name)
        )}
        <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handlePhotoChange} />
      </label>
      {error && (
        <div className="absolute right-0 top-11 z-20 w-52 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[var(--card)] p-2 text-[10px] leading-snug text-[var(--err)] shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

// A small live digital clock readout. Self-ticking so it can be dropped in
// anywhere without the caller wiring up its own interval — used only on
// the student's Apply for Leave form (see student/views.tsx ApplyLeave) to
// help with picking exact start/end times; every portal's shared header
// used to show one too, but that was just clutter for roles that never
// need to reference the clock while working.
export function DigitalClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours24 = now.getHours();
  const hours = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";

  return (
    <div
      title={now.toLocaleDateString()}
      className="hidden shrink-0 items-center gap-1.5 rounded-lg border-2 border-[var(--orange)] bg-gradient-to-br from-[#152569] to-[#0a1435] px-3 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:flex"
    >
      <span className="font-mono text-sm font-bold tabular-nums text-white">
        {hours}:{minutes}:{seconds}
      </span>
      <span className="text-[10px] font-bold text-[var(--orange)]">{ampm}</span>
    </div>
  );
}

export function DashboardShell({
  role,
  title,
  subtitle,
  navItems,
  activeView,
  onNavigate,
  roleTag,
  locationLabel,
  children,
}: {
  role: Role;
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  activeView: string;
  onNavigate: (key: string) => void;
  roleTag?: string;
  // Shown in the header pill next to the avatar, in place of the username/
  // index number — each page.tsx passes whatever "location" makes sense for
  // that role (a student's current leave address or department, an HOD's
  // department, a Gate officer's post, etc.).
  locationLabel?: string;
  children: ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("ols_theme");
    if (saved === "light") {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("ols_theme", next);
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (user.role !== role) {
      router.replace("/");
    }
  }, [loading, user, role, router]);

  if (loading || !user || user.role !== role) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--bg)] text-sm text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 bg-[var(--bg)]">
      <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-[var(--border)] bg-gradient-to-b from-[var(--navy)] to-[#0a1435] shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--orange)] shadow-[0_0_0_2px_var(--gold),0_4px_10px_rgba(0,0,0,0.35)]">
              <img
                src="/KDU-LOGO-ORIGINAL-5x4-inch-copy.png"
                alt="KDU logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="text-[15px] font-extrabold tracking-wide text-white">
                SLMS
              </div>
              <div className="text-[10px] font-semibold tracking-widest text-[var(--orange2)]">
                KDU SOUTHERN CAMPUS
              </div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.06)] text-sm hover:bg-[rgba(74,144,217,0.18)]"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        <div className="mx-4 mt-4 rounded-lg border border-[rgba(74,144,217,0.2)] bg-[rgba(74,144,217,0.08)] p-3.5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--sky)]">
            Logged in as
          </div>
          <div className="mt-0.5 text-[13px] font-bold text-white">{user.name}</div>
          {roleTag && (
            <div className="mt-0.5 whitespace-pre-line font-mono text-[11px] text-[var(--muted)]">{roleTag}</div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-5 pb-1.5 pt-2 text-[9px] font-bold uppercase tracking-[.25em] text-[rgba(126,200,227,0.4)]">
            Menu
          </div>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`mx-2.5 mb-0.5 flex w-[calc(100%-20px)] items-center gap-3 rounded-lg border-l-2 px-5 py-2.5 text-left text-[13px] font-medium transition-all ${
                activeView === item.key
                  ? "border-[var(--orange)] bg-gradient-to-br from-[rgba(37,99,176,0.4)] to-[rgba(74,144,217,0.2)] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(74,144,217,0.3)]"
                  : "border-transparent text-[rgba(200,215,255,0.65)] hover:bg-[rgba(74,144,217,0.12)] hover:text-white"
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.08)] py-2.5 text-[13px] font-semibold text-[var(--err-soft)] transition-colors hover:border-[rgba(220,38,38,0.4)] hover:bg-[rgba(220,38,38,0.18)] hover:text-white"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="ml-64 flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-[62px] items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-7 shadow-[0_2px_20px_rgba(0,0,0,0.2)]">
          <div>
            <div className="text-base font-bold text-[var(--white)]">{title}</div>
            {subtitle && (
              <div className="mt-0.5 text-[11px] text-[var(--muted)]">{subtitle}</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {locationLabel && (
              <span className="rounded-lg border border-[rgba(37,99,176,0.3)] bg-[rgba(37,99,176,0.15)] px-3 py-1 font-mono text-xs text-[var(--sky)]">
                📍 {locationLabel}
              </span>
            )}
            <HeaderAvatar user={user} />
          </div>
        </header>
        <main className="flex-1 p-7">{children}</main>
      </div>
    </div>
  );
}
