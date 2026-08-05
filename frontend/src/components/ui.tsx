import { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Search, XCircle } from "lucide-react";

// ==================================================================
// Badge
// ==================================================================

type BadgeTone = "gray" | "amber" | "green" | "red" | "blue" | "purple";

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  gray: "bg-[rgba(100,116,139,0.12)] text-[var(--muted)] ring-[rgba(100,116,139,0.2)]",
  amber: "bg-[rgba(245,158,11,0.12)] text-[var(--warn)] ring-[rgba(245,158,11,0.2)]",
  green: "bg-[rgba(34,197,94,0.12)] text-[var(--ok)] ring-[rgba(34,197,94,0.2)]",
  red: "bg-[rgba(239,68,68,0.12)] text-[var(--err)] ring-[rgba(239,68,68,0.2)]",
  blue: "bg-[rgba(74,144,217,0.12)] text-[var(--sky)] ring-[rgba(74,144,217,0.2)]",
  purple: "bg-[rgba(124,58,237,0.15)] text-[var(--purple)] ring-[rgba(124,58,237,0.3)]",
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
    "bg-gradient-to-br from-[var(--navy)] to-[var(--blue)] text-white shadow-[0_6px_20px_rgba(13,27,94,0.4)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_28px_rgba(13,27,94,0.5)]",
  accent:
    "bg-gradient-to-br from-[var(--orange)] to-[var(--orange2)] text-white shadow-[0_6px_20px_rgba(224,123,32,0.35)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_28px_rgba(224,123,32,0.45)]",
  secondary:
    "bg-[var(--card2)] text-[var(--white)] ring-1 ring-inset ring-[var(--border)] hover:bg-[rgba(74,144,217,0.12)]",
  success:
    "bg-[rgba(34,197,94,0.12)] text-[var(--ok)] ring-1 ring-inset ring-[rgba(34,197,94,0.4)] hover:bg-[rgba(34,197,94,0.25)]",
  danger:
    "bg-[rgba(239,68,68,0.12)] text-[var(--err)] ring-1 ring-inset ring-[rgba(239,68,68,0.4)] hover:bg-[rgba(239,68,68,0.25)]",
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
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_4px_16px_rgba(0,0,0,0.18)] ${className}`}
    >
      {children}
    </div>
  );
}

const STAT_TILE_BAR_GRADIENTS: Record<string, string> = {
  default: "from-[var(--orange)] to-[var(--gold)]",
  amber: "from-[var(--orange)] to-[var(--gold)]",
  green: "from-[#22c55e] to-[#16a34a]",
  red: "from-[#ef4444] to-[#b91c1c]",
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
  icon?: ReactNode;
}) {
  const toneClass =
    tone === "amber"
      ? "text-[var(--warn)]"
      : tone === "green"
      ? "text-[var(--ok)]"
      : tone === "red"
      ? "text-[var(--err)]"
      : tone === "blue"
      ? "text-[var(--sky)]"
      : "text-[var(--white)]";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${STAT_TILE_BAR_GRADIENTS[tone]}`} />
      {icon && <div className="mb-2 text-[var(--muted)]">{icon}</div>}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-extrabold ${toneClass}`}>{value}</p>
    </div>
  );
}

// ==================================================================
// Toast
// ==================================================================

type ToastTone = "green" | "red";

// Solid, saturated fills (not the low-opacity tints used elsewhere in the
// app) — this one needs to grab the eye immediately since it's the only
// confirmation the approver gets naming who they just decided on before the
// row vanishes from the pending list.
const TOAST_TONE_CLASSES: Record<ToastTone, string> = {
  green:
    "bg-gradient-to-r from-[#15803d] to-[#22c55e] ring-2 ring-[rgba(255,255,255,0.3)] shadow-[0_10px_30px_rgba(21,128,61,0.5)]",
  red: "bg-gradient-to-r from-[#b91c1c] to-[#ef4444] ring-2 ring-[rgba(255,255,255,0.3)] shadow-[0_10px_30px_rgba(185,28,28,0.5)]",
};

const TOAST_TONE_ICON: Record<ToastTone, typeof CheckCircle2> = {
  green: CheckCircle2,
  red: XCircle,
};

// A transient confirmation banner — see useDecisionToast, used by every
// approver portal to confirm which student's leave was just decided (the
// row itself just silently disappears from the pending list otherwise).
export function Toast({ message, tone = "green" }: { message: string; tone?: ToastTone }) {
  const Icon = TOAST_TONE_ICON[tone];
  return (
    <div
      className={`toastIn mb-4 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold text-white ${TOAST_TONE_CLASSES[tone]}`}
    >
      <Icon size={20} className="shrink-0" />
      <span>{message}</span>
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

// ==================================================================
// SearchInput
// ==================================================================

// A text box with a leading search icon, replacing the inline "🔍
// Search..." boxes that used to be copy-pasted per table (see
// hooks/useTableControls.ts's useSearchFilter for the matching filter
// logic). Styled to match the `.input` class already duplicated across
// portal.module.css/admin.module.css/student.module.css.
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border)] bg-[rgba(74,144,217,0.06)] py-2.5 pl-9 pr-3 text-[13px] text-[var(--white)] outline-none focus:border-[var(--sky)]"
      />
    </div>
  );
}

// ==================================================================
// SortableTh
// ==================================================================

// A <th> that toggles sort on click and shows the active direction — the
// presentational half of the sort pattern in hooks/useTableControls.ts
// (useSort/sortRows). Renders as a plain <th> so each table's own CSS
// module `.table th` rule (uppercase, color, spacing) still applies via
// the cascade — this only adds the click affordance and indicator icon.
export function SortableTh({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
}: {
  label: ReactNode;
  sortKey: string;
  activeSortKey?: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
}) {
  const isActive = activeSortKey === sortKey;
  const Icon = isActive ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th onClick={() => onSort(sortKey)} className="cursor-pointer select-none hover:text-[var(--white)]">
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon size={12} className={isActive ? "text-[var(--sky)]" : "opacity-40"} />
      </span>
    </th>
  );
}
