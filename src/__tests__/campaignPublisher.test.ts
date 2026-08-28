import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  simpleMarkdownToHtml, 
  getBookStyles, 
  generateCampaignBookHtml, 
  exportStandaloneBookHtml,
  printSingleMarkdown,
  BookPublishOptions 
} from '../services/campaignPublisherService';

describe('Campaign Book & PDF Publisher Service (G.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts markdown to safe printable HTML and strips frontmatter', () => {
    const rawMd = `---
title: Fortaleza Antiga
tags: [local, masmorra]
---
# A Cidadela Esquecida

> "Erguida antes da Queda dos Deuses."

Esta fortaleza contém **três portões mágicos** e um *abismo sem fim*.

- Portão do Fogo
- Portão do Vento`;

    const html = simpleMarkdownToHtml(rawMd);

    expect(html).not.toContain('tags: [local, masmorra]');
    expect(html).toContain('<h1>A Cidadela Esquecida</h1>');
    expect(html).toContain('<blockquote>"Erguida antes da Queda dos Deuses."</blockquote>');
    expect(html).toContain('<strong>três portões mágicos</strong>');
    expect(html).toContain('<em>abismo sem fim</em>');
    expect(html).toContain('<li>Portão do Fogo</li>');
  });

  it('generates embedded CSS styles for grimoire, parchment, and clean themes', () => {
    const grimoireCss = getBookStyles('grimoire', true);
    expect(grimoireCss).toContain('--bg-color: #120d09');
    expect(grimoireCss).toContain('column-count: 2');
    expect(grimoireCss).toContain('@media print');

    const parchmentCss = getBookStyles('parchment', false);
    expect(parchmentCss).toContain('--bg-color: #e8dec8');
    expect(parchmentCss).toContain('column-count: 1');

    const cleanCss = getBookStyles('clean', true);
    expect(cleanCss).toContain('--bg-color: #f3f4f6');
    expect(cleanCss).toContain('--page-bg: #ffffff');
  });

  it('compiles full campaign book HTML with cover, TOC, scenes, characters, and wiki', async () => {
    const options: BookPublishOptions = {
      title: 'Crônicas de Valoria',
      subtitle: 'O Retorno da Sombra',
      author: 'Mestre Arthur',
      system: 'D20 Arcanum',
      coverImageUrl: 'https://example.com/cover.jpg',
      theme: 'parchment',
      twoColumns: true,
      includeCover: true,
      includeToc: true,
      includeOverview: true,
      includeScenes: true,
      includeBestiary: true,
      includeWikiNotes: true,
      includeLineages: false,
    };

    const mockData = {
      scenes: [
        { id: 'sc-1', name: 'Taverna do Dragão Bêbado', gridSize: 70, description: 'Um local barulhento e acolhedor.' }
      ],
      characters: [
        {
          id: 'char-1',
          name: 'Eldrin',
          sheet_data: {
            class: 'Mago',
            level: 5,
            race: 'Elfo',
            hp_current: 28,
            hp_max: 30,
            pm_current: 40,
            pm_max: 50,
            attributes: { str: 8, dex: 14, con: 12, int: 18, wis: 14, cha: 10 },
            bio: 'Estudioso dos tomos arcanos.'
          }
        }
      ],
      wikiEntries: [
        {
          path: 'Lores/O_Artefato.md',
          title: 'O Olho de Astaroth',
          content: 'Um amuleto com poder cósmico.'
        }
      ]
    };

    const bookHtml = await generateCampaignBookHtml('camp-123', options, mockData);

    expect(bookHtml).toContain('Crônicas de Valoria — Livro de Campanha');
    expect(bookHtml).toContain('Mestre Arthur');
    expect(bookHtml).toContain('D20 Arcanum');
    expect(bookHtml).toContain('Sumário Geral');
    expect(bookHtml).toContain('Capítulo I — Visão Geral do Mundo');
    expect(bookHtml).toContain('Taverna do Dragão Bêbado');
    expect(bookHtml).toContain('Eldrin');
    expect(bookHtml).toContain('O Olho de Astaroth');
  });

  it('exports standalone HTML bundle as a downloadable Blob', async () => {
    const options: BookPublishOptions = {
      title: 'Tomo de Teste',
      theme: 'clean',
      twoColumns: false,
      includeCover: true,
      includeToc: false,
      includeOverview: true,
      includeScenes: false,
      includeBestiary: false,
      includeWikiNotes: false,
      includeLineages: false,
    };

    const { blob, filename } = await exportStandaloneBookHtml('camp-1', options);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('text/html');
    expect(filename).toBe('tomo_de_teste_tomo_campanha.html');
  });

  it('prints single markdown document by opening a styled print window', () => {
    const mockWindow = {
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
      onload: null,
      focus: vi.fn(),
      print: vi.fn(),
    };

    (global as any).window.open = vi.fn().mockReturnValue(mockWindow);

    printSingleMarkdown('Diário do Mestre', '# Segredos da Cripta', 'grimoire');

    expect((global as any).window.open).toHaveBeenCalled();
    expect(mockWindow.document.write).toHaveBeenCalled();
  });
});
