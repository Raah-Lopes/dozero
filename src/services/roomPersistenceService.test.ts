import { beforeEach, describe, expect, it } from 'vitest';
import { state } from './yjs';
import { applyRoomBundle, getRoomBundle, hasLiveRoomContent, normalizeRoomBundle } from './roomPersistenceService';

const LIVE_MAPS = [
  state.tokens,
  state.backgrounds,
  state.drawings,
  state.walls,
  state.fogOps,
  state.mapTexts,
  state.props,
  state.lorePins,
];

describe('room persistence', () => {
  beforeEach(() => {
    LIVE_MAPS.forEach(map => map.clear());
    state.tableScenes.clear();
    state.tableSceneMeta.clear();
    state.wiki.clear();
    state.chronos.clear();
    state.lineage.clear();
    state.world.clear();
  });

  it('normalizes the legacy autosave shape before restoring it', () => {
    const bundle = normalizeRoomBundle({
      savedAt: '2026-08-29T10:00:00.000Z',
      tokens: { hero: { id: 'hero', name: 'Kael' } },
      backgrounds: { forest: { id: 'forest', imageUrl: 'https://assets.example/forest.webp' } },
      grid: { size: 70 },
    }, 'mesa-teste');

    expect(bundle).toMatchObject({
      version: 3,
      roomName: 'mesa-teste',
      exportedAt: '2026-08-29T10:00:00.000Z',
      data: { mapConfig: { size: 70 } },
    });
    expect(bundle?.data.tokens).toEqual([['hero', { id: 'hero', name: 'Kael' }]]);
    expect(bundle?.data.backgrounds).toEqual([['forest', { id: 'forest', imageUrl: 'https://assets.example/forest.webp' }]]);
  });

  it('rejects an unstructured snapshot instead of clearing the room', () => {
    expect(normalizeRoomBundle({ data: {} }, 'mesa-teste')).toBeNull();
  });

  it('does not let scene metadata block an incoming room sync, but protects live map content', () => {
    state.tableScenes.set('scene-1', { id: 'scene-1', name: 'Mesa atual' });
    expect(hasLiveRoomContent()).toBe(false);

    state.drawings.set('drawing-1', { id: 'drawing-1', type: 'arrow' });
    expect(hasLiveRoomContent()).toBe(true);
  });

  it('keeps Chronica, lineage, and world data in the campaign bundle', () => {
    state.chronos.set('events', [{ id: 'event-1', title: 'Fundação', year: -120 }]);
    state.lineage.set('atlas', '{"version":1,"people":[{"id":"house-1"}]}');
    state.world.set('factions', [{ id: 'faction-1', name: 'Coroa' }]);

    const bundle = getRoomBundle();
    expect(bundle.data.chronos).toMatchObject({ events: [{ title: 'Fundação' }] });
    expect(bundle.data.lineage).toMatchObject({ atlas: expect.any(String) });
    expect(bundle.data.world).toMatchObject({ factions: [{ name: 'Coroa' }] });

    state.chronos.clear();
    state.lineage.clear();
    state.world.clear();
    expect(applyRoomBundle(bundle, 'test-restore')).toBe(true);

    expect(state.chronos.get('events')).toMatchObject([{ title: 'Fundação' }]);
    expect(state.lineage.get('atlas')).toContain('house-1');
    expect(state.world.get('factions')).toMatchObject([{ name: 'Coroa' }]);
  });

  it('merges automatic hydration without deleting data that arrived meanwhile', () => {
    state.chronos.set('events', [{ id: 'event-1', title: 'Fundação' }]);
    const bundle = getRoomBundle();

    state.chronos.set('live-event', { id: 'event-2', title: 'Chegada do grupo' });
    expect(applyRoomBundle(bundle, 'room-auto-hydration')).toBe(true);

    expect(state.chronos.get('events')).toMatchObject([{ title: 'Fundação' }]);
    expect(state.chronos.get('live-event')).toMatchObject({ title: 'Chegada do grupo' });
  });

  it('keeps the free graph stored in the shared Codex document', () => {
    state.wiki.set('__arcanum_graph_v1__', {
      v: 1,
      nodes: [{ id: 'node-1', data: { label: 'Porto Real' } }],
      edges: [],
      customTypes: [],
      savedViews: [],
    });

    const bundle = getRoomBundle();
    state.wiki.clear();
    expect(applyRoomBundle(bundle, 'test-graph-restore')).toBe(true);

    expect(state.wiki.get('__arcanum_graph_v1__')).toMatchObject({
      nodes: [{ id: 'node-1', data: { label: 'Porto Real' } }],
    });
  });
});
