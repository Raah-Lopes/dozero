import { describe, expect, it } from 'vitest';
import { createEmptyCodex } from './codexModel';
import { createCreatureNote, getCodexStats, migrateMarkdownFiles, parseCodexImport, parseCodexNoteImport, serializeCodex, serializeCodexNote } from './codexTools';

describe('codexTools', () => {
  it('calcula estatísticas sem perder tags repetidas', () => {
    const codex = createEmptyCodex();
    codex.notes = [createCreatureNote({ name: 'Lobo', description: '', threat: 2, habitat: 'Mata', tags: ['fera', 'mata'] }), createCreatureNote({ name: 'Urso', description: '', threat: 3, habitat: 'Mata', tags: ['fera'] })];
    const stats = getCodexStats(codex);
    expect(stats.notes).toBe(2); expect(stats.tags[0]).toEqual({ tag: 'fera', count: 2 });
  });

  it('exporta e importa um Códice versionado', () => {
    const codex = createEmptyCodex(); codex.notes = [createCreatureNote({ name: 'Dragão', description: 'Antigo', threat: 10, habitat: 'Montanha', tags: ['lendário'] })];
    const restored = parseCodexImport(serializeCodex(codex));
    expect(restored.notes[0].name).toBe('Dragão'); expect(restored.types.length).toBeGreaterThan(0);
    expect(() => parseCodexImport('{}')).toThrow('válido');
  });

  it('exporta e importa uma nota individual', () => {
    const note = createCreatureNote({ name: 'Dragão', description: 'Antigo', threat: 10, habitat: 'Montanha', tags: ['lendário'] });
    note.gallery = ['data:image/webp;base64,abc'];
    const restored = parseCodexNoteImport(serializeCodexNote(note));
    expect(restored.name).toBe('Dragão');
    expect(restored.gallery).toEqual(['data:image/webp;base64,abc']);
    expect(() => parseCodexNoteImport('{}')).toThrow('nota DOZERO válida');
  });

  it('migra Markdown selecionado sem criar nós de pasta', () => {
    const result = migrateMarkdownFiles([['Personagens/Aurea.md', '---\ntipo: personagem\ntags: [deusa, luz]\ndescricao: Guardiã\n---\nTexto']]);
    expect(result.notes[0].typeId).toBe('person'); expect(result.notes[0].tags).toEqual(['deusa', 'luz']);
  });

  it('calcula centralidade e entidades recentes', () => {
    const codex = createEmptyCodex();
    const first = { ...createCreatureNote({ name: 'A', description: '', threat: 1, habitat: 'Floresta', tags: ['místico'] }), updatedAt: '2026-01-02T00:00:00.000Z' };
    const second = { ...createCreatureNote({ name: 'B', description: '', threat: 1, habitat: 'Montanha', tags: [] }), updatedAt: '2026-01-03T00:00:00.000Z' };
    codex.folders = [{ id: 'f1', name: 'Terras Altas', color: '#10b981' }];
    second.folderId = 'f1';
    codex.notes = [first, second];
    codex.relations = [{ id: 'r', sourceId: first.id, targetId: second.id, label: 'Aliado de', color: '#fff', icon: 'link', bidirectional: true }];
    const stats = getCodexStats(codex);
    expect(stats.centrality[0].degree).toBe(1);
    expect(stats.recent[0].id).toBe(second.id);
    expect(stats.topConnected?.note.id).toBe(first.id);
    expect(stats.byRelation[0]).toEqual({ label: 'Aliado de', count: 1 });
    expect(stats.byFolder[0]).toEqual({ folderId: 'f1', name: 'Terras Altas', color: '#10b981', count: 1, percentage: 50 });
    expect(stats.totalFields).toBe(4); // 2 threat fields + 2 habitat fields
  });
});
