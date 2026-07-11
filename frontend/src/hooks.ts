"use client";

import { useCallback, useEffect, useState } from "react";
import { api, normalizeLeave, normalizeMovement, normalizeStudent } from "@/src/api";
import {
  normalizeAudit,
  normalizeIntake,
  normalizeNotification,
  normalizeStaff,
} from "@/src/api";
import {
  AuditEntry,
  Intake,
  LeaveRequest,
  LeaveType,
  Movement,
  NotificationEntry,
  StaffAccount,
  Student,
} from "@/src/types";

// ==================================================================
// Admin
// ==================================================================

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
  async function removeStudent(id: string) {
    await api.delete(`/admin/students/${id}`);
    await refresh();
  }

  // ── Generic staff (HOD / Squadron / SDD / Gate) ────────────────
  async function addStaff(role: StaffRole, input: NewStaffInput) {
    await api.post(`/admin/staff/${role.toLowerCase()}`, input);
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
    removeStudent,
    addStaff,
    removeStaff,
    addTroop,
    editTroop,
    removeTroop,
    markNotificationRead,
    clearAuditLog,
  };
}

// ==================================================================
// Gate
// ==================================================================

export interface VerifyResult {
  found: boolean;
  valid?: boolean;
  reason?: "not_active" | "not_approved";
  leave?: Record<string, unknown>;
}

export function useGatePortal() {
  const [approvedLeaves, setApprovedLeaves] = useState<LeaveRequest[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [leavesRaw, movRaw] = await Promise.all([
        api.get<Record<string, unknown>[]>("/gate/leaves"),
        api.get<Record<string, unknown>[]>("/gate/movements"),
      ]);
      setApprovedLeaves(leavesRaw.map(normalizeLeave));
      setMovements(movRaw.map(normalizeMovement));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function verify(indexNumber: string): Promise<VerifyResult> {
    return api.get<VerifyResult>(`/gate/verify/${encodeURIComponent(indexNumber)}`);
  }

  async function logMovement(input: {
    indexNumber: string;
    direction: "Exit" | "Entry";
    leaveId?: string;
    notes?: string;
  }) {
    await api.post("/gate/movements", input);
    await refresh();
  }

  async function clearMovementLog() {
    await api.delete("/gate/movements");
    await refresh();
  }

  return { approvedLeaves, movements, loading, refresh, verify, logMovement, clearMovementLog };
}

// ==================================================================
// HOD
// ==================================================================

export function useHodPortal() {
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        api.get<Record<string, unknown>[]>("/hod/leaves/pending"),
        api.get<Record<string, unknown>[]>("/hod/leaves/history"),
      ]);
      setPending(p.map(normalizeLeave));
      setHistory(h.map(normalizeLeave));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function approve(id: string, comment?: string) {
    await api.patch(`/hod/leaves/${id}/approve`, { comment });
    await refresh();
  }
  async function reject(id: string, comment?: string) {
    await api.patch(`/hod/leaves/${id}/reject`, { comment });
    await refresh();
  }

  return { pending, history, loading, refresh, approve, reject };
}

// ==================================================================
// SDD
// ==================================================================

export function useSddPortal() {
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [overview, setOverview] = useState<LeaveRequest[]>([]);
  const [pipeline, setPipeline] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h, o, pl] = await Promise.all([
        api.get<Record<string, unknown>[]>("/sdd/leaves/pending"),
        api.get<Record<string, unknown>[]>("/sdd/leaves/history"),
        api.get<Record<string, unknown>[]>("/sdd/leaves/overview"),
        api.get<Record<string, unknown>[]>("/sdd/leaves/pipeline"),
      ]);
      setPending(p.map(normalizeLeave));
      setHistory(h.map(normalizeLeave));
      setOverview(o.map(normalizeLeave));
      setPipeline(pl.map(normalizeLeave));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function approve(id: string, comment?: string) {
    await api.patch(`/sdd/leaves/${id}/approve`, { comment });
    await refresh();
  }
  async function reject(id: string, comment?: string) {
    await api.patch(`/sdd/leaves/${id}/reject`, { comment });
    await refresh();
  }

  return { pending, history, overview, pipeline, loading, refresh, approve, reject };
}

// ==================================================================
// Squadran
// ==================================================================

export function useSquadranPortal() {
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        api.get<Record<string, unknown>[]>("/squadran/leaves/pending"),
        api.get<Record<string, unknown>[]>("/squadran/leaves/history"),
      ]);
      setPending(p.map(normalizeLeave));
      setHistory(h.map(normalizeLeave));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function approve(id: string, comment?: string) {
    await api.patch(`/squadran/leaves/${id}/approve`, { comment });
    await refresh();
  }
  async function reject(id: string, comment?: string) {
    await api.patch(`/squadran/leaves/${id}/reject`, { comment });
    await refresh();
  }

  return { pending, history, loading, refresh, approve, reject };
}

// ==================================================================
// Student
// ==================================================================

export interface NewLeaveInput {
  type: LeaveType;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
  attachmentName?: string;
  attachmentData?: string;
}

export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
}

export function useStudentPortal() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leavesRaw, profileRaw] = await Promise.all([
        api.get<Record<string, unknown>[]>("/student/leaves"),
        api.get<Record<string, unknown>>("/student/profile"),
      ]);
      setLeaves(leavesRaw.map(normalizeLeave));
      setProfile(normalizeStudent(profileRaw));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function applyLeave(input: NewLeaveInput) {
    await api.post("/student/leaves", input);
    await refresh();
  }

  async function updateProfile(input: ProfileInput) {
    await api.patch("/student/profile", input);
    await refresh();
  }

  async function updatePhoto(photo: string | null) {
    await api.patch("/student/photo", { photo });
    await refresh();
  }

  return { leaves, profile, loading, error, refresh, applyLeave, updateProfile, updatePhoto };
}

// ==================================================================
// Troop
// ==================================================================

export function useTroopPortal() {
  const [allPending, setAllPending] = useState<LeaveRequest[]>([]);
  const [dayScholarPending, setDayScholarPending] = useState<LeaveRequest[]>([]);
  const [cadetPending, setCadetPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [all, ds, cd, hist] = await Promise.all([
        api.get<Record<string, unknown>[]>("/troop/leaves/pending"),
        api.get<Record<string, unknown>[]>("/troop/leaves/pending/dayscholar"),
        api.get<Record<string, unknown>[]>("/troop/leaves/pending/cadet"),
        api.get<Record<string, unknown>[]>("/troop/leaves/history"),
      ]);
      setAllPending(all.map(normalizeLeave));
      setDayScholarPending(ds.map(normalizeLeave));
      setCadetPending(cd.map(normalizeLeave));
      setHistory(hist.map(normalizeLeave));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function approve(id: string, comment?: string) {
    await api.patch(`/troop/leaves/${id}/approve`, { comment });
    await refresh();
  }
  async function reject(id: string, comment?: string) {
    await api.patch(`/troop/leaves/${id}/reject`, { comment });
    await refresh();
  }

  return {
    allPending,
    dayScholarPending,
    cadetPending,
    history,
    loading,
    refresh,
    approve,
    reject,
  };
}
