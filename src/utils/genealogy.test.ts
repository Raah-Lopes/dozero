import { describe, it, expect } from 'vitest';
import { 
  classifyKinship, 
  extractGenealogyConnections, 
  buildGenealogyTree 
} from './genealogy';
import type { WikiEntry } from '../services/wiki/WikiIndexer';

describe('Genealogy Utilities', () => {
  it('deve classificar corretamente os tipos de parentesco e suas relações inversas', () => {
    const parentClass = classifyKinship('Pai de');
    expect(parentClass?.type).toBe('parent');
    expect(parentClass?.inverse).toBe('child');

    const childClass = classifyKinship('Filho(a) de');
    expect(childClass?.type).toBe('child');
    expect(childClass?.inverse).toBe('parent');

    const spouseClass = classifyKinship('Casado com');
    expect(spouseClass?.type).toBe('spouse');
    expect(spouseClass?.inverse).toBe('spouse');

    const siblingClass = classifyKinship('Irmão de');
    expect(siblingClass?.type).toBe('sibling');
    expect(siblingClass?.inverse).toBe('sibling');
  });

  it('deve extrair conexões genealógicas de frontmatter e markdown links', () => {
    const entries: WikiEntry[] = [
      {
        slug: 'rei-alderon',
        path: 'Personagens/Rei_Alderon.md',
        title: 'Rei Alderon',
        metadata: {
          nome: 'Rei Alderon',
          tipo: 'personagem',
          filhos: ['Príncipe Valerius', 'Princesa Lyanna']
        },
        content: 'Pai de:: [[Príncipe Valerius]]\nCasado com:: [[Rainha Mirella]]'
      },
      {
        slug: 'principe-valerius',
        path: 'Personagens/Principe_Valerius.md',
        title: 'Príncipe Valerius',
        metadata: {
          nome: 'Príncipe Valerius',
          tipo: 'personagem'
        },
        content: 'Filho de:: [[Rei Alderon]]'
      }
    ];

    const connections = extractGenealogyConnections(entries);
    expect(connections.length).toBeGreaterThan(0);
    expect(connections.some(c => c.sourceName === 'Rei Alderon' && c.targetNameOrPath === 'Rainha Mirella')).toBe(true);
  });

  it('deve construir a árvore genealógica completa centrada em um personagem', () => {
    const mockEntries: WikiEntry[] = [
      {
        slug: 'rei-alderon',
        path: 'Personagens/Rei_Alderon.md',
        title: 'Rei Alderon',
        metadata: { nome: 'Rei Alderon', tipo: 'personagem' },
        content: 'Casado com:: [[Rainha Mirella]]\nPai de:: [[Príncipe Valerius]]\nPai de:: [[Princesa Lyanna]]'
      },
      {
        slug: 'rainha-mirella',
        path: 'Personagens/Rainha_Mirella.md',
        title: 'Rainha Mirella',
        metadata: { nome: 'Rainha Mirella', tipo: 'personagem' },
        content: 'Casada com:: [[Rei Alderon]]\nMãe de:: [[Príncipe Valerius]]'
      },
      {
        slug: 'principe-valerius',
        path: 'Personagens/Principe_Valerius.md',
        title: 'Príncipe Valerius',
        metadata: { nome: 'Príncipe Valerius', tipo: 'personagem' },
        content: 'Filho de:: [[Rei Alderon]]\nFilho de:: [[Rainha Mirella]]\nPai de:: [[Jovem Arthur]]'
      },
      {
        slug: 'princesa-lyanna',
        path: 'Personagens/Princesa_Lyanna.md',
        title: 'Princesa Lyanna',
        metadata: { nome: 'Princesa Lyanna', tipo: 'personagem' },
        content: 'Filha de:: [[Rei Alderon]]'
      },
      {
        slug: 'jovem-arthur',
        path: 'Personagens/Jovem_Arthur.md',
        title: 'Jovem Arthur',
        metadata: { nome: 'Jovem Arthur', tipo: 'personagem' },
        content: 'Filho de:: [[Príncipe Valerius]]'
      }
    ];

    const focus = mockEntries.find(e => e.slug === 'principe-valerius')!;
    const tree = buildGenealogyTree(focus, mockEntries);

    expect(tree.focus.name).toBe('Príncipe Valerius');
    // Pais (Rei Alderon, Rainha Mirella)
    expect(tree.ancestors.some(a => a.name === 'Rei Alderon')).toBe(true);
    expect(tree.ancestors.some(a => a.name === 'Rainha Mirella')).toBe(true);
    // Descendentes (Jovem Arthur)
    expect(tree.descendants.some(d => d.name === 'Jovem Arthur')).toBe(true);
    // Irmãos (Princesa Lyanna compartilhando o pai Rei Alderon)
    expect(tree.siblings.some(s => s.name === 'Princesa Lyanna')).toBe(true);
    expect(tree.totalRelatives).toBeGreaterThanOrEqual(4);
  });
});
