import type * as Y from 'yjs';
import { doc, state } from '../services/yjs';
import { localState as tableLocalState } from './tokens';
import { localState as tokenLocalState } from './modules/tokenModule';
import { useUserStore } from './user';

type SceneMapKey =
  | 'tokens'
  | 'backgrounds'
  | 'props'
  | 'drawings'
  | 'walls'
  | 'drawingLayers'
  | 'fogOps'
  | 'mapTexts'
  | 'lorePins'
  | 'combat'
  | 'mapConfig';

const SCENE_MAP_KEYS: SceneMapKey[] = [
  'tokens',
  'backgrounds',
  'props',
  'drawings',
  'walls',
  'drawingLayers',
  'fogOps',
  'mapTexts',
  'lorePins',
  'combat',
  'mapConfig',
];
const SCENE_SWITCH_ORIGIN = 'table-scene-switch';

export const canManageTableScenes = () => useUserStore.getState().isGM;

export type TableSceneSnapshot = Record<SceneMapKey, Record<string, unknown>>;

export interface TableScene {
  id: string;
  name: string;
  playerVisible: boolean;
  playerIds: string[];
  createdAt: string;
  updatedAt: string;
  snapshot: TableSceneSnapshot;
}

export interface TableSceneState {
  activeId: string;
  scenes: TableScene[];
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const now = () => new Date().toISOString();

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? `scene_${crypto.randomUUID()}`
    : `scene_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function readMap(map: Y.Map<unknown>): Record<string, unknown> {
  return Object.fromEntries(Array.from(map.entries()).map(([id, value]) => [id, clone(value)]));
}

function replaceMap(map: Y.Map<unknown>, values: Record<string, unknown>) {
  map.clear();
  Object.entries(values).forEach(([id, value]) => map.set(id, clone(value)));
}

function emptySnapshot(): TableSceneSnapshot {
  return {
    tokens: {},
    backgrounds: {},
    props: {},
    drawings: {},
    walls: {},
    drawingLayers: {},
    fogOps: {},
    mapTexts: {},
    lorePins: {},
    combat: { isActive: false, turnIndex: 0, participants: [] },
    mapConfig: {},
  };
}

function emitSceneChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('table-scenes-changed'));
  window.dispatchEvent(new Event('config-changed'));
  window.dispatchEvent(new Event('bg-selection-updated'));
  window.dispatchEvent(new Event('token-selection-updated'));
  window.dispatchEvent(new Event('prop-selection-updated'));
  window.dispatchEvent(new Event('drawing-selection-updated'));
}

function clearLocalSelection() {
  tableLocalState.targets.clear();
  tableLocalState.selectedBgs.clear();
  tableLocalState.selectedTokens.clear();
  tableLocalState.selectedProps.clear();
  tableLocalState.selectedDrawings.clear();
  tableLocalState.editingTextId = null;
  tokenLocalState.selected.clear();
  tokenLocalState.targets.clear();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('clear-table-selection'));
}

export function captureTableSceneSnapshot(): TableSceneSnapshot {
  return Object.fromEntries(
    SCENE_MAP_KEYS.map((key) => [key, readMap(state[key] as Y.Map<unknown>)]),
  ) as TableSceneSnapshot;
}

function applyTableSceneSnapshot(snapshot: TableSceneSnapshot) {
  SCENE_MAP_KEYS.forEach((key) => {
    replaceMap(state[key] as Y.Map<unknown>, snapshot[key] || {});
  });
}

function putScene(scene: TableScene) {
  state.tableScenes.set(scene.id, scene);
}

function getScene(id: string | null | undefined): TableScene | undefined {
  return id ? state.tableScenes.get(id) as TableScene | undefined : undefined;
}

export function getTableSceneState(): TableSceneState {
  const scenes = Array.from(state.tableScenes.values() as Iterable<TableScene>)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const requestedActiveId = state.tableSceneMeta.get('activeId') as string | undefined;
  return { activeId: getScene(requestedActiveId)?.id || scenes[0]?.id || '', scenes };
}

export function isTableSceneVisibleToPlayers(scene: TableScene): boolean {
  return scene.playerVisible !== false;
}

export function isTableSceneVisibleToPlayer(scene: TableScene, playerId?: string | null): boolean {
  return isTableSceneVisibleToPlayers(scene) || Boolean(playerId && scene.playerIds?.includes(playerId));
}

export function getPlayerTableSceneState(playerId?: string | null): TableSceneState {
  const current = getTableSceneState();
  return {
    ...current,
    scenes: current.scenes.filter(scene => scene.id === current.activeId || isTableSceneVisibleToPlayer(scene, playerId)),
  };
}

export function initializeTableScenes(): TableSceneState {
  const current = getTableSceneState();
  if (current.scenes.length > 0) {
    if (canManageTableScenes() && state.tableSceneMeta.get('activeId') !== current.activeId) {
      state.tableSceneMeta.set('activeId', current.activeId);
      emitSceneChange();
    }
    return current;
  }

  if (!canManageTableScenes()) return current;

  const timestamp = now();
  const initialScene: TableScene = {
    id: createId(),
    name: 'Mesa atual',
    playerVisible: true,
    playerIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    snapshot: captureTableSceneSnapshot(),
  };

  doc.transact(() => {
    putScene(initialScene);
    state.tableSceneMeta.set('activeId', initialScene.id);
  });
  emitSceneChange();
  return getTableSceneState();
}

function saveActiveScene() {
  const active = getScene(getTableSceneState().activeId);
  if (!active) return;
  putScene({ ...active, snapshot: captureTableSceneSnapshot(), updatedAt: now() });
}

export function synchronizeActiveTableScene(): boolean {
  if (!canManageTableScenes()) return false;
  initializeTableScenes();
  doc.transact(saveActiveScene);
  emitSceneChange();
  return true;
}

export function createTableScene(name?: string): TableScene | null {
  if (!canManageTableScenes()) return null;
  initializeTableScenes();
  const timestamp = now();
  const scene: TableScene = {
    id: createId(),
    name: name?.trim() || `Cena ${getTableSceneState().scenes.length + 1}`,
    playerVisible: true,
    playerIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    snapshot: emptySnapshot(),
  };

  doc.transact(() => {
    saveActiveScene();
    putScene(scene);
    state.tableSceneMeta.set('activeId', scene.id);
    applyTableSceneSnapshot(scene.snapshot);
  }, SCENE_SWITCH_ORIGIN);
  clearLocalSelection();
  emitSceneChange();
  return scene;
}

export function activateTableScene(id: string): boolean {
  if (!canManageTableScenes()) return false;
  initializeTableScenes();
  const current = getTableSceneState();
  if (id === current.activeId) return true;
  const next = getScene(id);
  if (!next) return false;

  doc.transact(() => {
    saveActiveScene();
    state.tableSceneMeta.set('activeId', next.id);
    if (!isTableSceneVisibleToPlayers(next)) {
      putScene({ ...next, playerVisible: true, updatedAt: now() });
    }
    applyTableSceneSnapshot(next.snapshot);
  }, SCENE_SWITCH_ORIGIN);
  clearLocalSelection();
  emitSceneChange();
  return true;
}

export function duplicateTableScene(id: string): TableScene | null {
  if (!canManageTableScenes()) return null;
  initializeTableScenes();
  const current = getTableSceneState();
  const source = getScene(id);
  if (!source) return null;

  const timestamp = now();
  const duplicate: TableScene = {
    ...clone(source),
    id: createId(),
    name: `${source.name} (cópia)`,
    playerVisible: true,
    playerIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    snapshot: id === current.activeId ? captureTableSceneSnapshot() : clone(source.snapshot),
  };

  doc.transact(() => {
    saveActiveScene();
    putScene(duplicate);
    state.tableSceneMeta.set('activeId', duplicate.id);
    applyTableSceneSnapshot(duplicate.snapshot);
  }, SCENE_SWITCH_ORIGIN);
  clearLocalSelection();
  emitSceneChange();
  return duplicate;
}

export function renameTableScene(id: string, name: string): boolean {
  if (!canManageTableScenes()) return false;
  const scene = getScene(id);
  const nextName = name.trim();
  if (!scene || !nextName || scene.name === nextName) return false;
  putScene({ ...scene, name: nextName, updatedAt: now() });
  emitSceneChange();
  return true;
}

export function setTableScenePlayerVisibility(id: string, playerVisible: boolean): boolean {
  if (!canManageTableScenes()) return false;
  const current = getTableSceneState();
  const scene = getScene(id);
  if (!scene || current.activeId === id || isTableSceneVisibleToPlayers(scene) === playerVisible) return false;
  doc.transact(() => putScene({ ...scene, playerVisible, updatedAt: now() }));
  emitSceneChange();
  return true;
}

export function setTableScenePlayerAccess(id: string, playerId: string, visible: boolean): boolean {
  if (!canManageTableScenes()) return false;
  const scene = getScene(id);
  const normalizedPlayerId = playerId.trim();
  if (!scene || !normalizedPlayerId) return false;

  const playerIds = new Set(scene.playerIds || []);
  const changed = visible ? !playerIds.has(normalizedPlayerId) : playerIds.has(normalizedPlayerId);
  if (!changed) return false;
  visible ? playerIds.add(normalizedPlayerId) : playerIds.delete(normalizedPlayerId);

  doc.transact(() => putScene({ ...scene, playerIds: Array.from(playerIds), updatedAt: now() }));
  emitSceneChange();
  return true;
}

export function deleteTableScene(id: string): boolean {
  if (!canManageTableScenes()) return false;
  const current = initializeTableScenes();
  if (current.scenes.length <= 1 || !getScene(id)) return false;
  const next = current.scenes.find((scene) => scene.id !== id);
  if (!next) return false;

  doc.transact(() => {
    state.tableScenes.delete(id);
    if (current.activeId === id) {
      state.tableSceneMeta.set('activeId', next.id);
      applyTableSceneSnapshot(next.snapshot);
    }
  }, SCENE_SWITCH_ORIGIN);
  clearLocalSelection();
  emitSceneChange();
  return true;
}

export function onTableScenesChanged(listener: () => void) {
  state.tableScenes.observe(listener);
  state.tableSceneMeta.observe(listener);
  return () => {
    state.tableScenes.unobserve(listener);
    state.tableSceneMeta.unobserve(listener);
  };
}
