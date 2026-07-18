import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, BookOpen, Film, Users, MessageSquare, Settings, Menu, X, Search, CloudUpload
} from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';

export function MainToolbar() {
  const {
    viewMode, setViewMode,
    activeModal, setActiveModal,
    openWindows, toggleWindow
  } = useWindowManager();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleModal = (mode: any) => {
    setActiveModal(activeModal === mode ? 'none' : mode);
    setIsMenuOpen(false); // fechar menu ao abrir algo
  };

  const handleToggleWindow = (win: string) => {
    toggleWindow(win);
    setIsMenuOpen(false);
  };

  const handleSetViewMode = (mode: any) => {
    setViewMode(mode);
    setIsMenuOpen(false);
  };

  const handleSyncCloud = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/wiki/sync-cloud', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message || 'Sincronizado com sucesso!');
    } catch (e: any) {
      alert("Erro ao sincronizar: " + e.message);
    } finally {
      setIsSyncing(false);
      setIsMenuOpen(false);
    }
  };

  // The list of tools to be filtered
  const tools = [
    { id: 'hub', label: 'Menu Geral (Hub de Ferramentas)', icon: <LayoutGrid size={20} />, action: () => toggleModal('widgets'), isActive: activeModal === 'widgets', colorClass: 'theme-purple' },
    { id: 'wiki', label: 'Wiki da Campanha', icon: <BookOpen size={20} />, action: () => handleSetViewMode(viewMode === 'wiki' ? 'canvas' : 'wiki'), isActive: viewMode === 'wiki', colorClass: 'theme-cyan' },
    { id: 'theater', label: 'Teatro da Mente', icon: <Film size={20} />, action: () => handleSetViewMode(viewMode === 'theater' ? 'canvas' : 'theater'), isActive: viewMode === 'theater', colorClass: 'theme-violet' },
    { id: 'players', label: 'Convidar Jogadores', icon: <Users size={20} />, action: () => toggleModal('players'), isActive: activeModal === 'players', colorClass: 'theme-green' },
    { id: 'chat', label: 'Chat P2P (Mensagens)', icon: <MessageSquare size={20} />, action: () => handleToggleWindow('chatWindow'), isActive: openWindows.chatWindow, colorClass: 'theme-blue' },
    { id: 'combatLog', label: 'Registro de Rolagens (Log)', icon: <MessageSquare size={20} />, action: () => handleToggleWindow('combatLog'), isActive: openWindows.combatLog, colorClass: 'theme-red' },
    { id: 'sync', label: isSyncing ? 'Sincronizando...' : 'Sincronizar Nuvem (Vercel)', icon: <CloudUpload size={20} className={isSyncing ? 'spin-anim' : ''} />, action: handleSyncCloud, isActive: false, colorClass: 'theme-green' },
    { id: 'settings', label: 'Configurações do Sistema', icon: <Settings size={20} />, action: () => toggleModal('settings'), isActive: activeModal === 'settings', colorClass: 'theme-slate' }
  ];

  const filteredTools = tools.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isMobile) {
    return (
      <>
        <div style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 1000000, pointerEvents: 'auto' }}>
          <button 
            className="glass-panel"
            style={{ width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>

        {isMenuOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-primary)', zIndex: 1000001, display: 'flex', flexDirection: 'column', padding: '20px', pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Menu DOZERO</h2>
              <button onClick={() => setIsMenuOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white' }}><X size={28} /></button>
            </div>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Pesquisar ferramentas..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 35px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', fontSize: '1rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              {filteredTools.length > 0 ? filteredTools.map(tool => (
                <button 
                  key={tool.id}
                  onClick={tool.action}
                  className={`glass-panel ${tool.isActive ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: tool.isActive ? 'rgba(255,255,255,0.1)' : 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', textAlign: 'left', width: '100%' }}
                >
                  <div className={`btn-icon ${tool.colorClass} ${tool.isActive ? 'active' : ''}`} style={{ background: 'transparent', pointerEvents: 'none' }}>
                    {tool.icon}
                  </div>
                  <span style={{ fontSize: '1.1rem' }}>{tool.label}</span>
                </button>
              )) : (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>Nenhuma ferramenta encontrada.</p>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop Render
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
