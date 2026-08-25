import { state } from '../services/yjs';
import { WIKI_ENTITY_STYLES, getWikiEntityType } from '../utils/wikiEntities';
import type { WikiEntry } from '../services/wiki/WikiIndexer';

export interface LorePinData {
  id: string;
  x: number;
  y: number;
  title: string;
  wikiPath?: string;
  entityType?: string;
  color?: string;
  icon?: string;
  gmOnly?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function getLorePinColor(pin: Partial<LorePinData>): string {
  if (pin.color) return pin.color;
  if (pin.entityType && WIKI_ENTITY_STYLES[pin.entityType]) {
    return WIKI_ENTITY_STYLES[pin.entityType].color;
  }
  return '#34d399'; // Verde esmeralda padrão
}

export function addLorePin(pin: Omit<LorePinData, 'id'> & { id?: string }): LorePinData {
  const now = new Date().toISOString();
  const id = pin.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  
  const record: LorePinData = {
    ...pin,
    id,
    color: getLorePinColor(pin),
    createdAt: pin.createdAt || now,
    updatedAt: now
  };

  state.lorePins.set(id, record);
  return record;
}

export function createLorePinFromWikiEntry(entry: WikiEntry, x: number, y: number, gmOnly = false): LorePinData {
  const entityType = getWikiEntityType(entry.metadata);
  const title = String(entry.metadata.nome || entry.metadata.name || entry.metadata.titulo || entry.slug || 'Ponto de Interesse');
  const description = String(entry.metadata.descricao || entry.metadata.description || entry.metadata.resumo || '');
  const color = getLorePinColor({ entityType });

  return addLorePin({
    x,
    y,
    title,
    wikiPath: entry.path,
    entityType: entityType || undefined,
    color,
    gmOnly,
    description: description || undefined
  });
}

export function updateLorePin(id: string, updates: Partial<LorePinData>) {
  const existing = state.lorePins.get(id) as LorePinData | undefined;
  if (existing) {
    const updated: LorePinData = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    if (updates.entityType && !updates.color) {
      updated.color = getLorePinColor({ entityType: updates.entityType });
    }
    state.lorePins.set(id, updated);
  }
}

export function updateLorePinPosition(id: string, x: number, y: number) {
  const existing = state.lorePins.get(id) as LorePinData | undefined;
  if (existing && (existing.x !== x || existing.y !== y)) {
    state.lorePins.set(id, { ...existing, x, y, updatedAt: new Date().toISOString() });
  }
}

export function removeLorePin(id: string) {
  state.lorePins.delete(id);
}

export function getLorePins(): LorePinData[] {
  return Array.from(state.lorePins.values()) as LorePinData[];
}

export function getVisibleLorePins(isGM: boolean): LorePinData[] {
  const all = getLorePins();
  if (isGM) return all;
  return all.filter(pin => !pin.gmOnly);
}
