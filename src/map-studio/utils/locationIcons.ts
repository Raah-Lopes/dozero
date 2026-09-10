import type { LocationIconId, LocationType } from "../types";

// Stable identifiers belong to saved projects. Labels and artwork can evolve independently.
export const locationIcons: Record<
  LocationIconId,
  { label: string; color: string; legacy: string; path: string }
> = {
  city: {
    label: "Cidade",
    color: "#795337",
    legacy: "🏰",
    path: "M3 20V9h5v11m8 0V9h5v11M8 20V5h8v15M2 20h20M4 9V6m3 3V6m10 3V6m3 3V6M11 20v-5h2v5M11 8h2m-2 3h2",
  },
  town: {
    label: "Vila",
    color: "#806943",
    legacy: "🏘️",
    path: "M2 11l6-6 6 6M4 10v10h8V10M10 7l5-4 7 7m-9 0h7v10h-5M7 20v-5h3v5m7-8h1",
  },
  village: {
    label: "Aldeia",
    color: "#687446",
    legacy: "🏡",
    path: "M3 11l9-8 9 8M5 10v11h14V10M10 21v-7h4v7M8 11h1m6 0h1",
  },
  dungeon: {
    label: "Masmorra",
    color: "#81565d",
    legacy: "⚔️",
    path: "M4 21V11a8 8 0 0 1 16 0v10M3 21h18M8 21V11a4 4 0 0 1 8 0v10M8 15h8m-8 3h8M12 3v4M5 7l3 2m11-2-3 2M4 13h4m8 0h4",
  },
  forest: {
    label: "Floresta",
    color: "#3c745d",
    legacy: "🌲",
    path: "M9 3L3 11h3l-4 6h6v4m1-18 6 8h-3l4 6h-6M17 5l4 7h-2l3 6h-6m1 0v3",
  },
  mountain: {
    label: "Montanha",
    color: "#607282",
    legacy: "⛰️",
    path: "M2 20L10 4l9 16H2M7 10l3 3 3-3M15 12l3-5 5 13h-4",
  },
  river: {
    label: "Rio",
    color: "#317b90",
    legacy: "🌊",
    path: "M8 3c12 2-11 7 1 10s-4 7 0 8M15 3c12 2-11 7 1 10s-4 7 0 8",
  },
  lake: {
    label: "Lago",
    color: "#387590",
    legacy: "💧",
    path: "M4 8c-4 2-1 6 0 7-3 4 2 6 5 5 5 4 6-2 10-2 5-1 2-6-1-6 3-4-1-8-4-6-3-4-9-2-10 2ZM7 12h5m-2 4h7",
  },
  castle: {
    label: "Castelo",
    color: "#70515a",
    legacy: "🏯",
    path: "M3 21V6h3v3h3V6h6v3h3V6h3v15H3M9 21v-6a3 3 0 0 1 6 0v6M12 6V2l5 2-5 2M6 12v3m12-3v3",
  },
  temple: {
    label: "Templo",
    color: "#8a6942",
    legacy: "⛩️",
    path: "M2 9l10-6 10 6H2M4 12h16M6 12v7m6-7v7m6-7v7M3 19h18M2 22h20",
  },
  cave: {
    label: "Caverna",
    color: "#746555",
    legacy: "🕳️",
    path: "M2 21l3-12 6-6 7 4 4 14H2M7 21l1-8 4-4 4 4 2 8M6 9l3 2m7-2 3 2",
  },
  camp: {
    label: "Acampamento",
    color: "#876442",
    legacy: "⛺",
    path: "M3 21L12 5l9 16H3M12 5V2m0 3 2-3M8 21l4-8 4 8M12 13v8",
  },
  port: {
    label: "Porto",
    color: "#3f6b82",
    legacy: "⚓",
    path: "M12 7V3m-3 2a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12 8v13M7 10h10M3 14v4l3-2m15-2v4l-3-2M3 18c5 0 4 3 9 3s4-3 9-3",
  },
  bridge: {
    label: "Ponte",
    color: "#596d79",
    legacy: "🌉",
    path: "M2 10h20M4 7v10m16-10v10M4 17c1-9 15-9 16 0M2 21c3-3 5 3 8 0s5 3 8 0h4",
  },
  tower: {
    label: "Torre",
    color: "#66577f",
    legacy: "🗼",
    path: "M6 21l2-12H6V3h3v3h2V3h2v3h2V3h3v6h-2l2 12H6M8 9h8M11 21v-5h2v5M12 11v2",
  },
  ruins: {
    label: "Ruínas",
    color: "#756c60",
    legacy: "🏚️",
    path: "M3 21V9l4-2 2 4 4-5 2 4 5-2v13H3M3 9V4h5v3m8 2V3h4v5M8 21v-6m8 6v-4M13 10l-2 4 3 2-2 5",
  },
  custom: {
    label: "Referência",
    color: "#65716c",
    legacy: "📍",
    path: "M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6ZM12 10v4m-2-2h4",
  },
  entrance: {
    label: "Entrada",
    color: "#407b77",
    legacy: "🚪",
    path: "M10 4h11v17H10M2 12h13m-4-4 4 4-4 4M18 12v1",
  },
  room: {
    label: "Sala",
    color: "#806b44",
    legacy: "🗝️",
    path: "M14 11a5 5 0 1 0-5-5 5 5 0 0 0 5 5ZM10 10l-8 8v3h4v-3h3v-3l3-3M15 5h1",
  },
};
export const locationIconIds = Object.keys(locationIcons) as LocationIconId[];
export const locationTypes = locationIconIds.filter(
  (id) => id !== "entrance" && id !== "room",
) as LocationType[];
export const isLocationIconId = (value: unknown): value is LocationIconId =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(locationIcons, value);
export const locationTypeLabel = (type: string) =>
  isLocationIconId(type) ? locationIcons[type].label : type;
