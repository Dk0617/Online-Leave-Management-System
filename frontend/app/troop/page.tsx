"use client";

import { useState } from "react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { useAuth } from "@/src/AuthContext";
import { useTroopPortal } from "@/src/hooks/useTroopPortal";
import { Dashboard, DayScholarQueue, CadetQueue, History, AllRecords } from "./views";

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "dayscholar", label: "Day Scholar Queue", icon: "🏠" },
  { key: "cadet", label: "Cadet Queue", icon: "🎖️" },
  { key: "history", label: "History", icon: "📋" },
  { key: "records", label: "All Records", icon: "🗄️" },
  { key: "changePass", label: "Change Password", icon: "🔑" },
];

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  dayscholar: "Day Scholar Queue",
  cadet: "Cadet Queue",
  history: "History",
  records: "All Records",
  changePass: "Change Password",
};

export default function TroopPage() {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");
  const portal = useTroopPortal();

  const forced = !!user?.mustChangePassword;
  const activeView = forced ? "changePass" : view;
  const intakesText = user?.intakes?.length ? user.intakes.map((i) => `Intake ${i}`).join(", ") : "No intakes assigned";

  return (
    <DashboardShell
      role="TROOP"
      title={TITLES[activeView]}
      navItems={NAV_ITEMS}
      activeView={activeView}
      onNavigate={(key) => !forced && setView(key)}
      roleTag={intakesText}
    >
      {activeView === "dashboard" && <Dashboard portal={portal} />}
      {activeView === "dayscholar" && <DayScholarQueue portal={portal} />}
      {activeView === "cadet" && <CadetQueue portal={portal} />}
      {activeView === "history" && <History portal={portal} />}
      {activeView === "records" && <AllRecords portal={portal} />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
