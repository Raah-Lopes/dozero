import React from 'react';
import { Search, HelpCircle, Bell, BellOff, Trash2, X } from 'lucide-react';
import { state } from '../../store';

interface ChatHeaderProps {
  tab: 'geral' | 'in-game' | 'sistema';
  setTab: (tab: 'geral' | 'in-game' | 'sistema') => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSelectMode: boolean;
  setIsSelectMode: (mode: boolean) => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  chatSound: boolean;
  setChatSound: (sound: boolean) => void;
  setClearedAt: (time: number) => void;
  setShowHelpModal: (show: boolean) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  tab, setTab, showSearch, setShowSearch, searchQuery, setSearchQuery,
  isSelectMode, setIsSelectMode, selectedIds, setSelectedIds,
  chatSound, setChatSound, setClearedAt, setShowHelpModal
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--chat-border)', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setTab('geral')} style={{ flex: 1, padding: '8px 4px', background: tab === 'geral' ? 'var(--chat-bg-secondary)' : 'transparent', color: 'var(--chat-text-primary)', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>Geral</button>
        <button onClick={() => setTab('in-game')} style={{ flex: 1, padding: '8px 4px', background: tab === 'in-game' ? 'var(--chat-bg-secondary)' : 'transparent', color: 'var(--chat-text-primary)', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>In-Game</button>
        <button onClick={() => setTab('sistema')} style={{ flex: 1, padding: '8px 4px', background: tab === 'sistema' ? 'var(--chat-bg-secondary)' : 'transparent', color: 'var(--chat-text-primary)', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>Sistema</button>
        
        {/* BUSCA */}
        <button onClick={() => setShowSearch(!showSearch)} title="Buscar no Histórico" style={{ padding: '8px', background: showSearch ? 'rgba(168,85,247,0.2)' : 'transparent', color: showSearch ? 'var(--chat-accent)' : 'var(--chat-text-secondary)', border: 'none', cursor: 'pointer' }}>
          <Search size={15} />
        </button>

        {/* GUIA DE COMANDOS (?) */}
        <button onClick={() => setShowHelpModal(true)} title="Guia Visual de Comandos (?)" style={{ padding: '8px', background: 'transparent', color: 'var(--chat-text-secondary)', border: 'none', cursor: 'pointer' }}>
          <HelpCircle size={15} />
        </button>

        {/* SELEÇÃO MULTIPLA */}
        <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds(new Set()); }} title="Modo Seleção" style={{ padding: '8px', background: isSelectMode ? 'var(--chat-accent)' : 'transparent', color: isSelectMode ? 'var(--bg-primary)' : 'var(--chat-text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
          {isSelectMode ? 'Cancelar' : 'Selecionar'}
        </button>

        {isSelectMode && selectedIds.size > 0 && (
          <button onClick={() => {
            if (confirm(`Apagar ${selectedIds.size} mensagens definitivamente para todos?`)) {
              const arr = state.chat.toArray();
              for(let i = arr.length - 1; i >= 0; i--) {
                const msg = arr[i] as any;
                if(msg.id && selectedIds.has(msg.id)) state.chat.delete(i, 1);
              }
              setSelectedIds(new Set());
              setIsSelectMode(false);
            }
          }} title="Apagar Selecionadas" style={{ padding: '8px', background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            Excluir ({selectedIds.size})
          </button>
        )}

        {/* NOTIFICAÇÃO SONORA */}
        <button onClick={() => {
          const newState = !chatSound;
          setChatSound(newState);
          localStorage.setItem('chatSound', String(newState));
        }} title="Notificações Sonoras" style={{ padding: '8px', background: 'transparent', color: chatSound ? 'var(--chat-accent)' : 'var(--chat-text-secondary)', border: 'none', cursor: 'pointer' }}>
          {chatSound ? <Bell size={15} /> : <BellOff size={15} />}
        </button>

        {/* LIMPAR CHAT */}
        <button onClick={() => { if(confirm('Limpar seu chat local?')) setClearedAt(Date.now()); }} title="Limpar Chat Local" style={{ padding: '8px', background: 'transparent', color: 'var(--warning)', border: 'none', cursor: 'pointer' }}>
          <Trash2 size={15} />
        </button>
      </div>

      {/* BARRA DE BUSCA EXPANDÍVEL */}
      {showSearch && (
        <div style={{ padding: '6px 8px', background: 'var(--chat-bg-secondary)', borderBottom: '1px solid var(--chat-border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Search size={14} style={{ color: 'var(--chat-text-secondary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar mensagem ou autor..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--chat-text-primary)', fontSize: '0.8rem', outline: 'none' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--chat-text-secondary)', cursor: 'pointer', padding: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
