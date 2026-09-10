import { renderToStaticMarkup } from "react-dom/server";
import { MapArtwork } from "../components/MapDrawing";
import { MapProject } from "../types";
export interface RenderOptions {
  locations: boolean;
  annotations: boolean;
  grid: boolean;
  scale: number;
  format: "png" | "jpeg" | "webp" | "svg";
  quality: number;
}
export function mapSvg(
  project: MapProject,
  options: RenderOptions,
  region?: { x: number; y: number; width: number; height: number },
) {
  const r = region || {
    x: 0,
    y: 0,
    width: project.imageWidth,
    height: project.imageHeight,
  };
  return renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={Math.round(r.width * options.scale)}
      height={Math.round(r.height * options.scale)}
      viewBox={[r.x, r.y, r.width, r.height].join(" ")}
    >
      <MapArtwork
        project={project}
        locations={options.locations}
        annotations={options.annotations}
        grid={options.grid}
      />
    </svg>,
  );
}
export async function renderMap(
  project: MapProject,
  options: RenderOptions,
  region?: { x: number; y: number; width: number; height: number },
): Promise<Blob> {
  const width = Math.round(
      (region?.width || project.imageWidth) * options.scale,
    ),
    height = Math.round(
      (region?.height || project.imageHeight) * options.scale,
    );
  const svg = mapSvg(project, options, region);
  if (options.format === "svg")
    return new Blob([svg], { type: "image/svg+xml" });
  if (width * height > 64000000 || width > 16000 || height > 16000)
    throw new Error(
      "A saída excede 64 megapixels ou 16.000 pixels por lado. Reduza a escala ou exporte em regiões.",
    );
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          new Error("Falha ao renderizar. Reduza a escala e tente novamente."),
        );
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Não foi possível reservar memória para exportação.");
    ctx.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(new Error("Não foi possível exportar a imagem.")),
        "image/" + options.format,
        options.quality,
      ),
    );
    canvas.width = 0;
    canvas.height = 0;
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function exportVTT(project: MapProject) {
  const grid = project.gridSize;
  const rasterProject = {
    ...project,
    annotations: project.annotations.filter((a) => a.type !== "light"),
  };
  const blob = await renderMap(rasterProject, {
    format: "png",
    scale: 1,
    quality: 1,
    annotations: true,
    locations: false,
    grid: false,
  });
  const image = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  const walls = project.annotations.filter(
    (a) =>
      a.type === "wall" &&
      !a.hidden &&
      !project.hiddenLayers?.includes(a.layer || "paredes"),
  );
  const point = (x: number, y: number) => ({
    x: ((x / 100) * project.imageWidth) / grid,
    y: ((y / 100) * project.imageHeight) / grid,
  });
  return {
    format: 0.2,
    resolution: {
      map_origin: { x: 0, y: 0 },
      map_size: { x: project.imageWidth / grid, y: project.imageHeight / grid },
      pixels_per_grid: grid,
    },
    line_of_sight: walls.map((a) => [
      point(a.x, a.y),
      point(a.x2 ?? a.x, a.y2 ?? a.y),
    ]),
    portals: project.annotations
      .filter(
        (a) =>
          a.type === "door" &&
          !a.hidden &&
          !project.hiddenLayers?.includes(a.layer || "paredes"),
      )
      .map((a) => ({
        position: point((a.x + (a.x2 ?? a.x)) / 2, (a.y + (a.y2 ?? a.y)) / 2),
        bounds: [point(a.x, a.y), point(a.x2 ?? a.x, a.y2 ?? a.y)],
        rotation: Math.atan2(
          ((a.y2 ?? a.y) - a.y) * project.imageHeight,
          ((a.x2 ?? a.x) - a.x) * project.imageWidth,
        ),
        closed: true,
        freestanding: false,
      })),
    lights: project.annotations
      .filter(
        (a) =>
          a.type === "light" &&
          !a.hidden &&
          !project.hiddenLayers?.includes(a.layer || "luzes"),
      )
      .map((a) => ({
        position: point(a.x, a.y),
        range: (((a.width || 0) / 200) * project.imageWidth) / grid,
        intensity: 1,
        color: "ff" + a.color.replace("#", "").slice(0, 6),
        shadows: true,
      })),
    environment: { baked_lighting: false, ambient_light: "ffffffff" },
    image,
  };
}
