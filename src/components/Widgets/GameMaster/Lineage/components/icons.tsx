import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const IconPlus = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconChild = (p: P) => (
  <svg {...base(p)}><path d="M12 3v6M12 9c0 3-5 3-5 6v3M12 9c0 3 5 3 5 6v3" /><circle cx="12" cy="3.5" r="0.6" fill="currentColor" /></svg>
);

export const IconRings = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="13" r="5" /><circle cx="15" cy="11" r="5" /></svg>
);

export const IconQuill = (p: P) => (
  <svg {...base(p)}><path d="M20 4c-6 0-11 4-13 10l-3 6 6-3c6-2 10-7 10-13z" /><path d="M4 20L14 10" /></svg>
);

export const IconTrash = (p: P) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 12.2a1.5 1.5 0 0 0 1.5 1.3h6a1.5 1.5 0 0 0 1.5-1.3L17.5 7" /><path d="M10 11v6M14 11v6" /></svg>
);

export const IconSearch = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
);

export const IconX = (p: P) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);

export const IconUndo = (p: P) => (
  <svg {...base(p)}><path d="M8 5L4 9l4 4" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
);

export const IconRedo = (p: P) => (
  <svg {...base(p)}><path d="M16 5l4 4-4 4" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>
);

export const IconFit = (p: P) => (
  <svg {...base(p)}><path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" /><circle cx="12" cy="12" r="2" /></svg>
);

export const IconZoomIn = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2M8 11h6M11 8v6" /></svg>
);

export const IconZoomOut = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2M8 11h6" /></svg>
);

export const IconData = (p: P) => (
  <svg {...base(p)}><path d="M12 3v12M8 11l4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
);

export const IconUpload = (p: P) => (
  <svg {...base(p)}><path d="M12 15V4M8 8l4-4 4 4" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
);

export const IconFile = (p: P) => (
  <svg {...base(p)}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></svg>
);

export const IconImage = (p: P) => (
  <svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="1.5" /><circle cx="9" cy="9" r="1.6" /><path d="M4 17l5-5 4 4 3-3 4 4" /></svg>
);

export const IconUsers = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c.6-3.6 2.8-5.5 5.5-5.5s4.9 1.9 5.5 5.5" /><path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.9c1.7.8 2.7 2.5 3 5.1" /></svg>
);

export const IconLink = (p: P) => (
  <svg {...base(p)}><path d="M9.5 14.5l5-5" /><path d="M11 6.5L12.8 4.7a3.5 3.5 0 0 1 5 5L16 11.5M13 17.5l-1.8 1.8a3.5 3.5 0 0 1-5-5L8 12.5" /></svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}><path d="M4.5 12.5l5 5 10-11" /></svg>
);

export const IconSpark = (p: P) => (
  <svg {...base(p)}><path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z" /></svg>
);

export const IconCrown = (p: P) => (
  <svg {...base(p)}><path d="M4 17l-1-9 5 4 4-7 4 7 5-4-1 9z" /><path d="M4 20h16" /></svg>
);

export const IconGenerations = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="5" r="2.2" /><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="18" r="2.2" /><path d="M12 7.2V12M12 12l-6 4M12 12l6 4" /></svg>
);

export const IconHouse = (p: P) => (
  <svg {...base(p)}><path d="M4 21V9l8-5.5L20 9v12" /><path d="M9 21v-6h6v6" /><path d="M2.5 21h19" /></svg>
);

export const IconDagger = (p: P) => (
  <svg {...base(p)}><path d="M12 3v11M9.5 6.5h5" /><path d="M8 14h8M12 14v4l-1.5 3h3L12 18" /></svg>
);

export const IconHeart = (p: P) => (
  <svg {...base(p)}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
);

export const IconShield = (p: P) => (
  <svg {...base(p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);

export const IconSwords = (p: P) => (
  <svg {...base(p)}><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6 2 2-6M9.5 6.5L6.5 9.5M17.5 14.5L20.5 11.5M17.5 6.5L6 18v3h3l11.5-11.5M19 13l2-6-6-2M14.5 9.5l3-3M6.5 17.5l-3 3" /></svg>
);

export const IconFlame = (p: P) => (
  <svg {...base(p)}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.38 0 2.5-1.12 2.5-2.5 0-.74-.32-1.4-.83-1.85C11.75 11.8 11 10.5 11 9c0-1.5 1-3 3-5-1 4 2 5 2 8 0 3.31-2.69 6-6 6s-6-2.69-6-6c0-2.8 1.9-5.2 4.5-5.8-.3 1-.3 1.8 0 2.3z" /></svg>
);

export const IconBookOpen = (p: P) => (
  <svg {...base(p)}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
);

/** Sigilo da marca: escudo com a árvore de linhagem. */
export const BrandSigil = ({ size = 26, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...rest}>
    <path
      d="M16 2l11 5v9c0 7-4.6 11.6-11 14C9.6 27.6 5 23 5 16V7l11-5z"
      fill="#131a14"
      stroke="#c9a227"
      strokeWidth="1.6"
    />
    <path
      d="M16 8v14M16 12l-4-3M16 12l4-3M16 17l-5-3.5M16 17l5-3.5M11 25c1.5-2.5 3-4 5-4s3.5 1.5 5 4"
      stroke="#c9a227"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
