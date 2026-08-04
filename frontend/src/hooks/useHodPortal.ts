"use client";

import { useCallback, useEffect, useState } from "react";
import { api, normalizeEventDay, normalizeLeave, normalizeMovement, POLL_INTERVAL_MS } from "@/src/api";
import { EventCategory, EventDay, LeaveRequest, Movement } from "@/src/types";

export function useHodPortal() {
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [events, setEvents] = useState<EventDay[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, h, e, m] = await Promise.all([
        api.get<Record<string, unknown>[]>("/hod/leaves/pending"),
        api.get<Record<string, unknown>[]>("/hod/leaves/history"),
        api.get<Record<string, unknown>[]>("/hod/events"),
        api.get<Record<string, unknown>[]>("/hod/movements"),
      ]);
      setPending(p.map(normalizeLeave));
      setHistory(h.map(normalizeLeave));
      setEvents(e.map(normalizeEventDay));
      setMovements(m.map(normalizeMovement));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load HOD data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // No push/websocket infra — poll instead, so a newly-submitted leave (or
  // a decision made on one elsewhere) shows up here without a manual
  // reload. See api.ts POLL_INTERVAL_MS.
  useEffect(() => {
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  async function approve(id: string, comment?: string) {
    await api.patch(`/hod/leaves/${id}/approve`, { comment });
    await refresh();
  }
  async function reject(id: string, comment?: string) {
    await api.patch(`/hod/leaves/${id}/reject`, { comment });
    await refresh();
  }
  // Corrects a student's own date/time entry mistake on a leave still
  // pending the HOD's decision — see leavecontrol.js hodCorrectDateTime.
  async function correctDateTime(
    id: string,
    input: { startDate: string; startTime: string; endDate: string; endTime: string }
  ) {
    await api.patch(`/hod/leaves/${id}/datetime`, input);
    await refresh();
  }

  // startTime/endTime are only required (and only meaningful) for a
  // mandatory category (Workshop) — see backend/controllers/eventcontrol.js
  // createEvent.
  async function addEvent(
    date: string,
    title: string,
    category: EventCategory,
    startTime?: string,
    endTime?: string
  ) {
    await api.post("/hod/events", { date, title, category, startTime, endTime });
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
    movements,
    loading,
    error,
    refresh,
    approve,
    reject,
    correctDateTime,
    addEvent,
    removeEvent,
    rejectOverlapping,
  };
}
