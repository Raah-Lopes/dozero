// src/services/campaignPublisherService.ts
// Servico de geracao de Livro de Campanha / Tomo do Mundo em PDF de alta qualidade e HTML portatil.

export type BookTheme = 'grimoire' | 'parchment' | 'clean';

export interface BookPublishOptions {
  title: string;
  subtitle?: string;
  author?: string;
  system?: string;
  coverImageUrl?: string;
  theme: BookTheme;
  twoColumns: boolean;
  includeCover: boolean;
  includeToc: boolean;
  includeOverview: boolean;
  includeScenes: boolean;
  includeBestiary: boolean;
  includeWikiNotes: boolean;
  includeLineages: boolean;
  selectedWikiPaths?: string[];
  selectedSceneIds?: string[];
  selectedCharacterIds?: string[];
}

export interface BookChapter {
  id: string;
  title: string;
  subtitle?: string;
  type: 'cover' | 'toc' | 'overview' | 'scene' | 'character' | 'wiki' | 'lineage';
  contentHtml: string;
}

/**
 * Converte Markdown basico em HTML seguro para impressao
 */
export function simpleMarkdownToHtml(md: string): string {
  if (!md) return '';

  // Remove frontmatter se houver
  let content = md;
  if (content.startsWith('---')) {
    const end = content.indexOf('---', 3);
    if (end !== -1) {
      content = content.slice(end + 3).trim();
    }
  }

  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Blockquotes
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Bold e Italico
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Imagens
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<div class="img-wrapper"><img src="$2" alt="$1" /><p class="caption">$1</p></div>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>')
    // Listas
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>')
    // Linhas horizontais
    .replace(/^---$/gim, '<hr />')
    // Paragrafos
    .split('\n\n')
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<ul') || trimmed.startsWith('<div') || trimmed.startsWith('<hr')) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');
}

/**
 * Retorna os estilos CSS embutidos para o tema e formato de impressao
 */
