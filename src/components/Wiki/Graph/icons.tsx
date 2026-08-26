import React from "react";

interface IconProps {
  className?: string;
}

const base = "inline-block shrink-0";

function svgProps(className?: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `${base} ${className ?? "w-4 h-4"}`,
    "aria-hidden": true,
  };
}

export const IPlus: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M12 5v14M5 12h14" /></svg>
);
export const ILink: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}>
    <path d="M10 13.5a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-5.6-5.6l-1.2 1.2" />
    <path d="M14 10.5a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 5.6 5.6l1.2-1.2" />
  </svg>
);
export const ITarget: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
);
export const IStats: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
);
export const IDownload: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
);
export const IUpload: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M12 15V3m0 0 4 4m-4-4-4 4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
);
export const ISearch: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IX: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const ITrash: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></svg>
);
export const IPencil: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="m14.5 5.5 4 4L7 21H3v-4L14.5 5.5Z" /><path d="m12.5 7.5 4 4" /></svg>
);
export const IEye: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
);
export const IEyeOff: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M4 4l16 16" /><path d="M9.9 5.9A10.4 10.4 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17.6 17.6 0 0 1-3.2 3.9M6.1 8.3A17 17 0 0 0 2 12s3.5 6.5 10 6.5c1.1 0 2.1-.2 3-.5" /></svg>
);
export const IBookmark: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4.5L5 21V5a1 1 0 0 1 1-1Z" /></svg>
);
export const IFlow: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>
);
export const IFit: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
);
export const ICluster: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><circle cx="12" cy="5" r="2.4" /><circle cx="5" cy="18" r="2.4" /><circle cx="19" cy="18" r="2.4" /><path d="M12 7.4v4m0 0-5.2 4.8M12 11.4l5.2 4.8" /></svg>
);
export const IRoute: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="5" r="2.2" /><path d="M8 19h6a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h5.8" strokeDasharray="3.5 2.5" /></svg>
);
export const IChevronR: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="m9 5 7 7-7 7" /></svg>
);
export const ISpark: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3Z" /><path d="M19 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z" /></svg>
);
export const IImage: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m4 19 6-6 4 4 3-3 3 3" /></svg>
);
export const IRestore: React.FC<IconProps> = ({ className }) => (
  <svg {...svgProps(className)}><path d="M3 5v5h5" /><path d="M3.5 10A8.5 8.5 0 1 1 3 14" /></svg>
);

/** Sigilo do Arcanum — losango com núcleo */
export const Sigil: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" fill="none" className={`${base} ${className ?? "w-6 h-6"}`} aria-hidden>
    <path d="M16 3 29 16 16 29 3 16Z" stroke="#d8b45a" strokeWidth="2" />
    <path d="M16 9.5 22.5 16 16 22.5 9.5 16Z" stroke="#5fd0c5" strokeWidth="1.2" opacity="0.8" />
    <circle cx="16" cy="16" r="2.4" fill="#d8b45a" />
  </svg>
);
