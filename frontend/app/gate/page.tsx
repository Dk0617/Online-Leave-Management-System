"use client";

import { useState } from "react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { useAuth } from "@/src/AuthContext";
import { useGatePortal } from "@/src/hooks";
import { Dashboard, Verify, LogMovement, MovementLog } from "./views";

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "verify", label: "Verify Leave Pass", icon: "🔍" },
  { key: "logMovement", label: "Log Exit / Entry", icon: "📝" },
  { key: "movements", label: "Movement Log", icon: "📋" },
  { key: "changePass", label: "Change Password", icon: "🔑" },
];

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  verify: "Verify Leave Pass",
  logMovement: "Log Exit / Entry",
  movements: "Movement Log",
  changePass: "Change Password",
};

export default function GatePage() {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");
  const portal = useGatePortal();

  const forced = !!user?.mustChangePassword;
  const activeView = forced ? "changePass" : view;

  return (
    <DashboardShell
      role="GATE"
      title={TITLES[activeView]}
      navItems={NAV_ITEMS}
      activeView={activeView}
      onNavigate={(key) => !forced && setView(key)}
      roleTag={user?.post}
    >
      {activeView === "dashboard" && <Dashboard portal={portal} />}
      {activeView === "verify" && <Verify portal={portal} />}
      {activeView === "logMovement" && <LogMovement portal={portal} />}
      {activeView === "movements" && <MovementLog portal={portal} />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
