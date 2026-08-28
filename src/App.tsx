import React, { useState, useCallback } from 'react';
import './App.css';
import { GameCanvas } from './engine/GameCanvas';
import { GMToolbar } from './components/HUD/GMToolbar';
import { TokenContextHUD } from './components/HUD/TokenContextHUD';
import { CombatLog } from './components/Chat/CombatLog';
import { ChatWindow } from './components/Chat/ChatWindow';
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
import { ClimaxOverlay } from './components/UI/ClimaxOverlay';
import { SoftTimer } from './components/UI/SoftTimer';
import { DiceOverlay } from './components/UI/DiceOverlay';
import { PPROverlay } from './components/UI/PPROverlay';
import { CombatTracker } from './components/HUD/CombatTracker';
import { MapContextMenu } from './components/UI/MapContextMenu';
import { GridToolbar } from './components/UI/GridToolbar';
import { GridSoundboardLauncher } from './components/UI/GridSoundboardLauncher';
import { TensionClockManager } from './components/HUD/TensionClockManager';
import { FloatingDocument } from './components/UI/FloatingDocument';
import { WidgetLayer } from './components/HUD/WidgetLayer';
import { PlayerQuickBar } from './components/HUD/PlayerQuickBar';
import { useWindowManager } from './hooks/useWindowManager';
import { state, addTensionClock, updateTensionClockProps, pushChatMessage } from './store';
import { MobileQuickActions } from './components/HUD/MobileQuickActions';
import { PopoutViewer } from './components/Popout/PopoutViewer';
import { GlobalAudioSync } from './components/Audio/GlobalAudioSync';
import { CutsceneManager } from './components/Theater/CutsceneManager';
import { Toaster, ConfirmDialog } from './components/UI/Toast';
import { useAppEventListeners } from './hooks/useAppEventListeners';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { OfflineStatus } from './components/System/OfflineStatus';
import { StreamOverlay } from './components/Stream/StreamOverlay';
import { useAutoSaveSession } from './services/useAutoSaveSession';
import { useRoomPresence } from './services/useRoomPresence';
import { useAuthStore } from './store/authStore';

// Workspaces e Modais pesados carregados sob demanda (0ms de impacto inicial no Canvas)
const WikiViewer = React.lazy(() => import('./components/Wiki/WikiViewer').then(m => ({ default: m.WikiViewer })));
const CodexWorkspace = React.lazy(() => import('./components/Wiki/Codex/CodexWorkspace').then(m => ({ default: m.CodexWorkspace })));
const LivingBrain = React.lazy(() => import('./components/Wiki/LivingBrain').then(m => ({ default: m.LivingBrain })));
const ArcanumSheetsWorkspace = React.lazy(() => import('./components/Sheets/ArcanumSheetsWorkspace').then(m => ({ default: m.ArcanumSheetsWorkspace })));
const TheaterView = React.lazy(() => import('./components/Theater/TheaterView').then(m => ({ default: m.TheaterView })));
const SettingsModal = React.lazy(() => import('./components/Modals/SettingsModal').then(m => ({ default: m.SettingsModal })));
const InviteModal = React.lazy(() => import('./components/Modals/InviteModal').then(m => ({ default: m.InviteModal })));
const ClockConfigModal = React.lazy(() => import('./components/Modals/ClockConfigModal').then(m => ({ default: m.ClockConfigModal })));
const WidgetHubModal = React.lazy(() => import('./components/Modals/WidgetHubModal').then(m => ({ default: m.WidgetHubModal })));
const LayoutPresetsModal = React.lazy(() => import('./components/Modals/LayoutPresetsModal').then(m => ({ default: m.LayoutPresetsModal })));
const GlobalSearchModal = React.lazy(() => import('./components/Modals/GlobalSearchModal').then(m => ({ default: m.GlobalSearchModal })));
const LorePinsModal = React.lazy(() => import('./components/Modals/LorePinsModal').then(m => ({ default: m.LorePinsModal })));
const CampaignLobbyModal = React.lazy(() => import('./components/Modals/CampaignLobbyModal').then(m => ({ default: m.CampaignLobbyModal })));
const PlayerVaultModal = React.lazy(() => import('./components/Modals/PlayerVaultModal').then(m => ({ default: m.PlayerVaultModal })));
const TokenConfigModal = React.lazy(() => import('./components/Modals/TokenConfigModal').then(m => ({ default: m.TokenConfigModal })));
const AuthModal = React.lazy(() => import('./components/Modals/AuthModal').then(m => ({ default: m.AuthModal })));
const ProfileModal = React.lazy(() => import('./components/Modals/ProfileModal').then(m => ({ default: m.ProfileModal })));
const ResetPasswordModal = React.lazy(() => import('./components/Modals/ResetPasswordModal').then(m => ({ default: m.ResetPasswordModal })));
const ObsidianSyncModal = React.lazy(() => import('./components/Modals/ObsidianSyncModal').then(m => ({ default: m.ObsidianSyncModal })));
const CampaignBookPublisherModal = React.lazy(() => import('./components/Modals/CampaignBookPublisherModal').then(m => ({ default: m.CampaignBookPublisherModal })));