export function getBookStyles(theme: BookTheme, twoColumns: boolean): string {
  let themeCss = '';

  if (theme === 'grimoire') {
    themeCss = `
      :root {
        --bg-color: #120d09;
        --page-bg: #1a130e;
        --text-color: #e6ded3;
        --accent-color: #d4af37;
        --border-color: #5c4228;
        --header-color: #fef08a;
        --stat-bg: #241a12;
        --quote-bg: #211710;
      }
    `;
  } else if (theme === 'parchment') {
    themeCss = `
      :root {
        --bg-color: #e8dec8;
        --page-bg: #f5eedc;
        --text-color: #2b1d0c;
        --accent-color: #851e1e;
        --border-color: #bfa888;
        --header-color: #6b1414;
        --stat-bg: #eae0cb;
        --quote-bg: #eee5d0;
      }
    `;
  } else {
    // clean / print-friendly
    themeCss = `
      :root {
        --bg-color: #f3f4f6;
        --page-bg: #ffffff;
        --text-color: #1f2937;
        --accent-color: #3b82f6;
        --border-color: #d1d5db;
        --header-color: #111827;
        --stat-bg: #f9fafb;
        --quote-bg: #f3f4f6;
      }
    `;
  }

  return `
    ${themeCss}
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: Georgia, 'Times New Roman', serif;
      line-height: 1.6;
      font-size: 14px;
    }

    .book-container {
      max-width: 860px;
      margin: 0 auto;
      background-color: var(--page-bg);
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
    }

    .book-page {
      padding: 40px;
      min-height: 1120px;
      position: relative;
      page-break-after: always;
      break-after: page;
      border-bottom: 1px dashed var(--border-color);
    }

    .book-page:last-child {
      border-bottom: none;
      page-break-after: avoid;
      break-after: avoid;
    }

    /* CAPA */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      padding: 60px 40px;
      min-height: 1120px;
      border: 6px double var(--accent-color);
      margin: 20px;
      background: radial-gradient(circle, var(--page-bg) 60%, rgba(0,0,0,0.15) 100%);
    }

    .cover-title {
      font-size: 38px;
      font-weight: bold;
      color: var(--header-color);
      margin: 20px 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    .cover-subtitle {
      font-size: 18px;
      color: var(--accent-color);
      font-style: italic;
      margin-bottom: 30px;
    }

    .cover-image {
      max-width: 90%;
      max-height: 480px;
      object-fit: cover;
      border-radius: 8px;
      border: 3px solid var(--accent-color);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      margin: 20px 0;
    }

    .cover-footer {
      font-size: 13px;
      letter-spacing: 1px;
      color: var(--text-color);
      border-top: 1px solid var(--border-color);
      padding-top: 15px;
      width: 80%;
    }

    /* SUMÁRIO */
    .toc-list {
      list-style: none;
      padding: 0;
      margin: 30px 0;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 8px 0;
      border-bottom: 1px dotted var(--border-color);
      font-size: 15px;
    }

    .toc-item-title {
      font-weight: bold;
      color: var(--header-color);
    }

    .toc-item-page {
      font-weight: bold;
      color: var(--accent-color);
    }

    /* TIPOGRAFIA & CONTEÚDO */
    h1, h2, h3, h4 {
      color: var(--header-color);
      font-family: 'Cinzel', Georgia, serif;
      margin-top: 24px;
      margin-bottom: 12px;
    }

    h1 {
      font-size: 26px;
      border-bottom: 2px solid var(--accent-color);
      padding-bottom: 6px;
      text-transform: uppercase;
    }

    h2 {
      font-size: 20px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 4px;
    }

    h3 { font-size: 16px; }

    .content-columns {
      column-count: ${twoColumns ? 2 : 1};
      column-gap: 30px;
      column-rule: 1px solid var(--border-color);
      text-align: justify;
    }

    p { margin: 0 0 14px 0; }

    blockquote {
      margin: 16px 0;
      padding: 12px 18px;
      background-color: var(--quote-bg);
      border-left: 4px solid var(--accent-color);
      font-style: italic;
      border-radius: 0 6px 6px 0;
    }

    /* STAT BLOCKS (Fichas de Monstros/Personagens) */
    .statblock {
      background-color: var(--stat-bg);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      break-inside: avoid;
    }

    .statblock-header {
      border-bottom: 2px solid var(--accent-color);
      padding-bottom: 8px;
      margin-bottom: 10px;
    }

    .statblock-title {
      font-size: 20px;
      font-weight: bold;
      color: var(--header-color);
      margin: 0;
    }

    .statblock-meta {
      font-style: italic;
      font-size: 12px;
      color: var(--accent-color);
    }

    .statblock-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
      text-align: center;
      background: rgba(0,0,0,0.1);
      padding: 8px;
      border-radius: 6px;
      margin: 10px 0;
    }

    .statblock-attr {
      font-size: 11px;
      font-weight: bold;
    }

    .statblock-val {
      font-size: 15px;
      font-weight: bold;
      color: var(--accent-color);
    }

    /* IMAGENS & MAPAS */
    .img-wrapper {
      text-align: center;
      margin: 20px 0;
      break-inside: avoid;
    }

    .img-wrapper img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }

    .img-wrapper .caption {
      font-size: 12px;
      color: var(--accent-color);
      font-style: italic;
      margin-top: 6px;
    }

    .page-footer {
      position: absolute;
      bottom: 20px;
      left: 40px;
      right: 40px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--border-color);
      border-top: 1px solid var(--border-color);
      padding-top: 8px;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
      body {
        background-color: transparent !important;
      }
      .book-container {
        box-shadow: none !important;
        max-width: 100% !important;
      }
      .book-page {
        padding: 0 !important;
        border-bottom: none !important;
        min-height: auto !important;
      }
      .cover-page {
        margin: 0 !important;
        min-height: 98vh !important;
      }
    }
  `;
}

/**
 * Monta os capitulos e gera o HTML estruturado do livro completo
 */
