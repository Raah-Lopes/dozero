import React from "react";

type P = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/* Sigilo — d20 dentro de um anel rúnico */
export const Sigil = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9.2" strokeDasharray="3.4 2.2" />
    <path d="M12 4.6 18.6 8.4v7.2L12 19.4 5.4 15.6V8.4L12 4.6Z" />
    <path d="M12 4.6v3.1M12 19.4v-3.2M5.4 8.4l3.4 1.8M18.6 8.4 15.2 10.2M5.4 15.6l3.4-1.9M18.6 15.6l-3.4-1.9" opacity=".75" />
    <path d="M12 7.7 15.2 10v4l-3.2 2.2L8.8 14v-4L12 7.7Z" />
  </svg>
);

export const CrossedSwords = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m4 4 6.2 6.2M4 4h3M4 4v3M20 4l-6.2 6.2M20 4h-3M20 4v3" />
    <path d="M10.5 13.5 5.5 18.5M13.5 13.5l5 5M4.5 17.5l2 2M19.5 17.5l-2 2" />
    <path d="m12 12-1.6-1.6M12 12l1.6-1.6" />
  </svg>
);

export const HeartPulse = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 20s-7.5-4.6-9-9.3C2 7.4 4 5 6.8 5c2 0 3.6 1.2 4.4 2.7h1.6C13.6 6.2 15.2 5 17.2 5 20 5 22 7.4 21 10.7c-.4 1.3-1.1 2.5-2 3.6" />
    <path d="M3 13h4l1.5-2.5 2 5L12.5 12H21" />
  </svg>
);

export const ScrollSpell = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 3.5h11a2 2 0 0 1 2 2V19a1.5 1.5 0 0 1-3 0V6.5" />
    <path d="M6 3.5A1.5 1.5 0 0 0 4.5 5v14A1.5 1.5 0 0 0 6 20.5h10" />
    <path d="M8 8.5h6M8 12h6M8 15.5h3.5" />
  </svg>
);

export const MacroBraces = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M8.5 3.5c-1.8 0-2.5 1-2.5 2.6v2.6c0 1.3-.8 2.2-2 2.6v1.4c1.2.4 2 1.3 2 2.6v2.6c0 1.6.7 2.6 2.5 2.6" />
    <path d="M15.5 3.5c1.8 0 2.5 1 2.5 2.6v2.6c0 1.3.8 2.2 2 2.6v1.4c-1.2.4-2 1.3-2 2.6v2.6c0 1.6-.7 2.6-2.5 2.6" />
    <path d="M12 9.2v.01M12 12v.01M12 14.8v.01" strokeWidth="2.4" />
  </svg>
);

export const Backpack = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 7.5V6a5 5 0 0 1 10 0v1.5" />
    <path d="M5.5 7.5h13A1.5 1.5 0 0 1 20 9v9.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M8 13h8v4.5a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V13ZM4 13h4M16 13h4M8 20.5V18M16 20.5V18" />
  </svg>
);

export const OpenBook = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 6.5c-1.8-1.6-4.5-2.2-8-2v13.6c3.5-.2 6.2.4 8 2 1.8-1.6 4.5-2.2 8-2V4.5c-3.5-.2-6.2.4-8 2Z" />
    <path d="M12 6.5v13.6" />
    <path d="M6.5 9h2.5M6.5 12.5h2.5M15 9h2.5M15 12.5h2.5" opacity=".8" />
  </svg>
);

export const Quill = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20 4c-5.5.6-10.2 3.4-12.6 8.2L6 16.5C9.5 17.6 15 16.5 17.8 12.5 20.2 9 20.4 6 20 4Z" />
    <path d="M4 20c2.5-4.5 6.5-8.6 11-11.5" />
    <path d="M4.5 15.5H8M6 19h3.5" opacity=".8" />
  </svg>
);

export const FrameGallery = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
    <path d="M3.5 15.5 9 11l4 4 3-2.5 4.5 3.5" />
    <circle cx="9" cy="8.7" r="1.3" />
    <path d="M3.5 4.5h2v2M20.5 4.5h-2v2M3.5 19.5h2v-2M20.5 19.5h-2v-2" opacity="0" />
  </svg>
);

