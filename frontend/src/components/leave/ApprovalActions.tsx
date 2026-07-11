"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

export function ApprovalActions({
  onApprove,
  onReject,
}: {
  onApprove: () => void;
  onReject: (remarks: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [remarks, setRemarks] = useState("");

  if (rejecting) {
    return (
      <div className="flex w-56 flex-col gap-2">
        <input
          autoFocus
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Reason for rejection"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card2)] px-2 py-1.5 text-xs text-[var(--white)] outline-none focus:border-[var(--sky)]"
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setRejecting(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!remarks.trim()}
            onClick={() => onReject(remarks.trim())}
          >
            Confirm Reject
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button variant="danger" onClick={() => setRejecting(true)}>
        Reject
      </Button>
      <Button variant="success" onClick={onApprove}>
        Approve
      </Button>
    </div>
  );
}