type ModalMode = 'none' | 'players' | 'settings' | 'settings-aparencia' | 'settings-modulos' | 'settings-ia' | 'settings-cenario' | 'chat' | 'clockConfig' | 'widgets' | 'lobby' | 'vault' | 'tokenConfig';

function App() {
  const [isReady] = useState(true);
  const [showLegacyWiki, setShowLegacyWiki] = useState(false);
  const { initialize: initAuth } = useAuthStore();
  const { currentThemeId, setTheme, themeOverrides, updateOverrides, clearOverrides } = useTheme();

  React.useEffect(() => {
    initAuth();
  }, [initAuth]);
  const urlParams = new URLSearchParams(window.location.search);
  const standaloneWidget = urlParams.get('widget');
  const currentRoom = urlParams.get('room') || 'dozero-mesa-principal-v2';

  // Auto-backup de sessão periódico no banco Supabase e rastreamento de presença real
  useAutoSaveSession(currentRoom);
  useRoomPresence(currentRoom);

  const {
    openWindows, toggleWindow,
    viewMode, setViewMode,
    activeCharacterId, setActiveCharacterId,
    sheetScope, setSheetScope,
    activeModal, setActiveModal,
    showActors, setShowActors,
    showToolsDropdown, setShowToolsDropdown,
    openSheets, setOpenSheets,
    openWikiDocs, setOpenWikiDocs,
    editingClockId, setEditingClockId,
    editingTokenId, setEditingTokenId,
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
    isLorePinsOpen, setIsLorePinsOpen,
    isObsidianSyncOpen, setIsObsidianSyncOpen,
    isBookPublisherOpen, setIsBookPublisherOpen,
    activeCutscene, setActiveCutscene
  } = useAppEventListeners({
    viewMode,
    setViewMode,
    setActiveModal,
    setOpenSheets,
    setOpenWikiDocs,
    setEditingClockId,
    setWikiInitialFile,
    setActiveCharacterId,
    setSheetScope
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
  // ===== STREAM OVERLAY MODE (OBS / LIVE BROADCAST) ===== //
  const isStreamMode = urlParams.get('mode') === 'stream' || urlParams.get('mode') === 'spectator';
  if (isStreamMode) {
    return <StreamOverlay roomCode={currentRoom} />;
  }

  const [hasOpenedBrain, setHasOpenedBrain] = useState(viewMode === 'brain');

  React.useEffect(() => {
    if (viewMode === 'brain') setHasOpenedBrain(true);
  }, [viewMode]);

  return (
    <div className="app-container">
      <OfflineStatus />
      
      {/* ── Cutscene overlay (Global) ── */}
      {activeCutscene && (
        <CutsceneOverlay config={activeCutscene} onEnd={() => setActiveCutscene(null)} />
      )}

      {/* PÁGINA DO CÉREBRO GRÁFICO (Carregamento instantâneo em cache) */}
      <div
        className={`view-layer brain-layer ${viewMode === 'brain' ? 'active' : ''}`}
        style={{ display: viewMode === 'brain' ? 'block' : 'none' }}
      >
        {hasOpenedBrain && (
          <ErrorBoundary componentName="Cérebro Gráfico (Brain)">
            <React.Suspense fallback={<div className="h-full w-full grid place-items-center bg-[#15120e] text-[#d9a441]" role="status">Carregando Cérebro do Mundo…</div>}>
              <LivingBrain />
            </React.Suspense>
          </ErrorBoundary>
        )}
      </div>

      {/* PÁGINA DEDICADA DA WIKI */}
      <div className={`view-layer wiki-layer ${viewMode === 'wiki' ? 'active' : ''}`}>
        {viewMode === 'wiki' && (
          <ErrorBoundary componentName="Códice Arcanum">
            <React.Suspense fallback={<div className="h-full w-full grid place-items-center bg-[#15120e] text-[#d9a441]" role="status">Abrindo o Códice...</div>}>
              {showLegacyWiki
                ? <WikiViewer
                  initialFile={wikiInitialFile}
                    onClose={() => {
                      setShowLegacyWiki(false);
                      setViewMode('canvas');
                    }}
                    onBackToCodex={() => setShowLegacyWiki(false)}
                  />
                : <CodexWorkspace
                    initialFile={wikiInitialFile}
                    onClose={() => setViewMode('canvas')}
                    onOpenLegacy={currentRoom === 'dozero-mesa-principal-v2' ? () => setShowLegacyWiki(true) : undefined}
                    onOpenBrain={() => setViewMode('brain')}
                  />}
            </React.Suspense>
          </ErrorBoundary>
        )}
      </div>

      {/* PÁGINA DO TEATRO DA MENTE */}
      <div className={`view-layer theater-layer ${viewMode === 'theater' ? 'active' : ''}`}>
        {viewMode === 'theater' && (
          <ErrorBoundary componentName="Teatro (TheaterView)">
            <React.Suspense fallback={<div className="h-full w-full grid place-items-center bg-[#0d0f14] text-[#818cf8]" role="status">Preparando o Teatro...</div>}>
              <TheaterView />
            </React.Suspense>
          </ErrorBoundary>
        )}
      </div>

      <div className={`view-layer sheets-layer ${viewMode === 'sheets' ? 'active' : ''}`}>
        {viewMode === 'sheets' && (
          <ErrorBoundary componentName="Forja de Fichas Arcanum">
            <React.Suspense fallback={<div className="h-full w-full grid place-items-center bg-[#0c0911] text-[#e0b054]" role="status">Abrindo a Forja...</div>}>
              <ArcanumSheetsWorkspace
                campaignId={currentRoom}
                initialCharacterId={activeCharacterId}
                initialScope={sheetScope}
                onClose={() => setViewMode('canvas')}
              />
            </React.Suspense>
          </ErrorBoundary>
        )}
      </div>

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
      {viewMode === 'canvas' && (
        <div className="hud-layer hud-grid">
          <ErrorBoundary componentName="Interface Principal (HUD)">
            <GridSoundboardLauncher />
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
          {(activeModal === 'players' || activeModal.startsWith('settings')) && (
            <div className="hud-modal-layer">
              <React.Suspense fallback={null}>
                {activeModal === 'players' && <InviteModal onClose={() => setActiveModal('none')} />}
                {activeModal.startsWith('settings') && (
                  <SettingsModal 
                    onClose={() => setActiveModal('none')} 
                    initialTab={activeModal === 'settings-aparencia' ? 'aparencia' : activeModal === 'settings-modulos' ? 'modulos' : activeModal === 'settings-ia' ? 'ia' : 'geral'} 
                  />
                )}
              </React.Suspense>
            </div>
          )}

          {/* Clock Config Modal */}
          {activeModal === 'clockConfig' && (
            <React.Suspense fallback={null}>
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
                      const durationChanged = current.durationMs !== config.durationMs;
                      const newEndTime = durationChanged ? now + config.durationMs : current.endTime;
                      const newPausedRemaining = durationChanged ? undefined : current.pausedRemainingMs;

                      updateTensionClockProps(editingClockId, {
                        label: config.label,
                        durationMs: config.durationMs,
                        endTime: newEndTime,
                        pausedRemainingMs: newPausedRemaining,
                        hpMod: config.hpMod,
                        mpMod: config.mpMod
                      });
                      pushChatMessage(`⏱️ Relógio "${config.label}" foi atualizado.`);
                    }
                  } else {
                    const id = 'clock_' + Date.now();
                    pushChatMessage(`⏱️ Relógio de Tensão "${config.label}" criado.`);
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
            </React.Suspense>
          )}
        </ErrorBoundary>
      </div>
      )} {/* Fim da hud-layer */}

      {/* Free-Floating Window Layer */}
      {viewMode === 'canvas' && (
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
            <DraggableWindow 
              id="chatWindow" 
              title="Chat & Voz P2P" 
              initialX={typeof window !== 'undefined' && window.innerWidth > 768 ? window.innerWidth - 420 : 10} 
              initialY={typeof window !== 'undefined' && window.innerWidth > 768 ? 120 : 60} 
              width={typeof window !== 'undefined' && window.innerWidth > 768 ? 380 : 'calc(100vw - 20px)'} 
              height={typeof window !== 'undefined' && window.innerWidth > 768 ? 540 : 'calc(100vh - 140px)'} 
              onClose={handleCloseChatWindow}
            >
              <ErrorBoundary componentName="ChatWindow"><ChatWindow /></ErrorBoundary>
            </DraggableWindow>
          )}
        </>
      )}

      {/* Overlays Visuais e Funcionais */}
      <ClimaxOverlay />
      <SoftTimer />
      <DiceOverlay />
      <PPROverlay />
      <GlobalAudioSync />
      <Toaster />
      <ConfirmDialog />

      {viewMode === 'canvas' && <WidgetLayer />}

      {viewMode === 'canvas' && (
        <PlayerQuickBar playerName={localStorage.getItem('dozero_player_name') || 'Jogador'} />
      )}

      {/* WidgetHubModal */}
      {activeModal === 'widgets' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'auto', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}>
            <ErrorBoundary componentName="Hub de Módulos (WidgetHubModal)">
              <React.Suspense fallback={null}>
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
                  onOpenPlayerQuickBar={() => { toggleWindow('playerQuickBar'); setActiveModal('none'); }}
                  onToggleAIBot={() => { setActiveModal('settings-ia'); }}
                  onOpenAIStudio={() => { toggleWindow('aiStudio'); setActiveModal('none'); }}
                  onOpenThemes={() => { setActiveModal('settings-aparencia'); }}
                  onOpenCutsceneDirector={() => { toggleWindow('cutsceneDirector'); setActiveModal('none'); }}
                />
              </React.Suspense>
            </ErrorBoundary>
          </div>
        </div>
      )}
      {viewMode === 'canvas' && (
        <MobileQuickActions />
      )}
      <React.Suspense fallback={null}>
        <LayoutPresetsModal isOpen={isLayoutPresetsOpen} onClose={() => setIsLayoutPresetsOpen(false)} />
        <GlobalSearchModal isOpen={isGlobalSearchOpen} onClose={() => setIsGlobalSearchOpen(false)} />
        <LorePinsModal isOpen={isLorePinsOpen} onClose={() => setIsLorePinsOpen(false)} />
        <CampaignLobbyModal
          isOpen={activeModal === 'lobby'}
          onClose={() => setActiveModal('none')}
          onOpenVault={() => setActiveModal('vault')}
        />
        <PlayerVaultModal 
          isOpen={activeModal === 'vault'} 
          onClose={() => setActiveModal('none')} 
          activeCampaignId={currentRoom !== 'default-room' ? currentRoom : undefined} 
        />
        {activeModal === 'tokenConfig' && editingTokenId && (
          <TokenConfigModal 
            tokenId={editingTokenId} 
            onClose={() => {
              setActiveModal('none');
              setEditingTokenId(null);
            }} 
          />
        )}
        <AuthModal />
        <ProfileModal />
        <ResetPasswordModal />
        <ObsidianSyncModal isOpen={isObsidianSyncOpen} onClose={() => setIsObsidianSyncOpen(false)} />
        <CampaignBookPublisherModal isOpen={isBookPublisherOpen} onClose={() => setIsBookPublisherOpen(false)} />
      </React.Suspense>
    </div>
  );
}

export default App;
