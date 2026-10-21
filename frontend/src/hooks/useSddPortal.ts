"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, normalizeLeave, normalizeMovement, POLL_INTERVAL_MS } from "@/src/api";
import { LeaveRequest, Movement } from "@/src/types";

export function useSddPortal() {
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [pipeline, setPipeline] = useState<LeaveRequest[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, h, pl, m] = await Promise.all([
        api.get<Record<string, unknown>[]>("/sdd/leaves/pending"),
        api.get<Record<string, unknown>[]>("/sdd/leaves/history"),
        api.get<Record<string, unknown>[]>("/sdd/leaves/pipeline"),
        api.get<Record<string, unknown>[]>("/sdd/movements"),
      ]);
      setPending(p.map(normalizeLeave));
      setHistory(h.map(normalizeLeave));
      setPipeline(pl.map(normalizeLeave));
      setMovements(m.map(normalizeMovement));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SDD data");
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

  // After a decision the leave is dropped from the list straight away, and
  // the full reload is debounced — so a bulk approve/reject of many leaves
  // triggers one reload at the end instead of one per leave.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function refreshSoon() {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => refresh(), 300);
  }

  async function approve(id: string, comment?: string) {
    await api.patch(`/sdd/leaves/${id}/approve`, { comment });
    setPending((prev) => prev.filter((l) => l.id !== id));
    refreshSoon();
  }
  async function reject(id: string, comment?: string) {
    await api.patch(`/sdd/leaves/${id}/reject`, { comment });
    setPending((prev) => prev.filter((l) => l.id !== id));
    refreshSoon();
  }

  return { pending, history, pipeline, movements, loading, error, refresh, approve, reject };
}
