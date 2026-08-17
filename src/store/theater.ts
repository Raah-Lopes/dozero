import { state } from '../services/yjs';

export type MoodType = 'neutral' | 'suspense' | 'horror' | 'adventure' | 'victory' | 'sadness' | 'mystery' | 'combat';
export type WeatherType = 'clear' | 'rain' | 'storm' | 'fog' | 'snow' | 'fire' | 'darkness';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type NarrativeStatus = 'intact' | 'hurt' | 'wounded' | 'critical' | 'dead';
export type DistanceZone = 'melee' | 'close' | 'medium' | 'far' | 'extreme';
export type DiaryEntryType = 'scene' | 'combat' | 'clock' | 'objective' | 'condition' | 'narrative';

export interface SavedCutscene {
  id: string;
  name: string;       // Internal label (ex: "Capítulo 4 - A Capital")
  title: string;      // Displayed on screen
  subtitle?: string;
  imageUrl?: string;
  durationMs: number; // ms
  createdAt: number;
}

export interface TheaterObjective {
  id: string;
  text: string;
  completed: boolean;
  failed?: boolean;
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

export interface StageProp {
  id: string;
  type: 'image' | 'token';
  url?: string;
  color?: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  hp?: number;
  maxHp?: number;
  status?: string[];
}

export type SceneTransition = 'none' | 'fade' | 'dissolve' | 'wipe';

export interface ClueRedactedSection {
  id: string;
  label: string;
  text: string;
  revealed: boolean;
}

export interface TheaterClue {
  id: string;
  title: string;
  url: string;
  description?: string;
  discovered: boolean;
  redactedSections?: ClueRedactedSection[];
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
  props?: StageProp[];
  // Integração áudio ↔ cena
  musicPresetId?: string;
  ambiencePresetId?: string;
  // Transição visual ao entrar nesta cena
  transitionType?: SceneTransition;
  // Segredos do Mestre (exclusivo para o narrador)
  gmSecrets?: string;
  // Pistas e Handouts vinculados à cena com suporte a revelação progressiva
  clues?: TheaterClue[];
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

// ponytail: DistanceEntry removida — era código morto, TacticalRadar usa entityBands

export interface DialogueChoice {
  id: string;
  label: string;
  actionText?: string;
  outcomeText?: string; // Fala de resposta do interlocutor após a escolha
  nextStepId?: string;
}

export interface DialogueScriptStep {
  id: string;
  speakerName: string;
  speakerTitle?: string;
  speakerAvatar?: string;
  text: string;
  emotion?: 'neutral' | 'fury' | 'whisper' | 'panic' | 'joy' | 'mystic' | 'solemn';
  choices?: DialogueChoice[];
}

export interface SavedDialogueScript {
  id: string;
  title: string;
  description?: string;
  steps: DialogueScriptStep[];
  createdAt: number;
}

export interface TheaterDialogue {
  id: string;
  speakerName: string;
  speakerTitle?: string;
  speakerAvatar?: string;
  text: string;
  emotion?: 'neutral' | 'fury' | 'whisper' | 'panic' | 'joy' | 'mystic' | 'solemn';
  choices?: DialogueChoice[];
  timestamp: number;
  
  // Suporte a Mini-Roteiro Sequencial
  scriptTitle?: string;
  currentStepIndex?: number;
  totalSteps?: number;
  steps?: DialogueScriptStep[];
}

export interface TheaterNpcPresentation {
  name: string;
  imageUrl?: string;
  subtitle?: string;
  quote?: string;
  type?: 'hero' | 'npc' | 'boss' | 'threat';
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
  entityBands: Record<string, DistanceZone>;
  cutscenes: SavedCutscene[];
  selectedCastMemberId: string;
  vnModeActive?: boolean;
  globalAssets?: SceneAsset[];
  activeNpc?: TheaterNpcPresentation | null;
  activeDialogue?: TheaterDialogue | null;
  savedScripts?: SavedDialogueScript[];
  showHeroCards?: boolean;
  heroCardPositions?: Record<string, { x: number; y: number }>;
  heroCardScales?: Record<string, 'small' | 'medium' | 'large'>;
  heroCardCustomStatus?: Record<string, 'alive' | 'unconscious' | 'dead'>;
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
  entityBands: {},
  cutscenes: [],
  selectedCastMemberId: '',
  vnModeActive: false,
  globalAssets: [],
  activeNpc: null,
  activeDialogue: null,
  showHeroCards: true,
  heroCardPositions: {},
  heroCardScales: {},
  heroCardCustomStatus: {},
};

const THEATER_STORAGE_KEY = 'dozero_theater_state_v2';

export function getTheaterState(): TheaterStateData {
  const current = state.theater.get('global');
  if (current) return current as TheaterStateData;

  // Instant local-first cache recovery if Yjs is still initializing
  try {
    const cached = localStorage.getItem(THEATER_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        state.theater.set('global', parsed);
        return parsed as TheaterStateData;
      }
    }
  } catch {}

