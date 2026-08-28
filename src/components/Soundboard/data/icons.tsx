import type { ReactNode } from "react";

const I: Record<string, ReactNode> = {
  d20: (
    <>
      <path d="M12 2 21 7v10l-9 5-9-5V7z" />
      <path d="M12 2v20M3.2 7.4 12 12l8.8-4.6M3.2 16.6 12 12l8.8 4.6" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.6" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  heart: (
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
  ),
  heartFill: (
    <path
      d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  pencil: <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />,
  volume: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 8.5 4.5L12 11 3.5 6.5Z" />
      <path d="m3.5 11.5 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
    </>
  ),
  upload: <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 20h16" />,
  download: <path d="M12 4v12m0 0 4-4m-4 4-4-4M4 20h16" />,
  keyboard: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" />
    </>
  ),
  dice: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  castle: (
    <>
      <path d="M5 21V9L7 7V4h2v2h2V4h2v2h2V4h2v3l2 2v12" />
      <path d="M3 21h18M10 21v-4a2 2 0 0 1 4 0v4" />
    </>
  ),
  skull: (
    <>
      <path d="M12 2a8 8 0 0 0-8 8c0 2.9 1.4 4.9 3 6v5h10v-5c1.6-1.1 3-3.1 3-6a8 8 0 0 0-8-8Z" />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 13.5l1.2 2.3h-2.4zM10 21v-2m4 2v-2" />
    </>
  ),
  tree: <path d="M12 2 6.5 9.5h3L5 16h5v5h4v-5h5l-4.5-6.5h3Z" />,
  city: (
    <>
      <path d="M3 21V9h5v12M8 21V3h7v18M15 21v-9h6v9M2 21h20" />
      <path d="M10.5 6.5h2M10.5 10h2M10.5 13.5h2" />
    </>
  ),
  note: (
    <>
      <path d="M9 18V5l10-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  wave: (
    <>
      <path d="M2 10c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
      <path d="M2 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
    </>
  ),
  sword: (
    <>
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6M16 16l4 4M19 21l2-2M5 19l4-4" />
    </>
  ),
  flame: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z" />,
  rain: (
    <>
      <path d="M17.5 14a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4 1.7A4 4 0 0 0 7 14Z" />
      <path d="M8 17.5v2M12 17.5v3M16 17.5v2" />
    </>
  ),
  wind: (
    <>
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
      <path d="M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2" />
    </>
  ),
  moon: <path d="M12 3a6.4 6.4 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  crown: <path d="M3 18h18M4 18 3 7l5 4 4-7 4 7 5-4-1 11" />,
  ship: (
    <>
      <path d="M3 14l9-2 9 2-2 6H5Z" />
      <path d="M12 3v9M12 4c3 .6 5 3.2 5 6.2" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 2c4 2 6 7 6 11l2.5 4-4.5-1-2 4.5-2-4.5L7.5 17 10 13c0-4 2-9 6-11Z" transform="translate(-2 0)" />
      <circle cx="12" cy="9" r="1.8" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </>
  ),
  paw: (
    <>
      <circle cx="7" cy="8.5" r="1.7" />
      <circle cx="12" cy="6.5" r="1.7" />
      <circle cx="17" cy="8.5" r="1.7" />
      <path d="M12 11.5c-3 0-5.5 2.6-5.5 5.2 0 1.6 1.2 2.8 2.7 2.8 1.1 0 1.9-.5 2.8-.5s1.7.5 2.8.5c1.5 0 2.7-1.2 2.7-2.8 0-2.6-2.5-5.2-5.5-5.2Z" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5Z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-4.5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M19.1 4.9 17 7m-10 10-2.1 2.1" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  drag: (
    <>
      <circle cx="9" cy="6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  zap: <path d="M13 2 3 14h7l-1 8 10-12h-7z" />,
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L6 23" />
    </>
  ),
  chevronR: <path d="m9 6 6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  headphones: (
    <>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <rect x="3" y="14" width="4" height="7" rx="1.5" />
      <rect x="17" y="14" width="4" height="7" rx="1.5" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  ghost: (
    <>
      <path d="M12 2a8 8 0 0 0-8 8v12l2.7-2 2.6 2 2.7-2 2.7 2 2.6-2 2.7 2V10a8 8 0 0 0-8-8Z" />
      <circle cx="9" cy="10" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17.5" cy="9" r="2.5" />
      <path d="M16.5 14.5c2.9.3 5 2.4 5 5.5" />
    </>
  ),
  power: (
    <>
      <path d="M12 2v8" />
      <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 12.5a10 10 0 0 1 14 0" />
      <path d="M8.5 15.5a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v5m4-5v5" />
    </>
  ),
  star: <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z" />,
  arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />,
  mountain: <path d="m8 3 4 8 5-5 5 15H2L8 3Z" />,
  snow: <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  door: (
    <>
      <path d="M4 21V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v17M2 21h20" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <path d="M12 9.5v5" />
    </>
  ),
  hourglass: <path d="M6 2h12M6 22h12M8 2v4l4 5 4-5V2M8 22v-4l4-5 4 5v4" />,
};

export function Icon({
  name,
  size = 18,
  className = "",
  sw = 1.7,
}: {
  name: string;
  size?: number;
  className?: string;
  sw?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {I[name] ?? I.dice}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(I).filter(
  (n) => !["heartFill", "chevronR", "arrowRight", "stop", "play", "pause"].includes(n)
);

export const SOUND_ICONS = [
  "castle", "skull", "tree", "city", "note", "wave", "sword", "flame", "rain", "wind",
  "moon", "crown", "ship", "rocket", "bell", "paw", "book", "ghost", "dice", "zap",
  "mountain", "snow", "compass", "mic", "door", "coin", "hourglass", "sparkle", "d20",
  "users", "eye", "headphones",
];
