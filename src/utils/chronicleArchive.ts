import type { ChronicleEra, ChronicleEventKind, ChronicleMeta, ChronosEvent, ChronosEventLayer } from '../store/world';

export interface ChronicleArchive {
  version: 1;
  name: string;
  calendar: string;
  eras: Array<{
    id: string;
    name: string;
    start: number;
    end: number;
    color: string;
    description: string;
    background: string | null;
    collapsed: boolean;
    notes: Array<{
      id: string;
      title: string;
      year: number;
      kind: ChronicleEventKind;
      description: string;
      image: string | null;
      tags: string[];
      layer: ChronosEventLayer;
      wikiPath: string | null;
    }>;
  }>;
}

const KINDS = new Set<ChronicleEventKind>(['fundacao', 'reinado', 'batalha', 'descoberta', 'catastrofe', 'pacto', 'magia', 'jornada', 'queda']);
const LAYERS = new Set<ChronosEventLayer>(['world', 'campaign', 'character']);
const id = (prefix: string) => `${prefix}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;

export function createChronicleArchive(meta: ChronicleMeta, eras: ChronicleEra[], events: ChronosEvent[]): ChronicleArchive {
  return {
    version: 1,
    name: meta.worldName,
    calendar: meta.calendarLabel,
    eras: eras.map(era => ({
      id: era.id,
      name: era.name,
      start: era.startYear,
      end: era.endYear,
      color: era.color,
      description: era.description,
      background: era.backgroundUrl || null,
      collapsed: Boolean(era.collapsed),
      notes: events.filter(event => event.eraId === era.id && event.datePrecision === 'year').map(event => ({
        id: event.id,
        title: event.title,
        year: event.year,
        kind: event.kind || 'fundacao',
        description: event.description || '',
        image: event.imageUrl || null,
        tags: event.tags || [],
        layer: event.layer || 'world',
        wikiPath: event.wikiPath || null
      }))
    }))
  };
}

export function parseChronicleArchive(raw: unknown): { meta: ChronicleMeta; eras: ChronicleEra[]; events: ChronosEvent[] } | null {
  if (!raw || typeof raw !== 'object') return null;
  const world = raw as Record<string, unknown>;
  if (typeof world.name !== 'string' || typeof world.calendar !== 'string' || !Array.isArray(world.eras)) return null;
  const eras: ChronicleEra[] = [];
  const events: ChronosEvent[] = [];
  for (const entry of world.eras) {
    if (!entry || typeof entry !== 'object') return null;
    const era = entry as Record<string, unknown>;
    if (typeof era.name !== 'string' || typeof era.start !== 'number' || typeof era.end !== 'number' || era.end < era.start || !Array.isArray(era.notes)) return null;
    const eraId = typeof era.id === 'string' ? era.id : id('chronicle_era');
    eras.push({ id: eraId, name: era.name.trim() || 'Era sem nome', startYear: era.start, endYear: era.end, color: typeof era.color === 'string' ? era.color : '#8b5cf6', description: typeof era.description === 'string' ? era.description : '', backgroundUrl: typeof era.background === 'string' ? era.background : undefined, collapsed: Boolean(era.collapsed) });
    for (const item of era.notes) {
      if (!item || typeof item !== 'object') return null;
      const note = item as Record<string, unknown>;
      if (typeof note.title !== 'string' || typeof note.year !== 'number') return null;
      const kind = KINDS.has(note.kind as ChronicleEventKind) ? note.kind as ChronicleEventKind : 'fundacao';
      const layer = LAYERS.has(note.layer as ChronosEventLayer) ? note.layer as ChronosEventLayer : 'world';
      events.push({ id: typeof note.id === 'string' ? note.id : id('chronicle_event'), title: note.title.trim() || 'Evento sem título', day: 1, month: 1, year: Math.round(note.year), eraId, datePrecision: 'year', kind, layer, description: typeof note.description === 'string' ? note.description : '', imageUrl: typeof note.image === 'string' ? note.image : undefined, tags: Array.isArray(note.tags) ? note.tags.filter((tag): tag is string => typeof tag === 'string') : [], wikiPath: typeof note.wikiPath === 'string' ? note.wikiPath : undefined });
    }
  }
  return { meta: { worldName: world.name.trim() || 'Mundo da Campanha', calendarLabel: world.calendar.trim() || 'Ano' }, eras, events };
}

export function downloadChronicle(archive: ChronicleArchive) {
  const slug = archive.name.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'cronologia';
  const url = URL.createObjectURL(new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug}-chronologia.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
