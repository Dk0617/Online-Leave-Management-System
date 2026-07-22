"use client";

import { useState } from "react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { MyProfile } from "@/src/components/MyProfile";
import { useAuth } from "@/src/AuthContext";
import { useHodPortal } from "@/src/hooks/useHodPortal";
import { Dashboard, History } from "@/app/hod/views";

// Reuses the HOD portal's Dashboard/History screens and useHodPortal hook —
// the /hod/leaves/* endpoints already widen to whichever HOD(s) this
// Lecturer is currently covering (see leavecontrol.js hodScopeFilter /
// resolveActiveCoverer), so a Lecturer with no active cover today just sees
// an empty queue here, same shape as an HOD portal with nothing pending.
// The Event Calendar stays HOD-only (see hodRoutes.js), so it's
// deliberately left out of this portal's nav.

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "history", label: "History", icon: "📋" },
  { key: "profile", label: "My Profile", icon: "👤" },
  { key: "changePass", label: "Change Password", icon: "🔑" },
];

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  history: "History",
  profile: "My Profile",
  changePass: "Change Password",
};

export default function LecturerPage() {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");
  const portal = useHodPortal();

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
      locationLabel={user?.department}
    >
      {activeView === "dashboard" && <Dashboard portal={portal} asLecturer />}
      {activeView === "history" && <History portal={portal} />}
      {activeView === "profile" && <MyProfile />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
