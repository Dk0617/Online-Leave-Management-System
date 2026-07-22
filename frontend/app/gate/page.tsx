"use client";

import { useState } from "react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { MyProfile } from "@/src/components/MyProfile";
import { useAuth } from "@/src/AuthContext";
import { useGatePortal } from "@/src/hooks/useGatePortal";
import { Dashboard, Verify, MovementLog } from "./views";

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "verify", label: "Verify Leave Pass", icon: "🔍" },
  { key: "movements", label: "Movement Log", icon: "📋" },
  { key: "profile", label: "My Profile", icon: "👤" },
  { key: "changePass", label: "Change Password", icon: "🔑" },
];

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  verify: "Verify Leave Pass",
  movements: "Movement Log",
  profile: "My Profile",
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
      locationLabel={user?.post}
    >
      {activeView === "dashboard" && <Dashboard portal={portal} />}
      {activeView === "verify" && <Verify portal={portal} />}
      {activeView === "movements" && <MovementLog portal={portal} />}
      {activeView === "profile" && <MyProfile />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
