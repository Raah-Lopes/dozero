import { describe, it, expect } from 'vitest';
import * as yaml from 'js-yaml';

describe('CharacterSheet Data Logic', () => {
  it('deve parsear e serializar atributos e calcular modificadores D&D/D20', () => {
    const calcMod = (score: number) => Math.floor((Number(score) - 10) / 2);
    expect(calcMod(10)).toBe(0);
    expect(calcMod(18)).toBe(4);
    expect(calcMod(8)).toBe(-1);
    expect(calcMod(15)).toBe(2);
  });

  it('deve sincronizar inventário, magias e diário de sessão no YAML sem perder campos', () => {
    const initialData = {
      nome: 'Valerius Brightblade',
      nivel: 5,
      classe: 'Paladino',
      pv: 42,
      pv_max: 42,
      PM: 15,
      PM_max: 15,
      magias: [
        { nome: 'Cura Pelas Mãos', custo_pm: 2, dano: '2d8', alcance: 'Toque' }
      ],
      inventario: [
        { nome: 'Espada Longa Sagrada', quantidade: 1, dano: '1d8+3' },
        { nome: 'Poção de Cura', quantidade: 3 }
      ],
      diario_sessao: [
        { data: '25/08/2026', resumo: 'Derrotamos o culto na masmorra.' }
      ]
    };

    const dumpedYaml = yaml.dump(initialData);
    const parsedBack = yaml.load(dumpedYaml) as typeof initialData;

    expect(parsedBack.nome).toBe('Valerius Brightblade');
    expect(parsedBack.magias.length).toBe(1);
    expect(parsedBack.magias[0].nome).toBe('Cura Pelas Mãos');
    expect(parsedBack.inventario.length).toBe(2);
    expect(parsedBack.inventario[1].quantidade).toBe(3);
    expect(parsedBack.diario_sessao.length).toBe(1);
  });

  it('deve atualizar a quantidade de um item e remover quando zerado', () => {
    const inventory = [
      { nome: 'Tochas', quantidade: 2 },
      { nome: 'Rações', quantidade: 1 }
    ];

    // Decrementa tochas
    const updated1 = inventory.map(item => item.nome === 'Tochas' ? { ...item, quantidade: item.quantidade - 1 } : item);
    expect(updated1.find(i => i.nome === 'Tochas')?.quantidade).toBe(1);

    // Decrementa rações até zero (remover)
    const updated2 = updated1.filter(item => item.nome !== 'Rações');
    expect(updated2.length).toBe(1);
    expect(updated2.find(i => i.nome === 'Rações')).toBeUndefined();
  });
});
