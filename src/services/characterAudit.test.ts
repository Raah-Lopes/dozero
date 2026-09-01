import { describe, expect, it } from 'vitest';
import { characterFromMarkdown, auditCharacter, normalizeCharacter } from './characterAudit';

describe('characterAudit', () => {
  it('converte frontmatter legado sem depender de IA', () => {
    const character = characterFromMarkdown('---\nnome: Arin\nPV: 12\nPV_max: 20\nclasse: Ranger\n---\nUma história.');
    expect(character.name).toBe('Arin'); expect(character.vitals[0].max).toBe(20); expect(character.story).toBe('Uma história.');
  });
  it('preserva classes e macros legadas durante a conversão guiada', () => {
    const character = characterFromMarkdown('---\nclasse_personagem: Bruxo\nmacros:\n  - nome: Rajada\n    formula: 1d20+7\n---');
    expect(character.klass).toBe('Bruxo'); expect(character.macros[0].formula).toBe('1d20+7');
  });
  it('normaliza macros inválidas e limita recursos', () => {
    const character = normalizeCharacter({ ...characterFromMarkdown(''), macros: [{ id: '', name: '', formula: 'ruim', note: '' }], vitals: [{ id: '', label: '', value: 40, max: 10, color: '#fff' }] });
    expect(character.macros[0].formula).toBe('1d20'); expect(character.vitals[0].value).toBe(10); expect(auditCharacter(character).valid).toBe(true);
  });
});
