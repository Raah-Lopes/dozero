import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

// The Yjs document that holds the entire shared state
export const doc = new Y.Doc();
const roomName = 'vtt-dozero-dev-room';

// =========================================================================
// REAL-TIME LOCAL MULTIPLAYER (CROSS-TAB SYNC)
// =========================================================================
// This creates a direct peer-to-peer tunnel between your browser tabs
const channel = new BroadcastChannel(roomName);

// When this tab makes a change, broadcast the raw Yjs binary delta to other tabs
doc.on('update', (update, origin) => {
  if (origin !== channel) {
    // ArrayBuffer is strictly supported by all structured clone algorithms
    channel.postMessage(update.buffer);
  }
});

// When other tabs broadcast a change, apply it to this tab's document
channel.onmessage = (event) => {
  try {
    const update = new Uint8Array(event.data);
    Y.applyUpdate(doc, update, channel);
  } catch (e) {
    console.error("Yjs Sync Error:", e);
  }
};

// IndexeddbPersistence saves the document locally so it survives F5
export const indexeddbProvider = new IndexeddbPersistence(roomName, doc);

export const provider = new WebsocketProvider(
  'ws://localhost:1234', 
  roomName, 
  doc, 
  { connect: false } // we don't connect to websocket yet to avoid console errors
);

export const state = {
  tokens: doc.getMap('tokens'),
  chat: doc.getArray('chat'),
  wiki: doc.getMap('wiki'),
  backgrounds: doc.getMap('backgrounds'),
  combat: doc.getMap('combat'),
  clocks: doc.getMap('clocks'),
  mapConfig: doc.getMap('mapConfig'),
  wikiConfig: doc.getMap('wikiConfig'),
  campaigns: doc.getMap('campaigns'),
  theater: doc.getMap('theater'),
  chronos: doc.getMap('chronos'),
  dlcs: doc.getMap('dlcs'),
  world: doc.getMap('world'),
  stronghold: doc.getMap('stronghold'),
};

// =========================================================================
// EPHEMERAL LOCAL STATE (Not synced to other players, just for this client)
// =========================================================================
export const localState = {
  targets: new Set<string>(),
  selectedBgs: new Set<string>(),
  selectedTokens: new Set<string>(),
};

export function toggleTarget(tokenId: string) {
  if (localState.targets.has(tokenId)) {
    localState.targets.delete(tokenId);
  } else {
    localState.targets.add(tokenId);
  }
  // Dispatch event so UI can react
  window.dispatchEvent(new Event('targets-updated'));
}

export function getTargets(): string[] {
  return Array.from(localState.targets);
}
export function clearTargets() {
  localState.targets.clear();
  window.dispatchEvent(new Event('targets-updated'));
}

export function toggleTokenSelection(tokenId: string, multi: boolean) {
  if (!localState.selectedTokens) localState.selectedTokens = new Set<string>();

  if (!multi) localState.selectedTokens.clear();
  
  if (localState.selectedTokens.has(tokenId)) {
    localState.selectedTokens.delete(tokenId);
  } else {
    localState.selectedTokens.add(tokenId);
  }
  window.dispatchEvent(new Event('token-selection-updated'));
}

export function selectTokensBulk(tokenIds: string[]) {
  if (!localState.selectedTokens) localState.selectedTokens = new Set<string>();
  localState.selectedTokens.clear();
  tokenIds.forEach(id => localState.selectedTokens.add(id));
  window.dispatchEvent(new Event('token-selection-updated'));
}

export function clearTokenSelection() {
  if (!localState.selectedTokens) localState.selectedTokens = new Set<string>();
  localState.selectedTokens.clear();
  window.dispatchEvent(new Event('token-selection-updated'));
}

export function getSelectedTokens(): string[] {
  if (!localState.selectedTokens) return [];
  return Array.from(localState.selectedTokens);
}

