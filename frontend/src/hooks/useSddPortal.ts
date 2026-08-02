"use client";

import { useCallback, useEffect, useState } from "react";
import { api, normalizeLeave, POLL_INTERVAL_MS } from "@/src/api";
import { LeaveRequest } from "@/src/types";

export function useSddPortal() {
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [overview, setOverview] = useState<LeaveRequest[]>([]);
  const [pipeline, setPipeline] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, h, o, pl] = await Promise.all([
        api.get<Record<string, unknown>[]>("/sdd/leaves/pending"),
        api.get<Record<string, unknown>[]>("/sdd/leaves/history"),
        api.get<Record<string, unknown>[]>("/sdd/leaves/overview"),
        api.get<Record<string, unknown>[]>("/sdd/leaves/pipeline"),
      ]);
      setPending(p.map(normalizeLeave));
      setHistory(h.map(normalizeLeave));
      setOverview(o.map(normalizeLeave));
      setPipeline(pl.map(normalizeLeave));
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

  async function approve(id: string, comment?: string) {
    await api.patch(`/sdd/leaves/${id}/approve`, { comment });
    await refresh();
  }
  async function reject(id: string, comment?: string) {
    await api.patch(`/sdd/leaves/${id}/reject`, { comment });
    await refresh();
  }

  return { pending, history, overview, pipeline, loading, error, refresh, approve, reject };
}
