import { describe, expect, it } from 'vitest';
import { buildWikiGraphFromFiles } from './wikiGraphData';

describe('buildWikiGraphFromFiles', () => {
  it('constrói pastas, metadados e relações de documentos Markdown', () => {
    const graph = buildWikiGraphFromFiles([
      ['Personagens/Arya.md', `---\ntipo: personagem\nnivel: 7\ntags: [heroina, norte]\n---\nAliado de:: [[Bran|O Vidente]] — protege o irmão`],
      ['Personagens/Bran.md', '# Bran'],
    ]);

    expect(graph.nodes.find((node) => node.id === 'Personagens')).toMatchObject({ isFolder: true });
    expect(graph.nodes.find((node) => node.id === 'Personagens/Arya.md')).toMatchObject({
      entityType: 'personagem',
      level: 7,
      tags: ['heroina', 'norte'],
    });
    expect(graph.links).toContainEqual(expect.objectContaining({
      source: 'Personagens/Arya.md',
      target: 'Bran',
      label: 'Aliado de',
      description: 'protege o irmão',
      sourcePath: 'Personagens/Arya.md',
    }));
  });
});
