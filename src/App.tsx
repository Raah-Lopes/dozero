import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { Settings, Users, MessageSquare, X, Map as MapIcon, BookOpen, Swords, LayoutGrid, Library, Film, DoorOpen, Bot } from 'lucide-react';
import { WikiViewer } from './components/Wiki/WikiViewer';
import { LivingBrain } from './components/Wiki/LivingBrain';
import { GameCanvas } from './engine/GameCanvas';
import { CombatLog } from './components/Chat/CombatLog';
import { ChatWindow } from './components/Chat/ChatWindow';
import { SettingsModal } from './components/Modals/SettingsModal';
import { AIAssistantBot } from './components/HUD/AIAssistantBot';
import { DraggableWindow } from './components/HUD/DraggableWindow';
import { TargetTerminal } from './components/Widgets/PlayerTools/TargetTerminal';
import { MapSettingsPanel } from './components/HUD/MapSettingsPanel';
import { ThemePickerModal } from './components/Modals/ThemePickerModal';
import { useTheme } from './hooks/useTheme';
import { QuestTrackerHUD } from './components/Widgets/GameMaster/QuestTrackerHUD';
import { TextContextBar } from './components/UI/TextContextBar';
import { PropInteractionPanel } from './components/HUD/PropInteractionPanel';
import { NPCPanel } from './components/HUD/NPCPanel';
import { CutsceneOverlay, type CutsceneConfig } from './components/Theater/CutsceneOverlay';
import { InviteModal } from './components/Modals/InviteModal';
import { ClimaxOverlay } from './components/UI/ClimaxOverlay';
import { SoftTimer } from './components/UI/SoftTimer';
import { DiceOverlay } from './components/UI/DiceOverlay';
import { PPROverlay } from './components/UI/PPROverlay';
import { CombatTracker } from './components/HUD/CombatTracker';
import { MapContextMenu } from './components/UI/MapContextMenu';
import { ClockConfigModal } from './components/Modals/ClockConfigModal';
import { WidgetHubModal } from './components/Modals/WidgetHubModal';
import { TensionClockManager } from './components/HUD/TensionClockManager';
import { FloatingDocument } from './components/UI/FloatingDocument';
import { TheaterView } from './components/Theater/TheaterView';
import { WidgetLayer } from './components/HUD/WidgetLayer';
import { MainToolbar } from './components/HUD/MainToolbar';
import { useWindowManager } from './hooks/useWindowManager';
import { state, addTensionClock, updateTensionClockProps } from './store';
import type { TensionClock } from './store';
import { loadMarkdownFile } from './utils/githubApi';
import * as yaml from 'js-yaml';
import { PopoutViewer } from './components/Popout/PopoutViewer';
import { GlobalAudioSync } from './components/Audio/GlobalAudioSync';
import { CutsceneManager } from './components/Theater/CutsceneManager';
import { RoomManagerWidget } from './components/Widgets/System/RoomManagerWidget';

// Trigger HMR
type ModalMode = 'none' | 'players' | 'settings' | 'chat' | 'clockConfig' | 'widgets' | 'themes';

