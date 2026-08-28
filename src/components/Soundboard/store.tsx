import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import type {
  Category, DataState, LayerState, Scene, Sound, Soundpad, SoundType, Trigger, Vista, VttEvent, VttSettings,
} from "./types";
import { engine } from "./audio/engine";
import { communityPack, seedState } from "./data/seed";
import { migrateLegacyAudio } from "./migration";

/* ---------------- tipos de UI ---------------- */
export type View =
  | { kind: "pad"; padId: string }
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "scenes" }
  | { kind: "uploads" }
  | { kind: "vtt" };

export interface UIHooks {
  openEditor: (soundId: string) => void;
  openSceneFrom: (soundIds: string[]) => void;
  openSceneEdit: (sceneId: string) => void;
  openHelp: () => void;
}

export const UIContext = createContext<UIHooks>({
  openEditor: () => {},
  openSceneFrom: () => {},
  openSceneEdit: () => {},
  openHelp: () => {},
});
export const useUI = () => useContext(UIContext);

export interface Toast {
  id: number;
  msg: string;
  kind: "ok" | "warn" | "err";
}

export const EVENT_LABELS: Record<VttEvent, string> = {
  combat_start: "Início de combate",
  combat_end: "Fim de combate",
  long_rest: "Descanso longo",
  enter_dungeon: "Entrada em dungeon",
  boss_appears: "Chefe aparece",
  nat20: "Falha/20 natural",
  player_death: "Morte de personagem",
};

/* ---------------- filtros ---------------- */
export interface Filters {
  typeFilter: SoundType | "Todos";
  categoryFilter: string;
  search: string;
}

export function selectVisible(data: DataState, view: View, f: Filters): Sound[] {
  let ids: string[];
  if (view.kind === "pad") ids = data.pads.find((p) => p.id === view.padId)?.soundIds ?? [];
  else if (view.kind === "favorites") ids = data.favorites;
  else if (view.kind === "all") ids = Object.keys(data.sounds);
  else return [];
  const q = f.search.trim().toLowerCase();
  return ids
    .map((id) => data.sounds[id])
    .filter(Boolean)
    .filter(
      (s) =>
        (f.typeFilter === "Todos" || s.type === f.typeFilter) &&
        (f.categoryFilter === "all" || s.categoryId === f.categoryFilter) &&
        (!q || s.name.toLowerCase().includes(q))
    );
}

