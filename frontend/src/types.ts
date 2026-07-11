// Core domain types for the Online Leave Management System.

export type Role = "ADMIN" | "STUDENT" | "HOD" | "TROOP" | "SQUADRAN" | "SDD" | "GATE";

export type StudentType = "DAY_SCHOLAR" | "CADET";

export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "N/A";

export type LeaveType =
  | "Medical Leave"
  | "Personal Leave"
  | "Family Emergency"
  | "Academic Leave"
  | "Other"
  | "Emergency Leave";

export type Priority = "normal" | "emergency";

export type Direction = "Exit" | "Entry";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  STUDENT: "Student",
  HOD: "Head of Department",
  TROOP: "Troop Commander",
  SQUADRAN: "Squadron Commander",
  SDD: "Senior Deputy Dean",
  GATE: "Gate Staff",
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  "Medical Leave": "Medical Leave",
  "Personal Leave": "Personal Leave",
  "Family Emergency": "Family Emergency",
  "Academic Leave": "Academic Leave",
  Other: "Other",
  "Emergency Leave": "🚨 Emergency Leave",
};

// Leave types that require a supporting document attachment.
export const DOC_REQUIRED_TYPES: LeaveType[] = ["Medical Leave", "Academic Leave", "Other"];

// ── Auth / session ────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  department?: string;
  designation?: string;
  title?: string; // SDD
  post?: string; // Gate
  intakes?: string[]; // Troop
  studentType?: StudentType; // Student
  indexNumber?: string; // Student
  intake?: string; // Student
}

// ── Accounts (as returned by admin account-management endpoints) ──
export interface RefName {
  id: string;
  name: string;
}

export interface StaffAccount {
  id: string;
  username: string;
  name: string;
  department?: string; // HOD
  title?: string; // SDD
  post?: string; // Gate
  designation?: string;
  intakes?: string[]; // Troop
  mustChangePassword: boolean;
}

export interface Student {
  id: string;
  username: string;
  indexNumber: string;
  firstName: string;
  lastName: string;
  name: string;
  department?: string;
  email?: string;
  mobile?: string;
  studentType: StudentType;
  intake: string;
  troopIds: (string | RefName)[];
  hodId?: string | RefName;
  sqnId?: string | RefName;
  photo?: string;
  mustChangePassword: boolean;
}

export interface Intake {
  id: string;
  code: string;
}

// ── Leave ───────────────────────────────────────────────────────────
export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  indexNumber: string;
  department?: string;
  studentType: StudentType;
  intake?: string;
  hodId?: string;
  troopIds?: string[];
  sqnId?: string;

  type: LeaveType;
  priority: Priority;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
  attachmentName?: string;
  attachmentData?: string;
  appliedDate: string;

  hodStatus: LeaveStatus;
  troopStatus: LeaveStatus;
  sqnStatus: LeaveStatus;
  sddStatus: LeaveStatus;

  hodComment?: string;
  troopComment?: string;
  sqnComment?: string;
  sddComment?: string;

  hodApprovedAt?: string;
  troopApprovedAt?: string;
  sqnApprovedAt?: string;
  sddApprovedAt?: string;
}

// ── Gate movement log ───────────────────────────────────────────────
export interface Movement {
  id: string;
  indexNumber: string;
  studentName: string;
  studentType?: StudentType;
  direction: Direction;
  leaveId?: string;
  notes?: string;
  loggedBy: string;
  timestamp: string; // createdAt
}

// ── Admin: password-change notifications & audit log ─────────────────
export interface NotificationEntry {
  id: string;
  role: Role;
  username: string;
  name?: string;
  read: boolean;
  time: string; // createdAt
}

export interface AuditEntry {
  id: string;
  role: string;
  user: string;
  action: string;
  details?: string;
  time: string; // createdAt
}
