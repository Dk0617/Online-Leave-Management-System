"use client";

import { useState } from "react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { useAuth } from "@/src/AuthContext";
import { useStudentPortal } from "@/src/hooks";
import { Dashboard, ApplyLeave, Profile } from "./views";

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "applyLeave", label: "Apply Leave", icon: "📝" },
  { key: "profile", label: "My Profile", icon: "👤" },
  { key: "changePass", label: "Change Password", icon: "🔑" },
];

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  applyLeave: "Apply for Leave",
  profile: "My Profile",
  changePass: "Change Password",
};

export default function StudentPage() {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");
  const portal = useStudentPortal();

  const forced = !!user?.mustChangePassword;
  const activeView = forced ? "changePass" : view;

  return (
    <DashboardShell
      role="STUDENT"
      title={TITLES[activeView]}
      navItems={NAV_ITEMS}
      activeView={activeView}
      onNavigate={(key) => !forced && setView(key)}
      roleTag={user ? `${user.studentType === "CADET" ? "🎖️ Cadet" : "🏠 Day Scholar"} · ${user.indexNumber}` : undefined}
    >
      {activeView === "dashboard" && <Dashboard portal={portal} />}
      {activeView === "applyLeave" && <ApplyLeave portal={portal} onDone={() => setView("dashboard")} />}
      {activeView === "profile" && <Profile portal={portal} />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