export async function generateCampaignBookHtml(
  campaignId: string,
  options: BookPublishOptions,
  rawData?: { scenes?: any[]; characters?: any[]; wikiEntries?: any[]; lineage?: any }
): Promise<string> {
  const chapters: BookChapter[] = [];
  let pageCounter = 1;

  // 1. Capa
  if (options.includeCover) {
    chapters.push({
      id: 'cover',
      title: 'Capa',
      type: 'cover',
      contentHtml: `
        <div class="cover-page">
          <div class="cover-header">
            <div style="font-size: 14px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent-color);">
              ${options.system || 'DOZERO RPG ECOSYSTEM'}
            </div>
            <h1 class="cover-title">${options.title}</h1>
            ${options.subtitle ? `<div class="cover-subtitle">${options.subtitle}</div>` : ''}
          </div>

          ${options.coverImageUrl ? `<img src="${options.coverImageUrl}" class="cover-image" alt="Capa" />` : ''}

          <div class="cover-footer">
            <div><strong>Autor / Mestre:</strong> ${options.author || 'Mestre da Mesa'}</div>
            <div style="margin-top: 4px;">Publicado em ${new Date().toLocaleDateString('pt-BR')} • DOZERO VTT</div>
          </div>
        </div>
      `
    });
    pageCounter++;
  }

  // 2. Visão Geral
  if (options.includeOverview) {
    chapters.push({
      id: 'overview',
      title: 'Capítulo I — Visão Geral do Mundo',
      subtitle: 'Histórico, Cosmologia e Geografia',
      type: 'overview',
      contentHtml: `
        <div class="book-page">
          <h1>Capítulo I — Visão Geral do Mundo</h1>
          <div class="content-columns">
            <p>Bem-vindo às crônicas de <strong>${options.title}</strong>. Este tomo reúne os registros, lendas, mapas e personagens que moldam a nossa campanha.</p>
            <blockquote>"Nas terras sem nome onde o véu entre os mundos é tênue, cada escolha ecoa pela eternidade."</blockquote>
            <p>Os registros contidos neste livro foram extraídos diretamente do Códice e da Memória Viva do DOZERO VTT, preservando a verdade histórica das nossas sessões.</p>
          </div>
          <div class="page-footer">
            <span>${options.title}</span>
            <span>Página ${pageCounter++}</span>
          </div>
        </div>
      `
    });
  }

  // 3. Cenas e Masmorras
  if (options.includeScenes && rawData?.scenes && rawData.scenes.length > 0) {
    const scenesToInclude = options.selectedSceneIds
      ? rawData.scenes.filter(s => options.selectedSceneIds!.includes(s.id))
      : rawData.scenes;

    if (scenesToInclude.length > 0) {
      let scenesHtml = '';
      scenesToInclude.forEach((scene, idx) => {
        scenesHtml += `
          <div style="margin-bottom: 28px; break-inside: avoid;">
            <h2>${idx + 1}. ${scene.name || 'Cena Sem Nome'}</h2>
            ${scene.backgroundUrl ? `<div class="img-wrapper"><img src="${scene.backgroundUrl}" alt="${scene.name}" /><p class="caption">Mapa tático / Cenário: ${scene.name}</p></div>` : ''}
            <p><strong>Escala do Grid:</strong> ${scene.gridSize || 70}px • <strong>Iluminação:</strong> ${scene.lightingMode || 'Normal'}</p>
            ${scene.description ? `<p>${scene.description}</p>` : '<p><em>Sem descrição detalhada registrada para esta área.</em></p>'}
          </div>
        `;
      });

      chapters.push({
        id: 'scenes',
        title: 'Capítulo II — Atlas de Cenas & Masmorras',
        subtitle: 'Locais de Batalha e Exploração',
        type: 'scene',
        contentHtml: `
          <div class="book-page">
            <h1>Capítulo II — Atlas de Cenas & Masmorras</h1>
            <div class="content-columns">
              ${scenesHtml}
            </div>
            <div class="page-footer">
              <span>${options.title} • Atlas</span>
              <span>Página ${pageCounter++}</span>
            </div>
          </div>
        `
      });
    }
  }

  // 4. Bestiário & Personagens
  if (options.includeBestiary && rawData?.characters && rawData.characters.length > 0) {
    const charsToInclude = options.selectedCharacterIds
      ? rawData.characters.filter(c => options.selectedCharacterIds!.includes(c.id))
      : rawData.characters;

    if (charsToInclude.length > 0) {
      let charsHtml = '';
      charsToInclude.forEach(char => {
        const sheet = char.sheet_data || char;
        const attrs = sheet.attributes || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
        
        charsHtml += `
          <div class="statblock">
            <div class="statblock-header">
              <div class="statblock-title">${char.name || sheet.name || 'Personagem'}</div>
              <div class="statblock-meta">${sheet.class || 'Aventureiro'} • Nível ${sheet.level || 1} • ${sheet.race || 'Humano'}</div>
            </div>
            <p><strong>Pontos de Vida (HP):</strong> ${sheet.hp_current ?? sheet.pv ?? 10} / ${sheet.hp_max ?? sheet.pv_max ?? 10} • <strong>Mana/PM:</strong> ${sheet.pm_current ?? sheet.pm ?? 0} / ${sheet.pm_max ?? 0} • <strong>CA:</strong> ${sheet.ca ?? 10}</p>
            
            <div class="statblock-grid">
              <div><div class="statblock-attr">FOR</div><div class="statblock-val">${attrs.str ?? attrs.for ?? 10}</div></div>
              <div><div class="statblock-attr">DES</div><div class="statblock-val">${attrs.dex ?? attrs.des ?? 10}</div></div>
              <div><div class="statblock-attr">CON</div><div class="statblock-val">${attrs.con ?? 10}</div></div>
              <div><div class="statblock-attr">INT</div><div class="statblock-val">${attrs.int ?? 10}</div></div>
              <div><div class="statblock-attr">SAB</div><div class="statblock-val">${attrs.wis ?? attrs.sab ?? 10}</div></div>
              <div><div class="statblock-attr">CAR</div><div class="statblock-val">${attrs.cha ?? attrs.car ?? 10}</div></div>
            </div>
            
            ${sheet.bio ? `<p style="font-size: 12px; margin-top: 8px;"><em>${sheet.bio}</em></p>` : ''}
          </div>
        `;
      });

      chapters.push({
        id: 'characters',
        title: 'Capítulo III — Compêndio de Heróis & Criaturas',
        subtitle: 'Fichas de Personagens e Atores da Campanha',
        type: 'character',
        contentHtml: `
          <div class="book-page">
            <h1>Capítulo III — Compêndio de Personagens</h1>
            <div class="content-columns">
              ${charsHtml}
            </div>
            <div class="page-footer">
              <span>${options.title} • Bestiário</span>
              <span>Página ${pageCounter++}</span>
            </div>
          </div>
        `
      });
    }
  }

  // 5. Notas da Wiki & Códice
  if (options.includeWikiNotes && rawData?.wikiEntries && rawData.wikiEntries.length > 0) {
    const entriesToInclude = options.selectedWikiPaths
      ? rawData.wikiEntries.filter(w => options.selectedWikiPaths!.includes(w.path))
      : rawData.wikiEntries.slice(0, 15);

    if (entriesToInclude.length > 0) {
      let wikiHtml = '';
      entriesToInclude.forEach(entry => {
        const bodyHtml = simpleMarkdownToHtml(entry.content || entry.raw_content || '');
        wikiHtml += `
          <div style="margin-bottom: 30px; break-inside: avoid;">
            <h2>${entry.title || entry.name || entry.path.replace('.md', '')}</h2>
            ${bodyHtml}
          </div>
        `;
      });

      chapters.push({
        id: 'wiki',
        title: 'Capítulo IV — Códice & Lores da Campanha',
        subtitle: 'Documentos, Crônicas e Segredos',
        type: 'wiki',
        contentHtml: `
          <div class="book-page">
            <h1>Capítulo IV — Códice & Lores</h1>
            <div class="content-columns">
              ${wikiHtml}
            </div>
            <div class="page-footer">
              <span>${options.title} • Códice</span>
              <span>Página ${pageCounter++}</span>
            </div>
          </div>
        `
      });
    }
  }

  // 6. Sumário (inserido logo após a capa)
  if (options.includeToc) {
    const tocItemsHtml = chapters
      .filter(c => c.type !== 'cover')
      .map((c, i) => `
        <li class="toc-item">
          <span class="toc-item-title">${c.title}</span>
          <span class="toc-item-page">pág. ${i + 2}</span>
        </li>
      `)
      .join('');

    const tocChapter: BookChapter = {
      id: 'toc',
      title: 'Sumário',
      type: 'toc',
      contentHtml: `
        <div class="book-page">
          <h1>Sumário Geral</h1>
          <ul class="toc-list">
            ${tocItemsHtml}
          </ul>
          <div class="page-footer">
            <span>${options.title}</span>
            <span>Índice</span>
          </div>
        </div>
      `
    };
    chapters.splice(options.includeCover ? 1 : 0, 0, tocChapter);
  }

  const css = getBookStyles(options.theme, options.twoColumns);
  const fullContent = chapters.map(c => c.contentHtml).join('\n');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title} — Livro de Campanha</title>
  <style>${css}</style>
