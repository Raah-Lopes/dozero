import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseWikiDocument } from '../services/wiki/wikiGraphData';
import { createCharacterFromWiki } from '../services/characterIntegration';
import { isFichaEntry } from '../hooks/usePersonagens';

describe('11 Wiki Characters parser and draft validation', () => {
  const wikiDir = path.resolve(process.cwd(), 'wikidozero');
  const characterFiles = [
    '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Drougtot_.md',
    '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Goma.md',
    '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Jacir Malemog.md',
    '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Jubbaer.md',
    '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Kael Ironfist.md',
    '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Lyra Shadowveil.md',
    '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Thalion Brightweave.md',
    '[1] 🏕️ Campanha Principal/Personagens/Monstros/Gorath o Implacavel.md',
    '[1] 🏕️ Campanha Principal/Personagens/Monstros/Sentinela Omega 01.md',
    '[1] 🏕️ Campanha Principal/Personagens/NPCs/Mira Vendas-ao-Vento.md',
    '[1] 🏕️ Campanha Principal/Personagens/NPCs/Norta.md',
  ];

  it('correctly parses and drafts all 11 characters', () => {
    expect(characterFiles).toHaveLength(11);

    const drafts = characterFiles.map((relPath) => {
      const fullPath = path.join(wikiDir, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const parsed = parseWikiDocument(raw);
      const isFicha = isFichaEntry({ path: relPath, metadata: parsed.metadata });
      expect(isFicha).toBe(true);

      const draft = createCharacterFromWiki(
        parsed.metadata,
        relPath,
        null,
        '5c0be1c0-3583-4ef8-a795-be69bdb56f49'
      );
      return { relPath, draft, metadata: parsed.metadata };
    });

    expect(drafts).toHaveLength(11);

    // Check specific characters
    const norta = drafts.find((d) => d.relPath.includes('Norta.md'))!;
    expect(norta.draft.name).toBe('Norta');
    expect(norta.draft.type).toBe('npc');
    expect((norta.draft.data as any).ativo).toBe(false);

    const gorath = drafts.find((d) => d.relPath.includes('Gorath'))!;
    expect(gorath.draft.name).toBe('Gorath o Implacável');
    expect(gorath.draft.type).toBe('monster');

    const drougtot = drafts.find((d) => d.relPath.includes('Drougtot'))!;
    expect(drougtot.draft.type).toBe('pc');
    expect((drougtot.draft.data as any).macros).toHaveLength(2);
    expect((drougtot.draft.data as any).inventario).toHaveLength(3);

    drafts.forEach(({ relPath, draft }) => {
      expect(draft.owner_id).toBe('5c0be1c0-3583-4ef8-a795-be69bdb56f49');
      expect(draft.campaign_id).toBeNull();
      expect(draft.name).toBeTruthy();
      expect(['pc', 'npc', 'monster']).toContain(draft.type);
      expect((draft.data as any).wikiPath).toBe(relPath);
    });
  });
});
