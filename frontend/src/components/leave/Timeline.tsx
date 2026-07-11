export interface TimelineStep {
  label: string;
  status: "done" | "active" | "wait" | "reject";
}

const DOT_CLASS: Record<TimelineStep["status"], string> = {
  done: "bg-[#22c55e] border-[#22c55e] text-white",
  active:
    "bg-[var(--blue)] border-[var(--sky)] text-white shadow-[0_0_0_4px_rgba(74,144,217,0.2)]",
  wait: "bg-[var(--card2)] text-[var(--muted)] border-[var(--border)]",
  reject: "bg-[#ef4444] border-[#ef4444] text-white",
};

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex items-start gap-0">
      {steps.map((s, i) => (
        <div key={i} className="relative flex flex-1 flex-col items-center">
          {i < steps.length - 1 && (
            <div className="absolute left-1/2 top-[14px] h-[2px] w-full bg-[var(--border)]" />
          )}
          <div
            className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold ${DOT_CLASS[s.status]}`}
          >
            {s.status === "done" ? "✓" : s.status === "reject" ? "✕" : i + 1}
          </div>
          <div className="mt-1.5 max-w-[70px] text-center text-[10px] text-[var(--muted)]">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
