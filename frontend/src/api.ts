// Everything about talking to the backend: the fetch wrapper, mapping raw
// Mongo/Express JSON onto frontend shapes, and the shared leave-status logic
// (mirrors backend/controllers.js isApproved/isRejected — keep the two in sync).

import {
  AuditEntry,
  AuthUser,
  DOC_REQUIRED_TYPES,
  DOC_REQUIRED_TYPES_CADET,
  EventDay,
  HodUnavailability,
  Intake,
  LeaveRequest,
  LecturerAccount,
  LecturerUnavailability,
  Movement,
  NotificationEntry,
  RefName,
  Role,
  StaffAccount,
  Student,
} from "@/src/types";

// ==================================================================
// Fetch wrapper — attaches the JWT, parses JSON, throws ApiError on
// non-2xx so callers can catch a single type.
// ==================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const TOKEN_KEY = "ols_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    throw new ApiError(body?.message ?? res.statusText, res.status);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
};

// ==================================================================
// Normalizers — map raw Mongo/Express JSON (_id, populated refs) onto
// the frontend's camelCase `id` shapes.
// ==================================================================

type Raw = Record<string, unknown>;

function refName(value: unknown): string | RefName | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  const v = value as Raw;
  if (v.name) return { id: String(v._id ?? v.id), name: v.name as string };
  return String(v._id ?? v);
}

export function normalizeAuthUser(raw: Raw): AuthUser {
  return {
    id: String(raw._id ?? raw.id),
    username: raw.username as string,
    name: raw.name as string,
    role: raw.role as Role,
    mustChangePassword: !!raw.mustChangePassword,
    photo: raw.photo as string | undefined,
    department: raw.department as string | undefined,
    designation: raw.designation as string | undefined,
    title: raw.title as string | undefined,
    post: raw.post as string | undefined,
    intakes: raw.intakes as string[] | undefined,
    studentType: raw.studentType as AuthUser["studentType"],
    indexNumber: raw.indexNumber as string | undefined,
    intake: raw.intake as string | undefined,
  };
}

export function normalizeStaff(raw: Raw): StaffAccount {
  return {
    id: String(raw._id ?? raw.id),
    username: raw.username as string,
    name: raw.name as string,
    email: raw.email as string | undefined,
    department: raw.department as string | undefined,
    title: raw.title as string | undefined,
    post: raw.post as string | undefined,
    designation: raw.designation as string | undefined,
    intakes: raw.intakes as string[] | undefined,
    mustChangePassword: !!raw.mustChangePassword,
  };
}

export function normalizeStudent(raw: Raw): Student {
  return {
    id: String(raw._id ?? raw.id),
    username: raw.username as string,
    indexNumber: raw.indexNumber as string,
    firstName: raw.firstName as string,
    lastName: raw.lastName as string,
    name: (raw.name as string) ?? `${raw.firstName} ${raw.lastName}`,
    department: raw.department as string | undefined,
    email: raw.email as string | undefined,
    mobile: raw.mobile as string | undefined,
    studentType: raw.studentType as Student["studentType"],
    intake: raw.intake as string,
    troopIds: ((raw.troopIds as unknown[]) ?? []).map(refName) as (string | RefName)[],
    hodId: refName(raw.hodId),
    sqnId: refName(raw.sqnId),
    photo: raw.photo as string | undefined,
    mustChangePassword: !!raw.mustChangePassword,
  };
}

export function normalizeIntake(raw: Raw): Intake {
  return { id: String(raw._id ?? raw.id), code: raw.code as string };
}

