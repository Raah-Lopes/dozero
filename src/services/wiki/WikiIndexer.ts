import type { WikiEntry } from './WikiQuery';
import { getWikiConfig } from '../../store';
import { state } from '../yjs';
import { buildWikiGraphFromFiles, parseWikiDocument, type WikiGraphSource } from './wikiGraphData';

const LOCAL_WIKI_STORAGE_KEY = 'dozero_wiki_custom_files_v1';

export class WikiIndexer {
  private static index: WikiEntry[] | null = null;
  private static rawFiles = new Map<string, string>();

  static clearCache() {
    this.index = null;
    this.rawFiles.clear();
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

  static async buildIndex(bundledFiles?: Record<string, string>): Promise<WikiEntry[]> {
    if (this.index) {
      return this.index;
    }

    const entriesMap = new Map<string, WikiEntry>();
    const config = getWikiConfig();
    const repoPath = config.repoUrl;

    // O Grafo entrega a Wiki em um único chunk sob demanda, evitando uma
    // requisição separada para cada Markdown no Vercel.
    Object.entries(bundledFiles ?? {}).forEach(([filePath, rawContent]) => {
      const parsed = parseWikiDocument(rawContent);
      const filename = filePath.split('/').pop() || filePath.split('\\').pop() || '';
      const slug = filename.replace(/\.md$/i, '');

      this.rawFiles.set(filePath, rawContent);
      entriesMap.set(filePath, { path: filePath, slug, metadata: parsed.metadata });
    });

    // 1. Carrega a Wiki local em uma única resposta. O caminho anterior fazia
    // uma busca seguida de uma requisição para cada Markdown, o que saturava o
    // navegador em wikis grandes e atrasava inclusive a listagem das fichas.
    if (!bundledFiles) try {
      const res = await fetch(`/api/wiki/documents?repoPath=${encodeURIComponent(repoPath)}`);
      if (res.ok) {
        const data = await res.json();
        const documents: Array<{ path?: unknown; content?: unknown }> = Array.isArray(data.documents) ? data.documents : [];

        for (const document of documents) {
          const filePath = String(document.path || '');
          if (!filePath.endsWith('.md') || filePath.toLowerCase().includes('readme.md')) continue;
          const rawContent = String(document.content || '');
          const parsed = parseWikiDocument(rawContent);
          const filename = filePath.split('/').pop() || filePath.split('\\').pop() || '';
          const slug = filename.replace(/\.md$/i, '');

          this.rawFiles.set(filePath, rawContent);
          entriesMap.set(filePath, {
            path: filePath,
            slug,
            metadata: parsed.metadata,
          });
        }
      }
    } catch {
      console.warn('[WikiIndexer] API local da wiki indisponível, usando armazenamento local-first');
    }

    // 2. Mescla arquivos salvos no Yjs / IndexedDB (state.wiki)
    Array.from(state.wiki.keys()).forEach((filePath) => {
      const pathStr = String(filePath);
      const rawContent = String(state.wiki.get(filePath) || '');
      const parsed = parseWikiDocument(rawContent);
      const filename = pathStr.split('/').pop() || pathStr.split('\\').pop() || '';
      const slug = filename.replace(/\.md$/i, '');

      this.rawFiles.set(pathStr, rawContent);
      entriesMap.set(pathStr, {
        path: pathStr,
        slug,
        metadata: parsed.metadata,
      });
    });

    // 3. Mescla arquivos salvos no localStorage fallback
    try {
      const localWiki: Record<string, string> = JSON.parse(localStorage.getItem(LOCAL_WIKI_STORAGE_KEY) || '{}');
      Object.entries(localWiki).forEach(([filePath, rawContent]) => {
        if (!entriesMap.has(filePath)) {
          const parsed = parseWikiDocument(rawContent);
          const filename = filePath.split('/').pop() || filePath.split('\\').pop() || '';
          const slug = filename.replace(/\.md$/i, '');

          this.rawFiles.set(filePath, rawContent);
          entriesMap.set(filePath, {
            path: filePath,
            slug,
            metadata: parsed.metadata,
          });
        }
      });
    } catch {
      // localStorage pode estar indisponível em contextos privados/restritos.
    }

    this.index = Array.from(entriesMap.values());
    return this.index;
  }

  static async buildGraph(bundledFiles?: Record<string, string>): Promise<WikiGraphSource> {
    await this.buildIndex(bundledFiles);
    return buildWikiGraphFromFiles(this.rawFiles);
  }

  static async loadRawFileContent(path: string): Promise<string | null> {
    if (state.wiki.has(path)) return String(state.wiki.get(path) || '');

    try {
      const localWiki: Record<string, string> = JSON.parse(localStorage.getItem(LOCAL_WIKI_STORAGE_KEY) || '{}');
      if (localWiki[path]) return localWiki[path];
    } catch {
      // Continua com o cache em memória ou a fonte empacotada.
    }

    if (this.rawFiles.has(path)) return this.rawFiles.get(path) ?? null;

    try {
      const repoPath = getWikiConfig().repoUrl;
      const fileRes = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(path)}`);
      if (!fileRes.ok) return null;
      const fileData = await fileRes.json();
      return String(fileData.content || '');
    } catch (err) {
      console.error(`[WikiIndexer] Erro ao carregar conteúdo bruto de ${path}:`, err);
      return null;
    }
  }

  static async loadFileContent(path: string): Promise<string | null> {
    const rawContent = await this.loadRawFileContent(path);
    return rawContent == null ? null : parseWikiDocument(rawContent).content;
  }
}
