export type CodexFieldKind = 'text' | 'longtext' | 'number' | 'select' | 'url' | 'list';

export interface CodexFieldDefinition {
  id: string;
  label: string;
  kind: CodexFieldKind;
  options?: string[];
}

export interface CodexType {
  id: string;
  name: string;
  color: string;
  icon: string;
  fields: CodexFieldDefinition[];
  standard?: boolean;
}

export interface CodexNote {
  id: string;
  name: string;
  description: string;
  typeId: string;
  folderId: string | null;
  tags: string[];
  fields: Record<string, string | number | string[]>;
  favorite: boolean;
  imageUrl?: string;
  links: { label: string; url: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CodexFolder { id: string; name: string; color: string; }
export interface CodexRelation {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  color: string;
  icon: string;
  bidirectional: boolean;
}

export interface CodexSavedView {
  id: string;
  name: string;
  search: string;
  typeIds: string[];
  tags: string[];
  folderId: string | null;
  favoritesOnly: boolean;
}

export interface CodexDocument {
  version: 1;
  notes: CodexNote[];
  types: CodexType[];
  folders: CodexFolder[];
  relations: CodexRelation[];
  savedViews: CodexSavedView[];
  updatedAt: string;
}

export const STANDARD_CODEX_TYPES: CodexType[] = [
  { id: 'person', name: 'Personagem', color: '#8b5cf6', icon: 'user', standard: true, fields: [{ id: 'role', label: 'Papel', kind: 'text' }, { id: 'status', label: 'Estado', kind: 'select', options: ['Ativo', 'Desaparecido', 'Morto', 'Desconhecido'] }] },
  { id: 'place', name: 'Local', color: '#10b981', icon: 'map-pin', standard: true, fields: [{ id: 'region', label: 'Região', kind: 'text' }] },
  { id: 'faction', name: 'Facção', color: '#f59e0b', icon: 'shield', standard: true, fields: [{ id: 'alignment', label: 'Alinhamento', kind: 'text' }] },
  { id: 'item', name: 'Item', color: '#06b6d4', icon: 'gem', standard: true, fields: [{ id: 'rarity', label: 'Raridade', kind: 'text' }] },
  { id: 'event', name: 'Evento', color: '#ef4444', icon: 'calendar', standard: true, fields: [{ id: 'date', label: 'Data', kind: 'text' }] },
  { id: 'creature', name: 'Criatura', color: '#ec4899', icon: 'paw-print', standard: true, fields: [{ id: 'threat', label: 'Ameaça', kind: 'number' }, { id: 'habitat', label: 'Habitat', kind: 'text' }] },
  { id: 'lore', name: 'Conhecimento', color: '#64748b', icon: 'book-open', standard: true, fields: [] },
];

export function createEmptyCodex(now = new Date().toISOString()): CodexDocument {
  return { version: 1, notes: [], types: structuredClone(STANDARD_CODEX_TYPES), folders: [], relations: [], savedViews: [], updatedAt: now };
}

export function normalizeCodex(value: unknown): CodexDocument {
  const empty = createEmptyCodex();
  if (!value || typeof value !== 'object') return empty;
  const source = value as Partial<CodexDocument>;
  const customTypes = Array.isArray(source.types) ? source.types.filter(type => type && !STANDARD_CODEX_TYPES.some(item => item.id === type.id)) : [];
  return {
    version: 1,
    notes: Array.isArray(source.notes) ? source.notes.map((note: any) => ({
      ...note,
      links: Array.isArray(note.links) ? note.links : (note.externalUrl ? [{ label: 'Link Externo', url: note.externalUrl }] : [])
    })) : [],
    types: [...structuredClone(STANDARD_CODEX_TYPES), ...customTypes],
    folders: Array.isArray(source.folders) ? source.folders : [],
    relations: Array.isArray(source.relations) ? source.relations : [],
    savedViews: Array.isArray(source.savedViews) ? source.savedViews : [],
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : empty.updatedAt,
  };
}

export function deleteCodexNote(document: CodexDocument, noteId: string): CodexDocument {
  return {
    ...document,
    notes: document.notes.filter(note => note.id !== noteId),
    relations: document.relations.filter(relation => relation.sourceId !== noteId && relation.targetId !== noteId),
    updatedAt: new Date().toISOString(),
  };
}

export function deleteCodexType(document: CodexDocument, typeId: string): CodexDocument {
  const type = document.types.find(item => item.id === typeId);
  if (!type || type.standard) return document;
  return {
    ...document,
    types: document.types.filter(item => item.id !== typeId),
    notes: document.notes.map(note => note.typeId === typeId ? { ...note, typeId: 'lore' } : note),
    updatedAt: new Date().toISOString(),
  };
}

export function upsertCodexFolder(document: CodexDocument, folder: CodexFolder): CodexDocument {
  const trimmedName = folder.name.trim();
  if (!trimmedName) throw new Error('O nome da pasta não pode ser vazio.');
  const normalizedFolder: CodexFolder = { ...folder, name: trimmedName, color: folder.color || '#10b981' };
  return {
    ...document,
    folders: document.folders.some(item => item.id === folder.id)
      ? document.folders.map(item => item.id === folder.id ? normalizedFolder : item)
      : [...document.folders, normalizedFolder],
    updatedAt: new Date().toISOString(),
  };
}

export function deleteCodexFolder(document: CodexDocument, folderId: string): CodexDocument {
  return {
    ...document,
    folders: document.folders.filter(folder => folder.id !== folderId),
    notes: document.notes.map(note => note.folderId === folderId ? { ...note, folderId: null } : note),
    savedViews: document.savedViews.map(view => view.folderId === folderId ? { ...view, folderId: null } : view),
    updatedAt: new Date().toISOString(),
  };
}

export function upsertCodexRelation(document: CodexDocument, relation: CodexRelation): CodexDocument {
  if (relation.sourceId === relation.targetId) throw new Error('Uma entidade não pode se relacionar consigo mesma.');
  if (!document.notes.some(note => note.id === relation.sourceId) || !document.notes.some(note => note.id === relation.targetId)) throw new Error('A relação aponta para uma entidade inexistente.');
  const duplicate = document.relations.some(item => item.id !== relation.id && item.sourceId === relation.sourceId && item.targetId === relation.targetId && item.label.trim().toLocaleLowerCase('pt-BR') === relation.label.trim().toLocaleLowerCase('pt-BR'));
  if (duplicate) throw new Error('Esta relação já existe.');
  return {
    ...document,
    relations: document.relations.some(item => item.id === relation.id) ? document.relations.map(item => item.id === relation.id ? relation : item) : [...document.relations, relation],
    updatedAt: new Date().toISOString(),
  };
}

export interface CodexFilters {
  search?: string;
  typeIds?: string[];
  tags?: string[];
  folderId?: string | null;
  favoritesOnly?: boolean;
}

export function filterCodexNotes(notes: CodexNote[], filters: CodexFilters): CodexNote[] {
  const search = filters.search?.trim().toLocaleLowerCase('pt-BR') || '';
  return notes.filter(note => {
    const haystack = [note.name, note.description, ...note.tags, ...Object.values(note.fields).flat().map(String)].join(' ').toLocaleLowerCase('pt-BR');
    return (!search || haystack.includes(search))
      && (!filters.typeIds?.length || filters.typeIds.includes(note.typeId))
      && (!filters.tags?.length || filters.tags.every(tag => note.tags.includes(tag)))
      && (filters.folderId === undefined || note.folderId === filters.folderId)
      && (!filters.favoritesOnly || note.favorite);
  });
}
