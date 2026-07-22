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
  // Rejects only the leaves the HOD picked after reviewing the full
  // overlapping list (see hod/views.tsx EventCalendar's review modal) —
  // leaveIds is whatever survived the HOD un-checking anything they want
  // to keep (e.g. an Emergency Leave). Returns how many were actually
  // rejected, so the caller can show a confirmation.
  async function rejectOverlapping(id: string, leaveIds: string[]): Promise<number> {
    const result = await api.post<{ rejectedCount: number }>(`/hod/events/${id}/reject-overlapping`, { leaveIds });
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
