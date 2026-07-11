"use client";

import { DashboardShell } from "@/src/components/layout/DashboardShell";
import { LeaveTable } from "@/src/components/leave/LeaveTable";
import { ApprovalActions } from "@/src/components/leave/ApprovalActions";
import { StatTile } from "@/src/components/ui/Card";
import { useAuth } from "@/src/context/AuthContext";
import { useLeaves } from "@/src/context/LeaveContext";
import { pendingForRole } from "@/src/lib/workflow";

export default function SquadranPage() {
  const { user } = useAuth();
  const { leaves, approveStage, rejectStage } = useLeaves();

  if (!user) return null;

  const pending = pendingForRole(leaves, "SQUADRAN");
  const decidedByMe = leaves.filter((l) =>
    l.history.some((h) => h.stage === "SQUADRAN" && h.actorName === user.name)
  );

  return (
    <DashboardShell
      role="SQUADRAN"
      title="Squadron Commander Dashboard"
      subtitle={`${user.name} · ${
        user.squadron ?? "Squadron"
      } — reviews cadet requests after Troop Commander approval`}
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Pending your approval" value={pending.length} tone="amber" />
        <StatTile label="Reviewed by you" value={decidedByMe.length} />
        <StatTile
          label="Rejected by you"
          value={
            decidedByMe.filter((l) => l.overallStatus === "REJECTED").length
          }
          tone="red"
        />
      </div>

      <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Pending Your Approval
      </h2>
      <LeaveTable
        leaves={pending}
        emptyMessage="No cadet leave requests waiting on you."
        renderActions={(leave) => (
          <ApprovalActions
            onApprove={() => approveStage(leave.id, user)}
            onReject={(remarks) => rejectStage(leave.id, user, remarks)}
          />
        )}
      />

      <h2 className="mb-3 mt-8 text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Previously Reviewed
      </h2>
      <LeaveTable
        leaves={decidedByMe}
        emptyMessage="You haven't reviewed any requests yet."
      />
    </DashboardShell>
  );
}
