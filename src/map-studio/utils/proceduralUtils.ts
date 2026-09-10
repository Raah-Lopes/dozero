import {
  ProceduralConfig,
  MapLocation,
  MapAnnotation,
  MapStyle,
} from "../types";
import { locationIcons } from "./locationIcons";
import { reliefLight, smooth } from "./terrainAppearance";
import { biomeWeights, biomeTexture } from "./biomeAppearance";
import { naturalRoad, smoothRoutes } from "./naturalRoutes";
export const GENERATOR_VERSION = 2;
export function hashSeed(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function random(seed: string) {
  let a = hashSeed(seed);
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const palettes: Record<MapStyle, string[]> = {
  fantasy: [
    "#102b48",
    "#277cb0",
    "#e4d299",
    "#669247",
    "#356b40",
    "#817d6e",
    "#e7edf0",
  ],
  medieval: [
    "#4c645f",
    "#7c9a87",
    "#d4bd83",
    "#9aab6c",
    "#5a7555",
    "#80745b",
    "#e0d8b6",
  ],
  "sci-fi": [
    "#111835",
    "#244b88",
    "#33b6c5",
    "#725eaa",
    "#455183",
    "#ac718d",
    "#d2e6fa",
  ],
  nautical: [
    "#123f58",
    "#378f9a",
    "#eee3b9",
    "#a6b789",
    "#647c6c",
    "#9c9a81",
    "#fff3d0",
  ],
  dungeon: [
    "#211f2f",
    "#34334a",
    "#89795f",
    "#6c7562",
    "#49534f",
    "#817977",
    "#cdc4b3",
  ],
  world: [
    "#132b43",
    "#286c9d",
    "#c3b987",
    "#78a357",
    "#426e3c",
    "#887f6e",
    "#ffffff",
  ],
  modern: [
    "#102738",
    "#356c91",
    "#d3c9a3",
    "#8baf80",
    "#487153",
    "#8b969e",
    "#ffffff",
  ],
  custom: [
    "#25283b",
    "#565f8b",
    "#ddc0ab",
    "#9dba86",
    "#628570",
    "#a48992",
    "#faf3e8",
  ],
};
const rgb = (hex: string) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
function noise(x: number, y: number, seed: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy;
  const n = (a: number, b: number) => {
    let k = Math.imul(a, 374761393) + Math.imul(b, 668265263) + seed;
    k = Math.imul(k ^ (k >>> 13), 1274126177);
    return ((k ^ (k >>> 16)) >>> 0) / 4294967295;
  };
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  return (
    (n(ix, iy) * (1 - sx) + n(ix + 1, iy) * sx) * (1 - sy) +
    (n(ix, iy + 1) * (1 - sx) + n(ix + 1, iy + 1) * sx) * sy
  );
}
export function validateConfig(c: ProceduralConfig) {
  if (
    c.routeStyle !== undefined &&
    !["classic", "natural"].includes(c.routeStyle)
  )
    throw new Error("Estilo de caminhos inválido.");
  if (
    c.cartography &&
    (!["classic", "relief"].includes(c.cartography.mode) ||
      ![
        c.cartography.relief,
        c.cartography.coast,
        c.cartography.biomes ?? 0,
        c.cartography.texture ?? 0,
      ].every((v) => Number.isFinite(v) && v >= 0 && v <= 1))
  )
    throw new Error(
      "Acabamento cartográfico inválido. Use intensidades entre 0 e 1.",
    );
  if (
    !Number.isInteger(c.width) ||
    !Number.isInteger(c.height) ||
    c.width < 500 ||
    c.height < 500 ||
    c.width > 8000 ||
    c.height > 8000 ||
    c.width * c.height > 32000000
  )
    throw new Error(
      "Use dimensões entre 500 e 8.000 pixels, até 32 megapixels para geração.",
    );
  if (
    !Number.isFinite(c.terrain.octaves) ||
    c.terrain.octaves < 1 ||
    c.terrain.octaves > 8 ||
    !Number.isFinite(c.terrain.noiseScale) ||
    c.terrain.noiseScale < 1 ||
    c.terrain.noiseScale > 10
  )
    throw new Error("Configuração de relevo inválida.");
}
interface Terrain {
  elevation: Float32Array;
  size: number;
  imageData: ImageData;
}
function terrain(c: ProceduralConfig): Terrain {
  validateConfig(c);
  const size = 192,
    elevation = new Float32Array(size * size),
    seed = hashSeed(c.seed),
    randomIsland = random(c.seed + "islands");
  const centers = Array.from({ length: 9 }, () => ({
    x: 0.12 + randomIsland() * 0.76,
    y: 0.12 + randomIsland() * 0.76,
    r: 0.09 + randomIsland() * 0.16,
  }));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const nx = x / (size - 1),
        ny = y / (size - 1);
      let v = 0,
        total = 0,
        amp = 1,
        freq = c.terrain.noiseScale;
      for (let o = 0; o < c.terrain.octaves; o++) {
        v += noise(nx * freq, ny * freq, seed + o * 1013) * amp;
        total += amp;
        amp *= 0.5;
        freq *= 2;
      }
      v /= total;
      const shape = c.shape || "island";
      if (shape === "island") {
        const edge = Math.pow(
          Math.hypot((nx - 0.5) * 1.55, (ny - 0.5) * 1.55),
          2,
        );
        v = v * 1.15 + 0.14 - edge * 0.7;
      } else if (shape === "archipelago") {
        const island = Math.max(
          ...centers.map((p) =>
            Math.max(0, 1 - Math.hypot(nx - p.x, ny - p.y) / p.r),
          ),
        );
        v = v * 0.45 + island * 0.65 - 0.08;
      } else if (shape === "continents") {
        v = v * 0.8 + noise(nx * 2.8, ny * 2.8, seed + 73) * 0.45 - 0.12;
      } else v = 0.32 + v * 0.62;
      elevation[y * size + x] = Math.max(0, Math.min(1, v));
    }
  const imageData = new ImageData(c.width, c.height),
    colors = (palettes[c.style] || palettes.fantasy).map(rgb),
    water = c.terrain.waterLevel;
  const desert = rgb(c.style === "sci-fi" ? "#c178a9" : "#c5a16a");
  const finish = c.cartography?.mode === "relief" ? c.cartography : undefined;
  const lighting = finish?.relief
    ? reliefLight(elevation, size, c.width, c.height)
    : undefined;
  const weights = new Float64Array(5),
    landColor = new Float64Array(3);
  const biomeColors = [colors[3], colors[4], desert, colors[5], colors[6]];
  const textureScale = 320 / Math.min(c.width, c.height);
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++) {
      const gx = (x / c.width) * (size - 1),
        gy = (y / c.height) * (size - 1),
        ix = Math.floor(gx),
        iy = Math.floor(gy),
        fx = gx - ix,
        fy = gy - iy;
      const at = (xx: number, yy: number) =>
        elevation[Math.min(size - 1, yy) * size + Math.min(size - 1, xx)];
      const z =
        (at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx) * (1 - fy) +
        (at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx) * fy;
      const moisture = noise((x / c.width) * 6, (y / c.height) * 6, seed + 443);
      let col: number[] | Float64Array = colors[3];
      if (z < water * 0.65) col = colors[0];
      else if (z < water) col = colors[1];
      else if (z < water + 0.025) col = colors[2];
      else if (z > c.terrain.snowLevel) col = colors[6];
      else if (z > c.terrain.mountainLevel) col = colors[5];
      else if (moisture < c.terrain.desertChance) col = desert;
      else if (
        moisture <
        c.terrain.desertChance + c.terrain.forestDensity * 0.7
      )
        col = colors[4];
      const hasBiomes =
        finish && (finish.biomes || finish.texture) && z >= water;
      if (hasBiomes) {
        biomeWeights(c.terrain, z, moisture, finish.biomes || 0, weights);
        for (let channel = 0; channel < 3; channel++) {
          landColor[channel] = 0;
          for (let biome = 0; biome < 5; biome++)
            landColor[channel] += biomeColors[biome][channel] * weights[biome];
        }
        if (finish.biomes && z >= water + 0.025) col = landColor;
      }
      let shade = 1 + (noise(x * 0.2, y * 0.2, seed) * 2 - 1) * 0.045;
      if (hasBiomes && finish.texture)
        shade *=
          1 +
          biomeTexture(x * textureScale, y * textureScale, seed, weights) *
            finish.texture *
            smooth(water + 0.008, water + 0.06, z);
      const i = (y * c.width + x) * 4;
      if (lighting && finish && z >= water) {
        const a = iy * size + ix,
          b = Math.min(iy + 1, size - 1) * size + ix;
        const light =
          (lighting[a] * (1 - fx) + lighting[a + 1] * fx) * (1 - fy) +
          (lighting[b] * (1 - fx) + lighting[b + 1] * fx) * fy;
        shade *=
          1 + (light - 1) * finish.relief * smooth(water, water + 0.055, z);
      }
      let from = col,
        to = col,
        blend = 0;
      if (finish?.coast) {
        if (z < water) {
          from = colors[0];
          to = colors[1];
          blend = smooth(water * 0.18, water, z);
        } else if (z < water + 0.06) {
          from = colors[2];
          to =
            hasBiomes && finish.biomes
              ? landColor
              : z > c.terrain.snowLevel
                ? colors[6]
                : z > c.terrain.mountainLevel
                  ? colors[5]
                  : moisture < c.terrain.desertChance
                    ? desert
                    : moisture <
                        c.terrain.desertChance + c.terrain.forestDensity * 0.7
                      ? colors[4]
                      : colors[3];
          blend = smooth(water + 0.008, water + 0.06, z);
        }
      }
      for (let channel = 0; channel < 3; channel++) {
        let value = col[channel];
        if (finish?.coast) {
          let coastal = from[channel] * (1 - blend) + to[channel] * blend;
          if (z < water)
            coastal +=
              (colors[2][channel] - coastal) *
              smooth(water - 0.012, water, z) *
              0.22;
          value += (coastal - value) * finish.coast;
        }
        imageData.data[i + channel] = value * shade;
      }
      imageData.data[i + 3] = 255;
    }
  return { size, elevation, imageData };
}
const names = [
  "Vale Claro",
  "Porto da Lua",
  "Pedra Alta",
  "Bosque Antigo",
  "Vila Aurora",
  "Torre do Vento",
  "Campo Dourado",
  "Refúgio Norte",
  "Ponte Velha",
  "Lago Sereno",
  "Fortaleza Cinzenta",
  "Vila das Brumas",
];
function place(c: ProceduralConfig, t: Terrain): MapLocation[] {
  const rng = random(c.seed + "locations"),
    land: Array<number> = [];
  for (let i = 0; i < t.elevation.length; i++)
    if (
      t.elevation[i] > c.terrain.waterLevel + 0.035 &&
      t.elevation[i] < Math.max(c.terrain.mountainLevel, 0.8)
    )
      land.push(i);
  const used = new Set<number>(),
    result: MapLocation[] = [];
  for (const [type, count, icon] of [
    ["city", c.features.cities, "🏰"],
    ["town", c.features.towns, "🏘️"],
    ["dungeon", c.features.dungeons, "⚔️"],
  ] as const) {
    for (let i = 0; i < Math.min(30, count) && land.length; i++) {
      let cell = land[Math.floor(rng() * land.length)],
        attempt = 0;
      while (used.has(cell) && attempt++ < 100)
        cell = land[Math.floor(rng() * land.length)];
      if (used.has(cell)) continue;
      used.add(cell);
      result.push({
        id: crypto.randomUUID(),
        name:
          names[Math.floor(rng() * names.length)] + " " + (result.length + 1),
        type,
        icon,
        iconId: type,
        color: locationIcons[type].color,
        description: "Local gerado em terreno firme.",
        notes: "",
        tags: [type, "procedural"],
        x: ((cell % t.size) / (t.size - 1)) * 100,
        y: (Math.floor(cell / t.size) / (t.size - 1)) * 100,
      });
    }
  }
  return result;
}
function routes(
  c: ProceduralConfig,
  t: Terrain,
  locations: MapLocation[],
): MapAnnotation[] {
  const annotations: MapAnnotation[] = [],
    s = t.size,
    water = c.terrain.waterLevel;
  const routeTerrain = {
    size: s,
    elevation: t.elevation,
    water,
    width: c.width,
    height: c.height,
  };
  const neighbors = (i: number) => {
    const x = i % s,
      y = Math.floor(i / s);
    return [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]
      .filter(([x, y]) => x >= 0 && y >= 0 && x < s && y < s)
      .map(([x, y]) => y * s + x);
  };
  const pt = (i: number) => ({
    x: ((i % s) / (s - 1)) * 100,
    y: (Math.floor(i / s) / (s - 1)) * 100,
  });
  if (c.features.roads) {
    const towns = locations.filter((l) => l.type !== "dungeon");
    for (let n = 1; n < towns.length; n++) {
      const toCell = (l: MapLocation) =>
        Math.round((l.y / 100) * (s - 1)) * s +
        Math.round((l.x / 100) * (s - 1));
      const from = toCell(towns[n - 1]),
        to = toCell(towns[n]),
        parents = new Int32Array(s * s).fill(-1),
        queue = [from];
      parents[from] = from;
      for (let i = 0; i < queue.length && parents[to] === -1; i++)
        for (const next of neighbors(queue[i]))
          if (parents[next] === -1 && t.elevation[next] > water + 0.02) {
            parents[next] = queue[i];
            queue.push(next);
          }
      if (parents[to] === -1) continue;
      const cells = [to];
      while (cells[cells.length - 1] !== from)
        cells.push(parents[cells[cells.length - 1]]);
      cells.reverse();
      const routeCells =
        c.routeStyle === "natural"
          ? naturalRoad(from, to, routeTerrain) || cells
          : cells;
      const points = routeCells
        .filter(
          (v, i) =>
            c.routeStyle === "natural" ||
            i === 0 ||
            i === cells.length - 1 ||
            v - cells[i - 1] !== cells[i + 1] - v,
        )
        .map(pt);
      annotations.push({
        id: crypto.randomUUID(),
        type: "path",
        ...points[0],
        points,
        color: c.style === "sci-fi" ? "#eb80d9" : "#a77a48",
        strokeWidth: Math.max(2, c.width / 750),
        layer: "desenhos",
      });
    }
  }
  if (c.features.rivers) {
    // Priority flood connects inland depressions to an outlet without uphill loops.
    const parents = new Int32Array(s * s).fill(-1),
      heap: Array<{ i: number; z: number }> = [];
    const push = (node: { i: number; z: number }) => {
      heap.push(node);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p].z <= node.z) break;
        heap[k] = heap[p];
        k = p;
      }
      heap[k] = node;
    };
    const pop = () => {
      const first = heap[0],
        last = heap.pop()!;
      if (heap.length) {
        let k = 0;
        while (k * 2 + 1 < heap.length) {
          let child = k * 2 + 1;
          if (child + 1 < heap.length && heap[child + 1].z < heap[child].z)
            child++;
          if (heap[child].z >= last.z) break;
          heap[k] = heap[child];
          k = child;
        }
        heap[k] = last;
      }
      return first;
    };
    for (let i = 0; i < s * s; i++)
      if (t.elevation[i] < water) {
        parents[i] = i;
        push({ i, z: t.elevation[i] });
      }
    while (heap.length) {
      const cell = pop();
      for (const i of neighbors(cell.i))
        if (parents[i] === -1) {
          parents[i] = cell.i;
          push({ i, z: Math.max(t.elevation[i], cell.z) });
        }
    }
    const high = Array.from(t.elevation.keys())
        .filter((i) => t.elevation[i] > water + 0.2)
        .sort((a, b) => t.elevation[b] - t.elevation[a]),
      seen = new Set<number>();
    for (const source of high) {
      if (annotations.filter((a) => a.text === "Rio").length >= 3) break;
      if (seen.has(source) || parents[source] === -1) continue;
      let cell = source;
      const cells = [cell];
      for (let k = 0; k < s * s; k++) {
        const next = parents[cell];
        if (next < 0 || next === cell) break;
        cell = next;
        cells.push(cell);
        if (t.elevation[cell] < water) break;
      }
      if (cells.length < 12 || t.elevation[cell] >= water) continue;
      cells.forEach((i) => {
        seen.add(i);
        neighbors(i).forEach((j) => seen.add(j));
      });
      const points = cells.map(pt);
      annotations.push({
        id: crypto.randomUUID(),
        type: "path",
        ...points[0],
        points,
        color: "#65c2dc",
        strokeWidth: Math.max(3, c.width / 500),
        layer: "desenhos",
        text: "Rio",
      });
      if (annotations.filter((a) => a.text === "Rio").length >= 3) break;
    }
  }
  return c.routeStyle === "natural"
    ? smoothRoutes(annotations, routeTerrain)
    : annotations;
}
export function generateTerrainMap(c: ProceduralConfig) {
  return terrain(c).imageData;
}
export function generateProceduralMap(c: ProceduralConfig) {
  const t = terrain(c),
    locations = place(c, t),
    annotations = routes(c, t, locations),
    rng = random(c.seed + "symbols");
  for (const [count, text, min, max] of [
    [
      c.features.forests,
      "🌲",
      c.terrain.waterLevel + 0.06,
      c.terrain.mountainLevel,
    ],
    [c.features.mountains, "⛰️", c.terrain.mountainLevel, 1],
  ] as const) {
    const cells = Array.from(t.elevation.keys()).filter(
      (i) => t.elevation[i] > min && t.elevation[i] < max,
    );
    for (let j = 0; j < count && cells.length; j++) {
      const i = cells[Math.floor(rng() * cells.length)];
      annotations.push({
        id: crypto.randomUUID(),
        type: "symbol",
        x: ((i % t.size) / (t.size - 1)) * 100,
        y: (Math.floor(i / t.size) / (t.size - 1)) * 100,
        text,
        color: "#ffffff",
        strokeWidth: 1,
        fontSize: Math.max(28, c.width / 70),
        layer: "símbolos",
      });
    }
  }
  return {
    imageData: t.imageData,
    locations,
    annotations,
    geography: { size: t.size, elevation: t.elevation },
  };
}
export function generateDungeonMap(c: ProceduralConfig) {
  validateConfig(c);
  const rng = random(c.seed),
    canvas =
      typeof document === "undefined"
        ? new OffscreenCanvas(c.width, c.height)
        : Object.assign(document.createElement("canvas"), {
            width: c.width,
            height: c.height,
          });
  const ctx = canvas.getContext("2d") as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  const colors = palettes[c.style] || palettes.dungeon;

  const w = c.width;
  const h = c.height;

  // 1. Fundo de rocha maciça / alvenaria subterrânea
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, w, h);

  // Textura de cantaria e pedra antiga no fundo
  ctx.save();
  ctx.strokeStyle = colors[1] || "#2a2735";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.08;
  const bgGridStep = 40;
  for (let gx = 0; gx < w; gx += bgGridStep) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += bgGridStep) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  // Granulação sutil de pedra
  ctx.fillStyle = colors[5] || "#888";
  ctx.globalAlpha = 0.05;
  for (let g = 0; g < 180; g++) {
    ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 3, 2 + rng() * 3);
  }
  ctx.restore();

  const count = Math.min(40, Math.max(3, c.rooms || 12)),
    columns = Math.max(1, Math.ceil(Math.sqrt((count * w) / h))),
    rows = Math.ceil(count / columns),
    cw = w / columns,
    ch = h / rows;

  type Side = "top" | "bottom" | "left" | "right";
  type RoomShape = "great_hall" | "circular" | "octagonal" | "cruciform" | "vault" | "chamber";

  interface Room {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    cx: number;
    cy: number;
    shape: RoomShape;
    theme: string;
    icon: string;
    iconId: import("../types").LocationIconId;
    doors: Set<Side>;
  }

  const roomThemes: { name: string; icon: string; iconId: import("../types").LocationIconId }[] = [
    { name: "Entrada da Masmorra", icon: "🚪", iconId: "entrance" },
    { name: "Grande Salão dos Pilares", icon: "🏛", iconId: "dungeon" },
    { name: "Santuário do Círculo Oculto", icon: "🔮", iconId: "room" },
    { name: "Cripta dos Ancestrais", icon: "⚰️", iconId: "room" },
    { name: "Transepto dos Guardiões", icon: "⚔️", iconId: "room" },
    { name: "Galeria Abobadada", icon: "🗝️", iconId: "room" },
    { name: "Arquivo Proibido", icon: "📜", iconId: "room" },
    { name: "Arsenal de Guerra", icon: "🛡️", iconId: "room" },
    { name: "Câmara do Tesouro", icon: "💎", iconId: "room" },
    { name: "Laboratório Alquímico", icon: "🧪", iconId: "room" },
    { name: "Celas das Catacumbas", icon: "⛓️", iconId: "room" },
    { name: "Fosso dos Murmúrios", icon: "💀", iconId: "room" },
  ];

  const rooms: Room[] = [];

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / columns),
      col = row % 2 ? columns - 1 - (i % columns) : i % columns,
      cx = (col + 0.5) * cw + (rng() - 0.5) * (cw * 0.12),
      cy = (row + 0.5) * ch + (rng() - 0.5) * (ch * 0.12);

    // Formatos variados
    let shape: RoomShape = "chamber";
    let rw = cw * (0.5 + rng() * 0.28);
    let rh = ch * (0.5 + rng() * 0.28);

    if (i === 0) {
      shape = "vault";
      rw = cw * 0.62;
      rh = ch * 0.58;
    } else if (i === 1) {
      shape = "great_hall";
      rw = cw * 0.74;
      rh = ch * 0.72;
    } else {
      const pick = (i + Math.floor(rng() * 3)) % 5;
      if (pick === 0) shape = "circular";
      else if (pick === 1) shape = "octagonal";
      else if (pick === 2) shape = "cruciform";
      else if (pick === 3) shape = "great_hall";
      else shape = "chamber";
    }

    const theme = roomThemes[i % roomThemes.length] || {
      name: `Câmara ${i + 1}`,
      icon: "🗝️",
      iconId: "room" as const,
    };

    rooms.push({
      id: i,
      x: cx - rw / 2,
      y: cy - rh / 2,
      w: rw,
      h: rh,
      cx,
      cy,
      shape,
      theme: i === 0 ? "Entrada da Masmorra" : theme.name,
      icon: i === 0 ? "🚪" : theme.icon,
      iconId: i === 0 ? "entrance" : theme.iconId,
      doors: new Set(),
    });
  }

  const annotations: MapAnnotation[] = [];
  const gap = Math.min(cw, ch) * 0.18;

  const line = (
    x: number,
    y: number,
    x2: number,
    y2: number,
    type: "wall" | "door",
  ) =>
    annotations.push({
      id: crypto.randomUUID(),
      type,
      x: (x / w) * 100,
      y: (y / h) * 100,
      x2: (x2 / w) * 100,
      y2: (y2 / h) * 100,
      color: colors[5],
      strokeWidth: Math.max(2, Math.min(cw, ch) / 50),
      layer: "paredes",
    });

  // 2. Corredores sinuosos e dinâmicos entre as salas
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1],
      b = rooms[i],
      horizontal = Math.abs(a.cy - b.cy) < 0.15 * ch;

    if (horizontal) {
      a.doors.add(a.cx < b.cx ? "right" : "left");
      b.doors.add(a.cx < b.cx ? "left" : "right");
    } else {
      a.doors.add("bottom");
      b.doors.add("top");
    }

    // Traçado sinuoso com variação de largura
    const x1 = a.cx < b.cx ? a.x + a.w : b.x + b.w;
    const x2 = a.cx < b.cx ? b.x : a.x;
    const midX = (a.cx + b.cx) / 2;
    const midY = (a.cy + b.cy) / 2;
    const jitter = (rng() - 0.5) * (Math.min(cw, ch) * 0.15);

    // Sombra do corredor (ambient occlusion)
    ctx.save();
    ctx.strokeStyle = colors[1] || "#1b1824";
    ctx.lineWidth = gap * 1.5;
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    if (horizontal) {
      ctx.quadraticCurveTo(midX, a.cy + jitter, b.cx, b.cy);
    } else {
      ctx.quadraticCurveTo(a.cx + jitter, midY, b.cx, b.cy);
    }
    ctx.stroke();

    // Piso central do corredor
    ctx.strokeStyle = colors[2];
    ctx.lineWidth = gap * 1.15;
    ctx.stroke();

    // Miolo do corredor com lajotas mais claras
    ctx.strokeStyle = colors[3] || colors[2];
    ctx.lineWidth = gap * 0.7;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.restore();

    // Paredes limítrofes do corredor para anotações
    if (horizontal) {
      line(x1, a.cy - gap / 2, x2, a.cy - gap / 2, "wall");
      line(x1, a.cy + gap / 2, x2, a.cy + gap / 2, "wall");
    } else {
      line(a.cx - gap / 2, a.y + a.h, a.cx - gap / 2, b.y, "wall");
      line(a.cx + gap / 2, a.y + a.h, a.cx + gap / 2, b.y, "wall");
    }
  }

  // 3. Renderização de cada câmara com arquitetura e texturas
  for (const r of rooms) {
    const rx = r.x;
    const ry = r.y;
    const rw = r.w;
    const rh = r.h;
    const minD = Math.min(rw, rh);

    ctx.save();

    // Sombra de oclusão de parede (borda externa escura)
    ctx.fillStyle = colors[1] || "#201d2a";
    ctx.fillRect(rx - 8, ry - 8, rw + 16, rh + 16);

    // Piso base da sala
    ctx.fillStyle = colors[2];
    if (r.shape === "circular") {
      ctx.beginPath();
      ctx.ellipse(r.cx, r.cy, rw * 0.48, rh * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (r.shape === "octagonal") {
      const cut = minD * 0.22;
      ctx.beginPath();
      ctx.moveTo(rx + cut, ry);
      ctx.lineTo(rx + rw - cut, ry);
      ctx.lineTo(rx + rw, ry + cut);
      ctx.lineTo(rx + rw, ry + rh - cut);
      ctx.lineTo(rx + rw - cut, ry + rh);
      ctx.lineTo(rx + cut, ry + rh);
      ctx.lineTo(rx, ry + rh - cut);
      ctx.lineTo(rx, ry + cut);
      ctx.closePath();
      ctx.fill();
    } else if (r.shape === "cruciform") {
      const wingW = rw * 0.32;
      const wingH = rh * 0.32;
      ctx.fillRect(rx, ry + wingH, rw, rh - wingH * 2);
      ctx.fillRect(rx + wingW, ry, rw - wingW * 2, rh);
    } else {
      ctx.fillRect(rx, ry, rw, rh);
    }

    // Pavimentação de lajotas de pedra (Dungeon Tiles)
    const tileSize = Math.max(14, Math.min(rw, rh) * 0.14);
    ctx.strokeStyle = colors[1] || "#252230";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.28;

    for (let tx = rx; tx <= rx + rw; tx += tileSize) {
      ctx.beginPath();
      ctx.moveTo(tx, ry);
      ctx.lineTo(tx, ry + rh);
      ctx.stroke();
    }
    for (let ty = ry; ty <= ry + rh; ty += tileSize) {
      ctx.beginPath();
      ctx.moveTo(rx, ty);
      ctx.lineTo(rx + rw, ty);
      ctx.stroke();
    }

    // Sombra interna nas margens (vignette de parede)
    ctx.fillStyle = colors[0];
    ctx.globalAlpha = 0.18;
    ctx.fillRect(rx, ry, rw, 6);
    ctx.fillRect(rx, ry + rh - 6, rw, 6);
    ctx.fillRect(rx, ry, 6, rh);
    ctx.fillRect(rx + rw - 6, ry, 6, rh);

    // Decorações específicas por formato
    ctx.globalAlpha = 1.0;
    if (r.shape === "great_hall") {
      // Colunas duplas do grande salão
      const pillarR = Math.max(4, minD * 0.05);
      const colsX = [r.cx - rw * 0.28, r.cx + rw * 0.28];
      const colsY = [r.cy - rh * 0.26, r.cy, r.cy + rh * 0.26];
      for (const px of colsX) {
        for (const py of colsY) {
          // Sombra da coluna
          ctx.fillStyle = colors[0];
          ctx.beginPath();
          ctx.arc(px + 2, py + 2, pillarR + 1, 0, Math.PI * 2);
          ctx.fill();
          // Coluna
          ctx.fillStyle = colors[5] || "#999";
          ctx.beginPath();
          ctx.arc(px, py, pillarR, 0, Math.PI * 2);
          ctx.fill();
          // Brilho do capitel
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.arc(px - 1, py - 1, pillarR * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }
    } else if (r.shape === "circular") {
      // Círculo cerimonial / altar arcano
      ctx.strokeStyle = colors[4] || "#7a6b52";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(r.cx, r.cy, minD * 0.24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r.cx, r.cy, minD * 0.12, 0, Math.PI * 2);
      ctx.stroke();
      // Altar central
      ctx.fillStyle = colors[5] || "#888";
      ctx.beginPath();
      ctx.arc(r.cx, r.cy, minD * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    } else if (r.shape === "octagonal") {
      // Sarcófago central ou braseiro
      const sarcW = minD * 0.28;
      const sarcH = minD * 0.16;
      ctx.fillStyle = colors[1];
      ctx.fillRect(r.cx - sarcW / 2 + 2, r.cy - sarcH / 2 + 2, sarcW, sarcH);
      ctx.fillStyle = colors[5] || "#888";
      ctx.fillRect(r.cx - sarcW / 2, r.cy - sarcH / 2, sarcW, sarcH);
    }

    // Hachuras cartográficas clássicas nas paredes externas (estilo OSR / D&D)
    ctx.strokeStyle = colors[1] || "#2a2735";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    const hatchStep = 10;
    const hatchLen = 8;
    for (let hx = rx; hx <= rx + rw; hx += hatchStep) {
      ctx.beginPath();
      ctx.moveTo(hx, ry);
      ctx.lineTo(hx + 4, ry - hatchLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx, ry + rh);
      ctx.lineTo(hx + 4, ry + rh + hatchLen);
      ctx.stroke();
    }
    for (let hy = ry; hy <= ry + rh; hy += hatchStep) {
      ctx.beginPath();
      ctx.moveTo(rx, hy);
      ctx.lineTo(rx - hatchLen, hy + 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx + rw, hy);
      ctx.lineTo(rx + rw + hatchLen, hy + 4);
      ctx.stroke();
    }

    ctx.restore();

    // Portas e paredes vetoriais nas bordas (cumprindo o contrato de testes exato)
    for (const side of ["top", "bottom", "left", "right"] as const) {
      const horizontal = side === "top" || side === "bottom",
        fixed =
          side === "top"
            ? r.y
            : side === "bottom"
              ? r.y + r.h
              : side === "left"
                ? r.x
                : r.x + r.w,
        start = horizontal ? r.x : r.y,
        end = horizontal ? r.x + r.w : r.y + r.h,
        mid = (start + end) / 2;

      const segment = (from: number, to: number, type: "wall" | "door") =>
        horizontal
          ? line(from, fixed, to, fixed, type)
          : line(fixed, from, fixed, to, type);

      if (r.doors.has(side)) {
        segment(start, mid - gap / 2, "wall");
        segment(mid - gap / 2, mid + gap / 2, "door");
        segment(mid + gap / 2, end, "wall");
      } else {
        segment(start, end, "wall");
      }
    }

    // Anotação de luz ambiente
    annotations.push({
      id: crypto.randomUUID(),
      type: "light",
      x: (r.cx / w) * 100,
      y: (r.cy / h) * 100,
      width: ((Math.min(cw, ch) * (r.shape === "great_hall" ? 2.0 : 1.5)) / w) * 100,
      color: r.shape === "circular" ? "#ffca28" : "#ffc469",
      strokeWidth: 0,
      layer: "luzes",
    });
  }

  // 4. Locais com nomes e ícones temáticos
  const locations: MapLocation[] = rooms.map((r, i) => ({
    id: crypto.randomUUID(),
    name: r.theme,
    description: i === 0 ? "Ponto de entrada na masmorra subterrânea." : "Câmara com elementos arquitetônicos e desafios.",
    notes: "",
    type: "dungeon",
    icon: r.icon,
    iconId: r.iconId,
    color: locationIcons[r.iconId]?.color || (i === 0 ? "#4ade80" : "#d97706"),
    tags: ["masmorra", r.shape],
    x: (r.cx / w) * 100,
    y: (r.cy / h) * 100,
  }));

  return {
    imageData: ctx.getImageData(0, 0, w, h),
    locations,
    annotations,
  };
}

export function generateCaveMap(c: ProceduralConfig) {
  validateConfig(c);
  const rng = random(c.seed),
    canvas =
      typeof document === "undefined"
        ? new OffscreenCanvas(c.width, c.height)
        : Object.assign(document.createElement("canvas"), {
            width: c.width,
            height: c.height,
          });
  const ctx = canvas.getContext("2d") as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  const colors = palettes[c.style] || palettes.dungeon;

  const w = c.width;
  const h = c.height;

  // 1. Fundo de rocha maciça com textura estocástica (bedrock)
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, w, h);

  // Textura das paredes: granulação e veios minerais
  ctx.save();
  const veinCount = 28;
  for (let i = 0; i < veinCount; i++) {
    const vx0 = rng() * w;
    const vy0 = rng() * h;
    const len = 80 + rng() * 260;
    const angle = (rng() - 0.5) * Math.PI + (rng() < 0.5 ? 0.3 : -0.3);
    const vx1 = vx0 + Math.cos(angle) * len;
    const vy1 = vy0 + Math.sin(angle) * len;
    ctx.strokeStyle = rng() < 0.6 ? colors[1] : (colors[5] || "#444");
    ctx.globalAlpha = 0.08 + rng() * 0.12;
    ctx.lineWidth = 1 + rng() * 3;
    ctx.beginPath();
    ctx.moveTo(vx0, vy0);
    const midX = (vx0 + vx1) / 2 + (rng() - 0.5) * 35;
    const midY = (vy0 + vy1) / 2 + (rng() - 0.5) * 35;
    ctx.quadraticCurveTo(midX, midY, vx1, vy1);
    ctx.stroke();
  }

  // Granulação mineral na rocha
  const wallSpecks = 220;
  for (let i = 0; i < wallSpecks; i++) {
    ctx.fillStyle = rng() < 0.5 ? colors[1] : colors[5];
    ctx.globalAlpha = 0.05 + rng() * 0.1;
    const sx = rng() * w;
    const sy = rng() * h;
    const sr = 1.5 + rng() * 4;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 2. Câmaras com variação orgânica de tamanhos
  const count = Math.min(20, Math.max(3, c.rooms || 6));
  const baseDim = Math.min(w, h);
  const marginX = w * 0.12;
  const marginY = h * 0.12;
  const usableW = w - marginX * 2;
  const usableH = h - marginY * 2;

  interface Chamber {
    id: number;
    x: number;
    y: number;
    radius: number;
    type: "grand" | "medium" | "alcove";
    subBlobs: { ox: number; oy: number; r: number }[];
    points: { x: number; y: number }[];
  }

  const chambers: Chamber[] = [];

  // Posicionamento espacialmente distribuído
  for (let i = 0; i < count; i++) {
    let bestX = marginX + rng() * usableW;
    let bestY = marginY + rng() * usableH;
    let maxDist = -1;

    // Tentativas para dispersão orgânica
    for (let attempt = 0; attempt < 8; attempt++) {
      const cx = marginX + rng() * usableW;
      const cy = marginY + rng() * usableH;
      let minDist = 999999;
      for (const ch of chambers) {
        const d = Math.hypot(ch.x - cx, ch.y - cy);
        if (d < minDist) minDist = d;
      }
      if (minDist > maxDist) {
        maxDist = minDist;
        bestX = cx;
        bestY = cy;
      }
    }

    // Variedade hierárquica de tamanhos
    let chamberType: "grand" | "medium" | "alcove" = "medium";
    let baseR = baseDim * (0.055 + rng() * 0.035);

    if (i === 0) {
      // Entrada: tamanho médio-amplo
      chamberType = "medium";
      baseR = baseDim * 0.08;
    } else if (i === 1) {
      // Grande salão / câmara colossal
      chamberType = "grand";
      baseR = baseDim * (0.12 + rng() * 0.05);
    } else if (rng() < 0.35) {
      // Alcova / pequeno nicho
      chamberType = "alcove";
      baseR = baseDim * (0.035 + rng() * 0.02);
    } else {
      // Câmara média padrão
      chamberType = "medium";
      baseR = baseDim * (0.065 + rng() * 0.035);
    }

    // Gerar sub-blobs orgânicos (metaballs conectados)
    const blobCount = chamberType === "grand" ? 4 + Math.floor(rng() * 3) : 2 + Math.floor(rng() * 2);
    const subBlobs: { ox: number; oy: number; r: number }[] = [{ ox: 0, oy: 0, r: baseR }];
    for (let b = 1; b < blobCount; b++) {
      const bAngle = rng() * Math.PI * 2;
      const bDist = baseR * (0.35 + rng() * 0.45);
      const bRad = baseR * (0.55 + rng() * 0.4);
      subBlobs.push({
        ox: Math.cos(bAngle) * bDist,
        oy: Math.sin(bAngle) * bDist,
        r: bRad,
      });
    }

    // Pontos de contorno suave com deformação radial
    const numPoints = 18;
    const points: { x: number; y: number }[] = [];
    const phase1 = rng() * 10;
    const phase2 = rng() * 10;
    for (let p = 0; p < numPoints; p++) {
      const a = (p / numPoints) * Math.PI * 2;
      let effectiveR = baseR;
      // Encontrar maior raio composto pelos blobs
      for (const sb of subBlobs) {
        const dot = Math.cos(a) * sb.ox + Math.sin(a) * sb.oy;
        const dRadial = sb.r + Math.max(0, dot);
        if (dRadial > effectiveR) effectiveR = dRadial;
      }
      // Deformação harmônica suave (ruído orgânico arredondado)
      const noiseOffset = 1 + 0.18 * Math.sin(a * 2 + phase1) + 0.12 * Math.cos(a * 3 + phase2);
      const rFin = effectiveR * noiseOffset;
      points.push({
        x: bestX + Math.cos(a) * rFin,
        y: bestY + Math.sin(a) * rFin,
      });
    }

    chambers.push({
      id: i,
      x: bestX,
      y: bestY,
      radius: baseR,
      type: chamberType,
      subBlobs,
      points,
    });
  }

  // 3. Corredores Labirínticos (Winding Labyrinth Corridors)
  interface Corridor {
    points: { x: number; y: number }[];
    width: number;
  }
  const corridors: Corridor[] = [];

  // Grafo conexo (Árvore geradora + laços redundantes para labirinto)
  const connected = new Set<number>([0]);
  const edges: [number, number][] = [];

  while (connected.size < chambers.length) {
    let bestDist = Infinity;
    let bestFrom = -1;
    let bestTo = -1;
    for (const c1 of connected) {
      for (let c2 = 0; c2 < chambers.length; c2++) {
        if (!connected.has(c2)) {
          const d = Math.hypot(chambers[c1].x - chambers[c2].x, chambers[c1].y - chambers[c2].y);
          if (d < bestDist) {
            bestDist = d;
            bestFrom = c1;
            bestTo = c2;
          }
        }
      }
    }
    if (bestFrom !== -1 && bestTo !== -1) {
      edges.push([bestFrom, bestTo]);
      connected.add(bestTo);
    }
  }

  // Adicionar conexões secundárias para formar caminhos labirínticos alternativos
  const extraLoops = Math.min(5, Math.floor(chambers.length * 0.45));
  for (let l = 0; l < extraLoops; l++) {
    const c1 = Math.floor(rng() * chambers.length);
    const c2 = Math.floor(rng() * chambers.length);
    if (c1 !== c2 && !edges.some(([a, b]) => (a === c1 && b === c2) || (a === c2 && b === c1))) {
      const d = Math.hypot(chambers[c1].x - chambers[c2].x, chambers[c1].y - chambers[c2].y);
      if (d < baseDim * 0.55) {
        edges.push([c1, c2]);
      }
    }
  }

  // Função auxiliar para gerar caminho sinuoso/labiríntico entre dois pontos
  function createWindingPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    segments = 5,
    jitterFactor = 0.28
  ): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];
    const totalDist = Math.hypot(x2 - x1, y2 - y1);
    const perpX = -(y2 - y1) / (totalDist || 1);
    const perpY = (x2 - x1) / (totalDist || 1);

    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const baseX = x1 + (x2 - x1) * t;
      const baseY = y1 + (y2 - y1) * t;
      const side = (rng() - 0.5) * 2;
      const offset = side * totalDist * jitterFactor;
      pts.push({
        x: baseX + perpX * offset,
        y: baseY + perpY * offset,
      });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  // Criar corredores entre as arestas
  const baseCorridorWidth = Math.max(22, baseDim * 0.038);
  for (const [from, to] of edges) {
    const c1 = chambers[from];
    const c2 = chambers[to];
    const pathPts = createWindingPath(c1.x, c1.y, c2.x, c2.y, 6, 0.22);
    corridors.push({
      points: pathPts,
      width: baseCorridorWidth * (0.85 + rng() * 0.4),
    });
  }

  // Corredores labirínticos sem saída (dead-ends/branching maze tunnels)
  const deadEndCount = 3 + Math.floor(rng() * 4);
  for (let d = 0; d < deadEndCount; d++) {
    const sourceCh = chambers[Math.floor(rng() * chambers.length)];
    const angle = rng() * Math.PI * 2;
    const len = baseDim * (0.12 + rng() * 0.18);
    const targetX = Math.max(marginX * 0.5, Math.min(w - marginX * 0.5, sourceCh.x + Math.cos(angle) * len));
    const targetY = Math.max(marginY * 0.5, Math.min(h - marginY * 0.5, sourceCh.y + Math.sin(angle) * len));
    const mazePath = createWindingPath(sourceCh.x, sourceCh.y, targetX, targetY, 5, 0.35);
    corridors.push({
      points: mazePath,
      width: baseCorridorWidth * (0.65 + rng() * 0.35),
    });
  }

  // Helper para desenhar caminho suave com curvas de Bézier/quadratic
  function drawSmoothPoly(pts: { x: number; y: number }[]) {
    if (pts.length < 3) return;
    ctx.beginPath();
    ctx.moveTo((pts[0].x + pts[pts.length - 1].x) / 2, (pts[0].y + pts[pts.length - 1].y) / 2);
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, mx, my);
    }
    ctx.closePath();
  }

  function drawSmoothStroke(pts: { x: number; y: number }[]) {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }

  // 4. Renderização do relevo com arredondamento e texturas
  // CAMADA A: Sombra externa / Oclusão de profundidade (ambient occlusion)
  ctx.save();
  ctx.fillStyle = colors[1] || "#1e1e28";
  ctx.strokeStyle = colors[1] || "#1e1e28";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Desenhar borda de sombra das câmaras
  for (const ch of chambers) {
    const rimPoints = ch.points.map((pt) => ({
      x: ch.x + (pt.x - ch.x) * 1.14,
      y: ch.y + (pt.y - ch.y) * 1.14,
    }));
    drawSmoothPoly(rimPoints);
    ctx.fill();
  }
  // Desenhar borda de sombra dos corredores
  for (const cor of corridors) {
    ctx.lineWidth = cor.width + 20;
    drawSmoothStroke(cor.points);
    ctx.stroke();
  }
  ctx.restore();

  // CAMADA B: Piso base da caverna (arredondado, sem serrilhado)
  ctx.save();
  ctx.fillStyle = colors[2]; // piso base
  ctx.strokeStyle = colors[2];
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const ch of chambers) {
    drawSmoothPoly(ch.points);
    ctx.fill();
  }
  for (const cor of corridors) {
    ctx.lineWidth = cor.width;
    drawSmoothStroke(cor.points);
    ctx.stroke();
  }
  ctx.restore();

  // CAMADA C: Piso interior texturizado e variações de cor/terra
  ctx.save();
  ctx.fillStyle = colors[3] || "#5a5246";
  ctx.strokeStyle = colors[3] || "#5a5246";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.55;

  for (const ch of chambers) {
    // Miolo do piso com tom de terra / pedra escura
    const innerPoints = ch.points.map((pt) => ({
      x: ch.x + (pt.x - ch.x) * 0.82,
      y: ch.y + (pt.y - ch.y) * 0.82,
    }));
    drawSmoothPoly(innerPoints);
    ctx.fill();
  }
  for (const cor of corridors) {
    ctx.lineWidth = Math.max(10, cor.width * 0.55);
    drawSmoothStroke(cor.points);
    ctx.stroke();
  }
  ctx.restore();

  // CAMADA D: Detalhes orgânicos de piso — pedregulhos, fissuras e poças d'água
  ctx.save();
  // Pedregulhos / cascalho espalhados nas câmaras
  for (const ch of chambers) {
    const pebbleCount = Math.floor(ch.radius * 0.35);
    for (let p = 0; p < pebbleCount; p++) {
      const pa = rng() * Math.PI * 2;
      const pd = rng() * (ch.radius * 0.7);
      const px = ch.x + Math.cos(pa) * pd;
      const py = ch.y + Math.sin(pa) * pd;
      const pr = 1.8 + rng() * 3.5;

      ctx.fillStyle = rng() < 0.45 ? (colors[0] || "#111") : (colors[5] || "#888");
      ctx.globalAlpha = 0.4 + rng() * 0.35;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fissura ou racha no chão de rocha
    if (rng() < 0.65) {
      const crackStartAngle = rng() * Math.PI * 2;
      const cx0 = ch.x + Math.cos(crackStartAngle) * (ch.radius * 0.3);
      const cy0 = ch.y + Math.sin(crackStartAngle) * (ch.radius * 0.3);
      const clen = ch.radius * (0.4 + rng() * 0.5);
      const ca = crackStartAngle + (rng() - 0.5) * 1.5;
      const cx1 = cx0 + Math.cos(ca) * clen;
      const cy1 = cy0 + Math.sin(ca) * clen;

      ctx.strokeStyle = colors[0];
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1 + rng() * 1.5;
      ctx.beginPath();
      ctx.moveTo(cx0, cy0);
      ctx.lineTo((cx0 + cx1) / 2 + (rng() - 0.5) * 8, (cy0 + cy1) / 2 + (rng() - 0.5) * 8);
      ctx.lineTo(cx1, cy1);
      ctx.stroke();
    }

    // Poça d'água subterrânea / lago cristalino em salões maiores
    if (ch.type === "grand" || (ch.type === "medium" && rng() < 0.4)) {
      const poolR = ch.radius * (0.28 + rng() * 0.22);
      const poolA = rng() * Math.PI * 2;
      const poolX = ch.x + Math.cos(poolA) * (ch.radius * 0.25);
      const poolY = ch.y + Math.sin(poolA) * (ch.radius * 0.25);

      ctx.fillStyle = colors[4] || "#345";
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.ellipse(poolX, poolY, poolR, poolR * 0.65, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();

      // Brilho na água
      ctx.strokeStyle = "#ffffff";
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(poolX - poolR * 0.2, poolY - poolR * 0.15, poolR * 0.3, 0.2, 1.2);
      ctx.stroke();
    }
  }

  // Estalagmites estilizadas nas margens das paredes
  for (const ch of chambers) {
    const stalagmiteCount = Math.floor(ch.radius * 0.18);
    for (let s = 0; s < stalagmiteCount; s++) {
      const sa = (s / stalagmiteCount) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const sd = ch.radius * (0.72 + rng() * 0.18);
      const sx = ch.x + Math.cos(sa) * sd;
      const sy = ch.y + Math.sin(sa) * sd;
      const sw = 4 + rng() * 6;
      const sh = 7 + rng() * 12;

      ctx.fillStyle = colors[0];
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(sx - sw / 2, sy);
      ctx.lineTo(sx, sy - sh);
      ctx.lineTo(sx + sw / 2, sy);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  // 5. Locais e Anotações de Luz com Temática Subterrânea
  const locations: import("../types").MapLocation[] = [];
  const annotations: import("../types").MapAnnotation[] = [];

  const chamberNames = [
    "Entrada da Caverna",
    "Grande Salão Ecoante",
    "Gruta dos Cristais",
    "Salão das Estalactites",
    "Fosso Sombrio",
    "Covil Profundo",
    "Gruta do Lago Subterrâneo",
    "Labirinto dos Murmúrios",
    "Abismo Esquecido",
    "Altar dos Antigos",
    "Nichos dos Morcegos",
    "Garganta de Pedra",
  ];

  chambers.forEach((ch, i) => {
    let locName: string;
    let icon = "🦇";
    let iconId: import("../types").LocationIconId = "cave";

    if (i === 0) {
      locName = "Entrada da Caverna";
      icon = "🚪";
      iconId = "entrance";
    } else if (ch.type === "grand") {
      locName = "Grande Salão Ecoante";
      icon = "🏛";
      iconId = "dungeon";
    } else {
      locName = chamberNames[i % chamberNames.length] || `Câmara ${i + 1}`;
      if (locName.includes("Lago")) {
        icon = "💧";
      } else if (locName.includes("Cristais")) {
        icon = "💎";
      } else if (locName.includes("Altar")) {
        icon = "⛩";
      }
    }

    locations.push({
      id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36),
      name: locName,
      description: i === 0 ? "Ponto de acesso exterior à rede de cavernas." : "Câmara esculpida naturalmente na rocha.",
      notes: "",
      type: "cave",
      icon,
      iconId,
      color: i === 0 ? "#4ade80" : (locationIcons["cave"]?.color || "#e2c08d"),
      tags: ["caverna", ch.type],
      x: (ch.x / w) * 100,
      y: (ch.y / h) * 100,
    });

    // Anotação de luz (tocha ou bioluminescência)
    annotations.push({
      id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36),
      type: "light",
      x: (ch.x / w) * 100,
      y: (ch.y / h) * 100,
      width: ch.type === "grand" ? 22 : ch.type === "medium" ? 16 : 11,
      color: i === 0 ? "#ffe082" : rng() < 0.25 ? "#80deea" : "#ffb74d",
      strokeWidth: 0,
      layer: "luzes",
    });
  });

  return {
    imageData: ctx.getImageData(0, 0, w, h),
    locations,
    annotations,
  };
}
