import type { SavedWorkspace } from "./storage";
import { isLocationIconId } from "./locationIcons";
import {
  MapProject,
  MapLocation,
  MapAnnotation,
  GlossaryEntry,
  ProceduralConfig,
} from "../types";

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[<>:"/\\|?*]/g, "_");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function exportBackup(data: SavedWorkspace, name = "DOZERO-backup") {
  downloadBlob(
    new Blob(
      [
        JSON.stringify({
          format: "dozero-workspace",
          version: 1,
          exportedAt: new Date().toISOString(),
          ...data,
        }),
      ],
      { type: "application/json" },
    ),
    `${name}.json`,
  );
}
const object = (v: any) => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("Estrutura inválida.");
  return v;
};
const str = (v: any, fallback = ""): string => {
  if (v === undefined) return fallback;
  if (typeof v !== "string" || v.length > 1000000)
    throw new Error("Texto inválido.");
  return v;
};
const num = (v: any, min: number, max: number, fallback?: number): number => {
  if (v === undefined && fallback !== undefined) return fallback;
  if (!Number.isFinite(v) || v < min || v > max)
    throw new Error("Dimensão ou coordenada inválida.");
  return v;
};
const list = (v: any, max = 10000): any[] => {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > max)
    throw new Error("Lista inválida ou muito grande.");
  return v;
};
const date = (v: any) => {
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) throw new Error("Data inválida.");
  return d;
};
const id = (v: any) => str(v) || crypto.randomUUID();
const color = (v: any, fallback: string) => {
  const s = str(v, fallback);
  if (!/^#[0-9a-f]{3,8}$/i.test(s) && s !== "none")
    throw new Error("Cor inválida.");
  return s;
};
const location = (value: any): MapLocation => {
  const v = object(value);
  return {
    id: id(v.id),
    name: str(v.name, "Local"),
    x: num(v.x, 0, 100),
    y: num(v.y, 0, 100),
    description: str(v.description),
    notes: str(v.notes),
    type: str(v.type, "custom") as MapLocation["type"],
    icon: str(v.icon, "📍"),
    iconId: isLocationIconId(v.iconId) ? v.iconId : undefined,
    color: color(v.color, "#c8954a"),
    tags: list(v.tags).map((x) => str(x)),
    linkedMapId: v.linkedMapId ? str(v.linkedMapId) : undefined,
    hidden: !!v.hidden,
  };
};
const annotation = (value: any): MapAnnotation => {
  const v = object(value);
  if (
    ![
      "text",
      "line",
      "arrow",
      "circle",
      "rectangle",
      "path",
      "symbol",
      "wall",
      "door",
      "light",
    ].includes(v.type)
  )
    throw new Error("Tipo de desenho inválido.");
  return {
    material: ["grass", "stone", "water", "wood"].includes(v.material)
      ? v.material
      : undefined,
    id: id(v.id),
    type: v.type,
    x: num(v.x, 0, 100),
    y: num(v.y, 0, 100),
    x2: v.x2 === undefined ? undefined : num(v.x2, 0, 100),
    y2: v.y2 === undefined ? undefined : num(v.y2, 0, 100),
    width: num(v.width, 0, 300, 0),
    height: num(v.height, 0, 300, 0),
    text: str(v.text),
    name: v.name ? str(v.name) : undefined,
    interaction: v.interaction === "focus" ? "focus" : undefined,
    color: color(v.color, "#c8954a"),
    strokeWidth: num(v.strokeWidth, 0, 200, 2),
    fontSize: num(v.fontSize, 1, 1000, 24),
    fill: color(v.fill, "none"),
    rotation: num(v.rotation, -36000, 36000, 0),
    layer: str(v.layer, "desenhos"),
    hidden: !!v.hidden,
    points:
      v.points === undefined
        ? undefined
        : list(v.points, 100000).map((p) => ({
            x: num(p.x, 0, 100),
            y: num(p.y, 0, 100),
          })),
  };
};
const entry = (value: any): GlossaryEntry => {
  const v = object(value);
  return {
    id: id(v.id),
    name: str(v.name),
    description: str(v.description),
    type: str(v.type, "geral"),
    tags: list(v.tags).map((x) => str(x)),
    mapId: v.mapId ? str(v.mapId) : undefined,
    locationId: v.locationId ? str(v.locationId) : undefined,
  };
};
const generator = (value: any): ProceduralConfig | undefined => {
  if (value === undefined) return undefined;
  const v = object(value),
    t = object(v.terrain),
    f = object(v.features);
  let cartography: ProceduralConfig["cartography"];
  if (
    v.routeStyle !== undefined &&
    !["classic", "natural"].includes(v.routeStyle)
  )
    throw new Error("Estilo de caminhos inválido.");
  if (v.cartography !== undefined) {
    const appearance = object(v.cartography);
    if (!["classic", "relief"].includes(appearance.mode))
      throw new Error("Acabamento cartográfico inválido.");
    cartography = {
      mode: appearance.mode,
      relief: num(appearance.relief, 0, 1),
      coast: num(appearance.coast, 0, 1),
      biomes:
        appearance.biomes === undefined
          ? undefined
          : num(appearance.biomes, 0, 1),
      texture:
        appearance.texture === undefined
          ? undefined
          : num(appearance.texture, 0, 1),
    };
  }
  return {
    cartography,
    routeStyle: v.routeStyle,
    width: num(v.width, 500, 8000),
    height: num(v.height, 500, 8000),
    seed: str(v.seed),
    style: str(v.style, "fantasy") as ProceduralConfig["style"],
    shape: ["island", "continents", "archipelago", "inland"].includes(v.shape)
      ? v.shape
      : "island",
    rooms: num(v.rooms, 3, 40, 12),
    terrain: {
      waterLevel: num(t.waterLevel, 0, 1),
      mountainLevel: num(t.mountainLevel, 0, 1),
      forestDensity: num(t.forestDensity, 0, 1),
      desertChance: num(t.desertChance, 0, 1),
      snowLevel: num(t.snowLevel, 0, 1, 0.85),
      noiseScale: num(t.noiseScale, 1, 10),
      octaves: num(t.octaves, 1, 8),
    },
    features: {
      cities: num(f.cities, 0, 30),
      towns: num(f.towns, 0, 30),
      dungeons: num(f.dungeons, 0, 30),
      rivers: !!f.rivers,
      roads: !!f.roads,
      forests: num(f.forests, 0, 30, 0),
      mountains: num(f.mountains, 0, 30, 0),
    },
  };
};
const project = (value: any): MapProject => {
  const v = object(value);
  if (
    v.imageUrl !== null &&
    v.imageUrl !== undefined &&
    (typeof v.imageUrl !== "string" ||
      !/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v.imageUrl))
  )
    throw new Error(
      "O backup deve conter imagens PNG, JPEG ou WebP incorporadas.",
    );
  if (
    v.thumbnailUrl &&
    !/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v.thumbnailUrl)
  )
    throw new Error("Miniatura inválida.");
  return {
    thumbnailUrl: v.thumbnailUrl,
    generatorConfig: generator(v.generatorConfig),
    generatorMode:
      v.generatorMode === "dungeon"
        ? "dungeon"
        : v.generatorMode === "world"
          ? "world"
          : undefined,
    id: id(v.id),
    name: str(v.name, "Mapa importado"),
    description: str(v.description),
    imageUrl: v.imageUrl || null,
    imageWidth: num(v.imageWidth, 1, 32000),
    imageHeight: num(v.imageHeight, 1, 32000),
    createdAt: date(v.createdAt),
    updatedAt: date(v.updatedAt),
    style: str(v.style, "fantasy") as MapProject["style"],
    gridEnabled: !!v.gridEnabled,
    gridSize: num(v.gridSize, 5, 1000, 50),
    gridType: v.gridType === "hex" ? "hex" : "square",
    scaleUnit: str(v.scaleUnit, "m"),
    unitsPerCell: num(v.unitsPerCell, 0.01, 1000000, 1.5),
    locations: list(v.locations).map(location),
    annotations: list(v.annotations).map(annotation),
    hiddenLayers: list(v.hiddenLayers).map((x) => str(x)),
    lockedLayers: list(v.lockedLayers).map((x) => str(x)),
  };
};
export function validateWorkspace(value: unknown): SavedWorkspace {
  const v = object(value);
  if (v.format && (v.format !== "dozero-workspace" || v.version !== 1))
    throw new Error("Versão de backup não suportada.");
  if (!v.projects && !v.project)
    throw new Error("Este arquivo não contém projetos DOZERO.");
  const projects = list(
    v.projects || [
      {
        ...v.project,
        locations: v.locations || v.project.locations,
        annotations: v.annotations || v.project.annotations,
      },
    ],
    1000,
  ).map(project);
  const glossary = list(v.glossary).map(entry);
  const trash = list(v.trash, 10000).map((t) => {
    object(t);
    if (!["project", "location", "annotation", "glossary"].includes(t.kind))
      throw new Error("Lixeira inválida.");
    return {
      id: id(t.id),
      kind: t.kind,
      name: str(t.name),
      deletedAt: date(t.deletedAt),
      projectId: t.projectId ? str(t.projectId) : undefined,
      value:
        t.kind === "project"
          ? project(t.value)
          : t.kind === "location"
            ? location(t.value)
            : t.kind === "annotation"
              ? annotation(t.value)
              : entry(t.value),
      entries: list(t.entries).map(entry),
    };
  });
  if (new Set(projects.map((p) => p.id)).size !== projects.length)
    throw new Error("IDs de projetos repetidos no backup.");
  for (const p of projects)
    for (const items of [p.locations, p.annotations])
      if (new Set(items.map((i) => i.id)).size !== items.length)
        throw new Error("IDs de objetos repetidos.");
  return { projects, glossary, trash };
}

