// Minimal SVG icon set — 16px, 1.6 stroke, single color via currentColor.
// Keeps the app free of emoji, consistent across sections.

const PATHS = {
  signal: (
    <>
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12l9-9h7v7l-9 9-7-7z" />
      <circle cx="15" cy="7" r="1.2" />
    </>
  ),
  stats: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>
  ),
  news: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V11z" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </>
  ),
  chevronDown: (
    <>
      <path d="m6 9 6 6 6-6" />
    </>
  ),
  chevronRight: (
    <>
      <path d="m9 6 6 6-6 6" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  activity: (
    <>
      <path d="M22 12h-4l-3 9-6-18-3 9H2" />
    </>
  ),
  droplet: (
    <>
      <path d="M12 3s-7 7-7 12a7 7 0 0 0 14 0c0-5-7-12-7-12z" />
    </>
  ),
  flame: (
    <>
      <path d="M12 22a6 6 0 0 0 6-6c0-4-3-6-3-10 0 0-3 2-5 6-1-1-2-2-2-4 0 0-4 4-4 8a6 6 0 0 0 6 6z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 6-6 2 2-6 6-2z" />
    </>
  ),
  trendingUp: (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 16l.8 2.4L22 19l-2.2.6L19 22l-.8-2.4L16 19l2.2-.6L19 16z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
};

export default function Icon({ name, size = 16, strokeWidth = 1.6, className = '' }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon icon--${name} ${className}`}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