export function toggleBgSelection(id: string, multi: boolean) {
  if (!multi) localState.selectedBgs.clear();
  
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  const groupId = bg?.groupId;

  // Identify all IDs to toggle (the clicked one, plus any in the same group)
  const idsToToggle = new Set([id]);
  if (groupId) {
    for (const [bgId, bgData] of state.backgrounds.entries()) {
      if ((bgData as BackgroundData).groupId === groupId) {
        idsToToggle.add(bgId);
      }
    }
  }

  // Toggle them
  const isSelected = localState.selectedBgs.has(id);
  idsToToggle.forEach(toggleId => {
    if (isSelected) {
      localState.selectedBgs.delete(toggleId);
    } else {
      localState.selectedBgs.add(toggleId);
    }
  });

  window.dispatchEvent(new Event('bg-selection-updated'));
}

export function clearBgSelection() {
  localState.selectedBgs.clear();
  window.dispatchEvent(new Event('bg-selection-updated'));
}

export interface BackgroundData {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  opacity?: number;
  locked?: boolean;
  hidden?: boolean;
  groupId?: string;
  zIndex?: number;
}

export function addBackground(bg: BackgroundData) {
  state.backgrounds.set(bg.id, bg);
}

export function toggleBackgroundLock(id: string, forceLocked?: boolean) {
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  if (bg) {
    const isLocked = forceLocked !== undefined ? forceLocked : !bg.locked;
    state.backgrounds.set(id, { ...bg, locked: isLocked });
  }
}

export function updateBackgroundProps(id: string, updates: Partial<BackgroundData>) {
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  if (bg) {
    state.backgrounds.set(id, { ...bg, ...updates });
  }
}

export function updateBackgroundPosition(id: string, x: number, y: number) {
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  if (bg && (bg.x !== x || bg.y !== y)) {
    state.backgrounds.set(id, { ...bg, x, y });
  }
}

export function removeBackground(id: string) {
  state.backgrounds.delete(id);
}

// Initialize mock state ONLY if the database is truly empty after loading
indexeddbProvider.on('synced', () => {
  // Inicializa mapa de combate se vazio
  if (!state.combat.has('isActive')) {
    state.combat.set('isActive', false);
    state.combat.set('turnIndex', 0);
    state.combat.set('participants', []);
  }

  // Limpeza do personagem antigo
  if (state.tokens.has('goblin_boss')) {
    state.tokens.delete('goblin_boss');
  }

  const sentinel = state.tokens.get('omega_sentinel') as any;
  if (!sentinel) {
    state.tokens.set('omega_sentinel', { id: 'omega_sentinel', name: 'Sentinela Ômega', hp: 150, maxHp: 150, mana: 50, maxMana: 50, x: 800, y: 400 });
  }
  if (!state.world.has('factions')) {
    state.world.set('factions', [
      { id: 'f1', name: 'A Coroa Imperial', power: 50, influence: 50 },
      { id: 'f2', name: 'O Sindicato das Sombras', power: 40, influence: 60 }
    ]);
  }
  if (!state.world.has('settlements')) {
    state.world.set('settlements', [
      { id: 's1', name: 'A Capital', corruption: 20, economy: 80 }
    ]);
  }
  if (!state.stronghold.has('data')) {
    state.stronghold.set('data', {
      name: 'Refúgio de Arcanus',
      treasury: 500,
      upgrades: [] // ex: 'cozinha', 'poco', 'camas', 'altar'
    });
  }
});

export function connectProvider() {
  provider.connect();
}

export function disconnectProvider() {
  provider.disconnect();
}

// Helper to push a chat message
export function pushChatMessage(message: string, isCritical: boolean = false, isFailure: boolean = false) {
  state.chat.push([{ text: message, isCritical, isFailure, timestamp: Date.now() }]);
}

// Helper to apply damage
export function applyDamageToToken(tokenId: string, damage: number) {
  const token = state.tokens.get(tokenId) as any;
  if (token) {
    const newHp = Math.max(0, token.hp - damage);
    state.tokens.set(tokenId, { ...token, hp: newHp });
  }
}

