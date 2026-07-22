import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, LayoutGrid, Terminal, User, ArrowRight } from 'lucide-react';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import { useWindowManager } from '../../hooks/useWindowManager';
import { state } from '../../store';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { toggleWindow, setViewMode, setActiveModal, setShowActors } = useWindowManager();
  const [query, setQuery] = useState('');
  const [wikiEntries, setWikiEntries] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      WikiIndexer.buildIndex().then(idx => setWikiEntries(idx || [])).catch(() => {});
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Search Results
  const tools = [
    { name: 'Hub de Ferramentas (Menu Geral)', type: 'Widget', icon: LayoutGrid, action: () => { setActiveModal('widgets'); onClose(); } },
    { name: 'Wiki da Campanha', type: 'Visão', icon: BookOpen, action: () => { setViewMode('wiki'); onClose(); } },
    { name: 'Diretor de Áudio & Trilha Sonora', type: 'Widget', icon: LayoutGrid, action: () => { toggleWindow('audioDirector'); onClose(); } },
    { name: 'Rastreador de Combate (Iniciativa)', type: 'Widget', icon: LayoutGrid, action: () => { toggleWindow('combatTracker'); onClose(); } },
    { name: 'Oráculo Rápido V2 (Dados & Tabelas)', type: 'Widget', icon: LayoutGrid, action: () => { toggleWindow('oracle'); onClose(); } },
    { name: 'Gerador de NPCs', type: 'Widget', icon: LayoutGrid, action: () => { toggleWindow('npcGenerator'); onClose(); } },
    { name: 'Gerador de Locais', type: 'Widget', icon: LayoutGrid, action: () => { toggleWindow('locationGenerator'); onClose(); } },
    { name: 'Biblioteca de Atores / Personagens', type: 'Ferramenta', icon: User, action: () => { setShowActors(true); onClose(); } },
    { name: 'Estúdio de Inteligência Artificial (IA)', type: 'Widget', icon: LayoutGrid, action: () => { toggleWindow('aiStudio'); onClose(); } },
    { name: 'Painel de Conspiração (MindMap)', type: 'Widget', icon: LayoutGrid, action: () => { toggleWindow('mindMap'); onClose(); } },
    { name: 'Configurações de Layout & Multi-Monitor', type: 'Ferramenta', icon: LayoutGrid, action: () => { window.dispatchEvent(new CustomEvent('open-layout-presets')); onClose(); } },
  ].filter(t => !q || t.name.toLowerCase().includes(q));

  const wikiResults = q
    ? wikiEntries.filter(w => (w.title || w.slug || '').toLowerCase().includes(q)).slice(0, 6)
    : wikiEntries.slice(0, 4);

  const tokenResults = q
    ? Array.from(state.tokens.values() as Iterable<any>).filter(t => (t.name || '').toLowerCase().includes(q)).slice(0, 6)
    : [];

  const commands = [
    { cmd: '/ai', desc: 'Perguntar ao Assistente de IA' },
    { cmd: '/roll 1d20+5', desc: 'Rolar teste de dados' },
    { cmd: '/w Nome', desc: 'Sussurrar mensagem privada' },
    { cmd: '/me', desc: 'Ação narrativa em terceira pessoa' },
    { cmd: '/as "Nome"', desc: 'Falar como NPC / Alias' },
  ].filter(c => !q || c.cmd.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));

  return (
    <div 
      className="global-search-overlay"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(5, 10, 25, 0.85)',
        backdropFilter: 'blur(10px)', zIndex: 2000000, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center', padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '640px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)', color: 'var(--text-primary)',
          overflow: 'hidden', marginTop: '40px'
        }}
        onClick={e => e.stopPropagation()}
        className="global-search-modal"
      >
        {/* Search Bar Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--glass-border)', gap: '12px', background: 'rgba(0,0,0,0.3)' }}>
          <Search size={22} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar ferramentas, páginas da Wiki, tokens, comandos..."
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.05rem', outline: 'none' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
              <X size={18} />
            </button>
          )}
          <button onClick={onClose} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}>
            ESC
          </button>
        </div>

        {/* Results List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Ferramentas / Widgets */}
          {tools.length > 0 && (
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LayoutGrid size={12} /> Ferramentas & Widgets
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {tools.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={item.action}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid transparent', borderRadius: '6px', cursor: 'pointer',
                        color: 'var(--text-primary)', fontSize: '0.88rem', textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.18)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={18} style={{ color: '#c084fc' }} />
                        <span>{item.name}</span>
                      </div>
                      <ArrowRight size={14} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tokens no Mapa */}
          {tokenResults.length > 0 && (
            <div>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={12} /> Tokens no Mapa
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {tokenResults.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('token-dblclick', { detail: t.id }));
                      onClose();
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: 'rgba(56,189,248,0.06)',
                      border: '1px solid rgba(56,189,248,0.2)', borderRadius: '6px', cursor: 'pointer',
                      color: 'var(--text-primary)', fontSize: '0.88rem', textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={t.imageUrl} alt={t.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                      <strong style={{ color: '#7dd3fc' }}>{t.name}</strong>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Abrir Ficha</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wiki Documents */}
          {wikiResults.length > 0 && (
            <div>
              <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={12} /> Páginas da Wiki
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {wikiResults.map((w: any) => (
                  <button
                    key={w.path || w.slug}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-wiki-doc', { detail: w.path }));
                      onClose();
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: 'rgba(59,130,246,0.06)',
                      border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', cursor: 'pointer',
                      color: 'var(--text-primary)', fontSize: '0.88rem', textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📜</span>
                      <span style={{ fontWeight: 'bold', color: '#93c5fd' }}>{w.title || w.slug}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{w.category || 'Wiki'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comandos Rápidos */}
          {commands.length > 0 && (
            <div>
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={12} /> Comandos do Chat
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {commands.map((c, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <code style={{ color: '#fbbf24', fontWeight: 'bold' }}>{c.cmd}</code>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{c.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
