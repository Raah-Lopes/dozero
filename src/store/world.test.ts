import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ chronos: new Map<string, unknown>() }));

vi.mock('../services/yjs', () => ({ state: { chronos: mocks.chronos } }));
vi.mock('./chat', () => ({ pushChatMessage: vi.fn() }));

import { addChronosEvent, getChronosEvents, initChronos, updateChronosEvent } from './world';

describe('chronos event store', () => {
  beforeEach(() => mocks.chronos.clear());

  it('adds and updates a synchronized timeline event', () => {
    initChronos();
    addChronosEvent('Eclipse', undefined, { layer: 'campaign', wikiPath: 'Eventos/Eclipse.md' });
    const event = getChronosEvents()[0];

    updateChronosEvent(event.id, { month: 2, layer: 'character' });

    expect(getChronosEvents()[0]).toMatchObject({ title: 'Eclipse', month: 2, layer: 'character', wikiPath: 'Eventos/Eclipse.md' });
  });
});