// Helper para Forja de Entidades: Instanciar um novo token
export function addTokenFromMarkdown(tokenData: any) {
  const id = `token_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  state.tokens.set(id, {
    id,
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    ...tokenData
  });
  pushChatMessage(`⚡ <b>${tokenData.name || 'Entidade Desconhecida'}</b> foi forjado(a) e adicionado(a) à mesa!`, true, false);
}

// Helper to update token properties flexibly from Character Sheet
export function updateTokenProps(tokenId: string, props: Partial<any>) {
  const token = state.tokens.get(tokenId) as any;
  if (token) {
    state.tokens.set(tokenId, { ...token, ...props });
  }
}

// Helper to update token spatial position
export function updateTokenPosition(tokenId: string, x: number, y: number) {
  const token = state.tokens.get(tokenId) as any;
  if (token) {
    // Only update if it actually moved to save network bandwidth
    if (token.x !== x || token.y !== y) {
      state.tokens.set(tokenId, { ...token, x, y });
    }
  }
}

// =========================================================================
// COMBAT TRACKER HELPERS
// =========================================================================
export interface CombatCondition {
  id: string;
  name: string;
  durationTurns: number;
  type: 'damage' | 'heal' | 'buff' | 'debuff';
  value?: number;
  icon?: string;
}

export interface CombatParticipant {
  tokenId: string;
  name: string;
  initiative: number;
  imageUrl?: string;
  conditions?: CombatCondition[];
}

export function addCombatParticipant(tokenId: string, name: string, initiative: number, imageUrl?: string) {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  const existingIndex = participants.findIndex(p => p.tokenId === tokenId);
  
  let newParticipants = [...participants];
  if (existingIndex >= 0) {
    newParticipants[existingIndex].initiative = initiative;
    if (imageUrl) newParticipants[existingIndex].imageUrl = imageUrl;
  } else {
    newParticipants.push({ tokenId, name, initiative, imageUrl, conditions: [] });
  }

  // Sort descending by initiative
  newParticipants.sort((a, b) => b.initiative - a.initiative);
  
  state.combat.set('participants', newParticipants);
}

export function addConditionToParticipant(tokenId: string, condition: CombatCondition) {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  const newParticipants = [...participants];
  const idx = newParticipants.findIndex(p => p.tokenId === tokenId);
  if (idx >= 0) {
    if (!newParticipants[idx].conditions) newParticipants[idx].conditions = [];
    newParticipants[idx].conditions!.push(condition);
    state.combat.set('participants', newParticipants);
  }
}

export function removeConditionFromParticipant(tokenId: string, conditionId: string) {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  const newParticipants = [...participants];
  const idx = newParticipants.findIndex(p => p.tokenId === tokenId);
  if (idx >= 0 && newParticipants[idx].conditions) {
    newParticipants[idx].conditions = newParticipants[idx].conditions!.filter(c => c.id !== conditionId);
    state.combat.set('participants', newParticipants);
  }
}

export function removeCombatParticipant(tokenId: string) {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  const newParticipants = participants.filter(p => p.tokenId !== tokenId);
  state.combat.set('participants', newParticipants);
  
  // Adjust turnIndex if needed
  let turnIndex = state.combat.get('turnIndex') as number;
  if (turnIndex >= newParticipants.length && newParticipants.length > 0) {
    state.combat.set('turnIndex', 0);
  }
}

export function nextCombatTurn() {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  if (participants.length === 0) return;
  
  let turnIndex = state.combat.get('turnIndex') as number;
  const currentParticipant = participants[turnIndex];

  // Process Conditions for current participant BEFORE moving to the next
  if (currentParticipant && currentParticipant.conditions && currentParticipant.conditions.length > 0) {
    let newConditions = [...currentParticipant.conditions];
    const token = state.tokens.get(currentParticipant.tokenId) as any;
    
    if (token) {
      let hpChange = 0;
      let logMessages: string[] = [];

      newConditions = newConditions.filter(cond => {
        if (cond.type === 'damage' && cond.value) {
          hpChange -= cond.value;
          logMessages.push(`💀 <b>${cond.name}</b> causou ${cond.value} de dano a ${currentParticipant.name}.`);
        } else if (cond.type === 'heal' && cond.value) {
          hpChange += cond.value;
          logMessages.push(`💚 <b>${cond.name}</b> curou ${cond.value} PV de ${currentParticipant.name}.`);
        }

        cond.durationTurns -= 1;
        if (cond.durationTurns <= 0) {
          logMessages.push(`⏳ O efeito de <b>${cond.name}</b> acabou em ${currentParticipant.name}.`);
          return false; // Remove condition
        }
        return true; // Keep condition
      });

      // Apply HP change
      if (hpChange !== 0) {
        const newHp = Math.max(0, Math.min(token.maxHp || 9999, (token.hp || 0) + hpChange));
        state.tokens.set(currentParticipant.tokenId, { ...token, hp: newHp });
      }

      // Send logs to chat
      logMessages.forEach(msg => {
        state.chat.push([{ text: msg, timestamp: Date.now(), isCritical: false, isFailure: false }]);
      });

      // Save back conditions
      const newParticipants = [...participants];
      newParticipants[turnIndex].conditions = newConditions;
      state.combat.set('participants', newParticipants);
    }
  }

  turnIndex = (turnIndex + 1) % participants.length;
  state.combat.set('turnIndex', turnIndex);
}

export function clearCombat() {
  state.combat.set('participants', []);
  state.combat.set('turnIndex', 0);
  state.combat.set('isActive', false);
}

// =========================================================================
// TENSION CLOCKS HELPERS
// =========================================================================
export interface TensionClock {
  id: string;
  x: number;
  y: number;
  label: string;
  durationMs: number;
  endTime: number;
  isRunning: boolean;
  hpMod: string; // Ex: '-80%', '+10'
  mpMod: string; // Ex: '-5'
  pausedRemainingMs?: number; // Guarda o tempo exato em que foi pausado
}

export interface MapConfig {
  gridSize: number;
  gridType: 'square' | 'hex_v' | 'hex_h' | 'dots_square' | 'dots_hex';
  gridColor: string; // Hex string ex: '#1e293b'
  gridAlpha: number;
}

export function getMapConfig(): MapConfig {
  const current = state.mapConfig.get('global');
  if (current) {
    return current as MapConfig;
  }
  return {
    gridSize: 50,
    gridType: 'square',
    gridColor: '#1e293b',
    gridAlpha: 0.5
  };
}

export function updateMapConfig(config: Partial<MapConfig>) {
  const current = getMapConfig();
  state.mapConfig.set('global', { ...current, ...config });
}

export interface WikiConfig {
  repoUrl: string; // ex: 'Raah-Lopes/rpg-obsidian-mestre-guiado'
  branch: string;  // ex: 'main'
  token: string;   // Optional personal access token
}

export function getWikiConfig(): WikiConfig {
  const current = state.wikiConfig.get('global');
  if (current) {
    const config = current as WikiConfig;
    if (config.repoUrl === 'D:/wikidozero') {
      config.repoUrl = 'D:/DOZERO/wikidozero';
      // Avoid infinite loop / side effects by just returning the corrected value
      // User can save again in settings later
    }
    return config;
  }
  return {
    repoUrl: 'D:/DOZERO/wikidozero',
    branch: 'main',
    token: ''
  };
}

export function updateWikiConfig(config: Partial<WikiConfig>) {
  const current = getWikiConfig();
  state.wikiConfig.set('global', { ...current, ...config });
}

export function addTensionClock(clock: TensionClock) {
  state.clocks.set(clock.id, clock);
}

export function updateTensionClockProps(id: string, props: Partial<TensionClock>) {
  const clock = state.clocks.get(id) as TensionClock;
  if (clock) {
    state.clocks.set(id, { ...clock, ...props });
  }
}

export function removeTensionClock(id: string) {
  state.clocks.delete(id);
}

function applyMod(currentValue: number, modStr: string): number {
  if (!modStr || modStr === '0' || modStr === '') return currentValue;
  const str = modStr.trim();
  const isPercent = str.endsWith('%');
  const valStr = isPercent ? str.slice(0, -1) : str;
  const val = parseFloat(valStr);
  if (isNaN(val)) return currentValue;

  if (isPercent) {
     return Math.max(0, Math.floor(currentValue + (currentValue * (val / 100))));
  } else {
     return Math.max(0, Math.floor(currentValue + val));
  }
}

export function triggerClockConsequence(id: string) {
  const clock = state.clocks.get(id) as TensionClock;
  if (!clock) return;

  // Stop the clock
  state.clocks.set(id, { ...clock, isRunning: false });

  const chatArray = state.chat;
  chatArray.push([{
    text: `O relógio "${clock.label}" zerou! Consequências -> HP: ${clock.hpMod || '0'} | MP: ${clock.mpMod || '0'}`,
    timestamp: Date.now(),
    isCritical: true,
    isFailure: false
  }]);

  // Aplica as regras dinâmicas
  for (const key of state.tokens.keys()) {
    const t = state.tokens.get(key) as any;
    if (t) {
      let updated = false;
      const newT = { ...t };
      
      // Checa formato raiz (t.hp)
      if (typeof t.hp === 'number') {
         newT.hp = applyMod(t.hp, clock.hpMod);
         updated = true;
      }
      if (typeof t.mana === 'number') {
         newT.mana = applyMod(t.mana, clock.mpMod);
         updated = true;
      }
      
      // Checa formato aninhado (t.stats.hp)
      if (t.stats && typeof t.stats.hp === 'number') {
         newT.stats = { ...t.stats };
         newT.stats.hp = applyMod(t.stats.hp, clock.hpMod);
         if (typeof t.stats.mana === 'number') {
            newT.stats.mana = applyMod(t.stats.mana, clock.mpMod);
         }
         updated = true;
      }
      
      if (updated) {
         state.tokens.set(key, newT);
      }
    }
  }
}

// =========================================================================
// CAMPAIGN MANAGER
// =========================================================================

export interface CampaignArc {
  id: string;
  name: string;
  description: string;
  status: 'planned' | 'active' | 'completed';
  /** Caminho relativo do arquivo .md na wiki, ex: "Campanhas/Minha Camp/Arcos/Arco 1.md" */
  filePath?: string;
}

export interface CampaignSession {
  id: string;
  date: string;
  summary: string;
  status: 'upcoming' | 'completed';
  /** Caminho relativo do arquivo .md na wiki, ex: "Campanhas/Minha Camp/Sessoes/2026-06-17_Sessao-01.md" */
  filePath?: string;
}

export interface CampaignData {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  status: 'active' | 'hiatus' | 'completed';
  /** Pasta raiz desta campanha na wiki, ex: "Campanhas/Minha Campanha" */
  folderPath?: string;
  /** Arquivo de visão geral, ex: "Campanhas/Minha Campanha/_campanha.md" */
  overviewPath?: string;
  arcs: CampaignArc[];
  sessions: CampaignSession[];
}

export function createCampaign(campaign: Omit<CampaignData, 'id'>) {
  const id = `campaign_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  state.campaigns.set(id, { ...campaign, id });
}

