import { ReactNode } from "react";

type Tone = "gray" | "amber" | "green" | "red" | "blue" | "purple";

const TONE_CLASSES: Record<Tone, string> = {
  gray: "bg-[rgba(100,116,139,0.12)] text-[#94a3b8] ring-[rgba(100,116,139,0.2)]",
  amber: "bg-[rgba(245,158,11,0.12)] text-[#fbbf24] ring-[rgba(245,158,11,0.2)]",
  green: "bg-[rgba(34,197,94,0.12)] text-[#4ade80] ring-[rgba(34,197,94,0.2)]",
  red: "bg-[rgba(239,68,68,0.12)] text-[#f87171] ring-[rgba(239,68,68,0.2)]",
  blue: "bg-[rgba(74,144,217,0.12)] text-[var(--sky)] ring-[rgba(74,144,217,0.2)]",
  purple: "bg-[rgba(124,58,237,0.15)] text-[#c4b5fd] ring-[rgba(124,58,237,0.3)]",
};

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
