"use client";

import { useEffect, useState } from "react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { useAuth } from "@/src/AuthContext";
import { useStudentPortal } from "@/src/hooks/useStudentPortal";
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
  const { user, setUserPhoto } = useAuth();
  const [view, setView] = useState("dashboard");
  const portal = useStudentPortal();

  const forced = !!user?.mustChangePassword;
  const activeView = forced ? "changePass" : view;

  // Keeps the header avatar in sync with whatever the portal's own polling
  // (see useStudentPortal POLL_INTERVAL_MS) just fetched — covers the case
  // where an Admin approves a photo change request while this student is
  // still logged in, not just their own direct uploads (those already
  // update the header immediately via Profile's use of updatePhoto).
  useEffect(() => {
    setUserPhoto(portal.profile?.photo);
  }, [portal.profile?.photo, setUserPhoto]);

  return (
    <DashboardShell
      role="STUDENT"
      title={TITLES[activeView]}
      navItems={NAV_ITEMS}
      activeView={activeView}
      onNavigate={(key) => !forced && setView(key)}
      roleTag={user ? `${user.studentType === "CADET" ? "🎖️ Officer Cadet" : "🏠Day Scholar"}\n${user.indexNumber}` : undefined}
    >
      {activeView === "dashboard" && <Dashboard portal={portal} />}
      {activeView === "applyLeave" && <ApplyLeave portal={portal} onDone={() => setView("dashboard")} />}
      {activeView === "profile" && <Profile portal={portal} />}
      {activeView === "changePass" && <ChangePasswordForm forced={forced} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