export const fmtDur = (s: Sound) => {
  if (s.loop || s.duration === 0) return "∞";
  const m = Math.floor(s.duration / 60);
  const ss = Math.round(s.duration % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
};

/* ---------------- persistência ---------------- */
const KEY = "dozero-soundboard-v2";
const STANDALONE_KEY = "arcanum:v1";
const LEGACY_KEY = "dozero-audio-storage";

function readJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function load(): DataState {
  try {
    const parsed = (readJSON(KEY) ?? readJSON(STANDALONE_KEY)) as Partial<DataState> | null;
    const migrated = migrateLegacyAudio(seedState, readJSON(LEGACY_KEY));
    if (!parsed || !parsed.sounds || !parsed.pads) return migrated;

    const sounds: Record<string, Sound> = { ...migrated.sounds };
    Object.values(parsed.sounds).forEach((sound) => {
      const normalized =
        sound.name === "Taverna do Javali" && (sound.synth === "rain" || sound.synth === "tavern")
          ? { ...sound, synth: "file:legacy-amb-tavern", fileUrl: "/audio/ambience/tavern.wav", loop: true, duration: 0 }
          : sound;
      if (!normalized.ephemeral) sounds[normalized.id] = normalized;
    });
    const mergeById = <T extends { id: string }>(base: T[], additions: T[] = []) => {
      const map = new Map(base.map((item) => [item.id, item]));
      additions.forEach((item) => map.set(item.id, item));
      return [...map.values()];
    };
    const pads = mergeById(migrated.pads, parsed.pads).map((pad) => ({
      ...pad,
      soundIds: [...new Set(pad.soundIds.filter((id) => sounds[id]))],
    }));
    const scenes = mergeById(migrated.scenes, parsed.scenes ?? []).map((scene) => ({
      ...scene,
      layers: scene.layers.filter((layer) => sounds[layer.soundId]),
    }));
    return {
      ...migrated,
      ...parsed,
      sounds,
      pads,
      scenes,
      categories: mergeById(migrated.categories, parsed.categories ?? []),
      vistas: mergeById(migrated.vistas, parsed.vistas ?? []),
      favorites: [...new Set([...(migrated.favorites ?? []), ...(parsed.favorites ?? [])])].filter((id) => sounds[id]),
      vtt: { ...migrated.vtt, ...(parsed.vtt ?? {}) },
    };
  } catch {
    return migrateLegacyAudio(seedState, readJSON(LEGACY_KEY));
  }
}

/* ---------------- contexto ---------------- */
interface AppCtx {
  data: DataState;
  view: View;
  setView: (v: View) => void;
  filters: Filters;
  setTypeFilter: (t: SoundType | "Todos") => void;
  setCategoryFilter: (c: string) => void;
  setSearch: (s: string) => void;
  layers: LayerState[];
  paused: boolean;
  activeSceneId: string | null;
  sceneFadeMs: number;
  setSceneFadeMs: (ms: number) => void;
  toggleSound: (id: string) => void;
  stopLayer: (id: string) => void;
  stopAll: () => void;
  setLayerVolume: (id: string, v: number) => void;
  activateScene: (id: string) => void;
  togglePause: () => void;
  setMaster: (v: number) => void;
  updateSound: (id: string, patch: Partial<Sound>) => void;
  deleteSound: (id: string) => void;
  addSound: (sound: Sound, padId?: string) => void;
  addPad: (pad: Soundpad) => void;
  reorderInPad: (padId: string, soundId: string, targetId: string) => void;
  toggleFavorite: (id: string) => void;
  saveScene: (scene: Scene) => void;
  deleteScene: (id: string) => void;
  addCategory: (cat: Category) => void;
  saveVista: (v: Vista) => void;
  deleteVista: (id: string) => void;
  applyVista: (id: string) => void;
  setVtt: (patch: Partial<VttSettings>) => void;
  saveTrigger: (t: Trigger) => void;
  deleteTrigger: (id: string) => void;
  fireTrigger: (ev: VttEvent) => void;
  importJSON: (text: string) => boolean;
  importCommunity: () => void;
  toasts: Toast[];
  toast: (msg: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fora do provider");
  return c;
}

let toastSeq = 1;

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataState>(load);
  const [view, setView] = useState<View>({ kind: "pad", padId: seedState.pads[0].id });
  const [filters, setFilters] = useState<Filters>({ typeFilter: "Todos", categoryFilter: "all", search: "" });
  const [layers, setLayers] = useState<LayerState[]>([]);
  const [paused, setPaused] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [sceneFadeMs, setSceneFadeMs] = useState(2500);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dataRef = useRef(data);
  const layersRef = useRef(layers);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { layersRef.current = layers; }, [layers]);

  /* persistência */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {
        /* quota — estado segue em memória */
      }
    }, 350);
    return () => clearTimeout(t);
  }, [data]);

  /* master inicial */
  useEffect(() => {
    engine.setMaster(data.master);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = useCallback((msg: string, kind: Toast["kind"] = "ok") => {
    const id = toastSeq++;
    setToasts((ts) => [...ts.slice(-3), { id, msg, kind }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);

  /* ---------------- playback ---------------- */
  const startSound = useCallback((snd: Sound, volume: number, sceneId?: string, fadeInOverride?: number) => {
    const opts = {
      volume,
      loop: snd.loop,
      fadeIn: fadeInOverride ?? snd.fadeIn,
      onEnded: () => setLayers((ls) => ls.filter((l) => l.soundId !== snd.id)),
    };
    if (snd.synth.startsWith("file:")) {
      if (!snd.fileUrl) return;
      void engine.playFile(snd.id, snd.fileUrl, opts);
    } else {
      engine.play(snd.id, snd.synth, opts);
    }
    setLayers((ls) => [...ls.filter((l) => l.soundId !== snd.id), { soundId: snd.id, startedAt: Date.now(), volume, sceneId }]);
    if (sceneId) setActiveSceneId(sceneId);
  }, []);

  const toggleSound = useCallback((id: string) => {
    const snd = dataRef.current.sounds[id];
    if (!snd) return;
    if (engine.hasVoice(id)) {
      engine.stopVoice(id, snd.fadeOut);
      setLayers((ls) => ls.filter((l) => l.soundId !== id));
      return;
    }
    startSound(snd, snd.volume);
  }, [startSound]);

  const stopLayer = useCallback((id: string) => {
    const snd = dataRef.current.sounds[id];
    engine.stopVoice(id, snd?.fadeOut ?? 300);
    setLayers((ls) => ls.filter((l) => l.soundId !== id));
  }, []);

  const stopAll = useCallback(() => {
    engine.stopAll(140);
    setLayers([]);
    setActiveSceneId(null);
  }, []);

  const setLayerVolume = useCallback((id: string, v: number) => {
    engine.setVoiceVolume(id, v);
    setLayers((ls) => ls.map((l) => (l.soundId === id ? { ...l, volume: v } : l)));
  }, []);

  const activateScene = useCallback((id: string) => {
    const scene = dataRef.current.scenes.find((s) => s.id === id);
    if (!scene || scene.layers.length === 0) return;
    const fade = Math.max(300, scene.fadeMs);
    layersRef.current.forEach((l) => engine.stopVoice(l.soundId, fade));
    setLayers([]);
    setActiveSceneId(id);
    scene.layers.forEach((sl, idx) => {
      const snd = dataRef.current.sounds[sl.soundId];
      if (!snd) return;
      window.setTimeout(() => startSound(snd, sl.volume, id, fade), 200 + idx * 180);
    });
    toast(`Cena ativa — ${scene.name}`);
  }, [startSound, toast]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (p) engine.resume();
      else engine.suspend();
      return !p;
    });
  }, []);

  const setMaster = useCallback((v: number) => {
    engine.setMaster(v);
    setData((d) => ({ ...d, master: v }));
  }, []);

  /* ---------------- mutações de dados ---------------- */
  const updateSound = useCallback((id: string, patch: Partial<Sound>) => {
    setData((d) => ({ ...d, sounds: { ...d.sounds, [id]: { ...d.sounds[id], ...patch } } }));
  }, []);

  const deleteSound = useCallback((id: string) => {
    engine.stopVoice(id, 120);
    setData((d) => {
      const sounds = { ...d.sounds };
      delete sounds[id];
      return {
        ...d,
        sounds,
        pads: d.pads.map((p) => ({ ...p, soundIds: p.soundIds.filter((s) => s !== id) })),
        scenes: d.scenes.map((s) => ({ ...s, layers: s.layers.filter((l) => l.soundId !== id) })),
        favorites: d.favorites.filter((f) => f !== id),
      };
    });
    setLayers((ls) => ls.filter((l) => l.soundId !== id));
  }, []);

  const addSound = useCallback((sound: Sound, padId?: string) => {
    setData((d) => ({
      ...d,
      sounds: { ...d.sounds, [sound.id]: sound },
      pads: padId
        ? d.pads.map((p) => (p.id === padId && !p.soundIds.includes(sound.id) ? { ...p, soundIds: [...p.soundIds, sound.id] } : p))
        : d.pads,
    }));
  }, []);

  const addPad = useCallback((pad: Soundpad) => {
    setData((d) => ({ ...d, pads: [...d.pads, pad] }));
  }, []);

  const reorderInPad = useCallback((padId: string, soundId: string, targetId: string) => {
    setData((d) => ({
      ...d,
      pads: d.pads.map((p) => {
        if (p.id !== padId) return p;
        const ids = p.soundIds.filter((s) => s !== soundId);
        const idx = ids.indexOf(targetId);
        if (idx === -1) return p;
        ids.splice(idx, 0, soundId);
        return { ...p, soundIds: ids };
      }),
    }));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      favorites: d.favorites.includes(id) ? d.favorites.filter((f) => f !== id) : [...d.favorites, id],
    }));
  }, []);

  const saveScene = useCallback((scene: Scene) => {
    setData((d) => {
      const exists = d.scenes.some((s) => s.id === scene.id);
      return { ...d, scenes: exists ? d.scenes.map((s) => (s.id === scene.id ? scene : s)) : [...d.scenes, scene] };
    });
  }, []);

  const deleteScene = useCallback((id: string) => {
    setData((d) => ({ ...d, scenes: d.scenes.filter((s) => s.id !== id) }));
  }, []);

  const addCategory = useCallback((cat: Category) => {
    setData((d) => ({ ...d, categories: [...d.categories, cat] }));
  }, []);

  const saveVista = useCallback((v: Vista) => {
    setData((d) => ({ ...d, vistas: [...d.vistas.filter((x) => x.id !== v.id), v] }));
  }, []);

  const deleteVista = useCallback((id: string) => {
    setData((d) => ({ ...d, vistas: d.vistas.filter((v) => v.id !== id) }));
  }, []);

  const applyVista = useCallback((id: string) => {
    const v = dataRef.current.vistas.find((x) => x.id === id);
    if (!v) return;
    setFilters({ typeFilter: v.typeFilter, categoryFilter: v.categoryId, search: v.search });
    setView(v.padId === "favorites" ? { kind: "favorites" } : v.padId === "all" ? { kind: "all" } : { kind: "pad", padId: v.padId });
    toast(`Vista aplicada — ${v.name}`);
  }, [toast]);

  const setVtt = useCallback((patch: Partial<VttSettings>) => {
    setData((d) => ({ ...d, vtt: { ...d.vtt, ...patch } }));
  }, []);

  const saveTrigger = useCallback((t: Trigger) => {
    setData((d) => {
      const exists = d.vtt.triggers.some((x) => x.id === t.id);
      return {
        ...d,
        vtt: {
          ...d.vtt,
          triggers: exists ? d.vtt.triggers.map((x) => (x.id === t.id ? t : x)) : [...d.vtt.triggers, t],
        },
      };
    });
  }, []);

  const deleteTrigger = useCallback((id: string) => {
    setData((d) => ({ ...d, vtt: { ...d.vtt, triggers: d.vtt.triggers.filter((t) => t.id !== id) } }));
  }, []);

  const fireTrigger = useCallback((ev: VttEvent) => {
    const t = dataRef.current.vtt.triggers.find((x) => x.event === ev && x.enabled);
    if (!t) {
      toast(`Evento "${EVENT_LABELS[ev]}" sem trigger configurado`, "warn");
      return;
    }
    const scene = dataRef.current.scenes.find((s) => s.id === t.sceneId);
    if (scene) {
      activateScene(scene.id);
      toast(`Trigger VTT — ${EVENT_LABELS[ev]} ativou "${scene.name}"`);
    }
  }, [activateScene, toast]);

  const importJSON = useCallback((text: string): boolean => {
    try {
      const parsed = JSON.parse(text) as Partial<DataState> & { pad?: Soundpad; sounds?: Sound[] };
      if (Array.isArray(parsed.sounds) && parsed.pad) {
        // pacote de comunidade
        const packSounds = parsed.sounds;
        setData((d) => ({
          ...d,
          sounds: { ...d.sounds, ...Object.fromEntries(packSounds.map((s) => [s.id, s])) },
          pads: d.pads.some((p) => p.id === parsed.pad?.id) ? d.pads : [...d.pads, parsed.pad as Soundpad],
          scenes: [...d.scenes, ...((parsed.scenes as Scene[]) ?? []).filter((s) => !d.scenes.some((x) => x.id === s.id))],
        }));
        return true;
      }
      if (parsed.sounds && !Array.isArray(parsed.sounds) && parsed.pads) {
        const full = parsed as DataState;
        setData((d) => ({
          ...d,
          sounds: { ...d.sounds, ...full.sounds },
          pads: [...d.pads, ...full.pads.filter((p) => !d.pads.some((x) => x.id === p.id))],
          scenes: [...d.scenes, ...(full.scenes ?? []).filter((s) => !d.scenes.some((x) => x.id === s.id))],
          categories: [...d.categories, ...(full.categories ?? []).filter((c) => !d.categories.some((x) => x.id === c.id))],
          vistas: [...d.vistas, ...(full.vistas ?? []).filter((v) => !d.vistas.some((x) => x.id === v.id))],
          favorites: [...new Set([...d.favorites, ...(full.favorites ?? [])])],
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const importCommunity = useCallback(() => {
    const pack = communityPack();
    if (dataRef.current.pads.some((p) => p.id === pack.pad.id)) {
      toast("Pacote Eldritch já está na sua biblioteca", "warn");
      return;
    }
    setData((d) => {
      if (d.pads.some((p) => p.id === pack.pad.id)) return d;
      return {
        ...d,
        sounds: { ...d.sounds, ...Object.fromEntries(pack.sounds.map((s) => [s.id, s])) },
        pads: [...d.pads, pack.pad],
        scenes: [...d.scenes, ...pack.scenes],
      };
    });
    toast("Biblioteca comunitária importada — Pacote Eldritch");
  }, [toast]);

  const value = useMemo<AppCtx>(() => ({
    data, view, setView, filters,
    setTypeFilter: (t) => setFilters((f) => ({ ...f, typeFilter: t })),
    setCategoryFilter: (c) => setFilters((f) => ({ ...f, categoryFilter: c })),
    setSearch: (s) => setFilters((f) => ({ ...f, search: s })),
    layers, paused, activeSceneId, sceneFadeMs, setSceneFadeMs,
    toggleSound, stopLayer, stopAll, setLayerVolume, activateScene, togglePause, setMaster,
    updateSound, deleteSound, addSound, addPad, reorderInPad, toggleFavorite,
    saveScene, deleteScene, addCategory, saveVista, deleteVista, applyVista,
    setVtt, saveTrigger, deleteTrigger, fireTrigger,
    importJSON, importCommunity,
    toasts, toast, dismissToast,
  }), [
    data, view, filters, layers, paused, activeSceneId, sceneFadeMs,
    toggleSound, stopLayer, stopAll, setLayerVolume, activateScene, togglePause, setMaster,
    updateSound, deleteSound, addSound, addPad, reorderInPad, toggleFavorite,
    saveScene, deleteScene, addCategory, saveVista, deleteVista, applyVista,
    setVtt, saveTrigger, deleteTrigger, fireTrigger, importJSON, importCommunity,
    toasts, toast, dismissToast,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ---------------- exportadores ---------------- */
export function exportJSON(data: DataState) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "arcanum-soundboard.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function exportWebp(layers: LayerState[], data: DataState, sceneName: string | null) {
  const W = 1280;
  const H = 720;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  if (!g) return;
  g.fillStyle = "#0a100e";
  g.fillRect(0, 0, W, H);
  const grad = g.createRadialGradient(W / 2, 120, 60, W / 2, 120, 900);
  grad.addColorStop(0, "rgba(47,212,140,0.10)");
  grad.addColorStop(0.5, "rgba(183,140,255,0.05)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  /* moldura chanfrada */
  g.strokeStyle = "#e6c15c";
  g.lineWidth = 3;
  g.beginPath();
  const c = 42;
  g.moveTo(c, 24); g.lineTo(W - c, 24); g.lineTo(W - 24, c); g.lineTo(W - 24, H - c);
  g.lineTo(W - c, H - 24); g.lineTo(c, H - 24); g.lineTo(24, H - c); g.lineTo(24, c);
  g.closePath(); g.stroke();
  g.textAlign = "center";
  g.fillStyle = "#e6c15c";
  g.font = "700 64px Cinzel, serif";
  g.fillText("A R C A N U M", W / 2, 150);
  g.fillStyle = "#8fa79b";
  g.font = "500 26px Sora, sans-serif";
  g.fillText(sceneName ? `Cena ativa — ${sceneName}` : "Painel do Mestre", W / 2, 200);
  g.font = "400 20px 'JetBrains Mono', monospace";
  g.fillText(new Date().toLocaleString("pt-BR"), W / 2, 236);
  /* camadas */
  let y = 310;
  g.textAlign = "left";
  if (layers.length === 0) {
    g.fillStyle = "#5f7569";
    g.font = "400 24px Sora, sans-serif";
    g.textAlign = "center";
    g.fillText("— silêncio absoluto —", W / 2, y);
  }
  layers.forEach((l) => {
    const snd = data.sounds[l.soundId];
    if (!snd) return;
    const cat = data.categories.find((x) => x.id === snd.categoryId);
    const color = cat?.color ?? "#4ce6a5";
    g.save();
    g.translate(120, y - 8);
    g.rotate(Math.PI / 4);
    g.fillStyle = color;
    g.fillRect(-7, -7, 14, 14);
    g.restore();
    g.fillStyle = "#e9f2ec";
    g.font = "600 26px Sora, sans-serif";
    g.fillText(snd.name, 152, y);
    g.fillStyle = "#5f7569";
    g.font = "400 18px 'JetBrains Mono', monospace";
    g.fillText(`${snd.type.toUpperCase()} · VOL ${l.volume}%`, 152, y + 28);
    /* barra de volume */
    g.fillStyle = "#1d2c27";
    g.fillRect(640, y - 16, 480, 14);
    g.fillStyle = color;
    g.fillRect(640, y - 16, 480 * (l.volume / 100), 14);
    y += 78;
    if (y > H - 90) return;
  });
  g.textAlign = "center";
  g.fillStyle = "#5f7569";
  g.font = "400 18px Sora, sans-serif";
  g.fillText("Central Soundboard do Mestre · exportado via ARCANUM", W / 2, H - 52);
  let url = cv.toDataURL("image/webp", 0.92);
  let ext = "webp";
  if (!url.includes("data:image/webp")) {
    url = cv.toDataURL("image/png");
    ext = "png";
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = `arcanum-cena.${ext}`;
  a.click();
}
