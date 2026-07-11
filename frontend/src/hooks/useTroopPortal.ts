"use client";

import { useCallback, useEffect, useState } from "react";
import { api, normalizeLeave } from "@/src/api";
import { LeaveRequest } from "@/src/types";

export function useTroopPortal() {
  const [allPending, setAllPending] = useState<LeaveRequest[]>([]);
  const [dayScholarPending, setDayScholarPending] = useState<LeaveRequest[]>([]);
  const [cadetPending, setCadetPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [all, ds, cd, hist] = await Promise.all([
        api.get<Record<string, unknown>[]>("/troop/leaves/pending"),
        api.get<Record<string, unknown>[]>("/troop/leaves/pending/dayscholar"),
        api.get<Record<string, unknown>[]>("/troop/leaves/pending/cadet"),
        api.get<Record<string, unknown>[]>("/troop/leaves/history"),
      ]);
      setAllPending(all.map(normalizeLeave));
      setDayScholarPending(ds.map(normalizeLeave));
      setCadetPending(cd.map(normalizeLeave));
      setHistory(hist.map(normalizeLeave));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function approve(id: string, comment?: string) {
    await api.patch(`/troop/leaves/${id}/approve`, { comment });
    await refresh();
  }
  async function reject(id: string, comment?: string) {
    await api.patch(`/troop/leaves/${id}/reject`, { comment });
    await refresh();
  }

  return {
    allPending,
    dayScholarPending,
    cadetPending,
    history,
    loading,
    refresh,
    approve,
    reject,
  };
}
