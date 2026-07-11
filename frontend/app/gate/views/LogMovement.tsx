"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { useGatePortal } from "@/src/hooks/useGatePortal";
import styles from "../gate.module.css";

export function LogMovement({ portal }: { portal: ReturnType<typeof useGatePortal> }) {
  const { logMovement } = portal;
  const [indexNumber, setIndexNumber] = useState("");
  const [direction, setDirection] = useState<"Exit" | "Entry">("Exit");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(dir: "Exit" | "Entry") {
    if (!indexNumber.trim()) {
      setError("Enter student index number");
      return;
    }
    setError(null);
    try {
      await logMovement({ indexNumber: indexNumber.trim().toUpperCase(), direction: dir, notes: notes.trim() || undefined });
      setResult(`✅ ${dir} logged at ${new Date().toLocaleTimeString()} for ${indexNumber}`);
      setIndexNumber("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log movement");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-bold text-white">📝 Log Student Movement</h2>
      <div className="mb-3.5">
        <label className={styles.label}>Student Index Number</label>
        <input value={indexNumber} onChange={(e) => setIndexNumber(e.target.value)} placeholder="e.g. SC/2021/001" className={styles.input} />
      </div>
      <div className="mb-3.5">
        <label className={styles.label}>Direction</label>
        <select value={direction} onChange={(e) => setDirection(e.target.value as "Exit" | "Entry")} className={styles.input}>
          <option value="Exit">Exit (Leaving Campus)</option>
          <option value="Entry">Entry (Returning to Campus)</option>
        </select>
      </div>
      <div className="mb-4">
        <label className={styles.label}>Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any remarks…" className={styles.input} />
      </div>
      {error && <p className="mb-3 text-xs text-[#f87171]">{error}</p>}
      <div className="flex gap-2.5">
        <Button variant="danger" className="flex-1" onClick={() => handleSubmit("Exit")}>
          🚪 Log EXIT
        </Button>
        <Button variant="success" className="flex-1" onClick={() => handleSubmit("Entry")}>
          🏫 Log ENTRY
        </Button>
      </div>
      {result && <p className="mt-3.5 text-xs text-[var(--muted)]">{result}</p>}
    </Card>
  );
}
