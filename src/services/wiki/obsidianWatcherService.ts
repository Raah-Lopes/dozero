// src/services/wiki/obsidianWatcherService.ts
// Servico de sincronizacao em tempo real entre o cofre local do Obsidian/Markdown e o DOZERO.
// Escuta eventos SSE via /api/wiki/events, atualiza tokens no Canvas e notifica o ecossistema.

import * as yaml from 'js-yaml';
import { getWikiConfig } from '../../store/wiki';
import { fetchMarkdownContent } from '../../utils/githubApi';
import { syncFileToBoardTokens } from './syncWiki';
import { WikiIndexer } from './WikiIndexer';
import { toast } from '../../components/UI/Toast';

export type WatcherStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'disabled';

export interface ObsidianChangeEvent {
  id: string;
  type: 'change' | 'create' | 'delete' | 'connected' | 'error';
  path?: string;
  mtime?: number;
  timestamp: number;
  error?: string;
}

export interface ObsidianWatcherState {
  status: WatcherStatus;
  repoPath: string;
  lastSyncAt: string | null;
  totalSyncedEvents: number;
  history: ObsidianChangeEvent[];
  autoSyncTokens: boolean;
  notifyOnSync: boolean;
}

class ObsidianWatcherManager {
  private eventSource: EventSource | null = null;
  private listeners: Set<(state: ObsidianWatcherState) => void> = new Set();
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private state: ObsidianWatcherState = {
    status: 'disconnected',
    repoPath: 'D:/DOZERO/wikidozero',
    lastSyncAt: null,
    totalSyncedEvents: 0,
    history: [],
    autoSyncTokens: true,
    notifyOnSync: false,
  };

  constructor() {
    // Carrega preferencias salvas
    try {
      const savedNotify = localStorage.getItem('dozero_obsidian_notify');
      if (savedNotify !== null) this.state.notifyOnSync = savedNotify === 'true';
      const savedAuto = localStorage.getItem('dozero_obsidian_auto_tokens');
      if (savedAuto !== null) this.state.autoSyncTokens = savedAuto === 'true';
    } catch {}
  }

  public getState(): ObsidianWatcherState {
    return { ...this.state, history: [...this.state.history] };
  }

  public setOptions(opts: { autoSyncTokens?: boolean; notifyOnSync?: boolean }) {
    if (opts.autoSyncTokens !== undefined) {
      this.state.autoSyncTokens = opts.autoSyncTokens;
      try { localStorage.setItem('dozero_obsidian_auto_tokens', String(opts.autoSyncTokens)); } catch {}
    }
    if (opts.notifyOnSync !== undefined) {
      this.state.notifyOnSync = opts.notifyOnSync;
      try { localStorage.setItem('dozero_obsidian_notify', String(opts.notifyOnSync)); } catch {}
    }
    this.notifyListeners();
  }