export async function parseBackup(file: File): Promise<SavedWorkspace> {
  if (file.size > 512 * 1024 * 1024)
    throw new Error("Backup maior que 512 MB. Divida em projetos menores.");
  const { projects, glossary, trash } = validateWorkspace(
    JSON.parse(await file.text()),
  );
  const checked = new Set<string>();
  for (const p of [
    ...projects,
    ...trash
      .filter((t) => t.kind === "project")
      .map((t) => t.value as MapProject),
  ]) {
    const imageKey = p.imageWidth + "x" + p.imageHeight + ":" + p.imageUrl;
    if (!p.imageUrl || checked.has(imageKey)) continue;
    if (
      p.imageWidth * p.imageHeight > 64000000 ||
      p.imageWidth > 16000 ||
      p.imageHeight > 16000
    )
      throw new Error(
        "O backup contém imagem acima do limite de 64 megapixels ou 16.000 pixels por lado.",
      );
    try {
      const bitmap = await createImageBitmap(
        await (await fetch(p.imageUrl)).blob(),
      );
      const valid =
        bitmap.width === p.imageWidth && bitmap.height === p.imageHeight;
      bitmap.close();
      if (!valid) throw new Error();
    } catch {
      throw new Error(
        "Uma imagem do backup está corrompida ou tem dimensões diferentes das informadas.",
      );
    }
    checked.add(imageKey);
  }
  return { projects, glossary, trash };
}
// Import as independent copies; a repeated import never overwrites an existing project.
export function remapBackup(data: SavedWorkspace): SavedWorkspace {
  const ids = new Map<string, string>();
  const projectIds = new Set([
    ...data.projects.map((p) => p.id),
    ...data.trash.filter((t) => t.kind === "project").map((t) => t.value.id),
  ]);
  const newId = (old: string) => {
    if (!ids.has(old)) ids.set(old, crypto.randomUUID());
    return ids.get(old)!;
  };
  const mapLink = (id?: string) => (id && projectIds.has(id) ? newId(id) : id);
  const mapLocation = (l: MapLocation): MapLocation => ({
    ...l,
    id: newId(l.id),
    linkedMapId: mapLink(l.linkedMapId),
  });
  const mapProject = (p: MapProject): MapProject => ({
    ...p,
    id: newId(p.id),
    locations: p.locations.map(mapLocation),
    annotations: p.annotations.map((a) => ({ ...a, id: newId(a.id) })),
  });
  const mapEntry = (e: GlossaryEntry) => ({
    ...e,
    id: newId(e.id),
    mapId: mapLink(e.mapId),
    locationId: e.locationId ? newId(e.locationId) : undefined,
  });
  return {
    projects: data.projects.map(mapProject),
    glossary: data.glossary.map(mapEntry),
    trash: data.trash.map((t) => ({
      ...t,
      id: newId(t.id),
      projectId: mapLink(t.projectId),
      value:
        t.kind === "project"
          ? mapProject(t.value as MapProject)
          : t.kind === "glossary"
            ? mapEntry(t.value as GlossaryEntry)
            : t.kind === "location"
              ? mapLocation(t.value as MapLocation)
              : { ...t.value, id: newId(t.value.id) },
      entries: t.entries?.map(mapEntry),
    })),
  };
}
