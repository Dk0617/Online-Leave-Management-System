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