export const ShieldBanner = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.5 19 6v5.5c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6l7-2.5Z" />
    <path d="M12 7.5v6.5M9.2 9.5h5.6" />
  </svg>
);

export const Coin = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="5" opacity=".7" />
    <path d="M12 9.2v5.6M10.4 10.6h2.4a1.2 1.2 0 0 1 0 2.4h-1.6a1.2 1.2 0 0 0 0 2.4h2.4" />
  </svg>
);

export const Scale = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 4v16M8 20h8M12 4c-2.4 0-4 .8-6.5 1.6M12 4c2.4 0 4 .8 6.5 1.6" />
    <path d="M5.5 5.6 3 11.5a3 3 0 0 0 5 0L5.5 5.6ZM18.5 5.6 16 11.5a3 3 0 0 0 5 0l-2.5-5.9Z" />
  </svg>
);

export const DiceD20 = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2.5 20.5 7.4v9.2L12 21.5 3.5 16.6V7.4L12 2.5Z" />
    <path d="M12 2.5v4.3M3.5 7.4l3.9 2M20.5 7.4l-3.9 2M12 21.5v-4.4M3.5 16.6l4-2.2M20.5 16.6l-4-2.2" opacity=".8" />
    <path d="M12 6.8 16 9.5v4.9L12 17.1 8 14.4V9.5l4-2.7Z" />
    <path d="m10.4 13.4 1.6-3 1.6 3h-3.2Z" fill="currentColor" stroke="none" opacity=".9" />
  </svg>
);

export const Plus = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const Minus = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 12h14" /></svg>
);
export const Trash = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5M6.5 6.5l.8 12.5a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12.5" />
    <path d="M10 10.5v6M14 10.5v6" />
  </svg>
);
export const Download = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15" /></svg>
);
export const Upload = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 19.5h15" /></svg>
);
export const Printer = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 8V3.5h10V8M7 17H4.5a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H17" />
    <rect x="7" y="14" width="10" height="6.5" rx="1" />
    <path d="M17 11h.01" strokeWidth="2.4" />
  </svg>
);
export const Camera = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 4.8h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
    <circle cx="12" cy="12.8" r="3.4" />
  </svg>
);
export const Eye = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);
export const EyeOff = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 4l16 16M9.9 5.2A9.6 9.6 0 0 1 12 5c6 0 9.5 7 9.5 7a17.6 17.6 0 0 1-3 3.9M6 7.2A16.8 16.8 0 0 0 2.5 12S6 19 12 19a9 9 0 0 0 3.5-.7" />
    <path d="M9.5 9.8a3 3 0 0 0 4.2 4.2" />
  </svg>
);
export const Close = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="m6 6 12 12M18 6 6 18" /></svg>
);
export const ChevronL = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="m14.5 5.5-6.5 6.5 6.5 6.5" /></svg>
);
export const ChevronR = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="m9.5 5.5 6.5 6.5-6.5 6.5" /></svg>
);
export const Sparkle = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.5c.6 3.8 2.7 5.9 6.5 6.5-3.8.6-5.9 2.7-6.5 6.5-.6-3.8-2.7-5.9-6.5-6.5 3.8-.6 5.9-2.7 6.5-6.5Z" />
    <path d="M18.5 15.5c.3 1.7 1.3 2.7 3 3-1.7.3-2.7 1.3-3 3-.3-1.7-1.3-2.7-3-3 1.7-.3 2.7-1.3 3-3Z" opacity=".8" />
  </svg>
);
export const Flame = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 21c3.9 0 6.5-2.5 6.5-6.2 0-2.6-1.4-4.4-2.7-6C14.5 7.2 13.6 5.5 13.5 3.5c-2.7 1.5-3.6 4-3.2 6.4-1-.3-1.7-1-2-2.2-1.1 1.4-1.8 3-1.8 4.9C6.5 17 8.6 21 12 21Z" />
    <path d="M12 21c-1.7 0-2.8-1.5-2.8-3.2 0-1.6 1-2.6 2.8-4 1.8 1.4 2.8 2.4 2.8 4C14.8 19.5 13.7 21 12 21Z" opacity=".75" />
  </svg>
);
export const Check = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="m4.5 12.5 5 5 10-11" /></svg>
);
export const RenewIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6M20 3.5v4h-4" />
  </svg>
);
