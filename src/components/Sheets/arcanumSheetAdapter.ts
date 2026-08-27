import { DEFAULT_CHARACTER, type Character } from './Arcanum/lib';
import type { CharacterRecord } from '../../services/characterRepository';

export const ARCANUM_SHEET_KIND = 'arcanum';

export function characterFromRecord(record: CharacterRecord): Character {
  const stored = record.data?.character as Partial<Character> | undefined;
  if (record.data?.sheetKind === ARCANUM_SHEET_KIND && stored) {
    return { ...structuredClone(DEFAULT_CHARACTER), ...stored, name: record.name };
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
    notes: record.notes_markdown || '',
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