export function normalizeLeave(raw: Raw): LeaveRequest {
  return {
    id: String(raw._id ?? raw.id),
    studentId: String(raw.studentId),
    studentName: raw.studentName as string,
    indexNumber: raw.indexNumber as string,
    department: raw.department as string | undefined,
    studentType: raw.studentType as LeaveRequest["studentType"],
    intake: raw.intake as string | undefined,
    hodId: raw.hodId ? String(raw.hodId) : undefined,
    troopIds: ((raw.troopIds as unknown[]) ?? []).map((t) => String(t)),
    sqnId: raw.sqnId ? String(raw.sqnId) : undefined,
    type: raw.type as LeaveRequest["type"],
    priority: raw.priority as LeaveRequest["priority"],
    startDate: raw.startDate as string,
    startTime: raw.startTime as string,
    endDate: raw.endDate as string,
    endTime: raw.endTime as string,
    reason: raw.reason as string,
    address: raw.address as string,
    contactNumber: raw.contactNumber as string,
    attachmentName: raw.attachmentName as string | undefined,
    attachmentData: raw.attachmentData as string | undefined,
    appliedDate: raw.appliedDate as string,
    verifyCode: raw.verifyCode as string | undefined,
    linkedLeaveId: raw.linkedLeaveId ? String(raw.linkedLeaveId) : undefined,
    linkedLeave: raw.linkedLeave
      ? (raw.linkedLeave as {
          type: LeaveRequest["type"];
          reason: string;
          attachmentName?: string;
          attachmentData?: string;
        })
      : undefined,
    hodStatus: raw.hodStatus as LeaveRequest["hodStatus"],
    troopStatus: raw.troopStatus as LeaveRequest["troopStatus"],
    sqnStatus: raw.sqnStatus as LeaveRequest["sqnStatus"],
    sddStatus: raw.sddStatus as LeaveRequest["sddStatus"],
    hodComment: raw.hodComment as string | undefined,
    troopComment: raw.troopComment as string | undefined,
    sqnComment: raw.sqnComment as string | undefined,
    sddComment: raw.sddComment as string | undefined,
    hodApprovedAt: raw.hodApprovedAt as string | undefined,
    troopApprovedAt: raw.troopApprovedAt as string | undefined,
    sqnApprovedAt: raw.sqnApprovedAt as string | undefined,
    sddApprovedAt: raw.sddApprovedAt as string | undefined,
  };
}

export function normalizeMovement(raw: Raw): Movement {
  return {
    id: String(raw._id ?? raw.id),
    indexNumber: raw.indexNumber as string,
    studentName: raw.studentName as string,
    studentType: raw.studentType as Movement["studentType"],
    direction: raw.direction as Movement["direction"],
    leaveId: raw.leaveId ? String(raw.leaveId) : undefined,
    notes: raw.notes as string | undefined,
    loggedBy: raw.loggedBy as string,
    timestamp: raw.createdAt as string,
    department: raw.department as string | undefined,
  };
}

export function normalizeNotification(raw: Raw): NotificationEntry {
  return {
    id: String(raw._id ?? raw.id),
    role: raw.role as Role,
    username: raw.username as string,
    name: raw.name as string | undefined,
    read: !!raw.read,
    time: raw.createdAt as string,
  };
}

export function normalizeAudit(raw: Raw): AuditEntry {
  return {
    id: String(raw._id ?? raw.id),
    role: raw.role as string,
    user: raw.user as string,
    action: raw.action as string,
    details: raw.details as string | undefined,
    time: raw.createdAt as string,
  };
}

export function normalizeEventDay(raw: Raw): EventDay {
  return {
    id: String(raw._id ?? raw.id),
    date: raw.date as string,
    title: raw.title as string,
  };
}

export function normalizeLecturer(raw: Raw): LecturerAccount {
  return {
    id: String(raw._id ?? raw.id),
    username: raw.username as string,
    name: raw.name as string,
    email: raw.email as string | undefined,
    department: raw.department as string | undefined,
    tier: raw.tier as "SENIOR" | "JUNIOR",
    rank: raw.rank as number,
    mustChangePassword: !!raw.mustChangePassword,
  };
}

export function normalizeHodUnavailability(raw: Raw): HodUnavailability {
  const hod = raw.hodId as Raw;
  return {
    id: String(raw._id ?? raw.id),
    hodId: String(hod?._id ?? hod),
    hodName: (hod?.name as string) ?? "Unknown",
    hodDepartment: hod?.department as string | undefined,
    fromDate: raw.fromDate as string,
    toDate: raw.toDate as string,
    reason: raw.reason as string | undefined,
  };
}

