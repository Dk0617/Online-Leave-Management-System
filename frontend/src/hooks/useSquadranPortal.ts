"use client";

import { useCallback, useEffect, useState } from "react";
import { api, normalizeLeave, normalizeMovement } from "@/src/api";
import { LeaveRequest, Movement } from "@/src/types";

export function useSquadranPortal() {
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, h, mov] = await Promise.all([
        api.get<Record<string, unknown>[]>("/squadran/leaves/pending"),
        api.get<Record<string, unknown>[]>("/squadran/leaves/history"),
        api.get<Record<string, unknown>[]>("/squadran/movements"),
      ]);
      setPending(p.map(normalizeLeave));
      setHistory(h.map(normalizeLeave));
      setMovements(mov.map(normalizeMovement));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Squadron data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function approve(id: string, comment?: string) {
    await api.patch(`/squadran/leaves/${id}/approve`, { comment });
    await refresh();
  }
  async function reject(id: string, comment?: string) {
    await api.patch(`/squadran/leaves/${id}/reject`, { comment });
    await refresh();
  }

  return { pending, history, movements, loading, error, refresh, approve, reject };
}
