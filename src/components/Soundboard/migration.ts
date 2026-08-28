import type { DataState, Scene, Sound, SoundType } from "./types";

type LegacyTrack = {
  id?: string;
  title?: string;
  name?: string;
  url?: string;
  duration?: number;
  category?: string;
  isFavorite?: boolean;
  volume?: number;
};

type LegacySoundboardItem = LegacyTrack & { volume?: number; icon?: string };

type LegacyPersistedState = {
  playlist?: LegacyTrack[];
  soundboard?: LegacySoundboardItem[];
  scenePresets?: Array<{ id?: string; name?: string; musicTrackId?: string; ambienceTrackId?: string }>;
};

const categoryFor = (category?: string) => {
  if (category === "sfx") return "combate";
  if (category === "combat") return "combate";
  if (category === "exploration") return "natureza";
  if (category === "narrative") return "ritual";
  return "musica";
};

const typeFor = (category?: string, duration = 0): SoundType => {
  if (category === "sfx" || category === "combat" || (duration > 0 && duration < 20)) return "SFX";
  if (category === "ambience" || category === "exploration") return "Ambiente";
  return "Música";
};

const safeId = (value: string) => value.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();

function readLegacyState(value: unknown): LegacyPersistedState {
  if (!value || typeof value !== "object") return {};
  const candidate = value as { state?: LegacyPersistedState } & LegacyPersistedState;
  return candidate.state && typeof candidate.state === "object" ? candidate.state : candidate;
}

/**
 * Converte o armazenamento do Audio Director antigo para o modelo do Arcanum.
 * A operação é determinística: repetir a migração não cria sons ou cenas duplicados.
 */
export function migrateLegacyAudio(seed: DataState, legacyValue: unknown): DataState {
  const legacy = readLegacyState(legacyValue);
  const tracks = [...(legacy.playlist ?? []), ...(legacy.soundboard ?? [])];
  if (tracks.length === 0 && !(legacy.scenePresets?.length)) return seed;

  const sounds = { ...seed.sounds };
  const migratedIds: string[] = [];
  const idMap = new Map<string, string>();

  tracks.forEach((track, index) => {
    if (!track.url || track.url.startsWith("blob:")) return;
    const originalId = track.id || `track-${index}`;
    const id = `legacy-${safeId(originalId)}`;
    const existing = sounds[id];
    if (!existing) {
      const name = track.name || track.title || "Áudio legado";
      const duration = Number(track.duration) || 0;
      sounds[id] = {
        id,
        name,
        icon: track.icon || (typeFor(track.category, duration) === "SFX" ? "zap" : "note"),
        categoryId: categoryFor(track.category),
        type: typeFor(track.category, duration),
        synth: `file:${id}`,
        duration,
        loop: typeFor(track.category, duration) !== "SFX",
        volume: Math.round(Math.max(0, Math.min(1, track.volume ?? 1)) * 100),
        fadeIn: 300,
        fadeOut: 500,
        fileUrl: track.url,
        createdAt: Date.now(),
      } satisfies Sound;
    }
    idMap.set(originalId, id);
    if (!migratedIds.includes(id)) migratedIds.push(id);
  });

  const padId = "pad-legacy-audio";
  const pads = seed.pads.some((pad) => pad.id === padId)
    ? seed.pads.map((pad) => (pad.id === padId ? { ...pad, soundIds: [...new Set([...pad.soundIds, ...migratedIds])] } : pad))
    : [...seed.pads, { id: padId, name: "Biblioteca legada", icon: "folder", color: "#cd973c", soundIds: migratedIds }];

  const scenes = [...seed.scenes];
  (legacy.scenePresets ?? []).forEach((preset, index) => {
    const id = `legacy-scene-${safeId(preset.id || preset.name || String(index))}`;
    if (scenes.some((scene) => scene.id === id)) return;
    const layers: Scene["layers"] = [];
    const musicId = preset.musicTrackId ? idMap.get(preset.musicTrackId) : undefined;
    const ambienceId = preset.ambienceTrackId ? idMap.get(preset.ambienceTrackId) : undefined;
    if (musicId && sounds[musicId]) layers.push({ soundId: musicId, volume: sounds[musicId].volume });
    if (ambienceId && sounds[ambienceId]) layers.push({ soundId: ambienceId, volume: sounds[ambienceId].volume });
    if (layers.length > 0) scenes.push({ id, name: preset.name || "Cena legada", icon: "layers", layers, fadeMs: 1500 });
  });

  const favorites = [...new Set([
    ...seed.favorites,
    ...(legacy.playlist ?? []).filter((track) => track.isFavorite && track.id).map((track) => idMap.get(track.id!)).filter(Boolean) as string[],
  ])];

  return { ...seed, sounds, pads, scenes, favorites };
}
