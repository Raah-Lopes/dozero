import React, { useState } from 'react';
import './App.css';
import { Settings, Users, MessageSquare, X, Map as MapIcon } from 'lucide-react';
import { TextTicker } from './components/Chat/TextTicker';
import { MindMap } from './components/Wiki/MindMap';
import { GameCanvas } from './engine/GameCanvas';
import { CombatLog } from './components/Chat/CombatLog';
import { SettingsModal } from './components/HUD/SettingsModal';
import { DiagnosticOverlay } from './components/DiagnosticOverlay';
import { DraggableWindow } from './components/HUD/DraggableWindow';
import { TargetTerminal } from './components/HUD/TargetTerminal';
import { MapSettingsPanel } from './components/HUD/MapSettingsPanel';

// Trigger HMR
type ViewMode = 'canvas' | 'wiki' | 'theater';
type ModalMode = 'none' | 'players' | 'settings' | 'chat';

function App() {
  const [isReady, setIsReady] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [activeModal, setActiveModal] = useState<ModalMode>('none');
  const [showMapSettings, setShowMapSettings] = useState(false);
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
        <div className="top-bar" style={{ pointerEvents: 'auto' }}>
          <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: 'white', boxShadow: '0 0 10px var(--accent-glow)' }}>
              GM
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>O Mestre Preguiçoso</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: '500' }}>Modo Edição Ativo</span>
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem' }}>
            <button onClick={() => setViewMode('wiki')} className={`btn-icon ${viewMode === 'wiki' ? 'active' : ''}`} title="Wiki">
              <MessageSquare size={20} />
            </button>
            <button onClick={() => toggleModal('players')} className={`btn-icon ${activeModal === 'players' ? 'active' : ''}`} title="Jogadores">
              <Users size={20} />
            </button>
            <button onClick={() => setShowMapSettings(!showMapSettings)} className={`btn-icon ${showMapSettings ? 'active' : ''}`} title="Cenário/Mapa">
              <MapIcon size={20} />
            </button>
            <button onClick={() => toggleModal('chat')} className={`btn-icon ${activeModal === 'chat' ? 'active' : ''}`} title="Chat">
              <MessageSquare size={20} />
            </button>
            <button onClick={() => toggleModal('settings')} className={`btn-icon ${activeModal === 'settings' ? 'active' : ''}`} title="Configurações">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Modals Layer (Absolute positioning within HUD) */}
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

            <DraggableWindow id="chat" title="Registro" initialX={window.innerWidth - 340} initialY={100} width={320}>
              <CombatLog />
            </DraggableWindow>

            {showMapSettings && (
              <DraggableWindow id="mapSettings" title="Configurar Cenário" initialX={window.innerWidth / 2 - 150} initialY={100} width={300}>
                <MapSettingsPanel />
              </DraggableWindow>
            )}
          </>
        )}

        {/* Bottom HUD Area */}
        <div className="bottom-bar" style={{ pointerEvents: 'auto', position: 'relative' }}>
           {viewMode === 'theater' && (
             <TextTicker text="Os portões de obsidiana se abrem lentamente, revelando um abismo sem fim. Rolem iniciativa." speed={40} />
           )}

           <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', gap: '1rem', zIndex: 20, borderRadius: 'var(--radius-lg)' }}>
             <button onClick={() => setViewMode('canvas')} className={viewMode === 'canvas' ? 'btn btn-primary' : 'btn'} style={{ background: viewMode !== 'canvas' ? 'transparent' : '', color: viewMode !== 'canvas' ? 'var(--text-secondary)' : '' }}>
               Arena de Combate
             </button>
             <button onClick={() => setViewMode('theater')} className={viewMode === 'theater' ? 'btn btn-primary' : 'btn'} style={{ background: viewMode !== 'theater' ? 'transparent' : '', color: viewMode !== 'theater' ? 'var(--text-secondary)' : '' }}>
               Modo Teatro da Mente
             </button>
           </div>
        </div>

      </div>

      <DiagnosticOverlay />
    </div>
  );
}

export default App;
