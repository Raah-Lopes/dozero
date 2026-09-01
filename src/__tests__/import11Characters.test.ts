import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseWikiDocument } from '../services/wiki/wikiGraphData';
import { createCharacterFromWiki } from '../services/characterIntegration';
import { isFichaEntry } from '../hooks/usePersonagens';

const sampleCharacterData: Record<string, Record<string, unknown>> = {
  '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Drougtot_.md': {
    nome: 'Drougtot',
    tipo: 'PC',
    status: 'jogador',
    ativo: false,
    HP: 43,
    HP_max: 43,
    inventario: ['Katana Térmica Subcutânea de Nanotubos', 'Injetor Neuro-Estabilizador de Sanidade (3 doses)', 'Datapad Criptografado da Aethel-Corp'],
    macros: [
      { nome: 'Ataque de Pseudópode Térmico', formula: '1d20+9', tipo: 'ataque' },
      { nome: 'Disparo Nanóide Corrosivo', formula: '1d20+9', tipo: 'ataque' }
    ],
  },
  '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Goma.md': {
    nome: 'Mr. Goma',
    tipo: 'PC',
    status: 'jogador',
    ativo: false,
    HP: 0,
    HP_max: 100,
    PM: 99,
  },
  '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Jacir Malemog.md': {
    nome: 'Jacir Malemog',
    tipo: 'PC',
    status: 'jogador',
    ativo: false,
    HP: 24,
    HP_max: 24,
  },
  '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Jubbaer.md': {
    nome: 'Jubbaer',
    tipo: 'PC',
    status: 'jogador',
    ativo: false,
    HP: 10,
    HP_max: 20,
  },
  '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Kael Ironfist.md': {
    nome: 'Kael Ironfist',
    tipo: 'PC',
    status: 'jogador',
    ativo: false,
    HP: 60,
    HP_max: 85,
  },
  '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Lyra Shadowveil.md': {
    nome: 'Lyra Shadowveil',
    tipo: 'PC',
    status: 'jogador',
    ativo: false,
    HP: 51,
    HP_max: 52,
  },
  '[1] 🏕️ Campanha Principal/Personagens/Jogadores/Thalion Brightweave.md': {
    nome: 'Thalion Brightweave',
    tipo: 'PC',
    status: 'jogador',
    ativo: false,
    HP: 38,
    HP_max: 38,
  },
  '[1] 🏕️ Campanha Principal/Personagens/Monstros/Gorath o Implacavel.md': {
    nome: 'Gorath o Implacável',
    tipo: 'Monstro',
    status: 'inimigo',
    ativo: false,
    HP: 110,
    HP_max: 120,
  },
  '[1] 🏕️ Campanha Principal/Personagens/Monstros/Sentinela Omega 01.md': {
    nome: 'Sentinela Ômega 01',
    tipo: 'Monstro',
    status: 'inimigo',
    ativo: false,
    HP: 42,
    HP_max: 42,
  },
  '[1] 🏕️ Campanha Principal/Personagens/NPCs/Mira Vendas-ao-Vento.md': {
    nome: 'Mira Vendas-ao-Vento',
    tipo: 'NPC',
    status: 'npc',
    ativo: false,
    HP: 30,
    HP_max: 30,
  },
  '[1] 🏕️ Campanha Principal/Personagens/NPCs/Norta.md': {
    nome: 'Norta',
    tipo: 'NPC',
    status: 'npc',
    ativo: false,
    HP: 50,
    HP_max: 50,
  },
};

describe('11 Wiki Characters parser and draft validation', () => {
  const wikiDir = path.resolve(process.cwd(), 'wikidozero');
  const characterFiles = Object.keys(sampleCharacterData);

  it('correctly parses and drafts all 11 characters', () => {
    expect(characterFiles).toHaveLength(11);

    const drafts = characterFiles.map((relPath) => {
      const fullPath = path.join(wikiDir, relPath);
      let metadata: Record<string, unknown>;

      let rawContent: string | null = null;
      if (fs.existsSync(fullPath)) {
        rawContent = fs.readFileSync(fullPath, 'utf8');
        metadata = parseWikiDocument(rawContent).metadata;
      } else {
        metadata = sampleCharacterData[relPath];
      }

      const isFicha = isFichaEntry({ path: relPath, metadata });
      expect(isFicha).toBe(true);

      const draft = createCharacterFromWiki(
        metadata,
        relPath,
        null,
        '5c0be1c0-3583-4ef8-a795-be69bdb56f49',
        rawContent
      );
      return { relPath, draft, metadata, hasRealFile: fs.existsSync(fullPath) };
    });

    expect(drafts).toHaveLength(11);

    // Check specific characters
    const norta = drafts.find((d) => d.relPath.includes('Norta.md'))!;
    expect(norta.draft.name).toBe('Norta');
    expect(norta.draft.type).toBe('npc');
    expect(typeof (norta.draft.data as any).ativo).toBe('boolean');

    const gorath = drafts.find((d) => d.relPath.includes('Gorath'))!;
    expect(gorath.draft.name).toBe('Gorath o Implacável');
    expect(gorath.draft.type).toBe('monster');

    const drougtot = drafts.find((d) => d.relPath.includes('Drougtot'))!;
    expect(drougtot.draft.type).toBe('pc');
    expect((drougtot.draft.data as any).macros).toHaveLength(2);
    expect((drougtot.draft.data as any).inventario).toHaveLength(3);

    drafts.forEach(({ relPath, draft, hasRealFile }) => {
      expect(draft.owner_id).toBe('5c0be1c0-3583-4ef8-a795-be69bdb56f49');
      expect(draft.campaign_id).toBeNull();
      expect(draft.name).toBeTruthy();
      expect(['pc', 'npc', 'monster']).toContain(draft.type);
      expect((draft.data as any).wikiPath).toBe(relPath);
      if (hasRealFile) {
        expect(draft.notes_markdown).toBeTruthy();
        expect((draft.data as any).story).toBeTruthy();
      }
    });
  });
});
