import React from 'react';
import { 
  LayoutGrid, BookOpen, Film, Users, MessageSquare, Settings 
} from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';

export function MainToolbar() {
  const {
    viewMode, setViewMode,
    activeModal, setActiveModal,
    openWindows, toggleWindow
  } = useWindowManager();

  const toggleModal = (mode: any) => {
    setActiveModal(activeModal === mode ? 'none' : mode);
  };

  return (
    <div className="hud-top-area">
      {/* Left side: Navigation & Hub */}
      <div className="hud-hub-btn" style={{ gap: '0.5rem' }}>
        <div className="glass-panel pointer-events-auto" style={{ display: 'flex', padding: '0.25rem' }}>
          <button
            className={`btn-icon theme-purple ${activeModal === 'widgets' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setActiveModal(activeModal === 'widgets' ? 'none' : 'widgets'); }}
            title="Menu Geral (Hub de Ferramentas)"
          >
            <LayoutGrid size={20} />
          </button>
        </div>

        <div className="glass-panel pointer-events-auto" style={{ display: 'flex', padding: '0.25rem', gap: '0.25rem' }}>
          <button onClick={() => setViewMode(viewMode === 'wiki' ? 'canvas' : 'wiki')} className={`btn-icon theme-cyan ${viewMode === 'wiki' ? 'active' : ''}`} title="Wiki da Campanha">
            <BookOpen size={20} />
          </button>
          <button onClick={() => setViewMode(viewMode === 'theater' ? 'canvas' : 'theater')} className={`btn-icon theme-violet ${viewMode === 'theater' ? 'active' : ''}`} title="Teatro da Mente">
            <Film size={20} />
          </button>
        </div>
      </div>

      {/* Right side: Social & System */}
      <div className="hud-tools-bar">
        <div className="glass-panel pointer-events-auto" style={{ display: 'flex', padding: '0.25rem', gap: '0.25rem' }}>
          <button onClick={() => toggleModal('players')} className={`btn-icon theme-green ${activeModal === 'players' ? 'active' : ''}`} title="Convidar Jogadores (Compartilhar Mesa)">
            <Users size={20} />
          </button>
          <button className={`btn-icon theme-blue ${openWindows.chatWindow ? 'active' : ''}`} onClick={() => toggleWindow('chatWindow')} title="Chat P2P (Mensagens)">
            <MessageSquare size={20} />
          </button>
          <button className={`btn-icon theme-red ${openWindows.combatLog ? 'active' : ''}`} onClick={() => toggleWindow('combatLog')} title="Registro de Rolagens (Log)">
            <MessageSquare size={20} />
          </button>
        </div>
        
        <div className="glass-panel pointer-events-auto" style={{ display: 'flex', padding: '0.25rem' }}>
          <button className={`btn-icon theme-slate ${activeModal === 'settings' ? 'active' : ''}`} onClick={() => toggleModal('settings')} title="Configurações do Sistema">
            <Settings size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