export function updateCampaign(id: string, updates: Partial<CampaignData>) {
  const c = state.campaigns.get(id) as CampaignData | undefined;
  if (c) {
    state.campaigns.set(id, { ...c, ...updates });
  }
}

export function deleteCampaign(id: string) {
  state.campaigns.delete(id);
}

// =========================================================================
// TEATRO DA MENTE — TIPOS E HELPERS
// =========================================================================

export type MoodType = 'neutral' | 'suspense' | 'horror' | 'adventure' | 'victory' | 'sadness' | 'mystery' | 'combat';
export type WeatherType = 'clear' | 'rain' | 'storm' | 'fog' | 'snow' | 'fire' | 'darkness';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type NarrativeStatus = 'intact' | 'hurt' | 'wounded' | 'critical' | 'dead';
export type DistanceZone = 'melee' | 'close' | 'medium' | 'far' | 'extreme';
export type DiaryEntryType = 'scene' | 'combat' | 'clock' | 'objective' | 'condition' | 'narrative';

export interface TheaterObjective {
  id: string;
  text: string;
  completed: boolean;
  secret: boolean;
}

export interface SceneAsset {
  id: string;
  title: string;
  url: string; // Base64 data or web URL
  description?: string;
  link?: string; // Path to a Wiki page or custom URL
  type?: 'npc' | 'monster' | 'location' | 'prop' | 'other';
}

