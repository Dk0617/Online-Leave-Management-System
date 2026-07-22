"use client";

import { useCallback, useEffect, useState } from "react";
import { api, normalizeEventDay, normalizeLeave } from "@/src/api";
import { EventDay, LeaveRequest } from "@/src/types";

export function useHodPortal() {
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [events, setEvents] = useState<EventDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, h, e] = await Promise.all([
        api.get<Record<string, unknown>[]>("/hod/leaves/pending"),
        api.get<Record<string, unknown>[]>("/hod/leaves/history"),
        api.get<Record<string, unknown>[]>("/hod/events"),
      ]);
      setPending(p.map(normalizeLeave));
      setHistory(h.map(normalizeLeave));
      setEvents(e.map(normalizeEventDay));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load HOD data");
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

  async function addEvent(date: string, title: string) {
    await api.post("/hod/events", { date, title });
    await refresh();
  }
  async function removeEvent(id: string) {
    await api.delete(`/hod/events/${id}`);
    await refresh();
  }
  // Returns how many pending leaves were rejected, so the caller can show
  // the HOD a confirmation of what just happened.
  async function rejectOverlapping(id: string): Promise<number> {
    const result = await api.post<{ rejectedCount: number }>(`/hod/events/${id}/reject-overlapping`);
    await refresh();
    return result.rejectedCount;
  }

  return {
    pending,
    history,
    events,
    loading,
    error,
    refresh,
    approve,
    reject,
    addEvent,
    removeEvent,
    rejectOverlapping,
  };
}
