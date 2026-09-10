import type { BackgroundData } from "../store/backgrounds";
import type { MapProject } from "./types";

export function mapStudioVttUrl(roomCode: string) {
  return `/vtt.html?room=${encodeURIComponent(roomCode)}`;
}

export function mapStudioAssetName(projectName: string) {
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80) || "mapa";
  return `mapa_${safeName}.webp`;
}

export function createMapStudioBackground(
  project: MapProject,
  imageUrl: string,
  id = crypto.randomUUID(),
): BackgroundData {
  return {
    id: `map_studio_${id}`,
    name: project.name,
    imageUrl,
    x: Math.max(project.imageWidth / 2, 600),
    y: Math.max(project.imageHeight / 2, 400),
    width: project.imageWidth,
    height: project.imageHeight,
    scale: 1,
    opacity: 1,
    locked: false,
    hidden: false,
  };
}
