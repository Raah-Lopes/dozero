import type { TerrainConfig } from "../types";
import { smooth } from "./terrainAppearance";

// Order: grass, forest, desert, rock, snow. Reuse the output for each pixel.
export function biomeWeights(
  terrain: TerrainConfig,
  altitude: number,
  moisture: number,
  transition: number,
  out: Float64Array,
) {
  const band = transition * 0.065,
    elevationBand = transition * 0.035;
  const above = (threshold: number, value: number, width: number) =>
    width > 0
      ? smooth(threshold - width, threshold + width, value)
      : Number(value > threshold);
  const desert =
    terrain.desertChance === 0
      ? 0
      : 1 -
        (band
          ? above(terrain.desertChance, moisture, band)
          : Number(moisture >= terrain.desertChance));
  const forest =
    terrain.forestDensity === 0
      ? 0
      : (1 - desert) *
        (1 -
          (band
            ? above(
                terrain.desertChance + terrain.forestDensity * 0.7,
                moisture,
                band,
              )
            : Number(
                moisture >= terrain.desertChance + terrain.forestDensity * 0.7,
              )));
  const rock = above(terrain.mountainLevel, altitude, elevationBand),
    snow = above(terrain.snowLevel, altitude, elevationBand);
  const lowland = (1 - rock) * (1 - snow);
  out[0] = (1 - desert - forest) * lowland;
  out[1] = forest * lowland;
  out[2] = desert * lowland;
  out[3] = rock * (1 - snow);
  out[4] = snow;
  return out;
}

/** Original repeating marks, varied by seed, in map-relative coordinates. */
export function biomeTexture(
  x: number,
  y: number,
  seed: number,
  weights: Float64Array,
) {
  x += (seed & 1023) / 16;
  y += ((seed >>> 10) & 1023) / 16;
  const cellX = Math.floor(x / 5),
    cellY = Math.floor(y / 5);
  let hash = Math.imul(cellX, 374761393) + Math.imul(cellY, 668265263) + seed;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
  const jitterX = ((hash & 255) / 255 - 0.5) * 1.3,
    jitterY = (((hash >>> 8) & 255) / 255 - 0.5) * 1.3;
  const dx = x - (cellX + 0.5) * 5 - jitterX,
    dy = y - (cellY + 0.5) * 5 - jitterY;
  // Offset canopies, fine grass strokes, dune ripples, rock hatching and snow grain.
  const canopy = Math.max(0, 1 - Math.hypot(dx, dy) / 2.2);
  const forest = canopy * 0.18 - 0.045;
  const grass =
    Math.sin(x * 3.1 + Math.sin(y * 1.7)) * Math.sin(y * 2.6) * 0.025;
  const desert = Math.sin(y * 2 + Math.sin(x * 0.24) * 2) * 0.055;
  const rock =
    Math.pow(Math.max(0, Math.sin(x * 1.5 + y * 2.1 + Math.sin(y * 0.5))), 8) *
      -0.12 +
    0.015;
  const snow = Math.sin(x * 2.7 + y) * Math.sin(y * 2.9 - x) * 0.018;
  return (
    weights[0] * grass +
    weights[1] * forest +
    weights[2] * desert +
    weights[3] * rock +
    weights[4] * snow
  );
}
