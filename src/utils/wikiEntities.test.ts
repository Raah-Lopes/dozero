import { describe, expect, it } from 'vitest';
import { getEntityDate, getEntityStatus, getEntityTags, getWikiEntityStyle, getWikiEntityType } from './wikiEntities';

describe('wiki entity metadata', () => {
  it('normalizes legacy tags, status aliases and dates', () => {
    expect(getEntityTags({ tags: '\\[fogo, chefe]' })).toEqual(['fogo', 'chefe']);
    expect(getEntityStatus({ situação: 'Vivo' })).toBe('Vivo');
    expect(getEntityDate({ atualizado_em: '2026-08-25' }, 'updated')).toBe(Date.parse('2026-08-25'));
    expect(getWikiEntityType({ tipo: 'NPC' })).toBe('personagem');
    expect(getWikiEntityStyle({ categoria: 'local' })?.color).toBe('#34d399');
  });
});