</head>
<body>
  <div class="book-container">
    ${fullContent}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Abre a janela de impressão nativa do navegador formatada como livro de RPG em PDF
 */
export async function printCampaignBook(
  campaignId: string,
  options: BookPublishOptions,
  rawData?: any
): Promise<void> {
  const html = await generateCampaignBookHtml(campaignId, options, rawData);
  
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    throw new Error('Navegador bloqueou a abertura da janela de impressão.');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };
}

/**
 * Exporta um arquivo HTML portátil autônomo para compartilhamento com jogadores
 */
export async function exportStandaloneBookHtml(
  campaignId: string,
  options: BookPublishOptions,
  rawData?: any
): Promise<{ blob: Blob; filename: string }> {
  const html = await generateCampaignBookHtml(campaignId, options, rawData);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const filename = `${options.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_tomo_campanha.html`;
  return { blob, filename };
}

/**
 * Imprime uma nota Markdown individual no estilo pergaminho / grimório
 */
export function printSingleMarkdown(title: string, markdownContent: string, theme: BookTheme = 'parchment'): void {
  const bodyHtml = simpleMarkdownToHtml(markdownContent);
  const css = getBookStyles(theme, false);

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title} — DOZERO</title>
  <style>${css}</style>
</head>
<body>
  <div class="book-container">
    <div class="book-page">
      <h1>${title}</h1>
      <div class="content-columns">
        ${bodyHtml}
      </div>
      <div class="page-footer">
        <span>DOZERO VTT • Códice</span>
        <span>${new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 400);
    };
  }
}
