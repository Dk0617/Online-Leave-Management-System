// Everything about talking to the backend: the fetch wrapper, mapping raw
// Mongo/Express JSON onto frontend shapes, and the shared leave-status logic
// (mirrors backend/controllers.js isApproved/isRejected — keep the two in sync).

import {
  AuditEntry,
  AuthUser,
  Intake,
  LeaveRequest,
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
    attachmentName: raw.attachmentName as string | undefined,
    attachmentData: raw.attachmentData as string | undefined,
    appliedDate: raw.appliedDate as string,
    verifyCode: raw.verifyCode as string | undefined,
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

// ==================================================================
// Leave status helpers
// ==================================================================

export function isApproved(leave: LeaveRequest): boolean {
  if (leave.studentType === "CADET") {
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
    return (
      leave.troopStatus === "Rejected" ||
      leave.sqnStatus === "Rejected" ||
      leave.sddStatus === "Rejected"
    );
  }
  return leave.hodStatus === "Rejected" || leave.troopStatus === "Rejected";
}
