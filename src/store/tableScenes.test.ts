import { beforeEach, describe, expect, it } from 'vitest';
import { state } from '../services/yjs';
import { useUserStore } from './user';
import {
  activateTableScene,
  createTableScene,
  deleteTableScene,
  duplicateTableScene,
  getTableSceneState,
  getPlayerTableSceneState,
  initializeTableScenes,
  renameTableScene,
  setTableScenePlayerVisibility,
  setTableScenePlayerAccess,
} from './tableScenes';

const SCENE_MAPS = [
  state.tokens,
  state.backgrounds,
  state.props,
  state.drawings,
  state.walls,
  state.drawingLayers,
  state.fogOps,
  state.mapTexts,
  state.lorePins,
  state.combat,
  state.mapConfig,
];

describe('table scenes', () => {
  beforeEach(() => {
    useUserStore.setState({ isGM: true });
    SCENE_MAPS.forEach(map => map.clear());
    state.tableScenes.clear();
    state.tableSceneMeta.clear();
  });

  it('migrates the current table into the first scene without losing it', () => {
    state.tokens.set('hero', { id: 'hero', name: 'Kael', x: 100, y: 120 });
    state.backgrounds.set('forest', { id: 'forest', imageUrl: 'forest.webp' });
    state.walls.set('wall-1', { id: 'wall-1', a: { x: 80, y: 80 }, b: { x: 220, y: 80 }, thickness: 8 });

    const { activeId, scenes } = initializeTableScenes();

    expect(scenes).toHaveLength(1);
    expect(scenes[0]).toMatchObject({ id: activeId, name: 'Mesa atual' });
    expect(scenes[0].snapshot.tokens.hero).toMatchObject({ name: 'Kael' });
    expect(scenes[0].snapshot.backgrounds.forest).toMatchObject({ imageUrl: 'forest.webp' });
    expect(scenes[0].snapshot.walls['wall-1']).toMatchObject({ thickness: 8 });
  });

  it('keeps map state isolated when the active scene changes', () => {
    const original = initializeTableScenes();
    state.tokens.set('hero', { id: 'hero', name: 'Kael' });
    state.fogOps.set('reveal-1', { id: 'reveal-1', type: 'circle' });

    const dungeon = createTableScene('Masmorra');
    state.tokens.set('goblin', { id: 'goblin', name: 'Goblin' });
    state.props.set('chest', { id: 'chest', name: 'Baú' });

    expect(activateTableScene(original.activeId)).toBe(true);
    expect(state.tokens.has('hero')).toBe(true);
    expect(state.tokens.has('goblin')).toBe(false);
    expect(state.fogOps.has('reveal-1')).toBe(true);

    expect(activateTableScene(dungeon!.id)).toBe(true);
    expect(state.tokens.has('hero')).toBe(false);
    expect(state.tokens.has('goblin')).toBe(true);
    expect(state.props.has('chest')).toBe(true);
  });

  it('duplicates the current, unsaved state rather than a stale snapshot', () => {
    initializeTableScenes();
    state.tokens.set('mage', { id: 'mage', name: 'Iria' });
    state.drawings.set('arrow', { id: 'arrow', type: 'arrow' });

    const active = getTableSceneState().activeId;
    const copy = duplicateTableScene(active);

    expect(copy?.snapshot.tokens.mage).toMatchObject({ name: 'Iria' });
    expect(copy?.snapshot.drawings.arrow).toMatchObject({ type: 'arrow' });
    expect(getTableSceneState().activeId).toBe(copy?.id);
  });

  it('keeps scene management exclusive to the master while players follow the active scene', () => {
    const first = initializeTableScenes();
    const second = createTableScene('Torre');

    useUserStore.setState({ isGM: false });

    expect(createTableScene('Não deve existir')).toBeNull();
    expect(activateTableScene(first.activeId)).toBe(false);
    expect(renameTableScene(second!.id, 'Alteração negada')).toBe(false);
    expect(duplicateTableScene(second!.id)).toBeNull();
    expect(deleteTableScene(second!.id)).toBe(false);
    expect(setTableScenePlayerVisibility(first.activeId, false)).toBe(false);
    expect(getTableSceneState()).toMatchObject({ activeId: second!.id });
  });

  it('lets the master reveal inactive scenes without exposing hidden names to players', () => {
    const first = initializeTableScenes();
    const second = createTableScene('Torre Secreta');

    expect(activateTableScene(first.activeId)).toBe(true);
    expect(setTableScenePlayerVisibility(second!.id, false)).toBe(true);

    useUserStore.setState({ isGM: false });
    expect(getPlayerTableSceneState().scenes.map(scene => scene.name)).toEqual(['Mesa atual']);

    useUserStore.setState({ isGM: true });
    expect(setTableScenePlayerVisibility(second!.id, true)).toBe(true);

    useUserStore.setState({ isGM: false });
    expect(getPlayerTableSceneState().scenes.map(scene => scene.name)).toEqual(['Mesa atual', 'Torre Secreta']);
  });

  it('can reveal a hidden scene to selected authenticated members', () => {
    const first = initializeTableScenes();
    const second = createTableScene('Arquivo Privado');

    expect(activateTableScene(first.activeId)).toBe(true);
    expect(setTableScenePlayerVisibility(second!.id, false)).toBe(true);
    expect(setTableScenePlayerAccess(second!.id, 'player-ana', true)).toBe(true);

    expect(getPlayerTableSceneState('player-ana').scenes.map(scene => scene.name)).toEqual(['Mesa atual', 'Arquivo Privado']);
    expect(getPlayerTableSceneState('player-bia').scenes.map(scene => scene.name)).toEqual(['Mesa atual']);

    useUserStore.setState({ isGM: false });
    expect(setTableScenePlayerAccess(second!.id, 'player-bia', true)).toBe(false);
  });
});
