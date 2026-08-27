import { describe, expect, it } from 'vitest';
import type { CharacterRecord } from '../../services/characterRepository';
import { DEFAULT_CHARACTER } from './Arcanum/lib';
import { characterFromRecord, recordData } from './arcanumSheetAdapter';

const legacyRecord: CharacterRecord = {
  id: 'legacy',
  campaign_id: 'mesa',
  name: 'Ayla',
  type: 'pc',
  avatar_url: 'ayla.webp',
  notes_markdown: 'Notas antigas',
  data: { hp: 12, maxHp: 20, mana: 4, maxMana: 8 },
};

describe('Arcanum sheet adapter', () => {
  it('abre registros antigos sem perder identidade e vitais', () => {
    const character = characterFromRecord(legacyRecord);
    expect(character.name).toBe('Ayla');
    expect(character.avatar).toBe('ayla.webp');
    expect(character.notes).toBe('Notas antigas');
    expect(character.vitals.map((v) => [v.value, v.max])).toEqual([[12, 20], [4, 8]]);
  });

  it('preserva dados externos ao salvar o modelo Arcanum', () => {
    const character = { ...structuredClone(DEFAULT_CHARACTER), name: 'Ayla' };
    const data = recordData(legacyRecord, character, 'Personagens/Ayla.md');
    expect(data).toMatchObject({
      hp: 12,
      sheetKind: 'arcanum',
      sheetVersion: 1,
      wikiPath: 'Personagens/Ayla.md',
      character: { name: 'Ayla' },
    });
  });
});
