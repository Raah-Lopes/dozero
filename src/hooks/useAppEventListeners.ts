import { useState, useEffect } from 'react';
import yaml from 'js-yaml';
import { state } from '../store';
import { loadMarkdownFile } from '../utils/githubApi';
import type { CutsceneConfig } from '../components/Theater/CutsceneOverlay';
import { useYjsCleanup } from './useYjsCleanup';

interface UseAppEventListenersProps {
  viewMode: string;
  setViewMode: (mode: 'canvas' | 'wiki' | 'brain' | 'theater' | 'sheets') => void;
  setActiveModal: (modal: any) => void;
  setOpenSheets: React.Dispatch<React.SetStateAction<string[]>>;
  setOpenWikiDocs: React.Dispatch<React.SetStateAction<{ id: string, filepath: string }[]>>;
  setEditingClockId: (id: string | null) => void;
  setWikiInitialFile: (file: string | null) => void;
  setActiveCharacterId: (id: string | null) => void;
  setSheetScope: (scope: 'campaign' | 'vault') => void;
}

export const useAppEventListeners = ({
  viewMode,
  setViewMode,
  setActiveModal,
  setOpenSheets,
  setOpenWikiDocs,
  setEditingClockId,
  setWikiInitialFile,
  setActiveCharacterId,
  setSheetScope
}: UseAppEventListenersProps) => {
  const [isLayoutPresetsOpen, setIsLayoutPresetsOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isLorePinsOpen, setIsLorePinsOpen] = useState(false);
  const [activeCutscene, setActiveCutscene] = useState<CutsceneConfig | null>(null);

  useYjsCleanup();

  // 1. Layout Presets & Global Search & Lore Pins Shortcuts
  useEffect(() => {
    const handleOpenPresets = () => setIsLayoutPresetsOpen(true);
    const handleOpenSearch = () => setIsGlobalSearchOpen(true);
    const handleOpenLorePins = () => setIsLorePinsOpen(true);

    window.addEventListener('open-layout-presets', handleOpenPresets);
    window.addEventListener('open-global-search', handleOpenSearch);
    window.addEventListener('open-lore-pins', handleOpenLorePins);

    return () => {
      window.removeEventListener('open-layout-presets', handleOpenPresets);
      window.removeEventListener('open-global-search', handleOpenSearch);
      window.removeEventListener('open-lore-pins', handleOpenLorePins);
    };
  }, []);

  // 2. Desktop Nav Class
  useEffect(() => {
    if (localStorage.getItem('showDesktopNav') === 'true') {
      document.body.classList.add('show-desktop-nav');
    }
  }, []);

  // 3. View Mode Persistence
  useEffect(() => {
    localStorage.setItem('dozero_viewMode', viewMode);
  }, [viewMode]);

  // 4. Token Image Sanitizer (Vercel/PROD fix)
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    
    const sanitizeTokens = () => {
      Array.from(state.tokens.entries()).forEach(([id, t]: [string, any]) => {
        if (t.imageUrl && t.imageUrl.includes('/api/wiki/media')) {
          console.log('[Sanitize] Limpando imageUrl quebrado do token:', t.name);
          t.imageUrl = '';
          state.tokens.set(id, t);
        }
      });
    };
    
    sanitizeTokens();
    const interval = setInterval(sanitizeTokens, 2000);
    setTimeout(() => clearInterval(interval), 10000);
  }, []);

  // 5. Ghost Coordinate Cleanup
  useEffect(() => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('window_prefs_sheet-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }, []);

  // 6. Global Event Listeners (Cutscenes, Modals, Tokens, Wiki)
  useEffect(() => {
    const handleCutscene = (e: Event) => {
      const config = (e as CustomEvent<CutsceneConfig>).detail;
      if (config) setActiveCutscene(config);
    };

    const handleOpenWikiDoc = (e: Event) => {
      const filepath = (e as CustomEvent).detail;
      if (filepath) {
        setOpenWikiDocs(prev => {
          if (prev.some(doc => doc.filepath === filepath)) return prev;
          return [...prev, { id: `doc-${Date.now()}`, filepath }];
        });
      }
    };

    const handleDblClick = (e: Event) => {
      const { tokenId } = (e as CustomEvent).detail;
      const token = state.tokens.get(tokenId) as any;
      
      // Auto-open the premium wiki sheet if it exists
      if (token && token.wikiPath) {
        window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: token.wikiPath } }));
      }

      setOpenSheets(prev => {
        if (prev.includes(tokenId)) return prev;
        return [...prev, tokenId];
      });
    };

    const handleOpenClockConfig = () => {
      setEditingClockId(null);
      setActiveModal('clockConfig');
    };

    const handleOpenWikiFile = (e: Event) => {
      const path = (e as CustomEvent).detail?.path || (e as CustomEvent).detail?.filePath;
      if (path) {
        setWikiInitialFile(path);
        setViewMode('wiki');
      }
    };

    const handleOpenWiki = () => setViewMode('wiki');
    const handleOpenWikiGraph = () => setViewMode('brain');
    const handleOpenBrain = () => setViewMode('brain');
    const handleOpenArcanumSheet = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; scope?: 'campaign' | 'vault' }>).detail;
      setActiveCharacterId(detail?.id || null);
      setSheetScope(detail?.scope || 'campaign');
      setViewMode('sheets');
    };

    const handleOpenSheetByWiki = (e: Event) => {
      const wikiPath = (e as CustomEvent).detail;
      if (wikiPath) {
        setOpenSheets(prev => {
          const key = `wiki:${wikiPath}`;
          if (prev.includes(key)) {
            setTimeout(() => window.dispatchEvent(new CustomEvent('bring-window-to-front', { detail: `sheet-${key}` })), 10);
            return prev;
          }
          return [...prev, key];
        });
      }
    };

    const handleSpawnTokenFromWiki = async (e: Event) => {
      const { wikiPath, x, y } = (e as CustomEvent).detail;
      if (!wikiPath) return;
      try {
        const rawMd = await loadMarkdownFile(wikiPath);
        if (!rawMd) return;
        const parts = rawMd.split('---');
        if (parts.length < 3) return;
        const data = yaml.load(parts[1]) as any;

        const tipo = String(data.tipo || '').toLowerCase();
        const status = String(data.status || '').toLowerCase();
        const isPlayer = ['pc', 'personagem', 'jogador'].includes(tipo) || status === 'jogador' || wikiPath.toLowerCase().includes('/jogadores/');

        const tokenData = {
          name: data.nome || data.titulo || wikiPath.split('/').pop()?.replace('.md', '') || 'Desconhecido',
          hp: data.HP || data.pv || 100,
          maxHp: data.HP_max || data.pv_max || data.HP || data.pv || 100,
          mana: data.PM || data.mana || 50,
          maxMana: data.PM_max || data.mana_max || data.PM || data.mana || 50,
          hunger: Number(data.fome || data.Fome || 0),
          thirst: Number(data.sede || data.Sede || 0),
          sanity: Number(data.sanidade || data.Sanidade || 100),
          imageUrl: data.imageUrl || data.avatar || data.imagem || '/vite.svg',
          tokenShape: data.tokenShape || 'circle',
          sizeScale: Number(data.sizeScale) || 1,
          borderColor: data.borderColor || '#06b6d4',
          showName: data.showName === true,
          hpBarMode: data.hpBarMode || 'always',
          isPlayer,
          wikiSlug: wikiPath.split('/').pop()?.replace('.md', '')
        };

        const id = `token_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        state.tokens.set(id, { id, x, y, ...tokenData });

        const chatMsg = `⚡ <b>${tokenData.name}</b> foi conjurado(a) no mapa!`;
        state.chat.push([{ text: chatMsg, timestamp: Date.now(), isCritical: true, isFailure: false }]);
      } catch (err) {
        console.error("Erro ao evocar token no drop:", err);
      }
    };

    window.addEventListener('theater-cutscene', handleCutscene);
    window.addEventListener('open-wiki-doc', handleOpenWikiDoc);
    window.addEventListener('token-dblclick', handleDblClick);
    window.addEventListener('open-clock-config', handleOpenClockConfig);
    window.addEventListener('open-wiki-file', handleOpenWikiFile);
    window.addEventListener('open-wiki', handleOpenWiki);
    window.addEventListener('open-wiki-graph', handleOpenWikiGraph);
    window.addEventListener('open-brain', handleOpenBrain);
    window.addEventListener('open-arcanum-sheet', handleOpenArcanumSheet);
    window.addEventListener('open-sheet-by-wiki', handleOpenSheetByWiki);
    window.addEventListener('spawn-token-from-wiki', handleSpawnTokenFromWiki);

    // 3. Sincronização em tempo real de comandos do Mestre via Yjs (roomSettings)
    const observeRoomSettings = () => {
      const lastGmAction = state.roomSettings.get('last_gm_action') as any;
      if (!lastGmAction || !lastGmAction.timestamp) return;
      
      const now = Date.now();
      // Executa apenas eventos recentes (menos de 5 segundos)
      if (now - lastGmAction.timestamp > 5000) return;

      if (lastGmAction.type === 'summon_camera') {
        if (lastGmAction.tokenId) {
          window.dispatchEvent(new CustomEvent('canvas-focus-token', { detail: { tokenId: lastGmAction.tokenId } }));
        } else if (typeof lastGmAction.x === 'number' && typeof lastGmAction.y === 'number') {
          window.dispatchEvent(new CustomEvent('canvas-focus-point', { detail: { x: lastGmAction.x, y: lastGmAction.y, scale: lastGmAction.scale } }));
        }
      } else if (lastGmAction.type === 'request_roll') {
        window.dispatchEvent(new CustomEvent('gm-request-roll', { detail: lastGmAction }));
      }
    };

    state.roomSettings.observe(observeRoomSettings);

    return () => {
      state.roomSettings.unobserve(observeRoomSettings);
      window.removeEventListener('theater-cutscene', handleCutscene);
      window.removeEventListener('open-wiki-doc', handleOpenWikiDoc);
      window.removeEventListener('token-dblclick', handleDblClick);
      window.removeEventListener('open-clock-config', handleOpenClockConfig);
      window.removeEventListener('open-wiki-file', handleOpenWikiFile);
      window.removeEventListener('open-wiki', handleOpenWiki);
      window.removeEventListener('open-wiki-graph', handleOpenWikiGraph);
      window.removeEventListener('open-brain', handleOpenBrain);
      window.removeEventListener('open-arcanum-sheet', handleOpenArcanumSheet);
      window.removeEventListener('open-sheet-by-wiki', handleOpenSheetByWiki);
      window.removeEventListener('spawn-token-from-wiki', handleSpawnTokenFromWiki);
    };
  }, [setViewMode, setOpenSheets, setOpenWikiDocs, setEditingClockId, setWikiInitialFile, setActiveModal, setActiveCharacterId, setSheetScope]);

  return {
    isLayoutPresetsOpen, setIsLayoutPresetsOpen,
    isGlobalSearchOpen, setIsGlobalSearchOpen,
    isLorePinsOpen, setIsLorePinsOpen,
    activeCutscene, setActiveCutscene
  };
};
