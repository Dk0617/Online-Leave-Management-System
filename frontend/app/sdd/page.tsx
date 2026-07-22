"use client";

import { useState } from "react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { MyProfile } from "@/src/components/MyProfile";
import { useAuth } from "@/src/AuthContext";
import { useSddPortal } from "@/src/hooks/useSddPortal";
import { Dashboard, History, Overview } from "./views";

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "overview", label: "Overview", icon: "🗂️" },
  { key: "history", label: "History", icon: "📋" },
  { key: "profile", label: "My Profile", icon: "👤" },
  { key: "changePass", label: "Change Password", icon: "🔑" },
];

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  overview: "Overview",
  history: "History",
  profile: "My Profile",
  changePass: "Change Password",
};

export default function SddPage() {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");
  const portal = useSddPortal();

  const forced = !!user?.mustChangePassword;
  const activeView = forced ? "changePass" : view;

  return (
    <DashboardShell
      role="SDD"
      title={TITLES[activeView]}
      navItems={NAV_ITEMS}
      activeView={activeView}
      onNavigate={(key) => !forced && setView(key)}
      roleTag={user?.title}
      locationLabel={user?.title}
    >
      {activeView === "dashboard" && <Dashboard portal={portal} />}
      {activeView === "overview" && <Overview portal={portal} />}
      {activeView === "history" && <History portal={portal} />}
      {activeView === "profile" && <MyProfile />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
