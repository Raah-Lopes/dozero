import React, { useState, useEffect } from 'react';
import './App.css';
import { Settings, Users, MessageSquare, X, Map as MapIcon, BookOpen, Swords, LayoutGrid, Wrench } from 'lucide-react';
import { WikiViewer } from './components/Wiki/WikiViewer';
import { GameCanvas } from './engine/GameCanvas';
import { CombatLog } from './components/Chat/CombatLog';
import { SettingsModal } from './components/HUD/SettingsModal';
import { DiceOverlay } from './components/HUD/DiceOverlay';

import { DraggableWindow } from './components/HUD/DraggableWindow';
import { TargetTerminal } from './components/HUD/TargetTerminal';
import { MapSettingsPanel } from './components/HUD/MapSettingsPanel';
import { NPCPanel } from './components/HUD/NPCPanel';
import { PlayersLobby } from './components/HUD/PlayersLobby';
import { CombatTracker } from './components/HUD/CombatTracker';
import { MapContextMenu } from './components/HUD/MapContextMenu';
import { ClockConfigModal } from './components/HUD/ClockConfigModal';
import { WidgetHubModal } from './components/HUD/WidgetHubModal';
import { TensionClockManager } from './components/HUD/TensionClockManager';
import { state, addTensionClock, updateTensionClockProps } from './store';

// Trigger HMR
type ViewMode = 'canvas' | 'wiki' | 'theater';
type ModalMode = 'none' | 'players' | 'settings' | 'chat' | 'clockConfig' | 'widgets';

function App() {
  const [isReady, setIsReady] = useState(true);
  const [editingClockId, setEditingClockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('dozero_viewMode') as ViewMode) || 'canvas';
  });
  const [activeModal, setActiveModal] = useState<ModalMode>('none');
  const [showMapSettings, setShowMapSettings] = useState(false);
  const [showActors, setShowActors] = useState(false);
  const [showCombatLog, setShowCombatLog] = useState(() => localStorage.getItem('showCombatLog') !== 'false'); // Default open unless explicitly closed
  const [showCombatTracker, setShowCombatTracker] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [openSheets, setOpenSheets] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem('showCombatLog', showCombatLog.toString());
  }, [showCombatLog]);

  useEffect(() => {
    localStorage.setItem('dozero_viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const handleDblClick = (e: any) => {
      const { tokenId } = e.detail;
      setOpenSheets(prev => {
        if (prev.includes(tokenId)) return prev;
        return [...prev, tokenId];
      });
    };
    window.addEventListener('token-dblclick', handleDblClick);
    
    const handleOpenClockConfig = () => setActiveModal('clockConfig');
    window.addEventListener('open-clock-config', handleOpenClockConfig);

    return () => {
      window.removeEventListener('token-dblclick', handleDblClick);
      window.removeEventListener('open-clock-config', handleOpenClockConfig);
    }
  }, []);

  if (!isReady) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h1 className="text-gradient animate-fade-in">Loading VTT Ecosystem...</h1>
      </div>
    );
  }

  const toggleModal = (mode: ModalMode) => {
    setActiveModal(prev => prev === mode ? 'none' : mode);
  };

  return (
    <div className="app-container">
      {/* PÁGINA DEDICADA DA WIKI */}
      <div style={{ display: viewMode === 'wiki' ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1000, background: 'var(--bg-primary)' }}>
        {viewMode === 'wiki' && <WikiViewer />}
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

      {/* PÁGINA DA MESA (HUD + MAPA) */}
      <div style={{ display: viewMode === 'canvas' ? 'block' : 'none', width: '100%', height: '100%' }}>
        <div className="canvas-layer" id="canvas-container">
          <GameCanvas />
          <MapContextMenu />
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
                  <button onClick={() => setViewMode(viewMode === 'wiki' ? 'canvas' : 'wiki')} className={`btn-icon ${viewMode === 'wiki' ? 'active' : ''}`} title="Wiki">
                    <BookOpen size={20} />
                  </button>
                  <button onClick={() => toggleModal('players')} className={`btn-icon ${activeModal === 'players' ? 'active' : ''}`} title="Jogadores">
                    <Users size={20} />
                  </button>
                  <button className="btn-icon" onClick={() => setShowMapSettings(!showMapSettings)} title="Configurar Cenário">
                    <MapIcon size={20} />
                  </button>
                  <button className="btn-icon" onClick={() => setShowActors(!showActors)} title="Biblioteca de Atores">
                    <BookOpen size={20} />
                  </button>
                  <button className={`btn-icon ${activeModal === 'widgets' ? 'active' : ''}`} onClick={() => toggleModal('widgets')} title="Hub de Widgets">
                    <LayoutGrid size={20} />
                  </button>
                  <button className={`btn-icon ${showCombatLog ? 'active' : ''}`} onClick={() => setShowCombatLog(!showCombatLog)} title="Registro de Combate (Log)">
                    <MessageSquare size={20} />
                  </button>
                  <button className={`btn-icon ${activeModal === 'settings' ? 'active' : ''}`} onClick={() => toggleModal('settings')} title="Configurações">
                    <Wrench size={20} />
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
        
        {/* Ribbon Combat Tracker */}
        {showCombatTracker && (
          <DraggableWindow 
            id="tracker" 
            title="Iniciativa" 
            initialX={window.innerWidth / 2 - 200} 
            initialY={100} 
            width="auto" 
            height="auto" 
            variant="bare"
            windowStyle={{ alignItems: 'center' }}
            onClose={() => setShowCombatTracker(false)}
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
                 onOpenTracker={() => { setShowCombatTracker(!showCombatTracker); setActiveModal('none'); }} 
                 onOpenClockConfig={() => setActiveModal('clockConfig')} 
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

        {/* Free-Floating Window Layer */}
        <>
          {showActors && (
            <DraggableWindow id="actors-library" title="Biblioteca" initialX={window.innerWidth - 360} initialY={100} width={300} onClose={() => setShowActors(false)}>
              <div style={{ height: '400px' }}>
                <NPCPanel />
              </div>
            </DraggableWindow>
          )}

          {openSheets.map((tokenId, index) => (
            <DraggableWindow 
              key={tokenId} 
              id={`sheet-${tokenId}`} 
              title="Ficha do Personagem" 
              initialX={20 + (index * 40)} 
              initialY={100 + (index * 40)} 
              width={340}
              onClose={() => setOpenSheets(prev => prev.filter(id => id !== tokenId))}
            >
              <TargetTerminal tokenId={tokenId} isGM={true} />
            </DraggableWindow>
          ))}

          {showCombatLog && (
            <DraggableWindow id="chat" title="Registro" initialX={window.innerWidth - 340} initialY={100} width={320} height={400} onClose={() => setShowCombatLog(false)}>
              <CombatLog />
            </DraggableWindow>
          )}

          {showMapSettings && (
            <DraggableWindow id="mapSettings" title="Configurar Cenário" initialX={window.innerWidth / 2 - 150} initialY={200} width={300} onClose={() => setShowMapSettings(false)}>
              <MapSettingsPanel />
            </DraggableWindow>
          )}
        </>

      </div>

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
    </div>
  );
}

export default App;
