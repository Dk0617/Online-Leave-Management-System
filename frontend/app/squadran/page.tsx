"use client";

import { useState } from "react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { MyProfile } from "@/src/components/MyProfile";
import { useAuth } from "@/src/AuthContext";
import { useSquadranPortal } from "@/src/hooks/useSquadranPortal";
import { Dashboard, History } from "./views";

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

export default function SquadranPage() {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");
  const portal = useSquadranPortal();

  const forced = !!user?.mustChangePassword;
  const activeView = forced ? "changePass" : view;

  return (
    <DashboardShell
      role="SQUADRAN"
      title={TITLES[activeView]}
      navItems={NAV_ITEMS}
      activeView={activeView}
      onNavigate={(key) => !forced && setView(key)}
      roleTag={user?.designation}
    >
      {activeView === "dashboard" && <Dashboard portal={portal} />}
      {activeView === "history" && <History portal={portal} />}
      {activeView === "profile" && <MyProfile />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
