"use client";
 
import { useCallback, useEffect, useState } from "react";
import {
  api,
  normalizeBlockLeave,
  normalizeEventDay,
  normalizeLeave,
  normalizePhotoChangeRequest,
  normalizeStudent,
  POLL_INTERVAL_MS,
} from "@/src/api";
import { BlockLeaveRequest, EventDay, InvitableStudent, LeaveRequest, LeaveType, PhotoChangeRequest, Student } from "@/src/types";
import { PassVerification } from "@/src/pdf";
 
export interface NewLeaveInput {
  type: LeaveType;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
  address: string;
  contactNumber: string;
  attachmentName?: string;
  attachmentData?: string;
  // Only used when type === "Academic Leave" — the linked Personal Leave
  // applied together with it shares the reason above and has its own
  // independent attachment only.
  personalAttachmentName?: string;
  personalAttachmentData?: string;
}
 
// firstName/lastName/email are all fixed once the account is created (only
// Admin can change them) — mobile is the only thing a student can update
// themselves. See backend/controllers/studentcontrol.js updateProfile.
export interface ProfileInput {
  mobile?: string;
}
 
export interface NewBlockLeaveInput {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
}
 
export function useStudentPortal() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [profile, setProfile] = useState<Student | null>(null);
  const [photoRequests, setPhotoRequests] = useState<PhotoChangeRequest[]>([]);
  const [blockedDays, setBlockedDays] = useState<EventDay[]>([]);
  const [openBlockLeave, setOpenBlockLeave] = useState<BlockLeaveRequest | null>(null);
  const [myBlockLeaves, setMyBlockLeaves] = useState<BlockLeaveRequest[]>([]);
  const [blockLeaveInvitations, setBlockLeaveInvitations] = useState<BlockLeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leavesRaw, profileRaw, photoRequestsRaw, blockedDaysRaw, openBlockRaw, myBlockRaw, invitationsRaw] =
        await Promise.all([
          api.get<Record<string, unknown>[]>("/student/leaves"),
          api.get<Record<string, unknown>>("/student/profile"),
          api.get<Record<string, unknown>[]>("/student/photo-requests"),
          api.get<Record<string, unknown>[]>("/student/blocked-days"),
          api.get<Record<string, unknown> | null>("/student/block-leave/open"),
          api.get<Record<string, unknown>[]>("/student/block-leave/mine"),
          api.get<Record<string, unknown>[]>("/student/block-leave/invitations"),
        ]);
      setLeaves(leavesRaw.map(normalizeLeave));
      setProfile(normalizeStudent(profileRaw));
      setPhotoRequests(photoRequestsRaw.map(normalizePhotoChangeRequest));
      setBlockedDays(blockedDaysRaw.map(normalizeEventDay));
      setOpenBlockLeave(openBlockRaw ? normalizeBlockLeave(openBlockRaw) : null);
      setMyBlockLeaves(myBlockRaw.map(normalizeBlockLeave));
      setBlockLeaveInvitations(invitationsRaw.map(normalizeBlockLeave));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    refresh();
  }, [refresh]);
 
  // No push/websocket infra — poll instead, so a decision made on one of
  // their leaves shows up here without a manual reload. See api.ts
  // POLL_INTERVAL_MS.
  useEffect(() => {
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);
 
  async function applyLeave(input: NewLeaveInput) {
    await api.post("/student/leaves", input);
    await refresh();
  }
 
  async function updateProfile(input: ProfileInput) {
    await api.patch("/student/profile", input);
    await refresh();
  }
 
  // Only reachable once profile.photoLocked is true — see student/views.tsx
  // Profile for the UI that swaps to this. The initial (unlocked) photo set
  // goes through AuthContext's updatePhoto instead (see student/views.tsx
  // Profile) so the header avatar updates immediately too.
  async function requestPhotoChange(photo: string, reason?: string) {
    await api.post("/student/photo-request", { photo, reason });
    await refresh();
  }
 
  async function getMovements(leaveId: string): Promise<PassVerification> {
    return api.get<PassVerification>(`/student/leaves/${leaveId}/movements`);
  }
 
  async function startBlockLeave(input: NewBlockLeaveInput) {
    await api.post("/student/block-leave", input);
    await refresh();
  }
  async function joinBlockLeave(id: string) {
    await api.post(`/student/block-leave/${id}/join`);
    await refresh();
  }
  async function submitBlockLeave(id: string) {
    await api.post(`/student/block-leave/${id}/submit`);
    await refresh();
  }
  // Only the roster's starting student (students[0] on the backend) can
  // call this — enforced server-side in blockleavecontrol.js
  // cancelBlockLeave. Works while the roster is still FILLING (before the
  // student-minimum submit) or already SUBMITTED but not yet decided by
  // HOD/Troop.
  async function cancelBlockLeave(id: string) {
    await api.post(`/student/block-leave/${id}/cancel`);
    await refresh();
  }
  async function searchInvitableStudents(id: string, q: string): Promise<InvitableStudent[]> {
    return api.get<InvitableStudent[]>(`/student/block-leave/${id}/invitable-students?q=${encodeURIComponent(q)}`);
  }
  async function inviteToBlockLeave(id: string, studentId: string) {
    await api.post(`/student/block-leave/${id}/invite`, { studentId });
    await refresh();
  }
  async function respondToBlockLeaveInvite(id: string, accept: boolean) {
    await api.post(`/student/block-leave/${id}/invite/respond`, { accept });
    await refresh();
  }
 
  return {
    leaves,
    profile,
    photoRequests,
    blockedDays,
    openBlockLeave,
    myBlockLeaves,
    blockLeaveInvitations,
    loading,
    error,
    refresh,
    applyLeave,
    updateProfile,
    requestPhotoChange,
    getMovements,
    startBlockLeave,
    joinBlockLeave,
    submitBlockLeave,
    cancelBlockLeave,
    searchInvitableStudents,
    inviteToBlockLeave,
    respondToBlockLeaveInvite,
  };
}