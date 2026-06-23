import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { Settings, Users, MessageSquare, X, Map as MapIcon, BookOpen, Swords, LayoutGrid, Library, Film, DoorOpen } from 'lucide-react';
import { WikiViewer } from './components/Wiki/WikiViewer';
import { GameCanvas } from './engine/GameCanvas';
import { CombatLog } from './components/Chat/CombatLog';
import { SettingsModal } from './components/Modals/SettingsModal';
import { DiceOverlay } from './components/UI/DiceOverlay';

import { DraggableWindow } from './components/HUD/DraggableWindow';
import { TargetTerminal } from './components/Widgets/PlayerTools/TargetTerminal';
import { MapSettingsPanel } from './components/HUD/MapSettingsPanel';
import { TextContextBar } from './components/UI/TextContextBar';
import { PropInteractionPanel } from './components/HUD/PropInteractionPanel';
import { NPCPanel } from './components/HUD/NPCPanel';
import { PlayersLobby } from './components/HUD/PlayersLobby';
import { CombatTracker } from './components/HUD/CombatTracker';
import { MapContextMenu } from './components/UI/MapContextMenu';
import { ClockConfigModal } from './components/Modals/ClockConfigModal';
import { WidgetHubModal } from './components/Modals/WidgetHubModal';
import { TensionClockManager } from './components/HUD/TensionClockManager';
import { FloatingDocument } from './components/UI/FloatingDocument';
import { TheaterView } from './components/Theater/TheaterView';
import { WidgetLayer } from './components/HUD/WidgetLayer';
import { useWindowManager } from './hooks/useWindowManager';
import { state, addTensionClock, updateTensionClockProps } from './store';
import type { TensionClock } from './store';
import { loadMarkdownFile } from './utils/githubApi';
import * as yaml from 'js-yaml';

// Trigger HMR
type ModalMode = 'none' | 'players' | 'settings' | 'chat' | 'clockConfig' | 'widgets';

