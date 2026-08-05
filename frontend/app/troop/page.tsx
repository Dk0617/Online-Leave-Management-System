"use client";

import { useState } from "react";
import { Archive, Home, KeyRound, LayoutDashboard, Medal, User } from "lucide-react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { MyProfile } from "@/src/components/MyProfile";
import { useAuth } from "@/src/AuthContext";
import { useTroopPortal } from "@/src/hooks/useTroopPortal";
import { Dashboard, DayScholarQueue, CadetQueue, AllRecords } from "./views";

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "dayscholar", label: "Day Scholar Queue", icon: Home },
  { key: "cadet", label: "Officer Cadet Queue", icon: Medal },
  { key: "records", label: "All Records", icon: Archive },
  { key: "profile", label: "My Profile", icon: User },
  { key: "changePass", label: "Change Password", icon: KeyRound },
];

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  dayscholar: "Day Scholar Queue",
  cadet: "Officer Cadet Queue",
  records: "All Records",
  profile: "My Profile",
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
      {activeView === "records" && <AllRecords portal={portal} />}
      {activeView === "profile" && <MyProfile />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
