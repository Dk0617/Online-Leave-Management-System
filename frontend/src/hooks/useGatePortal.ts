"use client";

import { useCallback, useEffect, useState } from "react";
import { api, normalizeLeave, normalizeMovement } from "@/src/api";
import { LeaveRequest, Movement } from "@/src/types";

export interface VerifyResult {
  found: boolean;
  valid?: boolean;
  reason?: "not_active" | "not_approved";
  leave?: Record<string, unknown>;
  studentPhoto?: string;
}

export function useGatePortal() {
  const [approvedLeaves, setApprovedLeaves] = useState<LeaveRequest[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leavesRaw, movRaw] = await Promise.all([
        api.get<Record<string, unknown>[]>("/gate/leaves"),
        api.get<Record<string, unknown>[]>("/gate/movements"),
      ]);
      setApprovedLeaves(leavesRaw.map(normalizeLeave));
      setMovements(movRaw.map(normalizeMovement));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gate data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function verify(indexNumber: string): Promise<VerifyResult> {
    return api.get<VerifyResult>(`/gate/verify/${encodeURIComponent(indexNumber)}`);
  }

  async function verifyByCode(code: string): Promise<VerifyResult> {
    return api.get<VerifyResult>(`/gate/verify-code/${encodeURIComponent(code)}`);
  }

  async function logMovement(input: {
    indexNumber: string;
    direction: "Exit" | "Entry";
    leaveId?: string;
    notes?: string;
  }) {
    await api.post("/gate/movements", input);
    await refresh();
  }

  async function clearMovementLog() {
    await api.delete("/gate/movements");
    await refresh();
  }

  return { approvedLeaves, movements, loading, error, refresh, verify, verifyByCode, logMovement, clearMovementLog };
}
