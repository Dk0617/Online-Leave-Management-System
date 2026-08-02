// Core domain types for the Student Leave Management System.

export type Role = "ADMIN" | "STUDENT" | "HOD" | "TROOP" | "SQUADRAN" | "SDD" | "GATE" | "LECTURER";

export type StudentType = "DAY_SCHOLAR" | "CADET";

export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "N/A";

export type LeaveType =
  | "Medical Leave"
  | "Personal Leave"
  | "Academic Leave"
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
  LECTURER: "Lecturer",
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  "Medical Leave": "Medical Leave",
  "Personal Leave": "Personal Leave",
  "Academic Leave": "Academic Leave",
  "Emergency Leave": "🚨 Emergency Leave",
};

// Leave types that require a supporting document attachment. Academic Leave
// never requires one, for either student type. See requiresAttachment in
// api.ts, kept in sync with backend/controllers/studentcontrol.js.
export const DOC_REQUIRED_TYPES: LeaveType[] = ["Medical Leave"];
export const DOC_REQUIRED_TYPES_CADET: LeaveType[] = ["Medical Leave", "Personal Leave"];

// ── Auth / session ────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  photo?: string; // base64 data URL — shown as the header avatar (see DashboardShell)
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
  email?: string;
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
  // Set once the student has used their one self-service photo set — see
  // backend/models/Student.js. Further changes need a PhotoChangeRequest.
  photoLocked?: boolean;
  mustChangePassword: boolean;
}

export type PhotoChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

// A student's request to change their photo after it's locked — see
// backend/models/PhotoChangeRequest.js.
export interface PhotoChangeRequest {
  id: string;
  studentId: string;
  studentName?: string;
  studentIndexNumber?: string;
  currentPhoto?: string;
  requestedPhoto: string;
  reason?: string;
  status: PhotoChangeRequestStatus;
  decidedBy?: string;
  decidedAt?: string;
  decisionReason?: string;
  createdAt: string;
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
  address: string;
  contactNumber: string;
  attachmentName?: string;
  attachmentData?: string;
  appliedDate: string;
  verifyCode?: string;
  linkedLeaveId?: string;
  // Lightweight summary of the linked leave's own reason/attachment (only
  // populated on Pending queue responses) — lets an approver reviewing an
  // Academic Leave also see the linked Personal Leave's own document,
  // since their decision cascades to approve it too but never shows it.
  linkedLeave?: {
    type: LeaveType;
    reason: string;
    attachmentName?: string;
    attachmentData?: string;
  };

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
  // Only present on the Troop/Squadron-scoped /movements endpoints (see
  // backend/controllers/movementcontrol.js) — joined in from Student since
  // Movement itself doesn't store it.
  department?: string;
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

// A day an HOD marks on their calendar — see backend/models/EventDay.js.
export type EventCategory = "WORKSHOP" | "POYA" | "HOLIDAY" | "NO_LECTURE" | "OTHER";

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  WORKSHOP: "Workshop",
  POYA: "Poya Day",
  HOLIDAY: "Holiday",
  NO_LECTURE: "No Lecture Day",
  OTHER: "Other",
};

// Only Workshop is mandatory-attendance — the one the bulk-reject action
// (see hod/views.tsx EventCalendar) actually makes sense for. Poya Day is
// itself a public holiday (students are normally free to leave on it, not
// restricted), and Holiday/No Lecture are purely informational too.
export const MANDATORY_EVENT_CATEGORIES: EventCategory[] = ["WORKSHOP"];

export interface EventDay {
  id: string;
  date: string; // "YYYY-MM-DD"
  title: string;
  category: EventCategory;
}

// A Senior or Junior Lecturer in the campus-wide HOD-cover seniority chain
// — see backend/models/Lecturer.js.
export interface LecturerAccount {
  id: string;
  username: string;
  name: string;
  email?: string;
  department?: string;
  tier: "SENIOR" | "JUNIOR";
  rank: number;
  mustChangePassword: boolean;
}

// Admin-marked window when an HOD is unavailable — see
// backend/models/HodUnavailability.js.
export interface HodUnavailability {
  id: string;
  hodId: string;
  hodName: string;
  hodDepartment?: string;
  fromDate: string; // "YYYY-MM-DD"
  toDate: string; // "YYYY-MM-DD"
  reason?: string;
}

// Admin-marked window when a Lecturer isn't available to cover HOD
// approvals — see backend/models/LecturerUnavailability.js.
export interface LecturerUnavailability {
  id: string;
  lecturerId: string;
  lecturerName: string;
  lecturerTier: "SENIOR" | "JUNIOR";
  lecturerRank: number;
  fromDate: string; // "YYYY-MM-DD"
  toDate: string; // "YYYY-MM-DD"
  reason?: string;
}
