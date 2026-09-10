import { MapAnnotation } from "../types";

type Point = { x: number; y: number };

export function resizeHandle(a: MapAnnotation): Point | null {
  if (a.type === "rectangle")
    return { x: a.x + (a.width || 0), y: a.y + (a.height || 0) };
  if (a.type === "circle" || a.type === "light")
    return { x: a.x + (a.width || 0) / 2, y: a.y };
  if (["line", "arrow", "wall", "door"].includes(a.type))
    return { x: a.x2 ?? a.x, y: a.y2 ?? a.y };
  if (a.type === "path" && a.points?.length)
    return {
      x: Math.max(...a.points.map((p) => p.x)),
      y: Math.max(...a.points.map((p) => p.y)),
    };
  return null;
}

export function resizeAnnotation(
  a: MapAnnotation,
  dx: number,
  dy: number,
  width: number,
  height: number,
): MapAnnotation {
  const handle = resizeHandle(a);
  if (!handle) return a;
  const x = Math.max(0, Math.min(100, handle.x + dx));
  const y = Math.max(0, Math.min(100, handle.y + dy));
  if (a.type === "rectangle")
    return {
      ...a,
      width: Math.max(100 / width, x - a.x),
      height: Math.max(100 / height, y - a.y),
    };
  if (a.type === "circle" || a.type === "light") {
    const radius = Math.hypot((x - a.x) * width, (y - a.y) * height) / width;
    const limit = Math.min(
      a.x,
      100 - a.x,
      (a.y * height) / width,
      ((100 - a.y) * height) / width,
    );
    return { ...a, width: 2 * Math.max(0, Math.min(limit, radius)) };
  }
  if (a.type === "path" && a.points?.length) {
    const minX = Math.min(...a.points.map((p) => p.x)),
      minY = Math.min(...a.points.map((p) => p.y));
    const sx =
      handle.x === minX
        ? 1
        : Math.max(100 / width, x - minX) / (handle.x - minX);
    const sy =
      handle.y === minY
        ? 1
        : Math.max(100 / height, y - minY) / (handle.y - minY);
    const scale = (p: Point) => ({
      x: minX + (p.x - minX) * sx,
      y: minY + (p.y - minY) * sy,
    });
    return { ...a, ...scale(a), points: a.points.map(scale) };
  }
  return { ...a, x2: x, y2: y };
}
