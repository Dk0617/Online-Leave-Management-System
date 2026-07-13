"use client";

import { useCallback, useEffect, useState } from "react";
import { api, normalizeLeave } from "@/src/api";
import { LeaveRequest } from "@/src/types";

export function useHodPortal() {
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, h] = await Promise.all([
        api.get<Record<string, unknown>[]>("/hod/leaves/pending"),
        api.get<Record<string, unknown>[]>("/hod/leaves/history"),
      ]);
      setPending(p.map(normalizeLeave));
      setHistory(h.map(normalizeLeave));
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

  return { pending, history, loading, error, refresh, approve, reject };
}
