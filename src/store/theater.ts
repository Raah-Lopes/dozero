import { state } from '../services/yjs';

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
