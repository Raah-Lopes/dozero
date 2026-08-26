import { describe, expect, it } from 'vitest';
import { FamilyTree, Person } from './tree';

const person = (id: string, name = id) => new Person({ id, name, createdAt: 1 });

describe('FamilyTree', () => {
  it('mantém vínculos conjugais e sociais simétricos', () => {
    const tree = FamilyTree.empty()
      .add(person('a'))
      .add(person('b'))
      .linkPartner('a', 'b')
      .linkRelation('a', 'b', 'amigo', 'Pacto antigo');

    expect(tree.get('a')?.partnerIds).toContain('b');
    expect(tree.get('b')?.partnerIds).toContain('a');
    expect(tree.relationsOf('a')[0]).toMatchObject({ type: 'amigo', notes: 'Pacto antigo' });
    expect(tree.relationsOf('b')[0]).toMatchObject({ type: 'amigo', notes: 'Pacto antigo' });
  });

  it('impede ciclos de descendência', () => {
    const tree = FamilyTree.empty()
      .add(person('avó'))
      .add(person('mãe'))
      .add(person('filha'))
      .linkParent('mãe', 'avó')
      .linkParent('filha', 'mãe');

    const invalid = tree.linkParent('avó', 'filha');
    expect(invalid.get('avó')?.parentIds).toEqual([]);
    expect(invalid.generations()).toBe(3);
  });

  it('remove referências órfãs e preserva descendentes', () => {
    const tree = FamilyTree.empty()
      .add(person('a'))
      .add(person('b'))
      .add(person('c'))
      .linkPartner('a', 'b')
      .linkRelation('b', 'a', 'amigo')
      .linkParent('c', 'a')
      .remove('a');

    expect(tree.has('a')).toBe(false);
    expect(tree.get('b')?.partnerIds).toEqual([]);
    expect(tree.get('b')?.relations).toEqual([]);
    expect(tree.get('c')?.parentIds).toEqual([]);
  });

  it('exporta e importa o atlas sem perda de dados', () => {
    const original = FamilyTree.empty().add(new Person({
      id: 'arya',
      name: 'Arya Lobo',
      affiliation: 'Casa Lobo',
      coatOfArms: 'data:image/webp;base64,brasao',
      portrait: 'data:image/webp;base64,retrato',
      status: 'vivo',
      notes: 'Herdeira',
    }));

    const restored = FamilyTree.from(JSON.parse(original.serialize()));
    expect(restored.toJSON()).toEqual(original.toJSON());
    expect(restored.stats()).toMatchObject({ members: 1, houses: 1, generations: 1 });
  });
});
