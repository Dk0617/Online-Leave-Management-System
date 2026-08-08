"use client";

import { useState } from "react";
import { CalendarDays, History as HistoryIcon, KeyRound, LayoutDashboard, User, Users } from "lucide-react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { MyProfile } from "@/src/components/MyProfile";
import { useAuth } from "@/src/AuthContext";
import { useHodPortal } from "@/src/hooks/useHodPortal";
import { Dashboard, History, EventCalendar, BlockLeaveQueue } from "./views";

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "history", label: "History", icon: HistoryIcon },
  { key: "blockLeave", label: "Block Leave", icon: Users },
  { key: "calendar", label: "Event Calendar", icon: CalendarDays },
  { key: "profile", label: "My Profile", icon: User },
  { key: "changePass", label: "Change Password", icon: KeyRound },
];

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  history: "History",
  blockLeave: "Block Leave",
  calendar: "Event Calendar",
  profile: "My Profile",
  changePass: "Change Password",
};

export default function HodPage() {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");
  const portal = useHodPortal();

  const forced = !!user?.mustChangePassword;
  const activeView = forced ? "changePass" : view;

  return (
    <DashboardShell
      role="HOD"
      title={TITLES[activeView]}
      navItems={NAV_ITEMS}
      activeView={activeView}
      onNavigate={(key) => !forced && setView(key)}
      roleTag={user?.department}
    >
      {activeView === "dashboard" && <Dashboard portal={portal} />}
      {activeView === "history" && <History portal={portal} />}
      {activeView === "blockLeave" && <BlockLeaveQueue portal={portal} />}
      {activeView === "calendar" && <EventCalendar portal={portal} />}
      {activeView === "profile" && <MyProfile />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
