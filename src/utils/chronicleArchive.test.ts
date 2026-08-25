import { describe, expect, it } from 'vitest';
import { createChronicleArchive, parseChronicleArchive } from './chronicleArchive';

describe('chronicle archive', () => {
  it('imports the original Chronica world shape and preserves signed years', () => {
    const parsed = parseChronicleArchive({
      name: 'Aethermoor', calendar: 'A.M.', eras: [{ id: 'era-1', name: 'Era Antiga', start: -300, end: 0, color: '#d99a2b', description: 'Origem', background: null, collapsed: false, notes: [{ id: 'note-1', title: 'O Pacto', year: -10, kind: 'pacto', description: 'Tratado', image: null, tags: ['origem'] }] }]
    });

    expect(parsed?.meta).toEqual({ worldName: 'Aethermoor', calendarLabel: 'A.M.' });
    expect(parsed?.eras[0]).toMatchObject({ startYear: -300, endYear: 0 });
    expect(parsed?.events[0]).toMatchObject({ year: -10, datePrecision: 'year', kind: 'pacto', layer: 'world' });
  });

  it('exports only annual Chronica events inside their eras', () => {
    const archive = createChronicleArchive(
      { worldName: 'Mundo', calendarLabel: 'Era' },
      [{ id: 'era', name: 'Primeira', startYear: 0, endYear: 20, color: '#fff', description: '' }],
      [
        { id: 'historic', title: 'Histórico', day: 1, month: 1, year: 5, eraId: 'era', datePrecision: 'year' },
        { id: 'daily', title: 'Sessão', day: 2, month: 3, year: 5, eraId: 'era', datePrecision: 'day' }
      ]
    );

    expect(archive.eras[0].notes.map(note => note.id)).toEqual(['historic']);
  });

  it('rejects invalid or inverted eras', () => {
    expect(parseChronicleArchive({ name: 'Falho', calendar: 'Ano', eras: [{ name: 'Erro', start: 10, end: 0, notes: [] }] })).toBeNull();
  });
});