export interface TheaterScene {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl?: string;
  mood: MoodType;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  objectives: TheaterObjective[];
  tags: string[];
  assets?: SceneAsset[];
}

export interface TheaterEnemy {
  id: string;
  name: string;
  status: NarrativeStatus;
  conditions: string[];
  isElite: boolean;
  isBoss: boolean;
  notes: string;
}

export interface DiaryEntry {
  id: string;
  timestamp: number;
  type: DiaryEntryType;
  text: string;
}

export interface DistanceEntry {
  id: string;
  entityA: string;
  entityB: string;
  zone: DistanceZone;
}

export interface TheaterStateData {
  currentSceneId: string;
  scenes: TheaterScene[];
  enemies: TheaterEnemy[];
  castConditions: Record<string, string[]>;
  mood: MoodType;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  diaryEntries: DiaryEntry[];
  distanceMap: DistanceEntry[];
}

const THEATER_DEFAULT: TheaterStateData = {
  currentSceneId: '',
  scenes: [],
  enemies: [],
  castConditions: {},
  mood: 'neutral',
  weather: 'clear',
  timeOfDay: 'day',
  diaryEntries: [],
  distanceMap: [],
};

export function getTheaterState(): TheaterStateData {
  const current = state.theater.get('global');
  if (current) return current as TheaterStateData;
  return { ...THEATER_DEFAULT };
}

