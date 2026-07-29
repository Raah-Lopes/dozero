import React, { useState, useCallback } from 'react';
import './App.css';
import { X, DoorOpen } from 'lucide-react';
import { WikiViewer } from './components/Wiki/WikiViewer';
import { LivingBrain } from './components/Wiki/LivingBrain';
import { GameCanvas } from './engine/GameCanvas';
import { GMToolbar } from './components/HUD/GMToolbar';
import { TokenContextHUD } from './components/HUD/TokenContextHUD';
import { CombatLog } from './components/Chat/CombatLog';
import { ChatWindow } from './components/Chat/ChatWindow';
import { SettingsModal } from './components/Modals/SettingsModal';
import { AIAssistantBot } from './components/HUD/AIAssistantBot';
import { DraggableWindow } from './components/HUD/DraggableWindow';
import { TargetTerminal } from './components/Widgets/PlayerTools/TargetTerminal';
import { useTheme } from './hooks/useTheme';
import { QuestTrackerHUD } from './components/Widgets/GameMaster/QuestTrackerHUD';
import { TextContextBar } from './components/UI/TextContextBar';
import { ImageContextBar } from './components/HUD/ImageContextBar';
import { PropInteractionPanel } from './components/HUD/PropInteractionPanel';
import { NPCPanel } from './components/HUD/NPCPanel';
import { CutsceneOverlay } from './components/Theater/CutsceneOverlay';
import { InviteModal } from './components/Modals/InviteModal';
import { ClimaxOverlay } from './components/UI/ClimaxOverlay';
import { SoftTimer } from './components/UI/SoftTimer';
import { DiceOverlay } from './components/UI/DiceOverlay';
import { PPROverlay } from './components/UI/PPROverlay';
import { CombatTracker } from './components/HUD/CombatTracker';
import { MapContextMenu } from './components/UI/MapContextMenu';
import { GridToolbar } from './components/UI/GridToolbar';
import { ClockConfigModal } from './components/Modals/ClockConfigModal';
import { WidgetHubModal } from './components/Modals/WidgetHubModal';
import { TensionClockManager } from './components/HUD/TensionClockManager';
import { FloatingDocument } from './components/UI/FloatingDocument';
import { TheaterView } from './components/Theater/TheaterView';
import { WidgetLayer } from './components/HUD/WidgetLayer';
import { MainToolbar } from './components/HUD/MainToolbar';
import { PlayerQuickBar } from './components/HUD/PlayerQuickBar';
import { useWindowManager } from './hooks/useWindowManager';
import { state, addTensionClock, updateTensionClockProps } from './store';
import type { TensionClock } from './store';
import { MobileBottomNav } from './components/HUD/MobileBottomNav';
import { MobileQuickActions } from './components/HUD/MobileQuickActions';
import { LayoutPresetsModal } from './components/Modals/LayoutPresetsModal';
import { GlobalSearchModal } from './components/Modals/GlobalSearchModal';
import { PopoutViewer } from './components/Popout/PopoutViewer';
import { GlobalAudioSync } from './components/Audio/GlobalAudioSync';
import { CutsceneManager } from './components/Theater/CutsceneManager';
import { Toaster, ConfirmDialog } from './components/UI/Toast';
import { useAppEventListeners } from './hooks/useAppEventListeners';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { OfflineStatus } from './components/System/OfflineStatus';

type ModalMode = 'none' | 'players' | 'settings' | 'settings-aparencia' | 'settings-modulos' | 'settings-ia' | 'settings-cenario' | 'chat' | 'clockConfig' | 'widgets';

