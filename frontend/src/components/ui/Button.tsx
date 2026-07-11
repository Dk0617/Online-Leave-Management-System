import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "success" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-[var(--navy)] to-[var(--blue)] text-white shadow-[0_6px_20px_rgba(13,27,94,0.4)] hover:brightness-110",
  accent:
    "bg-gradient-to-br from-[var(--orange)] to-[var(--orange2)] text-white shadow-[0_6px_20px_rgba(224,123,32,0.35)] hover:brightness-110",
  secondary:
    "bg-[var(--card2)] text-[var(--white)] ring-1 ring-inset ring-[var(--border)] hover:bg-[rgba(74,144,217,0.12)]",
  success:
    "bg-[rgba(34,197,94,0.12)] text-[#4ade80] ring-1 ring-inset ring-[rgba(34,197,94,0.4)] hover:bg-[rgba(34,197,94,0.25)]",
  danger:
    "bg-[rgba(239,68,68,0.12)] text-[#f87171] ring-1 ring-inset ring-[rgba(239,68,68,0.4)] hover:bg-[rgba(239,68,68,0.25)]",
  ghost:
    "bg-transparent text-[var(--muted)] ring-1 ring-inset ring-[var(--border)] hover:text-[var(--white)] hover:border-[rgba(74,144,217,0.4)]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}
