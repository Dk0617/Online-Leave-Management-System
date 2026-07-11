"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { normalizeLeave } from "@/src/lib/normalize";
import { LeaveRequest } from "@/src/types";

export function useSddPortal() {
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [overview, setOverview] = useState<LeaveRequest[]>([]);
  const [pipeline, setPipeline] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function approve(id: string, comment?: string) {
    await api.patch(`/sdd/leaves/${id}/approve`, { comment });
    await refresh();
  }
  async function reject(id: string, comment?: string) {
    await api.patch(`/sdd/leaves/${id}/reject`, { comment });
    await refresh();
  }

  return { pending, history, overview, pipeline, loading, refresh, approve, reject };
}