export function updateTheaterState(updates: Partial<TheaterStateData>) {
  const current = getTheaterState();
  state.theater.set('global', { ...current, ...updates });
}

export function addTheaterDiaryEntry(entry: Omit<DiaryEntry, 'id'>) {
  const current = getTheaterState();
  const newEntry: DiaryEntry = { ...entry, id: `diary_${Date.now()}` };
  const entries = [...current.diaryEntries.slice(-200), newEntry];
  state.theater.set('global', { ...current, diaryEntries: entries });
}

export function addTheaterScene(scene: Omit<TheaterScene, 'id'>): string {
  const current = getTheaterState();
  const id = `scene_${Date.now()}`;
  const newScene: TheaterScene = { ...scene, id };
  state.theater.set('global', { ...current, scenes: [...current.scenes, newScene] });
  return id;
}

export function updateTheaterScene(id: string, updates: Partial<TheaterScene>) {
  const current = getTheaterState();
  const scenes = current.scenes.map(s => s.id === id ? { ...s, ...updates } : s);
  state.theater.set('global', { ...current, scenes });
}

export function removeTheaterScene(id: string) {
  const current = getTheaterState();
  const scenes = current.scenes.filter(s => s.id !== id);
  const currentSceneId = current.currentSceneId === id ? (scenes[0]?.id || '') : current.currentSceneId;
  state.theater.set('global', { ...current, scenes, currentSceneId });
}

export function addTheaterEnemy(enemy: Omit<TheaterEnemy, 'id'>): string {
  const current = getTheaterState();
  const id = `enemy_${Date.now()}`;
  const newEnemy: TheaterEnemy = { ...enemy, id };
  state.theater.set('global', { ...current, enemies: [...current.enemies, newEnemy] });
  return id;
}

export function updateTheaterEnemy(id: string, updates: Partial<TheaterEnemy>) {
  const current = getTheaterState();
  const enemies = current.enemies.map(e => e.id === id ? { ...e, ...updates } : e);
  state.theater.set('global', { ...current, enemies });
}

export function removeTheaterEnemy(id: string) {
  const current = getTheaterState();
  state.theater.set('global', { ...current, enemies: current.enemies.filter(e => e.id !== id) });
}

export function setTheaterMood(mood: MoodType) {
  updateTheaterState({ mood });
  addTheaterDiaryEntry({ timestamp: Date.now(), type: 'narrative', text: `🎭 Atmosfera alterada: ${mood}` });
}

