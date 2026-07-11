import { ButtonHTMLAttributes, ReactNode } from "react";

// ==================================================================
// Badge
// ==================================================================

type BadgeTone = "gray" | "amber" | "green" | "red" | "blue" | "purple";

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
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
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${BADGE_TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

// ==================================================================
// Button
// ==================================================================

type ButtonVariant = "primary" | "accent" | "secondary" | "success" | "danger" | "ghost";

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
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

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}

// ==================================================================
// Card / StatTile
// ==================================================================

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

const STAT_TILE_BAR_GRADIENTS: Record<string, string> = {
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
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${STAT_TILE_BAR_GRADIENTS[tone]}`} />
      {icon && <div className="mb-2 text-xl">{icon}</div>}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-extrabold ${toneClass}`}>{value}</p>
    </div>
  );
}

// ==================================================================
// Crest
// ==================================================================

// KDU crest badge — navy circle, gold ring, orange accents (matches the
// reference portal mockups' .kdu-crest / .sb-crest / .sl-crest).
export function Crest({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="31" fill="#0d1b5e" stroke="#e07b20" strokeWidth="3" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="#d4a017" strokeWidth="1" opacity="0.6" />
      <path
        d="M32 14 L46 19 V32 C46 41 40 47 32 50 C24 47 18 41 18 32 V19 Z"
        fill="#ffffff"
        stroke="#d4a017"
        strokeWidth="1.5"
      />
      <path d="M32 22 L32 40" stroke="#e07b20" strokeWidth="3" strokeLinecap="round" />
      <path d="M27 22 L37 22" stroke="#e07b20" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M32 14 C30 18 34 20 32 22 C30 20 34 18 32 14 Z"
        fill="#cc1f34"
      />
    </svg>
  );
}
