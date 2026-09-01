import { describe, expect, it } from 'vitest';
import { parseCampaignLorePlan } from './campaignLorePlan';

describe('campaignLorePlan', () => {
  it('normaliza o plano estruturado e preserva somente tipos do Códice aceitos', () => {
    const plan = parseCampaignLorePlan(JSON.stringify({
      campaign: { name: 'Cinzas de Vhal', summary: 'Uma campanha de intriga.' },
      notes: [{ name: 'Vhal', typeId: 'local', tags: ['capital'] }, { name: 'Tipo estranho', typeId: 'fora-do-contrato' }],
      relations: [{ source: 'Vhal', target: 'Tipo estranho', label: 'abriga' }],
      characters: [{ name: 'Mira', type: 'npc', description: 'Informante.' }],
      events: [{ title: 'A Queda', year: -14, kind: 'queda', layer: 'world' }],
      lineage: [{ name: 'Casa Vhal', status: 'vivo' }],
      arcs: [{ name: 'O Véu', description: 'Investigar a fenda.' }],
      sessions: [{ summary: 'Os heróis chegam à capital.' }]
    }));

    expect(plan.campaign.name).toBe('Cinzas de Vhal');
    expect(plan.notes.map(note => note.typeId)).toEqual(['local', 'conceito']);
    expect(plan.events[0]).toMatchObject({ year: -14, kind: 'queda', layer: 'world' });
    expect(plan.characters[0].type).toBe('npc');
  });

  it('recusa uma resposta que não permite revisão segura', () => {
    expect(() => parseCampaignLorePlan('{"campaign": {"summary": "sem nome"}}')).toThrow('nome da campanha');
    expect(() => parseCampaignLorePlan('isto não é json')).toThrow();
  });
});
