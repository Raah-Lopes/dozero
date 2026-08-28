import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, BookOpen, Film, Users, MessageSquare, Settings, Menu, X, Search, CloudUpload, LogOut, Dices, GitMerge, ScrollText
} from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';

import { toast } from '../UI/Toast';
import { Tooltip } from '../UI/Tooltip';
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
      toast.success(data.message || 'Sincronizado com sucesso!');
    } catch (e: any) {
      toast.error("Erro ao sincronizar: " + e.message);
    } finally {
      setIsSyncing(false);
      setIsMenuOpen(false);
    }
  };

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');

  // The list of tools to be filtered
  const tools = [
    { id: 'hub', label: 'Menu Geral (Hub de Ferramentas)', icon: <LayoutGrid size={20} />, action: () => toggleModal('widgets'), isActive: activeModal === 'widgets', colorClass: 'theme-purple' },
    { id: 'wiki', label: 'Wiki da Campanha', icon: <BookOpen size={20} />, action: () => handleSetViewMode(viewMode === 'wiki' ? 'canvas' : 'wiki'), isActive: viewMode === 'wiki', colorClass: 'theme-cyan' },
    { id: 'sheets', label: 'Forja de Fichas (Arcanum)', icon: <ScrollText size={20} />, action: () => handleSetViewMode(viewMode === 'sheets' ? 'canvas' : 'sheets'), isActive: viewMode === 'sheets', colorClass: 'theme-amber' },
    { id: 'brain', label: 'Cérebro Grafo (Arcanum)', icon: <GitMerge size={20} />, action: () => handleSetViewMode(viewMode === 'brain' ? 'canvas' : 'brain'), isActive: viewMode === 'brain', colorClass: 'theme-amber' },
    { id: 'theater', label: 'Teatro da Mente', icon: <Film size={20} />, action: () => handleSetViewMode(viewMode === 'theater' ? 'canvas' : 'theater'), isActive: viewMode === 'theater', colorClass: 'theme-violet' },
    { id: 'layouts', label: 'Layouts & Multi-Monitor', icon: <LayoutGrid size={20} />, action: () => { window.dispatchEvent(new CustomEvent('open-layout-presets')); setIsMenuOpen(false); }, isActive: false, colorClass: 'theme-violet' },
    { id: 'players', label: 'Central da Mesa & Jogadores', icon: <Users size={20} />, action: () => toggleModal('players'), isActive: activeModal === 'players', colorClass: 'theme-green' },
    { id: 'chat', label: 'Chat P2P (Mensagens)', icon: <MessageSquare size={20} />, action: () => handleToggleWindow('chatWindow'), isActive: openWindows.chatWindow, colorClass: 'theme-blue' },
    { id: 'combatLog', label: 'Registro de Rolagens (Log)', icon: <Dices size={20} />, action: () => handleToggleWindow('combatLog'), isActive: openWindows.combatLog, colorClass: 'theme-red' },
    ...(isLocalhost ? [{ id: 'sync', label: isSyncing ? 'Sincronizando...' : 'Sincronizar Nuvem (Vercel)', icon: <CloudUpload size={20} className={isSyncing ? 'spin-anim' : ''} />, action: handleSyncCloud, isActive: false, colorClass: 'theme-green' }] : []),
    { id: 'settings', label: 'Configurações do Sistema', icon: <Settings size={20} />, action: () => toggleModal('settings'), isActive: activeModal === 'settings', colorClass: 'theme-slate' },
    { id: 'exit', label: 'Sair (Voltar ao Início)', icon: <LogOut size={20} />, action: () => window.location.href = '/', isActive: false, colorClass: 'theme-red' }
  ];

  const filteredTools = tools.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isMobile) {
    return (
      <>
        <div style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 1000000, pointerEvents: 'auto' }}>
          <button 
            className="glass-panel"
            style={{ width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>

        {isMenuOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-primary)', zIndex: 1000001, display: 'flex', flexDirection: 'column', padding: '20px', pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src="/mascot/zye-head-smile.png" 
                  alt="Zye" 
                  style={{ width: '36px', height: '36px', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(250, 204, 21, 0.4))' }} 
                />
                <h2 className="theme-text-gradient" style={{ margin: 0 }}>Menu DOZERO</h2>
              </div>
              <button onClick={() => setIsMenuOpen(false)} aria-label="Fechar Menu" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}><X size={28} /></button>
            </div>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Pesquisar ferramentas..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 35px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '1rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '15px', overflowY: 'auto' }}>
              {filteredTools.length > 0 ? filteredTools.map(tool => (
                <button 
                  key={tool.id}
                  onClick={() => {
                    tool.action();
                    setIsMenuOpen(false); // fechar o menu mobile ao clicar
                  }}
                  className={`glass-panel ${tool.isActive ? 'active' : ''}`}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '15px 5px', background: tool.isActive ? 'var(--accent-glow)' : 'var(--glass-bg)', border: tool.isActive ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '12px', textAlign: 'center', width: '100%' }}
                >
                  <div className={`btn-icon ${tool.colorClass} ${tool.isActive ? 'active' : ''}`} style={{ background: 'transparent', pointerEvents: 'none', width: 'auto', height: 'auto', marginBottom: '4px' }}>
                    {tool.icon}
                  </div>
                  <span style={{ fontSize: '0.75rem', lineHeight: '1.2', fontWeight: 500, color: tool.isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{tool.label}</span>
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
    <div className="hud-top-area" style={{ justifyContent: 'flex-end' }}>
      {/* Right side: Social & System */}
      <div className="hud-tools-bar">
        <div className="glass-panel pointer-events-auto" style={{ display: 'flex', padding: '0.25rem', gap: '0.25rem' }}>
          <Tooltip label="Central da Mesa & Jogadores" description="Convites, Participantes e Sala" position="bottom">
            <button onClick={() => toggleModal('players')} className={`btn-icon theme-green ${activeModal === 'players' ? 'active' : ''}`} aria-label="Central da Mesa e Jogadores">
              <Users size={20} />
            </button>
          </Tooltip>
          <Tooltip label="Chat P2P" description="Mensagens" position="bottom">
            <button className={`btn-icon theme-blue ${openWindows.chatWindow ? 'active' : ''}`} onClick={() => toggleWindow('chatWindow')} aria-label="Abrir Chat de Mensagens">
              <MessageSquare size={20} />
            </button>
          </Tooltip>
          <Tooltip label="Registro de Rolagens" description="Log" position="bottom">
            <button className={`btn-icon theme-red ${openWindows.combatLog ? 'active' : ''}`} onClick={() => toggleWindow('combatLog')} aria-label="Abrir Registro de Rolagens">
              <Dices size={20} />
            </button>
          </Tooltip>
        </div>
        
        <div className="glass-panel pointer-events-auto" style={{ display: 'flex', padding: '0.25rem', gap: '0.25rem' }}>
          {isLocalhost && (
            <Tooltip label={isSyncing ? "Sincronizando..." : "Sincronizar Nuvem (Vercel)"} position="bottom">
              <button className="btn-icon theme-green" onClick={handleSyncCloud} aria-label="Sincronizar com a Nuvem">
                <CloudUpload size={20} className={isSyncing ? 'spin-anim' : ''} />
              </button>
            </Tooltip>
          )}
          <Tooltip label="Configurações do Sistema" position="bottom">
            <button className={`btn-icon theme-slate ${activeModal === 'settings' ? 'active' : ''}`} onClick={() => toggleModal('settings')} aria-label="Abrir Configurações do Sistema">
              <Settings size={20} />
            </button>
          </Tooltip>
          <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 4px' }}></div>
          <Tooltip label="Sair" description="Voltar ao Início" position="bottom">
            <button className="btn-icon theme-red" onClick={() => window.location.href = '/'} aria-label="Sair da Mesa">
              <LogOut size={20} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
