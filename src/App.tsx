import React, { useState, useEffect } from 'react';
import './App.css';
import { Settings, Users, MessageSquare, X, Map as MapIcon, BookOpen, Swords } from 'lucide-react';
import { MindMap } from './components/Wiki/MindMap';
import { GameCanvas } from './engine/GameCanvas';
import { CombatLog } from './components/Chat/CombatLog';
import { SettingsModal } from './components/HUD/SettingsModal';
import { DiagnosticOverlay } from './components/DiagnosticOverlay';
import { DraggableWindow } from './components/HUD/DraggableWindow';
import { TargetTerminal } from './components/HUD/TargetTerminal';
import { MapSettingsPanel } from './components/HUD/MapSettingsPanel';
import { NPCPanel } from './components/HUD/NPCPanel';
import { PlayersLobby } from './components/HUD/PlayersLobby';
import { CombatTracker } from './components/HUD/CombatTracker';

// Trigger HMR
type ViewMode = 'canvas' | 'wiki' | 'theater';
type ModalMode = 'none' | 'players' | 'settings' | 'chat';

function App() {
  const [isReady, setIsReady] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [activeModal, setActiveModal] = useState<ModalMode>('none');
  const [showMapSettings, setShowMapSettings] = useState(false);
  const [showActors, setShowActors] = useState(false);
  const [showCombatLog, setShowCombatLog] = useState(true); // Default open
  const [showCombatTracker, setShowCombatTracker] = useState(false);
  const [openSheets, setOpenSheets] = useState<string[]>([]);

  useEffect(() => {
    const handleDblClick = (e: any) => {
      const { tokenId } = e.detail;
      setOpenSheets(prev => {
        if (prev.includes(tokenId)) return prev;
        return [...prev, tokenId];
      });
    };
    window.addEventListener('token-dblclick', handleDblClick);
    return () => window.removeEventListener('token-dblclick', handleDblClick);
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
      {/* Background Layers depending on mode */}
      {viewMode === 'canvas' && (
        <div className="canvas-layer" id="canvas-container">
          <GameCanvas />
        </div>
      )}

      {viewMode === 'wiki' && (
        <div className="canvas-layer" style={{ zIndex: 5 }}>
           <MindMap />
        </div>
      )}

      {/* Layer 10: React HUD */}
      <div className="hud-layer" style={{ pointerEvents: 'none' }}>
        
        {/* Top HUD Area */}
        <div style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', width: '100%' }}>
          
          <div className="top-bar" style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
            {/* Left side: GM Profile */}
            <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: 'white', fontSize: '0.8rem', boxShadow: '0 0 10px var(--accent-glow)' }}>
                GM
              </div>
              <div>
                <h2 style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-primary)' }}>Mestre</h2>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: '500' }}>Edição Ativa</span>
              </div>
            </div>

            {/* Right side: Tools */}
            <div className="glass-panel" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem' }}>
              <button onClick={() => setViewMode('wiki')} className={`btn-icon ${viewMode === 'wiki' ? 'active' : ''}`} title="Wiki">
                <MessageSquare size={20} />
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
              <button className={`btn-icon ${showCombatTracker ? 'active' : ''}`} onClick={() => setShowCombatTracker(!showCombatTracker)} title="Rastreador de Combate (Iniciativa)">
                <Swords size={20} />
              </button>
              <button className={`btn-icon ${showCombatLog ? 'active' : ''}`} onClick={() => setShowCombatLog(!showCombatLog)} title="Registro de Combate (Log)">
                <MessageSquare size={20} />
              </button>
              <button className={`btn-icon ${activeModal === 'settings' ? 'active' : ''}`} onClick={() => toggleModal('settings')} title="Configurações">
                <Settings size={20} />
              </button>
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

        {/* Modal Layer */}
        {activeModal !== 'none' && (
           <div style={{ position: 'absolute', top: '90px', right: 'var(--hud-padding)', zIndex: 50, pointerEvents: 'auto' }}>
             {activeModal === 'players' && <PlayersLobby onClose={() => setActiveModal('none')} />}
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
           </div>
        )}

        {/* Free-Floating Window Layer */}
        {viewMode === 'canvas' && (
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
        )}

      </div>

      <DiagnosticOverlay />
    </div>
  );
}

export default App;