  public subscribe(listener: (state: ObsidianWatcherState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => { this.listeners.delete(listener); };
  }

  private notifyListeners() {
    const currentState = this.getState();
    this.listeners.forEach(cb => {
      try { cb(currentState); } catch (e) { console.warn('[ObsidianWatcher] Erro no listener:', e); }
    });
  }

  private addHistoryEvent(event: Omit<ObsidianChangeEvent, 'id'>) {
    const fullEvent: ObsidianChangeEvent = {
      ...event,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    };
    this.state.history.unshift(fullEvent);
    if (this.state.history.length > 25) {
      this.state.history.pop();
    }
    this.state.lastSyncAt = new Date().toISOString();
    this.state.totalSyncedEvents++;
    this.notifyListeners();
  }

  /**
   * Inicia o watcher em tempo real conectando via SSE ao backend Vite local
   */
  public startWatching(customRepoPath?: string) {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    this.stopWatching();

    const config = getWikiConfig();
    const repo = customRepoPath || config.repoUrl || 'D:/DOZERO/wikidozero';
    this.state.repoPath = repo;
    this.state.status = this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting';
    this.notifyListeners();

    try {
      const url = `/api/wiki/events?repoPath=${encodeURIComponent(repo)}`;
      const es = new EventSource(url);
      this.eventSource = es;

      es.onopen = () => {
        this.reconnectAttempts = 0;
        this.state.status = 'connected';
        this.notifyListeners();
        console.log('[ObsidianWatcher] Conectado ao cofre:', repo);
      };

      es.onmessage = async (e) => {
        try {
          const data: ObsidianChangeEvent = JSON.parse(e.data);

          if (data.type === 'connected') {
            this.state.status = 'connected';
            this.notifyListeners();
            return;
          }

          if (data.type === 'error') {
            console.warn('[ObsidianWatcher] Erro reportado pelo watcher:', data.error);
            this.addHistoryEvent({ type: 'error', error: data.error, timestamp: Date.now() });
            return;
          }

          if (data.path) {
            this.handleFileChange(data);
          }
        } catch (err) {
          console.warn('[ObsidianWatcher] Falha ao processar mensagem SSE:', err);
        }
      };

      es.onerror = () => {
        es.close();
        this.eventSource = null;
        this.state.status = 'reconnecting';
        this.notifyListeners();

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
          this.reconnectAttempts++;
          this.reconnectTimeout = setTimeout(() => {
            this.startWatching(repo);
          }, delay);
        } else {
          this.state.status = 'disconnected';
          this.notifyListeners();
        }
      };
    } catch (err) {
      console.warn('[ObsidianWatcher] Nao foi possivel conectar ao watcher SSE:', err);
      this.state.status = 'disconnected';
      this.notifyListeners();
    }
  }

  /**
   * Processa a mudanca de arquivo e atualiza tokens e indices no VTT
   */
  private async handleFileChange(event: ObsidianChangeEvent) {
    const filePath = event.path;
    if (!filePath) return;

    this.addHistoryEvent(event);

    const fileName = filePath.split('/').pop()?.replace('.md', '') || filePath;

    // 1. Limpa cache do WikiIndexer para nova busca
    WikiIndexer.clearCache();

    // 2. Se for arquivo Markdown, lê o frontmatter e atualiza tokens correspondentes no mapa
    if (filePath.endsWith('.md') && (event.type === 'change' || event.type === 'create')) {
      try {
        const content = await fetchMarkdownContent(filePath);
        if (content) {
          const parts = content.split('---');
          if (parts.length >= 3) {
            const frontmatter = parts[1];
            const parsedYaml = yaml.load(frontmatter) as any;
            if (parsedYaml && this.state.autoSyncTokens) {
              syncFileToBoardTokens(filePath, parsedYaml);
            }
          }
        }
      } catch (err) {
        console.warn(`[ObsidianWatcher] Falha ao ler atualizacao de ${filePath}:`, err);
      }
    }

    // 3. Notifica o ecossistema DOZERO com eventos DOM customizados
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wiki-updated', { detail: { path: filePath, event } }));
      window.dispatchEvent(new CustomEvent('wiki-file-changed', { detail: { path: filePath, event } }));
      window.dispatchEvent(new CustomEvent('obsidian-sync-event', { detail: event }));
    }

    // 4. Notificacao Toast opcional
    if (this.state.notifyOnSync) {
      toast.info(`⚡ Obsidian: "${fileName}" sincronizado!`);
    }
  }

  /**
   * Para o watcher e encerra a conexao SSE
   */
  public stopWatching() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.state.status = 'disconnected';
    this.notifyListeners();
  }

  /**
   * Consulta o status do cofre no backend local
   */
  public async fetchServerStatus(): Promise<{ connected: boolean; fileCount: number; lastModified: number } | null> {
    try {
      const config = getWikiConfig();
      const repo = config.repoUrl || 'D:/DOZERO/wikidozero';
      const res = await fetch(`/api/wiki/status?repoPath=${encodeURIComponent(repo)}&t=${Date.now()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return null;
  }
}

export const obsidianWatcherService = new ObsidianWatcherManager();