function App() {
  const [isReady, _setIsReady] = useState(true);
  const {
    openWindows, toggleWindow,
    viewMode, setViewMode,
    activeModal, setActiveModal,
    showMapSettings, setShowMapSettings,
    showActors, setShowActors,
    showToolsDropdown, setShowToolsDropdown,
    openSheets, setOpenSheets,
    openWikiDocs, setOpenWikiDocs,
    wikiInitialFile, setWikiInitialFile,
    editingClockId, setEditingClockId
  } = useWindowManager();

  const handleCloseActorLibrary = useCallback(() => setShowActors(false), [setShowActors]);
  const handleCloseCombatLog = useCallback(() => toggleWindow('combatLog'), [toggleWindow]);
  const handleCloseMapSettings = useCallback(() => setShowMapSettings(false), [setShowMapSettings]);
  
  const handleCloseSheet = useCallback((sheetKey: string) => {
    setOpenSheets((prev: string[]) => prev.filter((id) => id !== sheetKey));
  }, [setOpenSheets]);

  const handleCloseWikiDoc = useCallback((docId: string) => {
    setOpenWikiDocs((prev: any[]) => prev.filter((d) => d.id !== docId));
  }, [setOpenWikiDocs]);

  useEffect(() => {
    const handleOpenWikiDoc = (e: Event) => {
      const filepath = (e as CustomEvent).detail;
      if (filepath) {
        setOpenWikiDocs((prev: { id: string, filepath: string }[]) => {
          if (prev.some(doc => doc.filepath === filepath)) return prev;
          return [...prev, { id: `doc-${Date.now()}`, filepath }];
        });
      }
    };
    window.addEventListener('open-wiki-doc', handleOpenWikiDoc);
    return () => window.removeEventListener('open-wiki-doc', handleOpenWikiDoc);
  }, []);

  useEffect(() => {
    localStorage.setItem('dozero_viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const handleDblClick = (e: Event) => {
      const { tokenId } = (e as CustomEvent).detail;
      setOpenSheets((prev: string[]) => {
        if (prev.includes(tokenId)) return prev;
        return [...prev, tokenId];
      });
    };
    window.addEventListener('token-dblclick', handleDblClick);
    
    const handleOpenClockConfig = () => setActiveModal('clockConfig');
    window.addEventListener('open-clock-config', handleOpenClockConfig);

    // Evento disparado pelo CampaignManagerWidget para abrir um arquivo na Wiki
    const handleOpenWikiFile = (e: Event) => {
      const path = (e as CustomEvent).detail?.path || (e as CustomEvent).detail?.filePath;
      if (path) {
        setWikiInitialFile(path);
        setViewMode('wiki');
      }
    };
    window.addEventListener('open-wiki-file', handleOpenWikiFile);

    const handleOpenSheetByWiki = (e: Event) => {
      const wikiPath = (e as CustomEvent).detail;
      if (wikiPath) {
        setOpenSheets((prev: string[]) => {
          const key = `wiki:${wikiPath}`;
          if (prev.includes(key)) return prev;
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
        if (!data) return;

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
      window.removeEventListener('open-sheet-by-wiki', handleOpenSheetByWiki);
      window.removeEventListener('spawn-token-from-wiki', handleSpawnTokenFromWiki);
    }
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

  return (
    <div className="app-container">
      {/* PÁGINA DEDICADA DA WIKI */}
      <div style={{ display: viewMode === 'wiki' ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1000, background: 'var(--bg-primary)' }}>
        {viewMode === 'wiki' && <WikiViewer initialFile={wikiInitialFile} />}
        <div style={{ position: 'fixed', top: '15px', right: '15px', zIndex: 99999 }}>
          <button 
            onClick={() => setViewMode('canvas')} 
            className="glass-panel hover-glow" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', cursor: 'pointer', border: '1px solid var(--accent-primary)', color: 'white', background: 'rgba(20,20,20,0.85)', borderRadius: '8px', pointerEvents: 'auto', fontWeight: 'bold', transition: 'all 0.2s' }}
          >
            <Swords size={18} color="var(--accent-primary)" /> 
            Voltar para a Mesa
          </button>
        </div>
      </div>

      {/* PÁGINA DO TEATRO DA MENTE */}
      <div style={{ display: viewMode === 'theater' ? 'flex' : 'none', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 900, flexDirection: 'column' }}>
        {viewMode === 'theater' && <TheaterView />}
        {viewMode === 'theater' && (
          <div style={{ position: 'fixed', top: '15px', left: '15px', zIndex: 99999 }}>
            <button 
              onClick={() => setViewMode('canvas')} 
              className="glass-panel exit-door-btn" 
              style={{ display: 'flex', alignItems: 'center', gap: '0', padding: '0.6rem', cursor: 'pointer', border: '1px solid var(--accent-primary)', color: 'white', background: 'rgba(20,20,20,0.85)', borderRadius: '8px', pointerEvents: 'auto', transition: 'all 0.3s ease', overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              <DoorOpen size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} /> 
              <span className="exit-text" style={{ maxWidth: 0, opacity: 0, transition: 'all 0.3s ease', display: 'inline-block', overflow: 'hidden', fontFamily: 'var(--font-display)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                Painel Principal
              </span>
            </button>
            <style>{`
              .exit-door-btn:hover {
                box-shadow: 0 0 15px var(--accent-glow);
                background: rgba(30,30,30,0.95) !important;
              }
              .exit-door-btn:hover .exit-text { 
                max-width: 150px !important; 
                opacity: 1 !important; 
                margin-left: 0.5rem !important; 
              }
            `}</style>
          </div>
        )}
      </div>

      {/* PÁGINA DA MESA (HUD + MAPA) */}
      <div style={{ display: viewMode === 'canvas' ? 'block' : 'none', width: '100%', height: '100%' }}>
        <div className="canvas-layer" id="canvas-container">
          <GameCanvas />
          <MapContextMenu />
          <TextContextBar />
          <PropInteractionPanel />
        </div>

      {/* Layer 10: React HUD */}
      <div className="hud-layer" style={{ pointerEvents: 'none' }}>
        
        {/* Top HUD Area */}
        <div style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', width: '100%' }}>
          
          <div className="top-bar" style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
            {/* Left side: (Empty to push tools to right if needed, or we can just justify-end) */}
            <div style={{ flex: 1 }}></div>

            {/* Right side: Tools */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              {showToolsDropdown && (
                <div className="glass-panel animate-fade-in" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem' }}>
                  <button onClick={() => setViewMode(viewMode === 'wiki' ? 'canvas' : 'wiki')} className={`btn-icon theme-cyan ${viewMode === 'wiki' ? 'active' : ''}`} title="Wiki da Campanha">
                    <BookOpen size={20} />
                  </button>
                  <button onClick={() => setViewMode(viewMode === 'theater' ? 'canvas' : 'theater')} className={`btn-icon theme-violet ${viewMode === 'theater' ? 'active' : ''}`} title="Teatro da Mente">
                    <Film size={20} />
                  </button>
                  <button onClick={() => toggleModal('players')} className={`btn-icon theme-green ${activeModal === 'players' ? 'active' : ''}`} title="Jogadores e Lobby">
                    <Users size={20} />
                  </button>
                  <button className="btn-icon theme-blue" onClick={() => setShowMapSettings(!showMapSettings)} title="Configurar Cenário e Grade">
                    <MapIcon size={20} />
                  </button>
                  <button className="btn-icon theme-amber" onClick={() => setShowActors(!showActors)} title="Biblioteca de Atores">
                    <Library size={20} />
                  </button>
                  <button className={`btn-icon theme-purple ${activeModal === 'widgets' ? 'active' : ''}`} onClick={() => toggleModal('widgets')} title="Hub de Widgets (Ferramentas GM)">
                    <LayoutGrid size={20} />
                  </button>
                  <button className={`btn-icon theme-red ${openWindows.combatLog ? 'active' : ''}`} onClick={() => toggleWindow('combatLog')} title="Registro de Rolagens (Log)">
                    <MessageSquare size={20} />
                  </button>
                  <button className={`btn-icon theme-slate ${activeModal === 'settings' ? 'active' : ''}`} onClick={() => toggleModal('settings')} title="Configurações do Sistema">
                    <Settings size={20} />
                  </button>
                </div>
              )}
              <div className="glass-panel" style={{ padding: '0.5rem' }}>
                <button 
                  className={`btn-icon ${showToolsDropdown ? 'active' : ''}`} 
                  onClick={() => setShowToolsDropdown(!showToolsDropdown)} 
                  title="Ferramentas"
                >
                  <Settings size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
        
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

        <TensionClockManager onEditClock={(id) => {
          setEditingClockId(id);
          setActiveModal('clockConfig');
        }} />

        {/* Modal Layer */}
        {activeModal !== 'none' && (
           <div style={{ position: 'absolute', top: '90px', right: 'var(--hud-padding)', zIndex: 50, pointerEvents: 'auto' }}>
             {activeModal === 'players' && <PlayersLobby onClose={() => setActiveModal('none')} />}
             {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal('none')} />}
             {activeModal === 'widgets' && (
               <WidgetHubModal 
                 onClose={() => setActiveModal('none')} 
                 onOpenTracker={() => { toggleWindow('combatTracker'); setActiveModal('none'); }} 
                 onOpenClockConfig={() => setActiveModal('clockConfig')} 
                 onOpenOracleV2={() => { toggleWindow('oracle'); setActiveModal('none'); }}
                 onOpenNPCGenerator={() => { toggleWindow('npcGenerator'); setActiveModal('none'); }}
                 onOpenLocationGenerator={() => { toggleWindow('locationGenerator'); setActiveModal('none'); }}
                 onOpenEncounterGenerator={() => { toggleWindow('encounterGenerator'); setActiveModal('none'); }}
                 onOpenCampaignManager={() => { toggleWindow('campaignManager'); setActiveModal('none'); }}
                 onOpenMindMap={() => { toggleWindow('mindMap'); setActiveModal('none'); }}
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
                   // Se estava pausado, não mexemos no tempo de fim até ele ser despausado.
                   // Mas como o usuário editou a duração, precisamos refazer as contas:
                   // Se mudou a duração, o novo endTime será agora + nova duração
                   updateTensionClockProps(editingClockId, {
                     label: config.label,
                     durationMs: config.durationMs,
                     endTime: now + config.durationMs,
                     pausedRemainingMs: undefined, // retoma ou reseta
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

      {/* GM Profile (Moved to Bottom Left) */}
      <div className="glass-panel" style={{ position: 'absolute', bottom: 'var(--hud-padding)', left: 'var(--hud-padding)', pointerEvents: 'auto', padding: '0.5rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', zIndex: 10 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: 'white', fontSize: '0.8rem', boxShadow: '0 0 10px var(--accent-glow)' }}>
          GM
        </div>
        <div>
          <h2 style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-primary)' }}>Mestre</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: '500' }}>Edição Ativa</span>
        </div>
      </div>
      <DiceOverlay />
      
      </div> {/* Fim da div da PÁGINA DA MESA */}

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

        {showMapSettings && (
          <DraggableWindow id="mapSettings" title="Configurar Cenário" initialX={window.innerWidth / 2 - 150} initialY={200} width={300} onClose={handleCloseMapSettings}>
            <MapSettingsPanel />
          </DraggableWindow>
        )}

        <TextContextBar />
        <WidgetLayer />
      </>

    </div>
  );
}

export default App;
