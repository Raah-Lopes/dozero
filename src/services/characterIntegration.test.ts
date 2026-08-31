import { describe, expect, it } from 'vitest';
import {
  createCharacterFromWiki,
  findCharacterByWikiPath,
  findCodexNoteForCharacter,
  upsertCharacterCodex,
} from './characterIntegration';
import { createEmptyCodex } from '../components/Wiki/Codex/codexModel';
import type { CharacterRecord } from './characterRepository';

describe('characterIntegration', () => {
  const wikiPath = '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Ayla.md';

  it('converte uma ficha Markdown preservando vínculo e valores zero', () => {
    const draft = createCharacterFromWiki({
      nome: 'Ayla',
      tipo: 'PC',
      status: 'jogador',
      HP: 0,
      HP_max: 24,
      PM: 0,
      PM_max: 8,
      imagem: '/ayla.webp',
    }, wikiPath, 'mesa-1', 'user-1');

    expect(draft).toMatchObject({
      campaign_id: 'mesa-1',
      owner_id: 'user-1',
      name: 'Ayla',
      type: 'pc',
      avatar_url: '/ayla.webp',
    });
    expect(draft.data).toMatchObject({ wikiPath, hp: 0, maxHp: 24, mana: 0, maxMana: 8 });
  });

  it('cria somente uma nota do Códice para a mesma ficha', () => {
    const character: CharacterRecord = {
      id: 'char-1',
      campaign_id: 'mesa-1',
      name: 'Ayla',
      type: 'pc',
      avatar_url: '/ayla.webp',
      notes_markdown: 'Batedora da companhia.',
      data: { wikiPath, hp: 12, maxHp: 24, nivel: 3 },
    };
    const first = upsertCharacterCodex(createEmptyCodex('2026-01-01T00:00:00.000Z'), character);
    const second = upsertCharacterCodex(first.document, { ...character, name: 'Ayla Vento Norte' });

    expect(second.document.notes).toHaveLength(1);
    expect(second.note).toMatchObject({ characterId: 'char-1', wikiPath, name: 'Ayla Vento Norte' });
    expect(findCodexNoteForCharacter(second.document, character)?.id).toBe(second.note.id);
    expect(findCharacterByWikiPath([character], wikiPath)).toBe(character);
  });
});
