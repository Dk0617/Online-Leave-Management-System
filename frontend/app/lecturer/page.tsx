"use client";

import { useCallback, useEffect, useState } from "react";
import { History as HistoryIcon, KeyRound, LayoutDashboard, User } from "lucide-react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { MyProfile } from "@/src/components/MyProfile";
import { Badge } from "@/src/components/ui";
import { useAuth } from "@/src/AuthContext";
import { useHodPortal } from "@/src/hooks/useHodPortal";
import { api, normalizeCoverStatus, POLL_INTERVAL_MS } from "@/src/api";
import { LecturerCoverStatus } from "@/src/types";
import { Dashboard, History } from "@/app/hod/views";

// Reuses the HOD portal's Dashboard/History screens and useHodPortal hook —
// the /hod/leaves/* endpoints already widen to whichever HOD this
// department's shared login is currently covering (see leavecontrol.js
// hodScopeFilter / resolveActiveMemberForDepartment), so logging in on a day
// the HOD is available just shows an empty queue here, same shape as an HOD
// portal with nothing pending. The Event Calendar stays HOD-only (see
// hodRoutes.js), so it's deliberately left out of this portal's nav.

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "history", label: "History", icon: HistoryIcon },
  { key: "profile", label: "My Profile", icon: User },
  { key: "changePass", label: "Change Password", icon: KeyRound },
];

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  history: "History",
  profile: "My Profile",
  changePass: "Change Password",
};

// Not part of useHodPortal's own refresh (that hook is shared with the HOD
// portal itself, which can't call this LECTURER-only endpoint) — fetched
// independently here so every lecturer sharing this department's one login
// can see, at a glance, whether the HOD is out today and who the roster
// currently resolves to as the active coverer.
function useCoverStatus() {
  const [status, setStatus] = useState<LecturerCoverStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const raw = await api.get<Record<string, unknown>>("/hod/cover-status");
      setStatus(normalizeCoverStatus(raw));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cover status");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { status, error };
}

function tierLabel(tier: "SENIOR" | "JUNIOR") {
  return tier === "SENIOR" ? "Senior Lecturer" : "Junior Lecturer";
}

function CoverStatusBanner({ status, error }: { status: LecturerCoverStatus | null; error: string | null }) {
  if (error) {
    return (
      <div className="mb-4 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-xs text-[var(--err)]">
        Couldn&apos;t load cover status: {error}
      </div>
    );
  }
  if (!status) return null;

  return (
    <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      {!status.hodUnavailable ? (
        <p className="text-sm text-[var(--white)]">
          ✅ <strong>{status.hodName || "Your HOD"}</strong> is available today — there&apos;s nothing for{" "}
          {status.department} to cover right now.
        </p>
      ) : status.activeMember ? (
        <p className="text-sm text-[var(--white)]">
          🔔 <strong>{status.hodName || "The HOD"}</strong> is unavailable today. Acting HOD for {status.department}:{" "}
          <strong>{status.activeMember.name}</strong> ({tierLabel(status.activeMember.tier)}). Their leave approvals
          are in the queue below.
        </p>
      ) : (
        <p className="text-sm text-[var(--warn)]">
          ⚠️ <strong>{status.hodName || "The HOD"}</strong> is unavailable today, but Admin hasn&apos;t assigned an
          Acting HOD for {status.department} yet. Admin has been alerted; the queue opens here once someone is
          assigned.
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
            HOD availability (next 30 days)
          </h4>
          {status.unavailability.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">Available on every day.</p>
          ) : (
            <ul className="space-y-1 text-xs text-[var(--white)]">
              {status.unavailability.map((u) => (
                <li key={u.id}>
                  <Badge tone="red">Unavailable</Badge> {u.fromDate === u.toDate ? u.fromDate : `${u.fromDate} → ${u.toDate}`}
                  {u.reason && <span className="text-[var(--muted)]"> · {u.reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Acting HOD assignments
          </h4>
          {status.assignments.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">None assigned.</p>
          ) : (
            <ul className="space-y-1 text-xs text-[var(--white)]">
              {status.assignments.map((a) => (
                <li key={a.id}>
                  {a.date}: <strong>{a.memberName}</strong>{" "}
                  <Badge tone={a.memberTier === "SENIOR" ? "blue" : "gray"}>{tierLabel(a.memberTier)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LecturerPage() {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");
  const portal = useHodPortal();
  const { status, error: coverError } = useCoverStatus();

  const forced = !!user?.mustChangePassword;
  const activeView = forced ? "changePass" : view;

  return (
    <DashboardShell
      role="LECTURER"
      title={TITLES[activeView]}
      navItems={NAV_ITEMS}
      activeView={activeView}
      onNavigate={(key) => !forced && setView(key)}
      roleTag={user?.department}
    >
      {activeView === "dashboard" && (
        <>
          <CoverStatusBanner status={status} error={coverError} />
          <Dashboard portal={portal} asLecturer />
        </>
      )}
      {activeView === "history" && <History portal={portal} />}
      {activeView === "profile" && <MyProfile />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
