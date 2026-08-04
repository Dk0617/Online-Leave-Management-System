"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  normalizeEventDay,
  normalizeLeave,
  normalizePhotoChangeRequest,
  normalizeStudent,
  POLL_INTERVAL_MS,
} from "@/src/api";
import { EventDay, LeaveRequest, LeaveType, PhotoChangeRequest, Student } from "@/src/types";
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

export function useStudentPortal() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [profile, setProfile] = useState<Student | null>(null);
  const [photoRequests, setPhotoRequests] = useState<PhotoChangeRequest[]>([]);
  const [blockedDays, setBlockedDays] = useState<EventDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leavesRaw, profileRaw, photoRequestsRaw, blockedDaysRaw] = await Promise.all([
        api.get<Record<string, unknown>[]>("/student/leaves"),
        api.get<Record<string, unknown>>("/student/profile"),
        api.get<Record<string, unknown>[]>("/student/photo-requests"),
        api.get<Record<string, unknown>[]>("/student/blocked-days"),
      ]);
      setLeaves(leavesRaw.map(normalizeLeave));
      setProfile(normalizeStudent(profileRaw));
      setPhotoRequests(photoRequestsRaw.map(normalizePhotoChangeRequest));
      setBlockedDays(blockedDaysRaw.map(normalizeEventDay));
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

  return {
    leaves,
    profile,
    photoRequests,
    blockedDays,
    loading,
    error,
    refresh,
    applyLeave,
    updateProfile,
    requestPhotoChange,
    getMovements,
  };
}
