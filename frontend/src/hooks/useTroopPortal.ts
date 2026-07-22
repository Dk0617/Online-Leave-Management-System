"use client";

import { useCallback, useEffect, useState } from "react";
import { api, normalizeLeave, normalizeMovement } from "@/src/api";
import { LeaveRequest, Movement } from "@/src/types";

export function useTroopPortal() {
  const [allPending, setAllPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [records, setRecords] = useState<LeaveRequest[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Day Scholar / Cadet pending are exact subsets of allPending (same
  // filters the backend's now-unused separate endpoints used to apply) —
  // deriving them here instead of fetching them separately cuts every
  // dashboard load and post-approve/reject refresh from 4 API round trips
  // down to 2.
  const dayScholarPending = allPending.filter((l) => l.studentType === "DAY_SCHOLAR");
  const cadetPending = allPending.filter((l) => l.studentType === "CADET");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, hist, mov] = await Promise.all([
        api.get<Record<string, unknown>[]>("/troop/leaves/pending"),
        api.get<Record<string, unknown>[]>("/troop/leaves/history"),
        api.get<Record<string, unknown>[]>("/troop/movements"),
      ]);
      setAllPending(all.map(normalizeLeave));
      setHistory(hist.map(normalizeLeave));
      setMovements(mov.map(normalizeMovement));
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
    movements,
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
