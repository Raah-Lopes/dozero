import type { ProceduralConfig } from "../types";

export const DEFAULT_CARTOGRAPHY: NonNullable<ProceduralConfig["cartography"]> =
  {
    mode: "relief",
    relief: 0.75,
    coast: 0.85,
    biomes: 0.7,
    texture: 0.45,
  };
export const smooth = (low: number, high: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};
/** North-west illumination of the existing elevation grid. Does not modify geography. */
export function reliefLight(
  elevation: Float32Array,
  size: number,
  width: number,
  height: number,
) {
  const light = new Float32Array(elevation.length);
  const at = (x: number, y: number) =>
    elevation[
      Math.max(0, Math.min(size - 1, y)) * size +
        Math.max(0, Math.min(size - 1, x))
    ];
  const aspectX = Math.min(width, height) / width,
    aspectY = Math.min(width, height) / height;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      // A weighted neighbourhood avoids abrupt lighting changes between grid cells.
      const dx =
        (at(x + 1, y - 1) +
          2 * at(x + 1, y) +
          at(x + 1, y + 1) -
          at(x - 1, y - 1) -
          2 * at(x - 1, y) -
          at(x - 1, y + 1)) /
        8;
      const dy =
        (at(x - 1, y + 1) +
          2 * at(x, y + 1) +
          at(x + 1, y + 1) -
          at(x - 1, y - 1) -
          2 * at(x, y - 1) -
          at(x + 1, y - 1)) /
        8;
      const nx = -dx * (size - 1) * 0.7 * aspectX,
        ny = -dy * (size - 1) * 0.7 * aspectY;
      const illumination =
        (-0.5 * nx - 0.5 * ny + Math.SQRT1_2) / Math.hypot(nx, ny, 1);
      light[y * size + x] = Math.max(
        0.55,
        Math.min(1.25, 1 + (illumination - Math.SQRT1_2) * 0.8),
      );
    }
  return light;
}
