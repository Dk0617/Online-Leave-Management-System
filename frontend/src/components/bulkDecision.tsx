"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/src/components/ui";

// Bulk approve / reject for the approver portals (HOD, Acting HOD, Troop,
// Squadron, SDD). The approver ticks several pending leaves, then one click
// applies the same decision to every ticked leave. Each leave still goes
// through the normal single-leave approve/reject call, so every server-side
// check (and the Acting HOD "I am" requirement) applies exactly as before.

export function useRowSelection(visibleIds: string[]) {
  const [picked, setPicked] = useState<string[]>([]);
  // Only ids still on screen count — a leave decided elsewhere, or hidden by
  // the search box, silently drops out of the selection.
  const selectedIds = picked.filter((id) => visibleIds.includes(id));
  const allSelected = visibleIds.length > 0 && selectedIds.length === visibleIds.length;

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleAll() {
    setPicked(allSelected ? [] : visibleIds);
  }
  function clear() {
    setPicked([]);
  }
  return { selectedIds, isSelected: (id: string) => selectedIds.includes(id), allSelected, toggle, toggleAll, clear };
}

export type RowSelection = ReturnType<typeof useRowSelection>;

export function SelectAllCheckbox({ selection, disabled }: { selection: RowSelection; disabled?: boolean }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      title="Select all"
      checked={selection.allSelected}
      disabled={disabled}
      onChange={selection.toggleAll}
      className="h-4 w-4 cursor-pointer accent-[var(--sky)]"
    />
  );
}

export function RowCheckbox({ selection, id }: { selection: RowSelection; id: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Select leave"
      checked={selection.isSelected(id)}
      onChange={() => selection.toggle(id)}
      className="h-4 w-4 cursor-pointer accent-[var(--sky)]"
    />
  );
}

export function BulkDecisionBar({
  selection,
  onApprove,
  onReject,
}: {
  selection: RowSelection;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, remarks: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);
  const count = selection.selectedIds.length;

  async function run(decision: "Approved" | "Rejected") {
    const ids = selection.selectedIds;
    setSubmitting(true);
    setResult(null);
    let done = 0;
    let firstError: string | null = null;
    // One at a time, so a failure on one leave doesn't stop the rest.
    for (const id of ids) {
      try {
        if (decision === "Approved") await onApprove(id);
        else await onReject(id, remarks.trim());
        done++;
      } catch (err) {
        firstError ??= err instanceof Error ? err.message : "Request failed";
      }
    }
    setSubmitting(false);
    setRejecting(false);
    setRemarks("");
    selection.clear();
    const verb = decision === "Approved" ? "approved" : "rejected";
    const failed = ids.length - done;
    setResult(
      failed === 0
        ? { text: `${done} leave${done === 1 ? "" : "s"} ${verb}.`, ok: true }
        : { text: `${done} ${verb}, ${failed} failed: ${firstError}`, ok: false }
    );
  }

  if (count === 0) {
    return result ? (
      <p className={`mb-3 text-xs font-bold ${result.ok ? "text-[var(--ok)]" : "text-[var(--err)]"}`}>{result.text}</p>
    ) : null;
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--sky)] bg-[var(--card2)] px-4 py-2.5">
      <span className="mr-2 text-sm font-bold text-[var(--white)]">{count} selected</span>
      {rejecting ? (
        <>
          <input
            autoFocus
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Reason for rejection (applies to all)"
            className="w-64 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-xs text-[var(--white)] outline-none focus:border-[var(--sky)]"
          />
          <Button variant="secondary" disabled={submitting} onClick={() => setRejecting(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={!remarks.trim() || submitting} onClick={() => run("Rejected")}>
            {submitting ? "Rejecting…" : `Confirm Reject (${count})`}
          </Button>
        </>
      ) : (
        <>
          <Button variant="success" disabled={submitting} onClick={() => run("Approved")}>
            <Check size={16} /> {submitting ? "Approving…" : `Approve (${count})`}
          </Button>
          <Button variant="danger" disabled={submitting} onClick={() => setRejecting(true)}>
            <X size={16} /> Reject ({count})
          </Button>
          <Button variant="ghost" disabled={submitting} onClick={selection.clear}>
            Clear
          </Button>
        </>
      )}
    </div>
  );
}
