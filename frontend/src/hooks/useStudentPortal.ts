"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { normalizeLeave, normalizeStudent } from "@/src/lib/normalize";
import { LeaveRequest, LeaveType, Student } from "@/src/types";

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
