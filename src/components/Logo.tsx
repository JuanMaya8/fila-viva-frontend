/** Fila Viva logo: same artwork as public/icon.svg (the favicon). */
export function Logo({ size = 42, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="fv-logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9A23B" />
          <stop offset="1" stopColor="#C2541F" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#fv-logo-gradient)" />
      <g fill="#FFFDF9">
        <circle cx="160" cy="200" r="44" />
        <circle cx="256" cy="200" r="44" opacity="0.8" />
        <circle cx="352" cy="200" r="44" opacity="0.55" />
        <rect x="112" y="300" width="288" height="40" rx="20" opacity="0.45" />
        <rect x="112" y="300" width="180" height="40" rx="20" />
      </g>
    </svg>
  );
}