function App() {
  const [isReady, _setIsReady] = useState(true);
  const { currentThemeId, setTheme, themeOverrides, updateOverrides, clearOverrides } = useTheme();
  const urlParams = new URLSearchParams(window.location.search);
  const standaloneWidget = urlParams.get('widget');

  const {
    openWindows, toggleWindow,
    viewMode, setViewMode,
    activeModal, setActiveModal,
    showMapSettings, setShowMapSettings,
    showActors, setShowActors,
    showToolsDropdown, setShowToolsDropdown,
    openSheets, setOpenSheets,
    openWikiDocs, setOpenWikiDocs,
    editingClockId, setEditingClockId,
    wikiInitialFile, setWikiInitialFile
  } = useWindowManager();

  const handleCloseActorLibrary = useCallback(() => setShowActors(false), [setShowActors]);
  const handleCloseCombatLog = useCallback(() => toggleWindow('combatLog'), [toggleWindow]);
  const handleCloseChatWindow = useCallback(() => toggleWindow('chatWindow'), [toggleWindow]);
  const handleCloseMapSettings = useCallback(() => setShowMapSettings(false), [setShowMapSettings]);
  const handleCloseRoomManager = useCallback(() => toggleWindow('roomManager'), [toggleWindow]);

  const handleCloseSheet = useCallback((sheetKey: string) => {
    setOpenSheets(prev => prev.filter(id => id !== sheetKey));
  }, [setOpenSheets]);

  const handleCloseWikiDoc = useCallback((docId: string) => {
    setOpenWikiDocs(prev => prev.filter(doc => doc.id !== docId));
  }, [setOpenWikiDocs]);

  // ===== SPLIT INTO MULTIPLE useEffects ===== //

  // 1. Handle wiki document opening
  useEffect(() => {
    const handleOpenWikiDoc = (e: Event) => {
      const filepath = (e as CustomEvent).detail;
      if (filepath) {
        setOpenWikiDocs(prev => {
          if (prev.some(doc => doc.filepath === filepath)) return prev;
          return [...prev, { id: `doc-${Date.now()}`, filepath }];
        });
      }
    };
    window.addEventListener('open-wiki-doc', handleOpenWikiDoc);
    return () => window.removeEventListener('open-wiki-doc', handleOpenWikiDoc);
  }, []);

  // 2. Handle view mode persistence
  useEffect(() => {
    localStorage.setItem('dozero_viewMode', viewMode);
  }, [viewMode]);

  const [activeCutscene, setActiveCutscene] = useState<CutsceneConfig | null>(null);

  // Cutscene event listener
  useEffect(() => {
    const handler = (e: Event) => {
      const config = (e as CustomEvent<CutsceneConfig>).detail;
      if (config) setActiveCutscene(config);
    };
    window.addEventListener('theater-cutscene', handler);
    return () => window.removeEventListener('theater-cutscene', handler);
  }, []);

  // 3. Handle double-click token actions
  useEffect(() => {
    const handleDblClick = (e: Event) => {
      const { tokenId } = (e as CustomEvent).detail;
      setOpenSheets(prev => {
        if (prev.includes(tokenId)) return prev;
        return [...prev, tokenId];
      });
    };
    window.addEventListener('token-dblclick', handleDblClick);

    const handleOpenClockConfig = () => setActiveModal('clockConfig');
    window.addEventListener('open-clock-config', handleOpenClockConfig);

    // Auto-limpeza de Coordenadas Fantasmas
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('window_prefs_sheet-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Event listeners for wiki integration
    const handleOpenWikiFile = (e: Event) => {
      const path = (e as CustomEvent).detail?.path || (e as CustomEvent).detail?.filePath;
      if (path) {
        setWikiInitialFile(path);
        setViewMode('wiki');
      }
    };
    window.addEventListener('open-wiki-file', handleOpenWikiFile);

    const handleOpenWiki = () => setViewMode('wiki');
    window.addEventListener('open-wiki', handleOpenWiki);

    const handleOpenWikiGraph = () => setViewMode('brain');
    window.addEventListener('open-wiki-graph', handleOpenWikiGraph);

    const handleOpenBrain = () => setViewMode('brain');
    window.addEventListener('open-brain', handleOpenBrain);

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
    window.addEventListener('open-sheet-by-wiki', handleOpenSheetByWiki);

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
        state.tokens.set(id, {
          id,
          x,
          y,
          ...tokenData
        });

        const chatMsg = `⚡ <b>${tokenData.name}</b> foi conjurado(a) no mapa!`;
        state.chat.push([{ text: chatMsg, timestamp: Date.now(), isCritical: true, isFailure: false }]);
      } catch (err) {
        console.error("Erro ao evocar token no drop:", err);
      }
    };
    window.addEventListener('spawn-token-from-wiki', handleSpawnTokenFromWiki);

    return () => {
      window.removeEventListener('token-dblclick', handleDblClick);
      window.removeEventListener('open-clock-config', handleOpenClockConfig);
      window.removeEventListener('open-wiki-file', handleOpenWikiFile);
      window.removeEventListener('open-wiki', handleOpenWiki);
      window.removeEventListener('open-wiki-graph', handleOpenWikiGraph);
      window.removeEventListener('open-sheet-by-wiki', handleOpenSheetByWiki);
      window.removeEventListener('spawn-token-from-wiki', handleSpawnTokenFromWiki);
    };
  }, []);

  // 4. Handle cleanup - separate effect with functional updates
  useEffect(() => {
    // No-op cleanup effect to avoid race conditions in setOpenWikiDocs/setOpenSheets
    return;
  }, []);

  if (!isReady) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h1 className="text-gradient animate-fade-in">Loading VTT Ecosystem...</h1>
      </div>
    );
  }

  const toggleModal = useCallback((mode: ModalMode) => {
    setActiveModal(activeModal === mode ? 'none' : mode);
  }, [activeModal, setActiveModal]);

  // ===== STANDALONE WIDGET MODE (MULTI-MONITOR POP-OUT) ===== //
  if (standaloneWidget) {
    return <PopoutViewer widgetId={standaloneWidget} />;
  }

  return (
    <div className="app-container">
      {/* ── Cutscene overlay (Global) ── */}
      {activeCutscene && (
        <CutsceneOverlay config={activeCutscene} onEnd={() => setActiveCutscene(null)} />
      )}

      {/* PÁGINA DO CÉREBRO GRÁFICO */}
      <div className={`view-layer brain-layer ${viewMode === 'brain' ? 'active' : ''}`}>
        {viewMode === 'brain' && <LivingBrain />}
      </div>

      {/* PÁGINA DEDICADA DA WIKI */}
      <div className={`view-layer wiki-layer ${viewMode === 'wiki' ? 'active' : ''}`}>
        {viewMode === 'wiki' && <WikiViewer initialFile={wikiInitialFile} />}
      </div>

      {/* PÁGINA DO TEATRO DA MENTE */}
      <div className={`view-layer theater-layer ${viewMode === 'theater' ? 'active' : ''}`}>
        {viewMode === 'theater' && <TheaterView />}
      </div>

      {viewMode === 'wiki' && (
        <div className="exit-door-container-right">
          <button onClick={() => setViewMode('canvas')} className="glass-panel exit-door-btn-hoverable">
            <span className="exit-text">Voltar para a Mesa</span>
            <DoorOpen size={20} color="var(--accent-primary)" className="exit-icon" />
          </button>
        </div>
      )}

      {viewMode === 'theater' && (
        <div className="exit-door-container-left">
          <button onClick={() => setViewMode('canvas')} className="glass-panel exit-door-btn-hoverable">
            <DoorOpen size={20} color="var(--accent-primary)" className="exit-icon" />
            <span className="exit-text">Painel Principal</span>
          </button>
        </div>
      )}

      {/* PÁGINA DA MESA (HUD + MAPA) */}
      <div className={`view-layer canvas-layer-container ${viewMode === 'canvas' ? 'active' : ''}`}>
        <div className="canvas-layer" id="canvas-container">
          <GameCanvas />
          <MapContextMenu />
          <TextContextBar />
          <PropInteractionPanel />
          <AIAssistantBot />
        </div>
      </div>

      {/* Layer 10: React HUD (moved out of canvas-layer so it works in Theater view too) */}
      <div className="hud-layer hud-grid">
        <MainToolbar />
        <QuestTrackerHUD />

        {/* Combat Tracker Widget */}
        {openWindows.combatTracker && (
          <DraggableWindow
            id="tracker"
            title="Iniciativa"
            initialX={window.innerWidth - 360}
            initialY={80}
            width={340}
            height={500}
            variant="default"
            onClose={() => toggleWindow('combatTracker')}
          >
            <CombatTracker />
          </DraggableWindow>
        )}

        {/* Cutscene Director Widget */}
        {openWindows.cutsceneDirector && (
          <DraggableWindow
            id="cutscenes"
            title="Diretor de Cenas (Títulos)"
            initialX={window.innerWidth / 2 - 200}
            initialY={100}
            width={400}
            height={500}
            variant="default"
            onClose={() => toggleWindow('cutsceneDirector')}
          >
            <div style={{ padding: '1rem', height: '100%', overflowY: 'auto' }}>
              <CutsceneManager />
            </div>
          </DraggableWindow>
        )}

          <TensionClockManager onEditClock={(id) => {
            setEditingClockId(id);
            setActiveModal('clockConfig');
          }} />

          {/* Modal Layer (players, settings, chat, themes) */}
          {(activeModal === 'players' || activeModal === 'settings' || activeModal === 'chat' || activeModal === 'themes') && (
            <div className="hud-modal-layer">
              {activeModal === 'players' && <InviteModal onClose={() => setActiveModal('none')} />}
              {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal('none')} />}
              {activeModal === 'chat' && (
                <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '350px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Mensagens Diretas</h3>
                    <button onClick={() => setActiveModal('none')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'white'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}><X size={18} /></button>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nenhuma mensagem recebida.</p>
                </div>
              )}
              {activeModal === 'themes' && (
                <ThemePickerModal 
                  currentThemeId={currentThemeId} 
                  themeOverrides={themeOverrides}
                  updateOverrides={updateOverrides}
                  clearOverrides={clearOverrides}
                  onSelect={setTheme} 
                  onClose={() => setActiveModal('none')} 
                />
              )}
            </div>
          )}

          {/* Clock Config Modal (Must be outside the right-aligned container because it is a DraggableWindow) */}
          {activeModal === 'clockConfig' && (
            <ClockConfigModal
              existingClock={editingClockId ? state.clocks.get(editingClockId) as TensionClock : undefined}
              onClose={() => {
                setActiveModal('none');
                setEditingClockId(null);
              }}
              onConfirm={(config, isEdit) => {
                if (isEdit && editingClockId) {
                  // Atualizar relógio existente
                  const current = state.clocks.get(editingClockId) as TensionClock;
                  if (current) {
                    const now = Date.now();
                    updateTensionClockProps(editingClockId, {
                      label: config.label,
                      durationMs: config.durationMs,
                      endTime: now + config.durationMs,
                      pausedRemainingMs: undefined,
                      isRunning: true,
                      hpMod: config.hpMod,
                      mpMod: config.mpMod
                    });
                    state.chat.push([{ text: `RELÓGIO MODIFICADO (HUD): ${config.label}`, timestamp: Date.now(), isCritical: false, isFailure: false }]);
                  }
                } else {
                  // Criar novo
                  const id = 'clock_' + Date.now();
                  state.chat.push([{ text: `CRIANDO RELÓGIO (HUD): ${config.label}`, timestamp: Date.now(), isCritical: false, isFailure: false }]);
                  addTensionClock({
                    id,
                    x: 0,
                    y: 0,
                    label: config.label,
                    durationMs: config.durationMs,
                    endTime: Date.now() + config.durationMs,
                    isRunning: true,
                    hpMod: config.hpMod,
                    mpMod: config.mpMod
                  });
                }
                setActiveModal('none');
                setEditingClockId(null);
              }}
            />
          )}

        </div> {/* Fim da hud-layer */}

        {/* Free-Floating Window Layer (MOVED OUTSIDE TO ALWAYS RENDER) */}
        <>
          {showActors && (
            <DraggableWindow id="actors-library" title="Biblioteca" initialX={window.innerWidth - 360} initialY={100} width={300} onClose={handleCloseActorLibrary}>
              <div style={{ height: '400px' }}>
                <NPCPanel />
              </div>
            </DraggableWindow>
          )}

          {openSheets.map((sheetKey: string, index: number) => {
            const isWiki = sheetKey.startsWith('wiki:');
            const wikiPath = isWiki ? sheetKey.slice(5) : undefined;
            const tokenId = isWiki ? undefined : sheetKey;

            return (
              <DraggableWindow
                key={sheetKey}
                id={`sheet-${sheetKey}`}
                title="Ficha do Personagem"
                initialX={20 + (index * 40)}
                initialY={100 + (index * 40)}
                width={340}
                onClose={() => handleCloseSheet(sheetKey)}
              >
                <TargetTerminal tokenId={tokenId} wikiPath={wikiPath} isGM={true} />
              </DraggableWindow>
            );
          })}

          {openWikiDocs.map((doc: { id: string, filepath: string }, index: number) => (
            <FloatingDocument
              key={doc.id}
              id={doc.id}
              filepath={doc.filepath}
              initialX={window.innerWidth / 2 - 200 + (index * 30)}
              initialY={100 + (index * 30)}
              onClose={() => handleCloseWikiDoc(doc.id)}
            />
          ))}

          {openWindows.combatLog && (
            <DraggableWindow id="chat" title="Registro" initialX={window.innerWidth - 340} initialY={100} width={320} height={400} onClose={handleCloseCombatLog}>
              <CombatLog />
            </DraggableWindow>
          )}

          {openWindows.chatWindow && (
            <DraggableWindow id="chatWindow" title="Chat P2P" initialX={window.innerWidth - 680} initialY={100} width={320} height={400} onClose={handleCloseChatWindow}>
              <ChatWindow />
            </DraggableWindow>
          )}
          {openWindows.roomManager && (
            <DraggableWindow id="roomManager" title="Gestor de Salas (Multiplayer)" initialX={window.innerWidth / 2 - 200} initialY={100} width={400} height={550} onClose={handleCloseRoomManager}>
              <RoomManagerWidget />
            </DraggableWindow>
          )}

          {showMapSettings && (
            <DraggableWindow id="mapSettings" title="Configurar Cenário" initialX={window.innerWidth / 2 - 150} initialY={200} width={300} onClose={handleCloseMapSettings}>
              <MapSettingsPanel />
            </DraggableWindow>
          )}

          {/* Overlays Visuais e Funcionais */}
          <ClimaxOverlay />
          <SoftTimer />
          <DiceOverlay />
          <PPROverlay />
          <GlobalAudioSync />

          <WidgetLayer />

          {/* WidgetHubModal fora da hud-layer para evitar interferencia do canvas PixiJS */}
          {activeModal === 'widgets' && (
            <div className="modal-overlay" onClick={() => setActiveModal('none')} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'auto', padding: '20px' }}>
              <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}>
              <WidgetHubModal
                onClose={() => setActiveModal('none')}
                onOpenTracker={() => { toggleWindow('combatTracker'); setActiveModal('none'); }}
                onOpenOracleV2={() => { toggleWindow('oracle'); setActiveModal('none'); }}
                onOpenNPCGenerator={() => { toggleWindow('npcGenerator'); setActiveModal('none'); }}
                onOpenLocationGenerator={() => { toggleWindow('locationGenerator'); setActiveModal('none'); }}
                onOpenEncounterGenerator={() => { toggleWindow('encounterGenerator'); setActiveModal('none'); }}
                onOpenClockConfig={() => setActiveModal('clockConfig')}
                onOpenCampaignManager={() => { toggleWindow('campaignManager'); setActiveModal('none'); }}
                onOpenGMNotes={() => { toggleWindow('gmNotes'); setActiveModal('none'); }}
                onOpenMindMap={() => { toggleWindow('mindMap'); setActiveModal('none'); }}
                onOpenTradeShop={() => { toggleWindow('tradeShop'); setActiveModal('none'); }}
                onOpenSystemAuditor={() => { toggleWindow('systemAuditor'); setActiveModal('none'); }}
                onOpenAutomatedDice={() => { toggleWindow('automatedDice'); setActiveModal('none'); }}
                onOpenCharacterRoster={() => { toggleWindow('characterRoster'); setActiveModal('none'); }}
                onOpenChronos={() => { toggleWindow('chronos'); setActiveModal('none'); }}
                onOpenLoreMachine={() => { toggleWindow('loreMachine'); setActiveModal('none'); }}
                onOpenDLCManager={() => { toggleWindow('dlcManager'); setActiveModal('none'); }}
                onOpenWorldEngine={() => { toggleWindow('worldEngine'); setActiveModal('none'); }}
                onOpenEntityForge={() => { toggleWindow('entityForge'); setActiveModal('none'); }}
                onOpenStronghold={() => { toggleWindow('stronghold'); setActiveModal('none'); }}
                onOpenArsenalMestre={() => { toggleWindow('arsenalMestre'); setActiveModal('none'); }}
                onOpenAudioDirector={() => { toggleWindow('audioDirector'); setActiveModal('none'); }}
                onOpenWebFrame={() => { toggleWindow('webFrame'); setActiveModal('none'); }}
                onOpenDiceRoller={() => { toggleWindow('diceRoller'); setActiveModal('none'); }}
                onOpenMapSettings={() => { setShowMapSettings(true); setActiveModal('none'); }}
                onOpenActorLibrary={() => { setShowActors(true); setActiveModal('none'); }}
                onOpenPlayerManager={() => { toggleWindow('playerManager'); setActiveModal('none'); }}
                onOpenRoomManager={() => { toggleWindow('roomManager'); setActiveModal('none'); }}
                onToggleAIBot={() => { window.dispatchEvent(new CustomEvent('toggle-ai-bot')); setActiveModal('none'); }}
                onOpenAIStudio={() => { toggleWindow('aiStudio'); setActiveModal('none'); }}
                onOpenThemes={() => { setActiveModal('themes'); }}
                onOpenCutsceneDirector={() => { toggleWindow('cutsceneDirector'); setActiveModal('none'); }}
              />
              </div>
            </div>
          )}
        </>
      </div>
  );
}

export default App;