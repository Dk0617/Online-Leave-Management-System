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
          🔔 <strong>{status.hodName || "The HOD"}</strong> is unavailable today. Their queue is currently with{" "}
          <strong>{status.activeMember.name}</strong> ({tierLabel(status.activeMember.tier)}, rank{" "}
          {status.activeMember.rank}) — log in with this department&apos;s shared account to act on it.
        </p>
      ) : (
        <p className="text-sm text-[var(--warn)]">
          ⚠️ <strong>{status.hodName || "The HOD"}</strong> is unavailable today, and every lecturer on{" "}
          {status.department}&apos;s roster is also marked unavailable — nobody can act on this queue until
          that changes.
        </p>
      )}

      {status.roster.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-left uppercase tracking-wide text-[var(--muted)]">
                <th className="py-1.5 pr-4">Order</th>
                <th className="py-1.5 pr-4">Name</th>
                <th className="py-1.5 pr-4">Tier</th>
                <th className="py-1.5">Rank</th>
              </tr>
            </thead>
            <tbody>
              {status.roster.map((m, i) => (
                <tr key={m.id} className="border-t border-[rgba(255,255,255,0.05)]">
                  <td className="py-1.5 pr-4 text-[var(--white)]">{i + 1}</td>
                  <td className="py-1.5 pr-4 text-[var(--white)]">
                    {m.name}
                    {status.activeMember?.id === m.id && (
                      <span className="ml-1.5">
                        <Badge tone="green">Active Today</Badge>
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-4">
                    <Badge tone={m.tier === "SENIOR" ? "blue" : "gray"}>{tierLabel(m.tier)}</Badge>
                  </td>
                  <td className="py-1.5 text-[var(--white)]">{m.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
