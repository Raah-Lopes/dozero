import type { WikiEntry } from './WikiQuery';
import { getWikiConfig } from '../../store';

import * as yaml from 'js-yaml';

function parseFrontmatter(content: string) {
  try {
    const parts = content.split('---');
    if (parts.length >= 3 && content.trim().startsWith('---')) {
      const data = yaml.load(parts[1]) as any;
      return { data: data || {}, content: parts.slice(2).join('---') };
    }
    return { data: {}, content };
  } catch (e) {
    console.error("Erro ao fazer parse do Frontmatter usando js-yaml:", e);
    return { data: {}, content };
  }
}

export class WikiIndexer {
  private static index: WikiEntry[] | null = null;

  static clearCache() {
    this.index = null;
  }

  static async buildIndex(): Promise<WikiEntry[]> {
    if (this.index) {
      return this.index;
    }

    const entries: WikiEntry[] = [];
    const config = getWikiConfig();
    const repoPath = config.repoUrl; // ex: D:/DOZERO/wikidozero

    try {
      // Faz a busca na API local do projeto configurada no vite-plugins
      const res = await fetch(`http://localhost:5174/api/wiki/search?q=.md&repoPath=${encodeURIComponent(repoPath)}`);
      if (!res.ok) throw new Error('Falha ao buscar arquivos da API local');
      
      const data = await res.json();
      const files: string[] = data.results || [];

      // Carrega os arquivos via API para extrair o Frontmatter (gray-matter)
      // Como estamos no localhost, essas requisições são na velocidade do disco rígido
      for (const filePath of files) {
        if (!filePath.endsWith('.md')) continue;
        if (filePath.toLowerCase().includes('readme.md')) continue;

        try {
          const fileRes = await fetch(`http://localhost:5174/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(filePath)}`);
          if (!fileRes.ok) continue;
          
          const fileData = await fileRes.json();
          const rawContent = fileData.content;
          
          const parsed = parseFrontmatter(rawContent);

          const filename = filePath.split('/').pop() || filePath.split('\\').pop() || '';
          const slug = filename.replace(/\.md$/i, '');

          entries.push({
            path: filePath, // guardamos o relativePath devolvido pela API
            slug,
            metadata: parsed.data || {}
          });
        } catch (err) {
          console.error(`[WikiIndexer] Erro ao ler arquivo ${filePath}:`, err);
        }
      }

    } catch (err) {
      console.error('[WikiIndexer] Erro ao conectar na API local da wiki:', err);
    }

    this.index = entries;
    return this.index;
  }

  static async loadFileContent(path: string): Promise<string | null> {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl;

      const fileRes = await fetch(`http://localhost:5174/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(path)}`);
      if (!fileRes.ok) return null;
      
      const fileData = await fileRes.json();
      const rawContent = fileData.content;
      
      const parsed = parseFrontmatter(rawContent);
      return parsed.content; // O texto puro
    } catch (err) {
      console.error(`[WikiIndexer] Erro ao carregar conteúdo de ${path} da API:`, err);
      return null;
    }
  }
}
