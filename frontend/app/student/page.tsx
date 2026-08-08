"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, KeyRound, LayoutDashboard, User, Users } from "lucide-react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { ChangePasswordForm } from "@/src/components/ChangePasswordForm";
import { useAuth } from "@/src/AuthContext";
import { useStudentPortal } from "@/src/hooks/useStudentPortal";
import { Dashboard, ApplyLeave, BlockLeave, Profile, SetProfilePhoto } from "./views";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  applyLeave: "Apply for Leave",
  blockLeave: "Block Leave",
  profile: "My Profile",
  changePass: "Change Password",
  setPhoto: "Set Profile Photo",
};

export default function StudentPage() {
  const { user, setUserPhoto } = useAuth();
  const [view, setView] = useState("dashboard");
  const portal = useStudentPortal();

  // Block Leave is Day Scholar only — never shown to Cadets, see
  // backend/models/BlockLeave.js.
  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "applyLeave", label: "Apply Leave", icon: FileText },
    ];
    if (user?.studentType === "DAY_SCHOLAR") {
      items.push({ key: "blockLeave", label: "Block Leave", icon: Users });
    }
    items.push({ key: "profile", label: "My Profile", icon: User }, { key: "changePass", label: "Change Password", icon: KeyRound });
    return items;
  }, [user?.studentType]);

  const forcedPassword = !!user?.mustChangePassword;
  // Only forced once the profile has actually loaded (so this doesn't flash
  // before useStudentPortal's initial fetch resolves) and only after the
  // password step above is done — a brand-new student always has no photo
  // yet (see backend/controllers/admincontrol.js createStudent, which never
  // sets one), so this is effectively "every student, once, on first login".
  const forcedPhoto = !forcedPassword && !!portal.profile && !portal.profile.photo;
  const forced = forcedPassword || forcedPhoto;
  const activeView = forcedPassword ? "changePass" : forcedPhoto ? "setPhoto" : view;

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
      navItems={navItems}
      activeView={activeView}
      onNavigate={(key) => !forced && setView(key)}
      roleTag={user ? `${user.studentType === "CADET" ? "🎖️ Officer Cadet" : "🏠Day Scholar"}\n${user.indexNumber}` : undefined}
    >
      {activeView === "dashboard" && <Dashboard portal={portal} />}
      {activeView === "applyLeave" && <ApplyLeave portal={portal} onDone={() => setView("dashboard")} />}
      {activeView === "blockLeave" && user?.studentType === "DAY_SCHOLAR" && <BlockLeave portal={portal} />}
      {activeView === "profile" && <Profile portal={portal} />}
      {activeView === "changePass" && (
        <ChangePasswordForm forced={forcedPassword} onDone={() => setView("dashboard")} />
      )}
      {activeView === "setPhoto" && <SetProfilePhoto portal={portal} onDone={() => setView("dashboard")} />}
    </DashboardShell>
  );
}
