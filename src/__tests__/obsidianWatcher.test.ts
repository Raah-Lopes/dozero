import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { obsidianWatcherService, ObsidianWatcherState } from '../services/wiki/obsidianWatcherService';
import * as syncWikiModule from '../services/wiki/syncWiki';
import * as githubApiModule from '../utils/githubApi';
import { WikiIndexer } from '../services/wiki/WikiIndexer';

vi.mock('../services/wiki/syncWiki', () => ({
  syncFileToBoardTokens: vi.fn(),
  syncTokenFieldToWiki: vi.fn(),
  syncMultipleFieldsToWiki: vi.fn(),
}));

vi.mock('../utils/githubApi', () => ({
  fetchMarkdownContent: vi.fn(),
  openLocalFolder: vi.fn(),
}));

vi.mock('../services/wiki/WikiIndexer', () => ({
  WikiIndexer: {
    clearCache: vi.fn(),
    buildIndex: vi.fn(),
  }
}));

vi.mock('../components/UI/Toast', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('Obsidian Real-Time Watcher & Markdown Sync (G.2)', () => {
  let mockEventSourceInstances: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockEventSourceInstances = [];

    // Mock global EventSource
    (global as any).EventSource = vi.fn().mockImplementation(function (this: any, url: string) {
      this.url = url;
      this.close = vi.fn();
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      mockEventSourceInstances.push(this);
    });
  });

  afterEach(() => {
    obsidianWatcherService.stopWatching();
  });

  it('provides initial state and allows subscribing to updates', () => {
    const states: ObsidianWatcherState[] = [];
    const unsubscribe = obsidianWatcherService.subscribe((s) => states.push(s));

    expect(states.length).toBeGreaterThan(0);
    expect(states[0].status).toBeDefined();
    expect(states[0].autoSyncTokens).toBe(true);

    obsidianWatcherService.setOptions({ autoSyncTokens: false, notifyOnSync: true });
    const current = obsidianWatcherService.getState();
    expect(current.autoSyncTokens).toBe(false);
    expect(current.notifyOnSync).toBe(true);

    unsubscribe();
  });

  it('starts watching by connecting EventSource with repo path', () => {
    obsidianWatcherService.startWatching('D:/Custom/ObsidianVault');
    
    expect((global as any).EventSource).toHaveBeenCalledWith(
      '/api/wiki/events?repoPath=D%3A%2FCustom%2FObsidianVault'
    );
    expect(obsidianWatcherService.getState().status).toBe('connecting');
    expect(obsidianWatcherService.getState().repoPath).toBe('D:/Custom/ObsidianVault');

    // Simulate connection open
    const es = mockEventSourceInstances[0];
    es.onopen();
    expect(obsidianWatcherService.getState().status).toBe('connected');
  });

  it('handles incoming file change event and triggers token sync', async () => {
    const mockMd = `---
nome: Aragorn
pv: 45
pv_max: 50
PM: 20
ouro: 150
---
Guardião do Norte e herdeiro de Isildur.`;

    (githubApiModule.fetchMarkdownContent as any).mockResolvedValue(mockMd);

    const eventListener = vi.fn();
    window.addEventListener('obsidian-sync-event', eventListener);

    obsidianWatcherService.setOptions({ autoSyncTokens: true });
    obsidianWatcherService.startWatching('D:/DOZERO/wikidozero');
    const es = mockEventSourceInstances[0];
    es.onopen();

    // Send SSE change message
    const ssePayload = JSON.stringify({
      type: 'change',
      path: 'Fichas/Aragorn.md',
      mtime: 1724800000,
      timestamp: Date.now()
    });

    await es.onmessage({ data: ssePayload });

    expect(WikiIndexer.clearCache).toHaveBeenCalled();
    expect(githubApiModule.fetchMarkdownContent).toHaveBeenCalledWith('Fichas/Aragorn.md');
    expect(syncWikiModule.syncFileToBoardTokens).toHaveBeenCalledWith(
      'Fichas/Aragorn.md',
      expect.objectContaining({ nome: 'Aragorn', pv: 45, pv_max: 50, PM: 20, ouro: 150 })
    );
    expect(eventListener).toHaveBeenCalled();
    expect(obsidianWatcherService.getState().history.length).toBeGreaterThan(0);
    expect(obsidianWatcherService.getState().history[0].path).toBe('Fichas/Aragorn.md');

    window.removeEventListener('obsidian-sync-event', eventListener);
  });

  it('handles delete file event without attempting to read markdown', async () => {
    obsidianWatcherService.startWatching('D:/DOZERO/wikidozero');
    const es = mockEventSourceInstances[0];
    es.onopen();

    const ssePayload = JSON.stringify({
      type: 'delete',
      path: 'Locais/AntigaMasmorra.md',
      timestamp: Date.now()
    });

    await es.onmessage({ data: ssePayload });

    expect(WikiIndexer.clearCache).toHaveBeenCalled();
    expect(githubApiModule.fetchMarkdownContent).not.toHaveBeenCalled();
    expect(obsidianWatcherService.getState().history[0].type).toBe('delete');
  });

  it('stops watching and closes EventSource', () => {
    obsidianWatcherService.startWatching('D:/DOZERO/wikidozero');
    const es = mockEventSourceInstances[0];
    
    obsidianWatcherService.stopWatching();
    expect(es.close).toHaveBeenCalled();
    expect(obsidianWatcherService.getState().status).toBe('disconnected');
  });

  it('queries server status endpoint', async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ connected: true, fileCount: 42, lastModified: 1724800000 })
    });

    const status = await obsidianWatcherService.fetchServerStatus();
    expect(status?.fileCount).toBe(42);
    expect(status?.connected).toBe(true);
  });
});