  return { ...THEATER_DEFAULT };
}

export function updateTheaterState(updates: Partial<TheaterStateData>) {
  const current = getTheaterState();
  const next = { ...current, ...updates };
  state.theater.set('global', next);
  try {
    localStorage.setItem(THEATER_STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function addTheaterAsset(asset: Omit<SceneAsset, 'id'>): string {
  const current = getTheaterState();
  const existing = (current.globalAssets || []).find(a => a.url === asset.url);
  if (existing) {
    updateTheaterAsset(existing.id, asset);
    return existing.id;
  }
  const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newAsset: SceneAsset = { ...asset, id };
  const globalAssets = [...(current.globalAssets || []), newAsset];
  state.theater.set('global', { ...current, globalAssets });
  return id;
}

export function updateTheaterAsset(id: string, updates: Partial<SceneAsset>) {
  const current = getTheaterState();
  const globalAssets = (current.globalAssets || []).map(a => a.id === id ? { ...a, ...updates } : a);
  state.theater.set('global', { ...current, globalAssets });
}

export function removeTheaterAsset(id: string) {
  const current = getTheaterState();
  const globalAssets = (current.globalAssets || []).filter(a => a.id !== id);
  state.theater.set('global', { ...current, globalAssets });
}

export function addTheaterDiaryEntry(entry: Omit<DiaryEntry, 'id'>) {
  const current = getTheaterState();
  const newEntry: DiaryEntry = { ...entry, id: `diary_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` };
  const entries = [...current.diaryEntries.slice(-200), newEntry];
  state.theater.set('global', { ...current, diaryEntries: entries });
}

export function removeTheaterDiaryEntry(id: string) {
  const current = getTheaterState();
  const entries = current.diaryEntries.filter(e => e.id !== id);
  state.theater.set('global', { ...current, diaryEntries: entries });
}

export function clearTheaterDiaryEntries() {
  const current = getTheaterState();
  state.theater.set('global', { ...current, diaryEntries: [] });
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

// ponytail: updateDistanceMap removida — nunca chamada, era código morto

export function setEntityBand(entityId: string, zone: DistanceZone) {
  const current = getTheaterState();
  const newBands = { ...current.entityBands };
  newBands[entityId] = zone;
  updateTheaterState({ entityBands: newBands });
}

export function setTheaterWeather(weather: WeatherType) {
  updateTheaterState({ weather });
  addTheaterDiaryEntry({ timestamp: Date.now(), type: 'narrative', text: `🌦️ Clima alterado: ${weather}` });
}

export function toggleVnMode() {
  const current = getTheaterState();
  updateTheaterState({ vnModeActive: !current.vnModeActive });
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

// ── Cutscene CRUD ─────────────────────────────────────────────────────────────

export function saveCutscene(data: Omit<SavedCutscene, 'id' | 'createdAt'>): string {
  const current = getTheaterState();
  const id = `cut_${Date.now()}`;
  const cutscene: SavedCutscene = { ...data, id, createdAt: Date.now() };
  state.theater.set('global', { ...current, cutscenes: [...(current.cutscenes ?? []), cutscene] });
  return id;
}

export function updateCutscene(id: string, updates: Partial<Omit<SavedCutscene, 'id' | 'createdAt'>>) {
  const current = getTheaterState();
  const cutscenes = (current.cutscenes ?? []).map(c => c.id === id ? { ...c, ...updates } : c);
  state.theater.set('global', { ...current, cutscenes });
}

export function deleteCutscene(id: string) {
  const current = getTheaterState();
  state.theater.set('global', { ...current, cutscenes: (current.cutscenes ?? []).filter(c => c.id !== id) });
}

// ── Cinematic Dialogue ────────────────────────────────────────────────────────

export function setActiveDialogue(dialogue: TheaterDialogue | null) {
  updateTheaterState({ activeDialogue: dialogue });
  if (dialogue) {
    addTheaterDiaryEntry({
      timestamp: dialogue.timestamp || Date.now(),
      type: 'narrative',
      text: `💬 **${dialogue.speakerName}**: "${dialogue.text}"`
    });
  }
}

export function advanceDialogueScript() {
  const current = getTheaterState();
  const dialogue = current.activeDialogue;
  if (!dialogue || !dialogue.steps || dialogue.steps.length === 0) {
    closeActiveDialogue();
    return;
  }

  const currentIndex = dialogue.currentStepIndex ?? 0;
  const nextIndex = currentIndex + 1;

  if (nextIndex < dialogue.steps.length) {
    const nextStep = dialogue.steps[nextIndex];
    const updatedDialogue: TheaterDialogue = {
      ...dialogue,
      speakerName: nextStep.speakerName,
      speakerTitle: nextStep.speakerTitle,
      speakerAvatar: nextStep.speakerAvatar,
      text: nextStep.text,
      emotion: nextStep.emotion || 'neutral',
      choices: nextStep.choices || [],
      currentStepIndex: nextIndex,
      timestamp: Date.now()
    };
    updateTheaterState({ activeDialogue: updatedDialogue });
    addTheaterDiaryEntry({
      timestamp: Date.now(),
      type: 'narrative',
      text: `💬 [${dialogue.scriptTitle || 'Roteiro'} ${nextIndex + 1}/${dialogue.steps.length}] **${nextStep.speakerName}**: "${nextStep.text}"`
    });
  } else {
    closeActiveDialogue();
  }
}

export function saveDialogueScript(script: Omit<SavedDialogueScript, 'id' | 'createdAt'>): string {
  const current = getTheaterState();
  const id = `script_${Date.now()}`;
  const newScript: SavedDialogueScript = { ...script, id, createdAt: Date.now() };
  const savedScripts = [...(current.savedScripts || []), newScript];
  updateTheaterState({ savedScripts });
  return id;
}

export function deleteDialogueScript(id: string) {
  const current = getTheaterState();
  const savedScripts = (current.savedScripts || []).filter(s => s.id !== id);
  updateTheaterState({ savedScripts });
}

export function closeActiveDialogue() {
  updateTheaterState({ activeDialogue: null });
}

// ── Hero Cards Management ───────────────────────────────────────────────────

export function toggleShowHeroCards() {
  const current = getTheaterState();
  updateTheaterState({ showHeroCards: current.showHeroCards === false ? true : false });
}

export function updateHeroCardPosition(memberId: string, pos: { x: number; y: number } | null) {
  const current = getTheaterState();
  const heroCardPositions = { ...(current.heroCardPositions || {}) };
  if (pos === null) {
    delete heroCardPositions[memberId];
  } else {
    heroCardPositions[memberId] = pos;
  }
  updateTheaterState({ heroCardPositions });
}

export function updateHeroCardScale(memberId: string, scale: 'small' | 'medium' | 'large') {
  const current = getTheaterState();
  updateTheaterState({
    heroCardScales: {
      ...(current.heroCardScales || {}),
      [memberId]: scale,
    }
  });
}

export function setHeroCustomStatus(memberId: string, status: 'alive' | 'unconscious' | 'dead') {
  const current = getTheaterState();
  updateTheaterState({
    heroCardCustomStatus: {
      ...(current.heroCardCustomStatus || {}),
      [memberId]: status,
    }
  });
}