export function normalizeLecturerUnavailability(raw: Raw): LecturerUnavailability {
  const lecturer = raw.lecturerId as Raw;
  return {
    id: String(raw._id ?? raw.id),
    lecturerId: String(lecturer?._id ?? lecturer),
    lecturerName: (lecturer?.name as string) ?? "Unknown",
    lecturerTier: lecturer?.tier as "SENIOR" | "JUNIOR",
    lecturerRank: lecturer?.rank as number,
    fromDate: raw.fromDate as string,
    toDate: raw.toDate as string,
    reason: raw.reason as string | undefined,
  };
}

// ==================================================================
// Leave status helpers
// ==================================================================

// Cadet Academic Leave routes HOD -> Squadron Commander only (no Troop
// Commander, no SDD) — identified by troopStatus === "N/A" on a CADET
// leave, since every other cadet leave type always puts troopStatus
// through Pending/Approved/Rejected, never N/A.
export function isApproved(leave: LeaveRequest): boolean {
  if (leave.studentType === "CADET") {
    if (leave.troopStatus === "N/A") {
      return leave.hodStatus === "Approved" && leave.sqnStatus === "Approved";
    }
    return (
      leave.troopStatus === "Approved" &&
      leave.sqnStatus === "Approved" &&
      leave.sddStatus === "Approved"
    );
  }
  return leave.hodStatus === "Approved" && leave.troopStatus === "Approved";
}

export function isRejected(leave: LeaveRequest): boolean {
  if (leave.studentType === "CADET") {
    if (leave.troopStatus === "N/A") {
      return leave.hodStatus === "Rejected" || leave.sqnStatus === "Rejected";
    }
    return (
      leave.troopStatus === "Rejected" ||
      leave.sqnStatus === "Rejected" ||
      leave.sddStatus === "Rejected"
    );
  }
  return leave.hodStatus === "Rejected" || leave.troopStatus === "Rejected";
}

// A stage's raw status can be stuck at "Pending" even though the leave as a
// whole is already Rejected — an earlier stage rejected it, so this later
// stage will never actually be reached or decided (the pending-queue
// queries in backend/controllers/leavecontrol.js already gate on the
// earlier stage's status, so downstream approvers never see it). Callers
// use this to avoid displaying a misleading "Pending" badge for a stage
// that is never coming.
export function isStageMoot(
  leave: LeaveRequest,
  field: "hodStatus" | "troopStatus" | "sqnStatus" | "sddStatus"
): boolean {
  return leave[field] === "Pending" && isRejected(leave);
}

// hodApprovedAt/troopApprovedAt/sqnApprovedAt/sddApprovedAt are stored as
// `new Date().toLocaleString()` (see leavecontrol.js applyDecision) rather
// than a clean ISO string — still parseable by `new Date(...)`, just not
// directly string-comparable. Used to scope each portal's "Approved
// Today"/"Rejected Today" dashboard stats to actions actually taken today,
// as opposed to the leave's original application date.
export function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return d.toDateString() === new Date().toDateString();
}

// Academic Leave is an academic excuse kept on file with the approver (HOD
// for Day Scholars, Squadron Commander for Cadets), not an exit permit — it
// never produces a gate pass or downloadable PDF, even once fully approved.
// Its auto-created companion Personal Leave is the one students actually
// use to exit/re-enter campus.
export function isGateEligible(leave: LeaveRequest): boolean {
  return isApproved(leave) && leave.type !== "Academic Leave";
}

// The leave a student is out on right now, if any — mirrors backend
// gatecontrol.js isCurrentlyValid. Used to show "currently at {address}"
// in the dashboard header instead of the student's department while
// they're actually off campus (see DashboardShell's locationLabel).
export function currentlyOnLeave(leaves: LeaveRequest[]): LeaveRequest | undefined {
  const now = new Date();
  return leaves.find((l) => {
    if (!isGateEligible(l)) return false;
    const start = new Date(`${l.startDate}T${l.startTime || "00:00"}`);
    const end = new Date(`${l.endDate}T${l.endTime || "23:59"}`);
    return now >= start && now <= end;
  });
}

// Day Scholar rule is unchanged; Cadets follow a different rule (see
// backend/controllers/studentcontrol.js requiresAttachment — keep in sync).
export function requiresAttachment(type: LeaveRequest["type"], studentType: LeaveRequest["studentType"]): boolean {
  return (studentType === "CADET" ? DOC_REQUIRED_TYPES_CADET : DOC_REQUIRED_TYPES).includes(type);
}
