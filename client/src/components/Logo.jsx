// Shield-with-plants mark. Strokes use currentColor so callers can set
// the final color via CSS (white on dark headers, etc.).

export default function Logo({ size = 24, strokeWidth = 1.4, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`logo ${className}`}
      aria-hidden="true"
    >
      {/* outer shield */}
      <path d="M24 4 C 19 7, 13 8, 7 8 L 7 22 C 7 32, 13 40, 24 44 C 35 40, 41 32, 41 22 L 41 8 C 35 8, 29 7, 24 4 Z" />
      {/* inner shield */}
      <path d="M24 8 C 20 10.5, 15 11.5, 10.5 11.5 L 10.5 22 C 10.5 30, 15.5 36.5, 24 40 C 32.5 36.5, 37.5 30, 37.5 22 L 37.5 11.5 C 33 11.5, 28 10.5, 24 8 Z" />

      {/* left sprout — stem, then two alternating leaves */}
      <path d="M19 34 L 19 22" />
      <path d="M19 28 C 15.5 27.5, 14.5 25, 16 24 C 17 25, 18.8 26.6, 19 28 Z" />
      <path d="M19 25 C 22 24.5, 22.8 22, 21.3 21 C 20.3 22, 19 23.5, 19 25 Z" />

      {/* right sprout — slightly taller */}
      <path d="M29 34 L 29 18" />
      <path d="M29 25 C 25.8 24.5, 24.8 22, 26.3 21 C 27.3 22, 28.8 23.6, 29 25 Z" />
      <path d="M29 22 C 32 21.5, 32.8 19, 31.3 18 C 30.3 19, 29 20.5, 29 22 Z" />
    </svg>
  );
}