function App() {
  const [isReady] = useState(true);
  const { currentThemeId, setTheme, themeOverrides, updateOverrides, clearOverrides } = useTheme();
  const urlParams = new URLSearchParams(window.location.search);
  const standaloneWidget = urlParams.get('widget');

  const {
    openWindows, toggleWindow,
    viewMode, setViewMode,
    activeModal, setActiveModal,
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

  const handleCloseSheet = useCallback((sheetKey: string) => {
    setOpenSheets(prev => prev.filter(id => id !== sheetKey));
  }, [setOpenSheets]);

  const handleCloseWikiDoc = useCallback((docId: string) => {
    setOpenWikiDocs(prev => prev.filter(doc => doc.id !== docId));
  }, [setOpenWikiDocs]);

  // Hook centralizado para gerenciar todos os eventos da janela
  const {
    isLayoutPresetsOpen, setIsLayoutPresetsOpen,
    isGlobalSearchOpen, setIsGlobalSearchOpen,
    activeCutscene, setActiveCutscene
  } = useAppEventListeners({
    viewMode,
    setViewMode,
    setActiveModal,
    setOpenSheets,
    setOpenWikiDocs,
    setEditingClockId,
    setWikiInitialFile
  });

  const toggleModal = useCallback((mode: ModalMode) => {
    setActiveModal(activeModal === mode ? 'none' : mode);
  }, [activeModal, setActiveModal]);

  if (!isReady) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h1 className="text-gradient animate-fade-in">Loading VTT Ecosystem...</h1>
      </div>
    );
  }

  // ===== STANDALONE WIDGET MODE (MULTI-MONITOR POP-OUT) ===== //
  if (standaloneWidget) {
    return <PopoutViewer widgetId={standaloneWidget} />;
  }

  return (
    <div className="app-container">
      <OfflineStatus />
      
      {/* ── Cutscene overlay (Global) ── */}
      {activeCutscene && (
        <CutsceneOverlay config={activeCutscene} onEnd={() => setActiveCutscene(null)} />
      )}

      {/* PÁGINA DO CÉREBRO GRÁFICO */}
      <div className={`view-layer brain-layer ${viewMode === 'brain' ? 'active' : ''}`}>
        {viewMode === 'brain' && (
          <ErrorBoundary componentName="Cérebro Gráfico (Brain)">
            <LivingBrain />
          </ErrorBoundary>
        )}
      </div>

      {/* PÁGINA DEDICADA DA WIKI */}
      <div className={`view-layer wiki-layer ${viewMode === 'wiki' ? 'active' : ''}`}>
        {viewMode === 'wiki' && (
          <ErrorBoundary componentName="WikiViewer">
            <WikiViewer initialFile={wikiInitialFile} />
          </ErrorBoundary>
        )}
      </div>

      {/* PÁGINA DO TEATRO DA MENTE */}
      <div className={`view-layer theater-layer ${viewMode === 'theater' ? 'active' : ''}`}>
        {viewMode === 'theater' && (
          <ErrorBoundary componentName="Teatro (TheaterView)">
            <TheaterView />
          </ErrorBoundary>
        )}
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
          <ErrorBoundary componentName="Mapa Interativo (GameCanvas)">
            <GameCanvas />
            <GridToolbar />
            <GMToolbar />
            <TokenContextHUD />
            <MapContextMenu />
            <ImageContextBar />
            <TextContextBar />
            <PropInteractionPanel />
            <AIAssistantBot />
          </ErrorBoundary>
        </div>
      </div>

      {/* Layer 10: React HUD */}
      <div className="hud-layer hud-grid">
        <ErrorBoundary componentName="Interface Principal (HUD)">
          <MainToolbar />
          <QuestTrackerHUD />

          {/* Combat Tracker Widget */}
          {openWindows.combatTracker && (
            <DraggableWindow
              id="tracker"
              title="Iniciativa"
              initialX={window.innerWidth - 360}
              initialY={160}
              width={340}
              height={500}
              variant="default"
              onClose={() => toggleWindow('combatTracker')}
            >
              <ErrorBoundary componentName="Combat Tracker">
                <CombatTracker />
              </ErrorBoundary>
            </DraggableWindow>
          )}

          {/* Cutscene Director Widget */}
          {openWindows.cutsceneDirector && (
            <DraggableWindow
              id="cutscenes"
              title="Diretor de Cenas (Títulos)"
              initialX={window.innerWidth / 2 - 200}
              initialY={180}
              width={400}
              height={500}
              variant="default"
              onClose={() => toggleWindow('cutsceneDirector')}
            >
              <div style={{ padding: '1rem', height: '100%', overflowY: 'auto' }}>
                <ErrorBoundary componentName="Cutscene Manager">
                  <CutsceneManager />
                </ErrorBoundary>
              </div>
            </DraggableWindow>
          )}

          <TensionClockManager onEditClock={(id) => {
            setEditingClockId(id);
            setActiveModal('clockConfig');
          }} />

          {/* Modal Layer */}
          {(activeModal === 'players' || activeModal.startsWith('settings') || activeModal === 'chat') && (
            <div className="hud-modal-layer">
              {activeModal === 'players' && <InviteModal onClose={() => setActiveModal('none')} />}
              {activeModal.startsWith('settings') && (
                <SettingsModal 
                  onClose={() => setActiveModal('none')} 
                  initialTab={activeModal === 'settings-aparencia' ? 'aparencia' : activeModal === 'settings-modulos' ? 'modulos' : activeModal === 'settings-ia' ? 'ia' : activeModal === 'settings-cenario' ? 'cenario' : 'geral'} 
                />
              )}
              {activeModal === 'chat' && (
                <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '350px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Mensagens Diretas</h3>
                    <button onClick={() => setActiveModal('none')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'white'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}><X size={18} /></button>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nenhuma mensagem recebida.</p>
                </div>
              )}
            </div>
          )}

          {/* Clock Config Modal */}
          {activeModal === 'clockConfig' && (
            <ClockConfigModal
              existingClock={editingClockId ? state.clocks.get(editingClockId) as TensionClock : undefined}
              onClose={() => {
                setActiveModal('none');
                setEditingClockId(null);
              }}
              onConfirm={(config, isEdit) => {
                if (isEdit && editingClockId) {
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
        </ErrorBoundary>
      </div> {/* Fim da hud-layer */}

      {/* Free-Floating Window Layer */}
      <>
        {showActors && (
          <DraggableWindow id="actors-library" title="Biblioteca" initialX={window.innerWidth - 360} initialY={160} width={300} onClose={handleCloseActorLibrary}>
            <div style={{ height: '400px' }}>
              <ErrorBoundary componentName="Painel de NPCs"><NPCPanel /></ErrorBoundary>
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
              <ErrorBoundary componentName="Ficha (TargetTerminal)">
                <TargetTerminal tokenId={tokenId} wikiPath={wikiPath} isGM={true} />
              </ErrorBoundary>
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
          <DraggableWindow id="chat" title="Registro" initialX={window.innerWidth - 340} initialY={160} width={320} height={400} onClose={handleCloseCombatLog}>
            <ErrorBoundary componentName="CombatLog"><CombatLog /></ErrorBoundary>
          </DraggableWindow>
        )}

        {openWindows.chatWindow && (
          <DraggableWindow id="chatWindow" title="Chat P2P" initialX={window.innerWidth - 680} initialY={160} width={320} height={400} onClose={handleCloseChatWindow}>
            <ErrorBoundary componentName="ChatWindow"><ChatWindow /></ErrorBoundary>
          </DraggableWindow>
        )}

        {/* Overlays Visuais e Funcionais */}
        <ClimaxOverlay />
        <SoftTimer />
        <DiceOverlay />
        <PPROverlay />
        <GlobalAudioSync />
        <Toaster />
        <ConfirmDialog />

        <WidgetLayer />

        <PlayerQuickBar playerName={localStorage.getItem('dozero_player_name') || 'Jogador'} />

        {/* WidgetHubModal */}
        {activeModal === 'widgets' && (
          <div className="modal-overlay" onClick={() => setActiveModal('none')} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'auto', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}>
              <ErrorBoundary componentName="Hub de Módulos (WidgetHubModal)">
                <WidgetHubModal
                  onClose={() => setActiveModal('none')}
                  onOpenTracker={() => { toggleWindow('combatTracker'); setActiveModal('none'); }}
                  onOpenOracleV2={() => { toggleWindow('oracle'); setActiveModal('none'); }}
                  onOpenNPCGenerator={() => { toggleWindow('npcGenerator'); setActiveModal('none'); }}
                  onOpenLocationGenerator={() => { toggleWindow('locationGenerator'); setActiveModal('none'); }}
                  onOpenEncounterGenerator={() => { toggleWindow('encounterGenerator'); setActiveModal('none'); }}
                  onOpenClockConfig={() => { setEditingClockId(null); setActiveModal('clockConfig'); }}
                  onOpenCampaignManager={() => { toggleWindow('campaignManager'); setActiveModal('none'); }}
                  onOpenGMNotes={() => { toggleWindow('gmNotes'); setActiveModal('none'); }}
                  onOpenMindMap={() => { toggleWindow('mindMap'); setActiveModal('none'); }}
                  onOpenTradeShop={() => { toggleWindow('tradeShop'); setActiveModal('none'); }}
                  onOpenSystemAuditor={() => { toggleWindow('systemAuditor'); setActiveModal('none'); }}
                  onOpenAutomatedDice={() => { toggleWindow('automatedDice'); setActiveModal('none'); }}
                  onOpenCharacterRoster={() => { toggleWindow('characterRoster'); setActiveModal('none'); }}
                  onOpenChronos={() => { toggleWindow('chronos'); setActiveModal('none'); }}
                  onOpenLoreMachine={() => { toggleWindow('loreMachine'); setActiveModal('none'); }}
                  onOpenDLCManager={() => { setActiveModal('settings-modulos'); }}
                  onOpenWorldEngine={() => { toggleWindow('worldEngine'); setActiveModal('none'); }}
                  onOpenEntityForge={() => { toggleWindow('entityForge'); setActiveModal('none'); }}
                  onOpenStronghold={() => { toggleWindow('stronghold'); setActiveModal('none'); }}
                  onOpenArsenalMestre={() => { toggleWindow('arsenalMestre'); setActiveModal('none'); }}
                  onOpenAudioDirector={() => { toggleWindow('audioDirector'); setActiveModal('none'); }}
                  onOpenWebFrame={() => { toggleWindow('webFrame'); setActiveModal('none'); }}
                  onOpenDiceRoller={() => { toggleWindow('diceRoller'); setActiveModal('none'); }}
                  onOpenMapSettings={() => { setActiveModal('settings-cenario'); }}
                  onOpenActorLibrary={() => { setShowActors(true); setActiveModal('none'); }}
                  onOpenPlayerManager={() => { toggleWindow('playerManager'); setActiveModal('none'); }}
                  onOpenRoomManager={() => { setActiveModal('players'); }}
                  onOpenStoryDice={() => { toggleWindow('storyDice'); setActiveModal('none'); }}
                  onOpenSSStoryDice={() => { toggleWindow('ssStoryDice'); setActiveModal('none'); }}
                  onOpenStoryBilderDeck={() => { toggleWindow('storyBilderDeck'); setActiveModal('none'); }}
                  onToggleAIBot={() => { setActiveModal('settings-ia'); }}
                  onOpenAIStudio={() => { toggleWindow('aiStudio'); setActiveModal('none'); }}
                  onOpenThemes={() => { setActiveModal('settings-aparencia'); }}
                  onOpenCutsceneDirector={() => { toggleWindow('cutsceneDirector'); setActiveModal('none'); }}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}
        <MobileBottomNav />
        <MobileQuickActions />
        <LayoutPresetsModal isOpen={isLayoutPresetsOpen} onClose={() => setIsLayoutPresetsOpen(false)} />
        <GlobalSearchModal isOpen={isGlobalSearchOpen} onClose={() => setIsGlobalSearchOpen(false)} />
      </>
    </div>
  );
}

export default App;