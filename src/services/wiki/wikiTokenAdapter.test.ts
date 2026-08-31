import { describe, expect, it } from 'vitest';
import { createWikiTokenData } from './wikiTokenAdapter';

describe('createWikiTokenData', () => {
  it('preserva valores zero e vincula o token ao arquivo da ficha', () => {
    const token = createWikiTokenData({
      nome: 'Goma', tipo: 'PC', status: 'jogador', HP: 0, HP_max: 100, PM: 0, PM_max: 99,
      imagem: 'https://example.test/goma.webp', hasVision: false,
    }, 'Campanha/Personagens/Jogadores/Goma.md', { x: 12, y: 24 });

    expect(token).toMatchObject({
      name: 'Goma', type: 'player', hp: 0, maxHp: 100, mana: 0, maxMana: 99,
      x: 12, y: 24, wikiPath: 'Campanha/Personagens/Jogadores/Goma.md',
      caminhoArquivo: 'Campanha/Personagens/Jogadores/Goma.md', hasVision: false,
    });
  });

  it('usa a imagem própria do token e nunca replica data URL no documento compartilhado', () => {
    const token = createWikiTokenData({
      nome: 'Mira', tipo: 'NPC', imagem: 'data:image/webp;base64,muito-grande',
      token_imagem: '[3] 📎 Anexos/Mira_Vendas_ao_Vento.png',
    }, 'Campanha/Personagens/NPCs/Mira.md');

    expect(token).toMatchObject({
      type: 'npc', imageUrl: '[3] 📎 Anexos/Mira_Vendas_ao_Vento.png', hp: 100, maxHp: 100,
    });
  });
});
