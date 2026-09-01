import { DEFAULT_CHARACTER, type Character } from './Arcanum/lib';
import type { CharacterRecord } from '../../services/characterRepository';

export const ARCANUM_SHEET_KIND = 'arcanum';

export function characterFromRecord(record: CharacterRecord): Character {
  const stored = record.data?.character as Partial<Character> | undefined;
  const rawStory = (record.data?.story as string) || (record.data?.backstory as string) || (typeof record.data?.biografia === 'string' ? record.data.biografia : '') || record.notes_markdown || '';
  const rawNotes = (record.data?.notes as string) || record.notes_markdown || '';

  if (record.data?.sheetKind === ARCANUM_SHEET_KIND && stored) {
    return {
      ...structuredClone(DEFAULT_CHARACTER),
      ...stored,
      name: record.name,
      story: stored.story || rawStory,
      notes: stored.notes || rawNotes,
    };
  }

  const vitals = (record.data?.vitals || {}) as Record<string, unknown>;
  const hp = Number(vitals.hp || vitals.pv || record.data?.hp || 20);
  const maxHp = Number(vitals.maxHp || vitals.pv_max || record.data?.maxHp || hp);
  const mana = Number(vitals.mana || vitals.pm || record.data?.mana || 10);
  const maxMana = Number(vitals.maxMana || vitals.pm_max || record.data?.maxMana || mana);

  return {
    ...structuredClone(DEFAULT_CHARACTER),
    name: record.name,
    avatar: record.avatar_url || DEFAULT_CHARACTER.avatar,
    notes: rawNotes,
    story: rawStory,
    vitals: [
      { id: 'pv', label: 'Pontos de Vida', value: hp, max: maxHp, color: '#c14e39' },
      { id: 'pm', label: 'Pontos de Magia', value: mana, max: maxMana, color: '#6b87b3' },
    ],
  };
}

export function recordData(record: CharacterRecord, character: Character, wikiPath?: string) {
  return {
    ...record.data,
    sheetKind: ARCANUM_SHEET_KIND,
    sheetVersion: 1,
    wikiPath: wikiPath !== undefined ? wikiPath : record.data?.wikiPath || '',
    character,
  };
}
