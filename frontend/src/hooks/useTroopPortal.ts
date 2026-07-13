"use client";

import { useCallback, useEffect, useState } from "react";
import { api, normalizeLeave } from "@/src/api";
import { LeaveRequest } from "@/src/types";

export function useTroopPortal() {
  const [allPending, setAllPending] = useState<LeaveRequest[]>([]);
  const [dayScholarPending, setDayScholarPending] = useState<LeaveRequest[]>([]);
  const [cadetPending, setCadetPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [records, setRecords] = useState<LeaveRequest[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Troop data");
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

  // Fetched on demand (not part of the main refresh) — this is a
  // system-wide, unbounded query covering every student's leaves, so it
  // only runs when the "All Records" tab is actually opened rather than on
  // every Troop dashboard load.
  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const raw = await api.get<Record<string, unknown>[]>("/troop/leaves/records");
      setRecords(raw.map(normalizeLeave));
      setRecordsLoaded(true);
    } catch (err) {
      setRecordsError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  return {
    allPending,
    dayScholarPending,
    cadetPending,
    history,
    records,
    recordsLoading,
    recordsLoaded,
    recordsError,
    loadRecords,
    loading,
    error,
    refresh,
    approve,
    reject,
  };
}
