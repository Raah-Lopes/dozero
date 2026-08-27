import { createEmptyCodex, normalizeCodex, type CodexDocument, type CodexNote } from './codexModel';
import { buildWikiGraphFromFiles } from '../../../services/wiki/wikiGraphData';

export interface CodexStats {
  notes: number;
  folders: number;
  relations: number;
  favorites: number;
  totalFields: number;
  byType: Array<{ typeId: string; count: number }>;
  byRelation: Array<{ label: string; count: number }>;
  byFolder: Array<{ folderId: string; name: string; color: string; count: number; percentage: number }>;
  tags: Array<{ tag: string; count: number }>;
  centrality: Array<{ noteId: string; note: CodexNote; degree: number }>;
  topConnected: { note: CodexNote; degree: number } | null;
  recent: CodexNote[];
}

export function getCodexStats(document: CodexDocument): CodexStats {
  const byType = new Map<string, number>();
  const tags = new Map<string, number>();
  const byRelation = new Map<string, number>();
  let favorites = 0;
  let totalFields = 0;

  for (const note of document.notes) {
    byType.set(note.typeId, (byType.get(note.typeId) || 0) + 1);
    if (note.favorite) favorites++;
    for (const tag of note.tags) tags.set(tag, (tags.get(tag) || 0) + 1);
    totalFields += Object.values(note.fields).filter(value => Array.isArray(value) ? value.length > 0 : value !== '' && value !== undefined && value !== null).length;
  }

  for (const relation of document.relations) {
    const label = relation.label.trim() || 'Relacionado a';
    byRelation.set(label, (byRelation.get(label) || 0) + 1);
  }

  const degree = new Map<string, number>();
  for (const relation of document.relations) {
    degree.set(relation.sourceId, (degree.get(relation.sourceId) || 0) + 1);
    degree.set(relation.targetId, (degree.get(relation.targetId) || 0) + 1);
  }

  const notesMap = new Map(document.notes.map(note => [note.id, note]));
  const centrality = document.notes
    .map(note => ({ noteId: note.id, note, degree: degree.get(note.id) || 0 }))
    .sort((a, b) => b.degree - a.degree || a.note.name.localeCompare(b.note.name, 'pt-BR'))
    .slice(0, 10);

  const topConnected = centrality.length > 0 && centrality[0].degree > 0 ? { note: centrality[0].note, degree: centrality[0].degree } : (document.notes[0] ? { note: document.notes[0], degree: 0 } : null);

  const recent = [...document.notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  const totalNotes = Math.max(1, document.notes.length);
  const byFolder = document.folders.map(folder => {
    const count = document.notes.filter(note => note.folderId === folder.id).length;
    return {
      folderId: folder.id,
      name: folder.name,
      color: folder.color || '#10b981',
      count,
      percentage: Math.round((count / totalNotes) * 100),
    };
  });

  return {
    notes: document.notes.length,
    folders: document.folders.length,
    relations: document.relations.length,
    favorites,
    totalFields,
    byType: [...byType].map(([typeId, count]) => ({ typeId, count })).sort((a, b) => b.count - a.count),
    byRelation: [...byRelation].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    byFolder,
    tags: [...tags].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count),
    centrality,
    topConnected,
    recent,
  };
}

export function createCreatureNote(input: { name: string; description: string; threat: number; habitat: string; tags: string[] }): CodexNote {
  const timestamp = new Date().toISOString();
  return { id: `note_${crypto.randomUUID()}`, name: input.name.trim(), description: input.description.trim(), typeId: 'creature', folderId: null, tags: input.tags.map(tag => tag.trim()).filter(Boolean), fields: { threat: input.threat, habitat: input.habitat.trim() }, favorite: false, links: [], createdAt: timestamp, updatedAt: timestamp };
}

export function serializeCodex(document: CodexDocument): string {
  return JSON.stringify({ kind: 'dozero-codex', version: 1, exportedAt: new Date().toISOString(), document }, null, 2);
}

export function serializeCodexNote(note: CodexNote): string {
  return JSON.stringify({ kind: 'dozero-codex-note', version: 1, exportedAt: new Date().toISOString(), note }, null, 2);
}

export function parseCodexNoteImport(raw: string): CodexNote {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || (parsed as { kind?: string }).kind !== 'dozero-codex-note') throw new Error('Arquivo não é uma nota DOZERO válida.');
  const note = (parsed as { note?: unknown }).note;
  const normalized = normalizeCodex({ notes: note ? [note] : [] }).notes[0];
  if (!normalized?.id || !normalized.name) throw new Error('A nota importada está incompleta.');
  return normalized;
}

export function parseCodexImport(raw: string): CodexDocument {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || (parsed as { kind?: string }).kind !== 'dozero-codex') throw new Error('Arquivo não é um Códice DOZERO válido.');
  const document = (parsed as { document?: unknown }).document;
  return normalizeCodex(document || createEmptyCodex());
}

export function migrateMarkdownFiles(files: Array<[string, string]>): Pick<CodexDocument, 'notes' | 'relations'> {
  const graph = buildWikiGraphFromFiles(files);
  const articles = graph.nodes.filter(node => !node.isFolder);
  const timestamp = new Date().toISOString();
  const notes = articles.map(node => ({ id: `legacy_${node.path}`, name: node.name, description: node.description || '', typeId: normalizeLegacyType(node.entityType), folderId: null, tags: node.tags || [], fields: { status: node.status || '', level: node.level || '', nd: node.nd || '' }, favorite: false, imageUrl: node.avatar || undefined, createdAt: timestamp, updatedAt: timestamp }));
  const relations = graph.links.filter(link => link.sourcePath && link.target).flatMap((link, index) => { const source = `legacy_${link.sourcePath}`; const targetNode = articles.find(node => node.id === link.target || node.name.toLocaleLowerCase('pt-BR') === String(link.target).toLocaleLowerCase('pt-BR')); const target = targetNode?.id; return target && source !== `legacy_${target}` ? [{ id: `legacy_relation_${index}`, sourceId: source, targetId: `legacy_${target}`, label: link.label || 'Relacionado a', color: '#d8b45a', icon: 'link', bidirectional: false }] : []; });
  return { notes, relations };
}

function normalizeLegacyType(type?: string): string {
  const value = String(type || '').toLocaleLowerCase('pt-BR');
  if (value.includes('person') || value.includes('npc')) return 'person';
  if (value.includes('local') || value.includes('cidade') || value.includes('lugar')) return 'place';
  if (value.includes('fac') || value.includes('organ')) return 'faction';
  if (value.includes('item') || value.includes('artef')) return 'item';
  if (value.includes('evento') || value.includes('hist')) return 'event';
  if (value.includes('criatur') || value.includes('monstr')) return 'creature';
  return 'lore';
}
