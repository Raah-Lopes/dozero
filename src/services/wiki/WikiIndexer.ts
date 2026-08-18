import type { WikiEntry } from './WikiQuery';
import { getWikiConfig } from '../../store';
import { state } from '../yjs';
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

const LOCAL_WIKI_STORAGE_KEY = 'dozero_wiki_custom_files_v1';

export class WikiIndexer {
  private static index: WikiEntry[] | null = null;

  static clearCache() {
    this.index = null;
  }

  /**
   * Salva ou atualiza um arquivo .md da Wiki localmente com persistência em IndexedDB/Yjs e localStorage
   */
  static saveLocalWikiFile(path: string, rawContent: string): void {
    try {
      // 1. Salva no mapa Yjs (sincronizado via IndexedDB por sala)
      state.wiki.set(path, rawContent);

      // 2. Persistência auxiliar no localStorage
      const localWiki: Record<string, string> = JSON.parse(localStorage.getItem(LOCAL_WIKI_STORAGE_KEY) || '{}');
      localWiki[path] = rawContent;
      localStorage.setItem(LOCAL_WIKI_STORAGE_KEY, JSON.stringify(localWiki));

      this.clearCache();
      window.dispatchEvent(new Event('wiki-updated'));
    } catch (e) {
      console.error('[WikiIndexer] Erro ao salvar arquivo da wiki localmente:', e);
    }
  }

  /**
   * Remove um arquivo .md da Wiki localmente
   */
  static deleteLocalWikiFile(path: string): void {
    try {
      state.wiki.delete(path);

      const localWiki: Record<string, string> = JSON.parse(localStorage.getItem(LOCAL_WIKI_STORAGE_KEY) || '{}');
      delete localWiki[path];
      localStorage.setItem(LOCAL_WIKI_STORAGE_KEY, JSON.stringify(localWiki));

      this.clearCache();
      window.dispatchEvent(new Event('wiki-updated'));
    } catch (e) {
      console.error('[WikiIndexer] Erro ao deletar arquivo da wiki localmente:', e);
    }
  }

  static async buildIndex(): Promise<WikiEntry[]> {
    if (this.index) {
      return this.index;
    }

    const entriesMap = new Map<string, WikiEntry>();
    const config = getWikiConfig();
    const repoPath = config.repoUrl;

    // 1. Carrega arquivos da API local (se disponível no Node/Vite)
    try {
      const res = await fetch(`/api/wiki/search?q=.md&repoPath=${encodeURIComponent(repoPath)}`);
      if (res.ok) {
        const data = await res.json();
        const files: string[] = data.results || [];

        for (const filePath of files) {
          if (!filePath.endsWith('.md') || filePath.toLowerCase().includes('readme.md')) continue;

          try {
            const fileRes = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(filePath)}`);
            if (!fileRes.ok) continue;
            
            const fileData = await fileRes.json();
            const rawContent = fileData.content;
            const parsed = parseFrontmatter(rawContent);

            const filename = filePath.split('/').pop() || filePath.split('\\').pop() || '';
            const slug = filename.replace(/\.md$/i, '');

            entriesMap.set(filePath, {
              path: filePath,
              slug,
              metadata: parsed.data || {}
            });
          } catch (err) {
            console.error(`[WikiIndexer] Erro ao ler arquivo ${filePath}:`, err);
          }
        }
      }
    } catch (err) {
      console.warn('[WikiIndexer] API local da wiki indisponível, usando armazenamento local-first');
    }

    // 2. Mescla arquivos salvos no Yjs / IndexedDB (state.wiki)
    Array.from(state.wiki.keys()).forEach((filePath: any) => {
      const pathStr = String(filePath);
      const rawContent = String(state.wiki.get(filePath) || '');
      const parsed = parseFrontmatter(rawContent);
      const filename = pathStr.split('/').pop() || pathStr.split('\\').pop() || '';
      const slug = filename.replace(/\.md$/i, '');

      entriesMap.set(pathStr, {
        path: pathStr,
        slug,
        metadata: parsed.data || {}
      });
    });

    // 3. Mescla arquivos salvos no localStorage fallback
    try {
      const localWiki: Record<string, string> = JSON.parse(localStorage.getItem(LOCAL_WIKI_STORAGE_KEY) || '{}');
      Object.entries(localWiki).forEach(([filePath, rawContent]) => {
        if (!entriesMap.has(filePath)) {
          const parsed = parseFrontmatter(rawContent);
          const filename = filePath.split('/').pop() || filePath.split('\\').pop() || '';
          const slug = filename.replace(/\.md$/i, '');

          entriesMap.set(filePath, {
            path: filePath,
            slug,
            metadata: parsed.data || {}
          });
        }
      });
    } catch (e) {}

    this.index = Array.from(entriesMap.values());
    return this.index;
  }

  static async loadFileContent(path: string): Promise<string | null> {
    // 1. Tenta buscar no state.wiki (Yjs / IndexedDB local da sala)
    if (state.wiki.has(path)) {
      const rawContent = String(state.wiki.get(path) || '');
      const parsed = parseFrontmatter(rawContent);
      return parsed.content;
    }

    // 2. Tenta buscar no localStorage
    try {
      const localWiki: Record<string, string> = JSON.parse(localStorage.getItem(LOCAL_WIKI_STORAGE_KEY) || '{}');
      if (localWiki[path]) {
        const parsed = parseFrontmatter(localWiki[path]);
        return parsed.content;
      }
    } catch (e) {}

    // 3. Fallback: API local
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl;

      const fileRes = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(path)}`);
      if (!fileRes.ok) return null;
      
      const fileData = await fileRes.json();
      const rawContent = fileData.content;
      
      const parsed = parseFrontmatter(rawContent);
      return parsed.content;
    } catch (err) {
      console.error(`[WikiIndexer] Erro ao carregar conteúdo de ${path}:`, err);
      return null;
    }
  }
}
