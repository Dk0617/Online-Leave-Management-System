"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  normalizeAudit,
  normalizeIntake,
  normalizeLeave,
  normalizeNotification,
  normalizeStaff,
  normalizeStudent,
} from "@/src/api";
import {
  AuditEntry,
  Intake,
  LeaveRequest,
  NotificationEntry,
  StaffAccount,
  Student,
} from "@/src/types";

export type StaffRole = "HOD" | "SQUADRAN" | "SDD" | "GATE";

export interface NewStudentInput {
  indexNumber: string;
  firstName: string;
  lastName: string;
  department?: string;
  email?: string;
  mobile?: string;
  studentType: "DAY_SCHOLAR" | "CADET";
  intake: string;
  troopIds: string[];
  hodId?: string;
  sqnId?: string;
  password?: string;
}

export interface NewStaffInput {
  username: string;
  name: string;
  password?: string;
  extra?: string;
}

export interface NewTroopInput {
  username: string;
  name: string;
  password?: string;
  intakes: string[];
}

export function useAdminPortal() {
  const [students, setStudents] = useState<Student[]>([]);
  const [hods, setHods] = useState<StaffAccount[]>([]);
  const [troops, setTroops] = useState<StaffAccount[]>([]);
  const [squadrans, setSquadrans] = useState<StaffAccount[]>([]);
  const [sdds, setSdds] = useState<StaffAccount[]>([]);
  const [gates, setGates] = useState<StaffAccount[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRaw, hodsRaw, troopsRaw, sqnRaw, sddRaw, gateRaw, intakesRaw, leavesRaw, notifsRaw, auditRaw] =
        await Promise.all([
          api.get<Record<string, unknown>[]>("/admin/students"),
          api.get<Record<string, unknown>[]>("/admin/staff/hod"),
          api.get<Record<string, unknown>[]>("/admin/troop"),
          api.get<Record<string, unknown>[]>("/admin/staff/squadran"),
          api.get<Record<string, unknown>[]>("/admin/staff/sdd"),
          api.get<Record<string, unknown>[]>("/admin/staff/gate"),
          api.get<Record<string, unknown>[]>("/admin/intakes"),
          api.get<Record<string, unknown>[]>("/admin/leaves"),
          api.get<Record<string, unknown>[]>("/admin/notifications"),
          api.get<Record<string, unknown>[]>("/admin/audit"),
        ]);
      setStudents(studentsRaw.map(normalizeStudent));
      setHods(hodsRaw.map(normalizeStaff));
      setTroops(troopsRaw.map(normalizeStaff));
      setSquadrans(sqnRaw.map(normalizeStaff));
      setSdds(sddRaw.map(normalizeStaff));
      setGates(gateRaw.map(normalizeStaff));
      setIntakes(intakesRaw.map(normalizeIntake));
      setLeaves(leavesRaw.map(normalizeLeave));
      setNotifications(notifsRaw.map(normalizeNotification));
      setAudit(auditRaw.map(normalizeAudit));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Intakes ─────────────────────────────────────────────────────
  async function addIntake(code: string) {
    await api.post("/admin/intakes", { code });
    await refresh();
  }
  async function removeIntake(code: string) {
    await api.delete(`/admin/intakes/${code}`);
    await refresh();
  }

  // ── Students ────────────────────────────────────────────────────
  async function addStudent(input: NewStudentInput) {
    await api.post("/admin/students", input);
    await refresh();
  }
  async function editStudent(id: string, input: Partial<NewStudentInput>) {
    await api.patch(`/admin/students/${id}`, input);
    await refresh();
  }
  async function removeStudent(id: string) {
    await api.delete(`/admin/students/${id}`);
    await refresh();
  }

  // ── Generic staff (HOD / Squadron / SDD / Gate) ────────────────
  async function addStaff(role: StaffRole, input: NewStaffInput) {
    await api.post(`/admin/staff/${role.toLowerCase()}`, input);
    await refresh();
  }
  async function editStaff(role: StaffRole, id: string, input: Partial<NewStaffInput>) {
    await api.patch(`/admin/staff/${role.toLowerCase()}/${id}`, input);
    await refresh();
  }
  async function removeStaff(role: StaffRole, id: string) {
    await api.delete(`/admin/staff/${role.toLowerCase()}/${id}`);
    await refresh();
  }

  // ── Troop (extra: intakes + edit) ───────────────────────────────
  async function addTroop(input: NewTroopInput) {
    await api.post("/admin/troop", input);
    await refresh();
  }
  async function editTroop(id: string, input: Partial<NewTroopInput>) {
    await api.patch(`/admin/troop/${id}`, input);
    await refresh();
  }
  async function removeTroop(id: string) {
    await api.delete(`/admin/troop/${id}`);
    await refresh();
  }

  // ── Notifications & audit ───────────────────────────────────────
  async function markNotificationRead(id: string) {
    await api.patch(`/admin/notifications/${id}/read`);
    await refresh();
  }
  async function clearAuditLog() {
    await api.delete("/admin/audit");
    await refresh();
  }

  return {
    students,
    hods,
    troops,
    squadrans,
    sdds,
    gates,
    intakes,
    leaves,
    notifications,
    audit,
    loading,
    error,
    refresh,
    addIntake,
    removeIntake,
    addStudent,
    editStudent,
    removeStudent,
    addStaff,
    editStaff,
    removeStaff,
    addTroop,
    editTroop,
    removeTroop,
    markNotificationRead,
    clearAuditLog,
  };
}
