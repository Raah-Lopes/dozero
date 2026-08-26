import { describe, expect, it } from 'vitest';
import { createEmptyCodex, deleteCodexFolder, deleteCodexNote, deleteCodexType, filterCodexNotes, normalizeCodex, upsertCodexFolder, upsertCodexRelation } from './codexModel';

describe('codexModel', () => {
  it('cria campanhas sem conteúdo de demonstração', () => {
    const codex = createEmptyCodex('2026-08-26T00:00:00.000Z');
    expect(codex.notes).toEqual([]);
    expect(codex.folders).toEqual([]);
    expect(codex.relations).toEqual([]);
    expect(codex.types.length).toBeGreaterThan(0);
  });

  it('restaura tipos padrão sem apagar tipos personalizados', () => {
    const codex = normalizeCodex({ version: 1, types: [{ id: 'deity', name: 'Divindade', color: '#fff', icon: 'star', fields: [] }] });
    expect(codex.types.some(type => type.id === 'person')).toBe(true);
    expect(codex.types.some(type => type.id === 'deity')).toBe(true);
  });

  it('remove relações órfãs ao excluir uma nota', () => {
    const codex = createEmptyCodex();
    codex.notes = [
      { id: 'a', name: 'A', description: '', typeId: 'lore', folderId: null, tags: [], fields: {}, favorite: false, createdAt: '', updatedAt: '' },
      { id: 'b', name: 'B', description: '', typeId: 'lore', folderId: null, tags: [], fields: {}, favorite: false, createdAt: '', updatedAt: '' },
    ];
    codex.relations = [{ id: 'r', sourceId: 'a', targetId: 'b', label: 'conhece', color: '#fff', icon: 'link', bidirectional: true }];
    const next = deleteCodexNote(codex, 'a');
    expect(next.notes.map(note => note.id)).toEqual(['b']);
    expect(next.relations).toEqual([]);
  });

  it('busca também em tags e campos personalizados', () => {
    const codex = createEmptyCodex();
    codex.notes = [{ id: 'a', name: 'Sentinela', description: '', typeId: 'creature', folderId: null, tags: ['floresta'], fields: { habitat: 'Ruínas Antigas' }, favorite: true, createdAt: '', updatedAt: '' }];
    expect(filterCodexNotes(codex.notes, { search: 'ruínas', favoritesOnly: true })).toHaveLength(1);
    expect(filterCodexNotes(codex.notes, { search: 'deserto' })).toHaveLength(0);
  });

  it('move notas para Conhecimento ao excluir um tipo personalizado', () => {
    const codex = createEmptyCodex();
    codex.types.push({ id: 'deity', name: 'Divindade', color: '#fff', icon: 'star', fields: [] });
    codex.notes = [{ id: 'a', name: 'Lua', description: '', typeId: 'deity', folderId: null, tags: [], fields: {}, favorite: false, createdAt: '', updatedAt: '' }];
    expect(deleteCodexType(codex, 'deity').notes[0].typeId).toBe('lore');
    expect(deleteCodexType(codex, 'person')).toBe(codex);
  });

  it('recusa relações duplicadas e autorrelações', () => {
    const codex = createEmptyCodex();
    codex.notes = ['a', 'b'].map(noteId => ({ id: noteId, name: noteId, description: '', typeId: 'lore', folderId: null, tags: [], fields: {}, favorite: false, createdAt: '', updatedAt: '' }));
    const relation = { id: 'r', sourceId: 'a', targetId: 'b', label: 'Conhece', color: '#fff', icon: 'link', bidirectional: true };
    const related = upsertCodexRelation(codex, relation);
    expect(related.relations).toHaveLength(1);
    expect(() => upsertCodexRelation(related, { ...relation, id: 'r2' })).toThrow('já existe');
    expect(() => upsertCodexRelation(codex, { ...relation, targetId: 'a' })).toThrow('consigo mesma');
  });

  it('permite criar, editar e excluir pastas preservando notas sem pasta', () => {
    const codex = createEmptyCodex();
    const folder = { id: 'f1', name: 'Capítulo 1', color: '#10b981' };
    const withFolder = upsertCodexFolder(codex, folder);
    expect(withFolder.folders).toHaveLength(1);
    expect(withFolder.folders[0].name).toBe('Capítulo 1');

    const edited = upsertCodexFolder(withFolder, { ...folder, name: 'Capítulo 1 — O Início', color: '#f59e0b' });
    expect(edited.folders[0].name).toBe('Capítulo 1 — O Início');
    expect(edited.folders[0].color).toBe('#f59e0b');

    edited.notes = [
      { id: 'n1', name: 'Prólogo', description: '', typeId: 'lore', folderId: 'f1', tags: [], fields: {}, favorite: false, createdAt: '', updatedAt: '' },
      { id: 'n2', name: 'Solto', description: '', typeId: 'lore', folderId: null, tags: [], fields: {}, favorite: false, createdAt: '', updatedAt: '' },
    ];
    edited.savedViews = [
      { id: 'v1', name: 'Vista Cap 1', search: '', typeIds: [], tags: [], folderId: 'f1', favoritesOnly: false }
    ];

    const deleted = deleteCodexFolder(edited, 'f1');
    expect(deleted.folders).toHaveLength(0);
    expect(deleted.notes.find(note => note.id === 'n1')?.folderId).toBeNull();
    expect(deleted.notes.find(note => note.id === 'n2')?.folderId).toBeNull();
    expect(deleted.savedViews[0].folderId).toBeNull();
  });
});
