import { getWikiConfig } from '../store';
import { WikiIndexer } from '../services/wiki/WikiIndexer';
import { uploadToSupabaseStorage } from '../services/storageService';

export interface GithubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha?: string;
  size?: number;
  url?: string;
}

export interface GithubTreeResponse {
  tree: GithubTreeItem[];
}

const markdownReadCache = new Map<string, { content: string | null; expiresAt: number }>();
const markdownReadInflight = new Map<string, Promise<string | null>>();

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`Requisição excedeu o tempo limite (${timeoutMs / 1000}s)`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function initializeWikiTemplate(): Promise<void> {
  const config = getWikiConfig();
  if (!config.repoUrl) {
    throw new Error("Repositório não configurado.");
  }
  const repoPath = config.repoUrl;
  
  const response = await fetchWithTimeout('/api/wiki/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoPath })
  });
  
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao inicializar template");
  }
}

export async function fetchRepositoryTree(): Promise<GithubTreeItem[]> {
  const config = getWikiConfig();
  if (!config.repoUrl) {
    throw new Error("Repositório não configurado.");
  }

  // O repoUrl agora pode apontar para a pasta local como D:/DOZERO/wikidozero
  // Mas vamos tentar passar como repoPath. Se for URL do Github, o usuário terá que configurar a pasta.
  let repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
  if (repoPath.includes('github.com')) {
    // Para simplificar, forçamos o usuário a colocar o caminho da pasta local no Settings
    // Ex: "D:/DOZERO/wikidozero"
    throw new Error("O sistema agora é Local-First. Configure o caminho da sua pasta local (ex: D:/DOZERO/wikidozero) nas configurações em vez da URL do GitHub.");
  }

  const url = `/api/wiki/tree?repoPath=${encodeURIComponent(repoPath)}`;
  const response = await fetchWithTimeout(url);
  
  if (!response.ok) {
    throw new Error(`Falha ao conectar no repositório local (Erro ${response.status}). Verifique se a pasta existe.`);
  }
  
  const data: GithubTreeResponse = await response.json();
  return data.tree;
}

export async function fetchMarkdownContent(path: string): Promise<string> {
  const config = getWikiConfig();
  if (!config.repoUrl) {
    throw new Error("Repositório não configurado.");
  }

  let repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
  const url = `/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(path)}&t=${Date.now()}`;
  
  const response = await fetchWithTimeout(url);
  
  if (!response.ok) {
    throw new Error(`Falha ao carregar arquivo local: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.content;
}

export async function openLocalFolder(path: string = ''): Promise<void> {
  const config = getWikiConfig();
  let repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
  
  const response = await fetchWithTimeout('/api/wiki/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoPath, path })
  });

  if (!response.ok) throw new Error("Erro ao abrir pasta local");
}

/**
 * O estado compartilhado só recebe uma URL durável do Storage.
 */
export async function saveImageToCloud(file: File | Blob | string, filename?: string): Promise<string | null> {
  const url = await uploadToSupabaseStorage(file, filename);
  if (!url) console.warn('[saveImageToCloud] Upload falhou; imagem não será gravada no estado compartilhado.');
  return url;
}

export async function saveMarkdownContent(path: string, content: string): Promise<void> {
  const normalizedPath = path.replace(/\\/g, '/');
  if (!normalizedPath || normalizedPath.startsWith('/') || normalizedPath.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Caminho de wiki inválido. Escolha uma pasta dentro da wiki.');
  }
  const config = getWikiConfig();
  const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
  markdownReadCache.delete(normalizedPath);

  if (!import.meta.env.PROD) {
    try {
      const response = await fetchWithTimeout('/api/wiki/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, path: normalizedPath, content }),
      });
      if (response.ok) {
        WikiIndexer.clearCache();
        window.dispatchEvent(new Event('wiki-updated'));
        return;
      }
    } catch {
      // Fallback para persistência local se o servidor de arquivos local não estiver acessível
    }
  }

  WikiIndexer.saveLocalWikiFile(normalizedPath, content);
}

export async function createFolder(path: string): Promise<void> {
  if (import.meta.env.PROD) return;
  const config = getWikiConfig();
  let repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
  
  const response = await fetchWithTimeout('/api/wiki/folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoPath, path })
  });

  if (!response.ok) throw new Error("Erro ao criar pasta");

  WikiIndexer.clearCache();
  window.dispatchEvent(new Event('wiki-updated'));
}

export async function moveFileOrFolder(oldPath: string, newPath: string): Promise<void> {
  if (import.meta.env.PROD) return;
  const config = getWikiConfig();
  let repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
  
  const response = await fetchWithTimeout('/api/wiki/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoPath, oldPath, newPath })
  });

  if (!response.ok) throw new Error("Erro ao mover/renomear arquivo");

  WikiIndexer.clearCache();
  window.dispatchEvent(new Event('wiki-updated'));
}

export async function deleteFileOrFolder(path: string): Promise<void> {
  if (import.meta.env.PROD) return;
  const config = getWikiConfig();
  let repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
  
  const response = await fetchWithTimeout('/api/wiki/file', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoPath, path })
  });

  if (!response.ok) throw new Error("Erro ao deletar arquivo");

  WikiIndexer.clearCache();
  window.dispatchEvent(new Event('wiki-updated'));
}

/**
 * Ensures a folder exists in the wiki. Idempotent — safe to call even if it already exists.
 * @param folderPath relative path inside the wiki root, e.g. "Campanhas/Minha Camp/Arcos"
 */
export async function ensureWikiFolder(folderPath: string): Promise<void> {
  return createFolder(folderPath);
}

/**
 * Loads a markdown file from the wiki. Returns null if the file doesn't exist (404).
 * @param filePath relative path inside the wiki root, e.g. "Campanhas/Minha Camp/_campanha.md"
 */
export async function loadMarkdownFile(filePath: string): Promise<string | null> {
  const now = Date.now();
  const cached = markdownReadCache.get(filePath);
  if (cached && cached.expiresAt > now) return cached.content;

  const inflight = markdownReadInflight.get(filePath);
  if (inflight) return inflight;

  const request = (async () => {
    try {
      const content = await fetchMarkdownContent(filePath);
      markdownReadCache.set(filePath, { content, expiresAt: Date.now() + 5_000 });
      return content;
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        // Evita repetir 404s causados por efeitos duplicados do modo de desenvolvimento.
        markdownReadCache.set(filePath, { content: null, expiresAt: Date.now() + 5_000 });
        return null;
      }
      throw err;
    } finally {
      markdownReadInflight.delete(filePath);
    }
  })();

  markdownReadInflight.set(filePath, request);
  return request;
}

export async function pushToGithub(): Promise<void> {
  const config = getWikiConfig();
  let repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
  
  const response = await fetchWithTimeout('/api/wiki/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoPath })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao sincronizar com GitHub");
  }
}
