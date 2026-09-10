import type { MapLocation } from "../types";
import { isLocationIconId, locationIcons } from "../utils/locationIcons";
import type { LabelPlacement } from "../utils/locationLabels";

type IconData = Pick<MapLocation, "icon" | "iconId" | "color">;
// One SVG vocabulary is shared by all UI surfaces and the export renderer.
export function LocationGlyph({
  location,
  selected = false,
}: {
  location: IconData;
  selected?: boolean;
}) {
  if (!isLocationIconId(location.iconId))
    return (
      <text data-legacy-icon x="16" y="27" fontSize="27" textAnchor="middle">
        {location.icon}
      </text>
    );
  const item = locationIcons[location.iconId];
  const base =
    location.color === "none" ? item.color : location.color || item.color;
  const hex = base.replace("#", "");
  const rgb =
    hex.length <= 4
      ? hex
          .slice(0, 3)
          .split("")
          .map((n) => parseInt(n + n, 16))
      : [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const ink =
    0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 155
      ? "#16242a"
      : "#fff3d4";
  return (
    <g data-icon-id={location.iconId}>
      <path
        d="M16 31 7 23A13 13 0 1 1 25 23Z"
        fill={base}
        stroke={selected ? "#ffd887" : "#17252b"}
        strokeWidth={selected ? 3 : 2}
        strokeLinejoin="round"
      />
      <circle
        cx="16"
        cy="14"
        r="11.3"
        fill="#101e2b"
        fillOpacity=".24"
        stroke="#f4e8c9"
        strokeWidth="1.1"
      />
      <path
        data-icon-symbol
        d={item.path}
        transform="translate(7 5) scale(.75)"
        stroke={ink}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="27" r="1" fill="#f4e8c9" />
    </g>
  );
}
export default function LocationIcon({
  location,
  size = 32,
  selected = false,
}: {
  location: IconData;
  size?: number;
  selected?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-2 -2 36 36"
      aria-hidden="true"
      className="shrink-0"
      style={{ overflow: "visible" }}
    >
      <LocationGlyph location={location} selected={selected} />
    </svg>
  );
}
export function LocationMarker({
  location,
  x,
  y,
  selected = false,
  scale = 1,
  label = { x: 0, y: -40, anchor: "middle" },
}: {
  location: MapLocation;
  x: number;
  y: number;
  selected?: boolean;
  scale?: number;
  label?: LabelPlacement | null;
}) {
  return (
    <g data-location-artwork transform={`translate(${x} ${y}) scale(${scale})`}>
      {selected && (
        <circle
          cx="0"
          cy="-17"
          r="23"
          fill="#ffc96b"
          fillOpacity=".12"
          stroke="#ffe0a0"
          strokeWidth="1.5"
        />
      )}
      <g transform="translate(-16 -32)">
        <LocationGlyph location={location} selected={selected} />
      </g>
      {label && (
        <text
          data-location-label
          x={label.x}
          y={label.y}
          textAnchor={label.anchor}
          fontFamily="Georgia,serif"
          fontSize="18"
          fill="#fff3d4"
          stroke="#17252b"
          strokeWidth="3"
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          {location.name}
        </text>
      )}
    </g>
  );
}
