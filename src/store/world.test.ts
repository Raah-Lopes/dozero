import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ chronos: new Map<string, unknown>() }));

vi.mock('../services/yjs', () => ({ state: { chronos: mocks.chronos } }));
vi.mock('./chat', () => ({ pushChatMessage: vi.fn() }));

import { addChronosEvent, duplicateChronicleEra, getChronicleEras, getChronicleMeta, getChronosEvents, initChronos, moveChronicleEra, removeChronicleEra, reorderChronicleEra, replaceChronicle, saveChronicleEra, saveChronicleEvent, saveChronicleMeta, setChronosDate, updateChronosEvent } from './world';

describe('chronos event store', () => {
  beforeEach(() => mocks.chronos.clear());

  it('adds and updates a synchronized timeline event', () => {
    initChronos();
    addChronosEvent('Eclipse', undefined, { layer: 'campaign', wikiPath: 'Eventos/Eclipse.md' });
    const event = getChronosEvents()[0];

    updateChronosEvent(event.id, { month: 2, layer: 'character' });

    expect(getChronosEvents()[0]).toMatchObject({ title: 'Eclipse', month: 2, layer: 'character', wikiPath: 'Eventos/Eclipse.md' });
  });

  it('stores historical eras and events with signed years', () => {
    const era = saveChronicleEra({ name: 'Era Antiga', startYear: -500, endYear: 0, color: '#8b5cf6', description: 'Antes do calendário atual.' });
    const event = saveChronicleEvent({ eraId: era.id, title: 'Fundação', year: -120, kind: 'fundacao', layer: 'world', description: '', imageUrl: '', tags: ['origem'], wikiPath: '' });

    expect(getChronicleEras()[0]).toMatchObject({ startYear: -500, endYear: 0 });
    expect(getChronosEvents()[0]).toMatchObject({ id: event.id, eraId: era.id, year: -120, datePrecision: 'year', tags: ['origem'] });
  });

  it('preserves events when an era is removed', () => {
    const first = saveChronicleEra({ name: 'Primeira', startYear: 0, endYear: 10, color: '#111111', description: '' });
    const second = saveChronicleEra({ name: 'Segunda', startYear: 11, endYear: 20, color: '#222222', description: '' });
    saveChronicleEvent({ eraId: first.id, title: 'Marco', year: 5, kind: 'pacto', layer: 'campaign', description: '', imageUrl: '', tags: [], wikiPath: '' });

    moveChronicleEra(second.id, -1);
    removeChronicleEra(first.id);

    expect(getChronicleEras().map(era => era.id)).toEqual([second.id]);
    expect(getChronosEvents()[0]).toMatchObject({ title: 'Marco', eraId: undefined });
  });

  it('duplicates and drag-reorders a complete era', () => {
    const first = saveChronicleEra({ name: 'Primeira', startYear: 0, endYear: 10, color: '#111111', description: '' })!;
    const second = saveChronicleEra({ name: 'Segunda', startYear: 11, endYear: 20, color: '#222222', description: '' })!;
    saveChronicleEvent({ eraId: first.id, title: 'Marco', year: 5 });

    const copy = duplicateChronicleEra(first.id)!;
    reorderChronicleEra(copy.id, second.id);

    expect(getChronicleEras().map(era => era.name)).toEqual(['Primeira', 'Segunda', 'Primeira (cópia)']);
    expect(getChronosEvents().filter(event => event.eraId === copy.id)).toHaveLength(1);
  });

  it('replaces only historical events and keeps Chronos operational data', () => {
    addChronosEvent('Sessão');
    saveChronicleEvent({ title: 'História antiga', year: -5 });
    replaceChronicle([], [{ id: 'imported', title: 'Importado', day: 1, month: 1, year: 0 }], { worldName: 'Novo Mundo', calendarLabel: 'N.M.' });

    expect(getChronosEvents().map(event => event.title)).toEqual(['Sessão', 'Importado']);
    expect(getChronicleMeta()).toEqual({ worldName: 'Novo Mundo', calendarLabel: 'N.M.' });
    expect(saveChronicleMeta({ worldName: '  Renomeado  ' }).worldName).toBe('Renomeado');
  });

  it('sets campaign operational date and computes season accurately', () => {
    initChronos();
    const result = setChronosDate(15, 7, 1492, 'Tarde');

    expect(result).toMatchObject({
      day: 15,
      month: 7,
      year: 1492,
      timeOfDay: 'Tarde',
      season: 'Verão'
    });
  });

  it('saves events with day and month precision for visual calendar', () => {
    const event = saveChronicleEvent({
      title: 'Festival da Colheita',
      day: 22,
      month: 9,
      year: 1450,
      datePrecision: 'day',
      kind: 'fundacao'
    });

    expect(event).toMatchObject({
      title: 'Festival da Colheita',
      day: 22,
      month: 9,
      year: 1450,
      datePrecision: 'day'
    });
  });
});
