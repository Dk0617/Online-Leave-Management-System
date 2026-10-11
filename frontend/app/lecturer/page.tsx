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

// The department's shared Acting HOD profile. Reuses the HOD portal's
// Dashboard/History screens and useHodPortal hook: the /hod/leaves/*
// endpoints open this department's HOD queue only on dates Admin assigned
// Acting HOD lecturers (see leavecontrol.js hodScopeFilter); on any other
// day the queue is empty. The Event Calendar stays HOD-only.

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

function CoverStatusBanner({
  status,
  error,
  actingAs,
  onActingAs,
}: {
  status: LecturerCoverStatus | null;
  error: string | null;
  actingAs: string;
  onActingAs: (id: string) => void;
}) {
  if (error) {
    return (
      <div className="mb-4 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-xs text-[var(--err)]">
        Couldn&apos;t load Acting HOD status: {error}
      </div>
    );
  }
  if (!status) return null;

  return (
    <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      {!status.hodUnavailable ? (
        <p className="text-sm text-[var(--white)]">
          ✅ <strong>{status.hodName || "Your HOD"}</strong> is available today. No Acting HOD is assigned for{" "}
          {status.department}, so there&apos;s nothing to approve here today.
        </p>
      ) : (
        <>
          <p className="text-sm text-[var(--white)]">
            🔔 <strong>{status.hodName || "The HOD"}</strong> is not available today. Acting HOD for{" "}
            {status.department}: <strong>{status.activeMembers.map((m) => m.name).join(", ")}</strong>.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--white)]">
            <label htmlFor="acting-as" className="font-bold">
              I am:
            </label>
            <select
              id="acting-as"
              value={actingAs}
              onChange={(e) => onActingAs(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--card2)] px-2 py-1 text-xs text-[var(--white)]"
            >
              <option value="">Select your name…</option>
              {status.activeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({tierLabel(m.tier)})
                </option>
              ))}
            </select>
            <span className="text-[var(--muted)]">Your name is recorded on every leave you approve or reject.</span>
          </div>
        </>
      )}

      <div className="mt-4">
        <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
          HOD not available / Acting HOD (next 30 days)
        </h4>
        {status.assignments.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No Acting HOD days assigned. The HOD is available.</p>
        ) : (
          <ul className="space-y-1 text-xs text-[var(--white)]">
            {status.assignments.map((a) => (
              <li key={a.id}>
                <Badge tone="red">HOD not available</Badge> {a.date}: {a.members.map((m) => m.name).join(", ")}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function LecturerPage() {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");
  const basePortal = useHodPortal();
  const { status, error: coverError } = useCoverStatus();
  // Which of today's assigned lecturers is using this shared login — sent
  // with every decision so the leave and PDF record the actual approver.
  const [actingMemberId, setActingMemberId] = useState("");
  const activeIds = (status?.activeMembers ?? []).map((m) => m.id);
  const actingAs = activeIds.includes(actingMemberId) ? actingMemberId : activeIds.length === 1 ? activeIds[0] : "";
  function requireActingAs() {
    if (!actingAs) throw new Error("Select which lecturer you are (top of the page) before approving or rejecting.");
    return actingAs;
  }
  const portal = {
    ...basePortal,
    approve: async (id: string, comment?: string) => basePortal.approve(id, comment, requireActingAs()),
    reject: async (id: string, comment?: string) => basePortal.reject(id, comment, requireActingAs()),
  };

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
          <CoverStatusBanner status={status} error={coverError} actingAs={actingAs} onActingAs={setActingMemberId} />
          <Dashboard portal={portal} asLecturer />
        </>
      )}
      {activeView === "history" && <History portal={portal} />}
      {activeView === "profile" && <MyProfile />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
