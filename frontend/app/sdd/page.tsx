"use client";

import { useState } from "react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { useAuth } from "@/src/AuthContext";
import { useSddPortal } from "@/src/hooks/useSddPortal";
import { Dashboard, Pending, History, Overview } from "./views";

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "pending", label: "Pending Reviews", icon: "⏳" },
  { key: "overview", label: "Overview", icon: "🗂️" },
  { key: "history", label: "History", icon: "📋" },
  { key: "changePass", label: "Change Password", icon: "🔑" },
];

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  pending: "Pending Reviews",
  overview: "Overview",
  history: "History",
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
    >
      {activeView === "dashboard" && <Dashboard portal={portal} />}
      {activeView === "pending" && <Pending portal={portal} />}
      {activeView === "overview" && <Overview portal={portal} />}
      {activeView === "history" && <History portal={portal} />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
