export type SoundType = "SFX" | "Música" | "Ambiente";

export interface Category {
  id: string;
  name: string;
  color: string;
  custom?: boolean;
}

export interface Sound {
  id: string;
  name: string;
  icon: string;
  categoryId: string;
  type: SoundType;
  /** id da receita do motor procedural, ou "file:<id>" para uploads */
  synth: string;
  /** duração em segundos (0 = contínuo/infinito) */
  duration: number;
  loop: boolean;
  volume: number; // 0..100
  fadeIn: number; // ms
  fadeOut: number; // ms
  ephemeral?: boolean; // upload mantido apenas na sessão atual
  fileUrl?: string;
  hotkey?: string; // atalho de teclado rápido (ex: '1', '2', 'Numpad1')
  createdAt: number;
}

export interface Soundpad {
  id: string;
  name: string;
  icon: string;
  color: string;
  soundIds: string[];
}

export interface SceneLayer {
  soundId: string;
  volume: number; // 0..100
}

export interface Scene {
  id: string;
  name: string;
  icon: string;
  layers: SceneLayer[];
  fadeMs: number;
}

export interface Vista {
  id: string;
  name: string;
  padId: string; // id do soundpad | "favorites" | "all"
  typeFilter: SoundType | "Todos";
  categoryId: string; // id da categoria | "all"
  search: string;
}

export type VttEvent =
  | "combat_start"
  | "combat_end"
  | "long_rest"
  | "enter_dungeon"
  | "boss_appears"
  | "nat20"
  | "player_death";

export interface Trigger {
  id: string;
  event: VttEvent;
  sceneId: string;
  enabled: boolean;
}

export interface VttSettings {
  foundryUrl: string;
  foundryConnected: boolean;
  roll20Key: string;
  roll20Connected: boolean;
  playerSync: boolean;
  triggers: Trigger[];
}

export interface DataState {
  sounds: Record<string, Sound>;
  pads: Soundpad[];
  scenes: Scene[];
  categories: Category[];
  vistas: Vista[];
  favorites: string[];
  vtt: VttSettings;
  master: number;
}

export interface LayerState {
  soundId: string;
  startedAt: number;
  volume: number;
  sceneId?: string;
}