export function setTheaterWeather(weather: WeatherType) {
  updateTheaterState({ weather });
  addTheaterDiaryEntry({ timestamp: Date.now(), type: 'narrative', text: `🌦️ Clima alterado: ${weather}` });
}

export function toggleCastCondition(personagemId: string, conditionId: string) {
  const current = getTheaterState();
  const existing = current.castConditions[personagemId] || [];
  const hasCondition = existing.includes(conditionId);
  const updated = hasCondition
    ? existing.filter(c => c !== conditionId)
    : [...existing, conditionId];
  state.theater.set('global', {
    ...current,
    castConditions: { ...current.castConditions, [personagemId]: updated },
  });
}

// =========================================================================
// CHRONOS ENGINE (A Campanha Viva)
// =========================================================================
export interface ChronosState {
  day: number;
  month: number;
  year: number;
  timeOfDay: 'Manhã' | 'Tarde' | 'Noite' | 'Madrugada';
  season: 'Primavera' | 'Verão' | 'Outono' | 'Inverno';
}

export function initChronos() {
  if (!state.chronos.get('global')) {
    state.chronos.set('global', {
      day: 1,
      month: 1,
      year: 1450,
      timeOfDay: 'Manhã',
      season: 'Primavera'
    });
  }
}

export function getChronosState(): ChronosState {
  return (state.chronos.get('global') as ChronosState) || { day: 1, month: 1, year: 1450, timeOfDay: 'Manhã', season: 'Primavera' };
}

export function advanceDay() {
  const current = getChronosState();
  const times = ['Manhã', 'Tarde', 'Noite', 'Madrugada'];
  
  let newDay = current.day + 1;
  let newMonth = current.month;
  let newYear = current.year;
  let newSeason = current.season;

  if (newDay > 30) {
    newDay = 1;
    newMonth += 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    // Update Season
    if (newMonth >= 3 && newMonth <= 5) newSeason = 'Outono';
    else if (newMonth >= 6 && newMonth <= 8) newSeason = 'Inverno';
    else if (newMonth >= 9 && newMonth <= 11) newSeason = 'Primavera';
    else newSeason = 'Verão';
  }

  state.chronos.set('global', { ...current, day: newDay, month: newMonth, year: newYear, season: newSeason, timeOfDay: 'Manhã' });
  
  // LOGICA DE CONSEQUENCIAS (FOME/SEDE)
  pushChatMessage(`🌅 <b>Um novo dia amanheceu!</b> (${newDay}/${newMonth}/${newYear}) - ${newSeason}`, true, false);
  
  const tokens = Array.from(state.tokens.entries()) as [string, any][];
  let famintos = 0;
  
  for (const [id, token] of tokens) {
    if (token.hp > 0 && token.isPlayer !== false) { // Apenas heróis
      let hunger = token.hunger || 0;
      let thirst = token.thirst || 0;
      let sanity = token.sanity !== undefined ? token.sanity : 100;

      // Todo dia aumenta a fome e sede
      hunger = Math.min(100, hunger + 25);
      thirst = Math.min(100, thirst + 25);
      
      let newHp = token.hp;
      if (hunger >= 100) newHp -= 5;
      if (thirst >= 100) newHp -= 5;

      newHp = Math.max(0, newHp);
      
      if (hunger >= 100 || thirst >= 100) {
        famintos++;
      }

      state.tokens.set(id, { ...token, hp: newHp, hunger, thirst, sanity });
    }
  }

  if (famintos > 0) {
    pushChatMessage(`💀 ${famintos} aventureiros estão sofrendo danos reais por Fome ou Sede Extrema (100%)!`, false, true);
  }

  // LOGICA DO MOTOR DE MUNDO (FACÇÕES E CORRUPÇÃO)
  // Roda a simulação a cada 7 dias (Semanas)
  if (newDay % 7 === 0) {
    const factions = state.world.get('factions') as any[] || [];
    const settlements = state.world.get('settlements') as any[] || [];
    
    if (factions.length > 0) {
      pushChatMessage(`🌐 <b>O Mundo Gira:</b> Uma semana se passou. Movimentos geopolíticos ocorrem nas sombras...`, true, false);
      
      const newFactions = factions.map(f => {
        // Flutuação aleatória de poder (-5 a +5)
        const shift = Math.floor(Math.random() * 11) - 5;
        return { ...f, power: Math.max(0, Math.min(100, f.power + shift)) };
      });
      state.world.set('factions', newFactions);

      // Sindicato vs Coroa
      const sindicato = newFactions.find(f => f.id === 'f2');
      const coroa = newFactions.find(f => f.id === 'f1');
      
      if (sindicato && coroa && sindicato.power > coroa.power) {
        // Corrupção aumenta
        const newSettlements = settlements.map(s => {
          if (s.id === 's1') return { ...s, corruption: Math.min(100, s.corruption + 5) };
          return s;
        });
        state.world.set('settlements', newSettlements);
        pushChatMessage(`🗡️ O Sindicato das Sombras expandiu seu poder! A Corrupção na Capital aumentou!`, false, true);
      } else if (coroa && sindicato && coroa.power > sindicato.power) {
        const newSettlements = settlements.map(s => {
          if (s.id === 's1') return { ...s, economy: Math.min(100, s.economy + 5) };
          return s;
        });
        state.world.set('settlements', newSettlements);
        pushChatMessage(`🛡️ A Coroa Imperial impôs ordem. A economia da Capital floresceu esta semana.`, false, false);
      }
    }
  }
}

