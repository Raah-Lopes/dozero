import { MapAnnotation, MapProject } from "../types";
import { LocationMarker } from "./LocationIcon";
export const layerOf = (a: MapAnnotation) =>
  a.layer ||
  (["wall", "door"].includes(a.type)
    ? "paredes"
    : a.type === "symbol"
      ? "símbolos"
      : a.type === "light"
        ? "luzes"
        : "desenhos");
export const layers = [
  "base",
  "desenhos",
  "símbolos",
  "paredes",
  "luzes",
  "locais",
];
export const orderedAnnotations = (items: MapAnnotation[]) =>
  [...items].sort(
    (a, b) => layers.indexOf(layerOf(a)) - layers.indexOf(layerOf(b)),
  );
export function MapPatterns() {
  return (
    <defs>
      <pattern id="grass" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#527347" />
        <path
          d="M 4 14 l 2 -6 l 3 6 M 16 22 l 2 -5 l 2 5"
          stroke="#789854"
          fill="none"
        />
      </pattern>
      <pattern id="stone" width="50" height="36" patternUnits="userSpaceOnUse">
        <rect width="50" height="36" fill="#777674" />
        <path
          d="M 0 0 H 50 M 0 18 H 50 M 0 36 H 50 M 25 0 V 18 M 0 18 V 36 M 50 18 V 36"
          stroke="#494847"
          strokeWidth="2"
        />
      </pattern>
      <pattern id="wood" width="24" height="48" patternUnits="userSpaceOnUse">
        <rect width="24" height="48" fill="#966e43" />
        <path
          d="M 0 0 V 48 M 24 0 V 48 M 0 25 H 24 M 5 0 L 7 23 M 16 26 L 18 48"
          stroke="#6c4b30"
        />
      </pattern>
      <pattern id="water" width="40" height="24" patternUnits="userSpaceOnUse">
        <rect width="40" height="24" fill="#2e6e96" />
        <path
          d="M 0 8 Q 10 0 20 8 T 40 8 M 5 21 Q 15 13 25 21 T 45 21"
          fill="none"
          stroke="#5a9cb6"
        />
      </pattern>
    </defs>
  );
}
export function AnnotationShape({
  a,
  width,
  height,
}: {
  a: MapAnnotation;
  width: number;
  height: number;
}) {
  const x = (a.x * width) / 100,
    y = (a.y * height) / 100,
    x2 = ((a.x2 || 0) * width) / 100,
    y2 = ((a.y2 || 0) * height) / 100,
    w = ((a.width || 0) * width) / 100,
    h = ((a.height || 0) * height) / 100;
  const common = {
    stroke: a.color,
    strokeWidth: a.strokeWidth,
    fill: a.material ? "url(#" + a.material + ")" : a.fill || "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (a.type === "text" || a.type === "symbol")
    return (
      <text
        x={x}
        y={y}
        fill={a.color}
        fontSize={a.fontSize || 24}
        fontFamily="Georgia,serif"
        transform={"rotate(" + (a.rotation || 0) + " " + x + " " + y + ")"}
      >
        {a.text}
      </text>
    );
  if (a.type === "rectangle")
    return <rect x={x} y={y} width={w} height={h} {...common} />;
  if (a.type === "circle")
    return <circle cx={x} cy={y} r={w / 2} {...common} />;
  if (a.type === "light")
    return (
      <g>
        <circle cx={x} cy={y} r={w / 2} fill={a.color} opacity=".18" />
        <circle cx={x} cy={y} r={5} fill={a.color} />
      </g>
    );
  if (a.type === "path")
    return (
      <polyline
        points={a.points
          ?.map((p) => (p.x * width) / 100 + "," + (p.y * height) / 100)
          .join(" ")}
        {...common}
      />
    );
  if (["line", "arrow", "wall", "door"].includes(a.type)) {
    const angle = Math.atan2(y2 - y, x2 - x),
      len = Math.max(12, a.strokeWidth * 4);
    return (
      <g>
        <line
          x1={x}
          y1={y}
          x2={x2}
          y2={y2}
          {...common}
          strokeDasharray={a.type === "door" ? "8 5" : undefined}
        />
        {a.type === "arrow" && (
          <path
            d={
              "M " +
              x2 +
              " " +
              y2 +
              " L " +
              (x2 - len * Math.cos(angle - 0.5)) +
              " " +
              (y2 - len * Math.sin(angle - 0.5)) +
              " L " +
              (x2 - len * Math.cos(angle + 0.5)) +
              " " +
              (y2 - len * Math.sin(angle + 0.5)) +
              " Z"
            }
            fill={a.color}
          />
        )}
      </g>
    );
  }
  return null;
}
export function Grid({ project }: { project: MapProject }) {
  const s = project.gridSize,
    w = project.imageWidth,
    h = project.imageHeight;
  if (project.gridType === "hex") {
    const r = s / 2,
      hh = Math.sqrt(3) * r;
    return (
      <g>
        <defs>
          <pattern
            id="hexgrid"
            width={r * 3}
            height={hh}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={
                "M " +
                r / 2 +
                " 0 L " +
                r * 1.5 +
                " 0 L " +
                r * 2 +
                " " +
                hh / 2 +
                " L " +
                r * 1.5 +
                " " +
                hh +
                " L " +
                r / 2 +
                " " +
                hh +
                " L 0 " +
                hh / 2 +
                " Z M " +
                r * 2 +
                " " +
                hh / 2 +
                " L " +
                r * 3 +
                " " +
                hh / 2
              }
              fill="none"
              stroke="#b79a65"
              strokeOpacity=".35"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#hexgrid)" />
      </g>
    );
  }
  return (
    <g>
      <defs>
        <pattern
          id="squaregrid"
          width={s}
          height={s}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={"M " + s + " 0 H 0 V " + s}
            fill="none"
            stroke="#b79a65"
            strokeOpacity=".35"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#squaregrid)" />
    </g>
  );
}
export function MapArtwork({
  project,
  annotations = true,
  locations = true,
  grid = false,
  base = true,
}: {
  project: MapProject;
  annotations?: boolean;
  locations?: boolean;
  grid?: boolean;
  base?: boolean;
}) {
  return (
    <>
      <MapPatterns />
      <rect
        width={project.imageWidth}
        height={project.imageHeight}
        fill="#172330"
      />
      {base && !project.hiddenLayers?.includes("base") && project.imageUrl && (
        <image
          href={project.imageUrl}
          width={project.imageWidth}
          height={project.imageHeight}
        />
      )}
      {grid && <Grid project={project} />}
      {annotations &&
        orderedAnnotations(project.annotations)
          .filter(
            (a) => !a.hidden && !project.hiddenLayers?.includes(layerOf(a)),
          )
          .map((a) => (
            <AnnotationShape
              key={a.id}
              a={a}
              width={project.imageWidth}
              height={project.imageHeight}
            />
          ))}
      {locations &&
        !project.hiddenLayers?.includes("locais") &&
        project.locations
          .filter((l) => !l.hidden)
          .map((l) => (
            <LocationMarker
              key={l.id}
              location={l}
              x={(l.x * project.imageWidth) / 100}
              y={(l.y * project.imageHeight) / 100}
            />
          ))}
    </>
  );
}
