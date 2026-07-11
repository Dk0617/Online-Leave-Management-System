import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] ${className}`}
    >
      {children}
    </div>
  );
}

const BAR_GRADIENTS: Record<string, string> = {
  default: "from-[var(--orange)] to-[var(--gold)]",
  amber: "from-[var(--orange)] to-[var(--gold)]",
  green: "from-[#22c55e] to-[#16a34a]",
  red: "from-[#a855f7] to-[#7c3aed]",
  blue: "from-[var(--blue)] to-[var(--sky)]",
};

export function StatTile({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "amber" | "green" | "red" | "blue";
  icon?: string;
}) {
  const toneClass =
    tone === "amber"
      ? "text-[#fbbf24]"
      : tone === "green"
      ? "text-[#4ade80]"
      : tone === "red"
      ? "text-[#f87171]"
      : tone === "blue"
      ? "text-[var(--sky)]"
      : "text-[var(--light)]";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${BAR_GRADIENTS[tone]}`} />
      {icon && <div className="mb-2 text-xl">{icon}</div>}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-extrabold ${toneClass}`}>{value}</p>
    </div>
  );
}
