"use client";

import { useState } from "react";
import { DashboardShell, NavItem } from "@/src/components/DashboardShell";
import { MyProfile } from "@/src/components/MyProfile";
import { useAdminPortal } from "@/src/hooks/useAdminPortal";
import { Dashboard, Intakes, Students, StaffRole, Troop, PasswordChanges, AuditLog, Lecturers, HodCover } from "./views";

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "intakes", label: "Intakes", icon: "🗓️" },
  { key: "students", label: "Students", icon: "🎓" },
  { key: "hod", label: "HODs", icon: "🏛️" },
  { key: "lecturers", label: "Lecturers", icon: "📖" },
  { key: "hodCover", label: "HOD Cover", icon: "🔄" },
  { key: "troop", label: "Troop Commanders", icon: "🎖️" },
  { key: "squadran", label: "Squadron Commander", icon: "⚔️" },
  { key: "sdd", label: "Senior Deputy Dean", icon: "⭐" },
  { key: "gate", label: "Gate Staff", icon: "🚧" },
  { key: "profile", label: "My Profile", icon: "👤" },
  { key: "passwords", label: "Password Changes", icon: "🔑" },
  { key: "audit", label: "Audit Log", icon: "🛡️" },
];

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  intakes: "Intakes",
  students: "Students",
  hod: "HODs",
  lecturers: "Lecturers",
  hodCover: "HOD Cover",
  troop: "Troop Commanders",
  squadran: "Squadron Commander",
  sdd: "Senior Deputy Dean",
  gate: "Gate Staff",
  profile: "My Profile",
  passwords: "Password Changes",
  audit: "Audit Log",
};

export default function AdminPage() {
  const [view, setView] = useState("dashboard");
  const portal = useAdminPortal();

  return (
    <DashboardShell
      role="ADMIN"
      title={TITLES[view]}
      navItems={NAV_ITEMS}
      activeView={view}
      onNavigate={setView}
      locationLabel="Administration"
    >
      {view === "dashboard" && <Dashboard portal={portal} />}
      {view === "intakes" && <Intakes portal={portal} />}
      {view === "students" && <Students portal={portal} />}
      {view === "hod" && <StaffRole portal={portal} role="HOD" title="HOD" extraLabel="Department" />}
      {view === "lecturers" && <Lecturers portal={portal} />}
      {view === "hodCover" && <HodCover portal={portal} />}
      {view === "squadran" && <StaffRole portal={portal} role="SQUADRAN" title="Squadron Commander" />}
      {view === "sdd" && (
        <StaffRole portal={portal} role="SDD" title="Senior Deputy Dean" extraLabel="Title" extraPlaceholder="e.g. Senior Deputy Dean" />
      )}
      {view === "gate" && <StaffRole portal={portal} role="GATE" title="Gate Staff" extraLabel="Post" extraPlaceholder="e.g. Main Gate" />}
      {view === "troop" && <Troop portal={portal} />}
      {view === "profile" && <MyProfile />}
      {view === "passwords" && <PasswordChanges portal={portal} />}
      {view === "audit" && <AuditLog portal={portal} />}
    </DashboardShell>
  );
}