export function advanceTimeOfDay() {
  const current = getChronosState();
  const times: ("Manhã" | "Tarde" | "Noite" | "Madrugada")[] = ['Manhã', 'Tarde', 'Noite', 'Madrugada'];
  const idx = times.indexOf(current.timeOfDay);
  const nextIdx = idx + 1;

  if (nextIdx >= times.length) {
    advanceDay();
  } else {
    state.chronos.set('global', { ...current, timeOfDay: times[nextIdx] });
    pushChatMessage(`⏳ O tempo passou... Agora é <b>${times[nextIdx]}</b>.`, false, false);
  }
}

export function restAtStronghold() {
  const strongholdData = state.stronghold.get('data') as any;
  if (!strongholdData) return;

  const upgrades = strongholdData.upgrades || [];
  
  // Efeitos da base
  const hasKitchen = upgrades.includes('cozinha');
  const hasWell = upgrades.includes('poco');
  const hasBeds = upgrades.includes('camas');
  const hasAltar = upgrades.includes('altar');

  const tokens = Array.from(state.tokens.entries()) as [string, any][];
  let herois = 0;

  for (const [id, token] of tokens) {
    if (token.hp > 0 && token.isPlayer !== false) {
      herois++;
      let hunger = token.hunger || 0;
      let thirst = token.thirst || 0;
      let sanity = token.sanity !== undefined ? token.sanity : 100;
      let hp = token.hp;
      let mana = token.mana || 0;

      // Cozinha reduz fome a zero. Se nao, reduz 50
      hunger = hasKitchen ? 0 : Math.max(0, hunger - 50);
      // Poço reduz sede a zero. Se nao, reduz 50
      thirst = hasWell ? 0 : Math.max(0, thirst - 50);
      // Camas curam HP cheio. Se nao, cura 20
      hp = hasBeds ? (token.maxHp || 100) : Math.min(token.maxHp || 100, hp + 20);
      // Altar restaura sanidade a 100.
      sanity = hasAltar ? 100 : sanity;

      state.tokens.set(id, { ...token, hp, hunger, thirst, sanity, mana });
    }
  }

  if (herois > 0) {
    pushChatMessage(`🏰 <b>A party descansou em ${strongholdData.name}.</b><br/><span style="color:var(--text-secondary);font-size:0.8rem">(${hasKitchen ? '🍲 Cozinha' : ''} ${hasWell ? '💧 Poço' : ''} ${hasBeds ? '🛏️ Camas' : ''} ${hasAltar ? '✨ Altar' : ''})</span>`, true, false);
  }

  // Avança o tempo
  advanceTimeOfDay();
}
