import React, { useState, useEffect } from 'react';
import { Search, HelpCircle, Bell, BellOff, Trash2, X, Download, Shield } from 'lucide-react';
import { state } from '../../store';
import { updateGMChatConfig, getGMChatConfig, GMChatConfig } from '../../store/chat';
import { toast } from '../UI/Toast';

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
  const [showGMChatMenu, setShowGMChatMenu] = useState(false);
  const [gmConfig, setGmConfig] = useState<GMChatConfig>(() => getGMChatConfig());

  useEffect(() => {
    const handler = () => setGmConfig(getGMChatConfig());
    state.chatConfig?.observe(handler);
    return () => state.chatConfig?.unobserve(handler);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--chat-border)', alignItems: 'center',
        flexWrap: 'wrap', gap: '2px', padding: '4px', width: '100%', maxWidth: '100%', boxSizing: 'border-box'
      }}>
        {/* TAB BUTTONS - Auto-wrap & shrink gracefully when window is narrow */}
        <div style={{ display: 'flex', flex: '1 1 140px', minWidth: '120px', gap: '2px' }}>
          <button
            onClick={() => setTab('geral')}
            style={{
              flex: 1, minWidth: 0, padding: '6px 4px',
              background: tab === 'geral' ? 'var(--chat-bg-secondary)' : 'transparent',
              color: 'var(--chat-text-primary)', border: 'none', fontSize: '0.75rem', cursor: 'pointer',
              borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontWeight: tab === 'geral' ? 'bold' : 'normal'
            }}
          >
            Geral
          </button>
          <button
            onClick={() => setTab('in-game')}
            style={{
              flex: 1, minWidth: 0, padding: '6px 4px',
              background: tab === 'in-game' ? 'var(--chat-bg-secondary)' : 'transparent',
              color: 'var(--chat-text-primary)', border: 'none', fontSize: '0.75rem', cursor: 'pointer',
              borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontWeight: tab === 'in-game' ? 'bold' : 'normal'
            }}
          >
            In-Game
          </button>
          <button
            onClick={() => setTab('sistema')}
            style={{
              flex: 1, minWidth: 0, padding: '6px 4px',
              background: tab === 'sistema' ? 'var(--chat-bg-secondary)' : 'transparent',
              color: 'var(--chat-text-primary)', border: 'none', fontSize: '0.75rem', cursor: 'pointer',
              borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontWeight: tab === 'sistema' ? 'bold' : 'normal'
            }}
          >
            Sistema
          </button>
        </div>
        
        {/* ACTIONS BAR - Flex shrink 0 so icons stay intact on narrow widths */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto', flexShrink: 0, flexWrap: 'wrap' }}>
          {/* BUSCA */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Buscar no Histórico"
            style={{ padding: '6px', background: showSearch ? 'rgba(168,85,247,0.2)' : 'transparent', color: showSearch ? 'var(--chat-accent)' : 'var(--chat-text-secondary)', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            <Search size={14} />
          </button>

          {/* GUIA DE COMANDOS (?) */}
          <button
            onClick={() => setShowHelpModal(true)}
            title="Guia Visual de Comandos (?)"
            style={{ padding: '6px', background: 'transparent', color: 'var(--chat-text-secondary)', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            <HelpCircle size={14} />
          </button>

          {/* SELEÇÃO MULTIPLA */}
          <button
            onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds(new Set()); }}
            title="Modo Seleção"
            style={{ padding: '4px 6px', background: isSelectMode ? 'var(--chat-accent)' : 'transparent', color: isSelectMode ? 'var(--bg-primary)' : 'var(--chat-text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.7rem', borderRadius: '4px' }}
          >
            {isSelectMode ? 'Cancelar' : 'Sel.'}
          </button>

          {isSelectMode && selectedIds.size > 0 && (
            <button
              onClick={() => {
                if (confirm(`Apagar ${selectedIds.size} mensagens definitivamente para todos?`)) {
                  const arr = state.chat.toArray();
                  for (let i = arr.length - 1; i >= 0; i--) {
                    const msg = arr[i] as any;
                    if (msg.id && selectedIds.has(msg.id)) state.chat.delete(i, 1);
                  }
                  setSelectedIds(new Set());
                  setIsSelectMode(false);
                }
              }}
              title="Apagar Selecionadas"
              style={{ padding: '4px 6px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem', borderRadius: '4px' }}
            >
              Excluir ({selectedIds.size})
            </button>
          )}

          {/* NOTIFICAÇÃO SONORA */}
          <button
            onClick={() => {
              const newState = !chatSound;
              setChatSound(newState);
              localStorage.setItem('chatSound', String(newState));
            }}
            title="Notificações Sonoras"
            style={{ padding: '6px', background: 'transparent', color: chatSound ? 'var(--chat-accent)' : 'var(--chat-text-secondary)', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            {chatSound ? <Bell size={14} /> : <BellOff size={14} />}
          </button>

          {/* PAINEL DO MESTRE DO CHAT */}
          {localStorage.getItem('isGM') === 'true' && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowGMChatMenu(!showGMChatMenu)}
                title="Controles do Chat (Mestre)"
                style={{ padding: '6px', background: showGMChatMenu ? 'rgba(239,68,68,0.2)' : 'transparent', color: showGMChatMenu ? 'var(--danger)' : 'var(--chat-text-secondary)', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              >
                <Shield size={14} />
              </button>

              {showGMChatMenu && (
                <div style={{
                  position: 'absolute', top: '30px', right: 0,
                  background: 'var(--chat-bg-primary)', backdropFilter: 'blur(12px)',
                  border: '1px solid var(--chat-border)', borderRadius: '8px',
                  padding: '10px', boxShadow: '0 8px 25px rgba(0,0,0,0.6)', zIndex: 300,
                  display: 'flex', flexDirection: 'column', gap: '8px', width: '220px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--chat-accent)', fontWeight: 'bold', borderBottom: '1px solid var(--chat-border)', paddingBottom: '4px' }}>
                    🛡️ Gerenciamento do Mestre:
                  </div>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={gmConfig.chatLocked || false}
                      onChange={e => {
                        updateGMChatConfig({ chatLocked: e.target.checked });
                        setGmConfig(getGMChatConfig());
                        toast.info(e.target.checked ? '🔒 Chat bloqueado para jogadores!' : '🔓 Chat liberado!');
                      }}
                    />
                    <span>🔒 Bloquear Chat (Somente Mestre)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={gmConfig.whispersDisabled || false}
                      onChange={e => {
                        updateGMChatConfig({ whispersDisabled: e.target.checked });
                        setGmConfig(getGMChatConfig());
                        toast.info(e.target.checked ? '🤫 Sussurros desativados!' : '💬 Sussurros liberados!');
                      }}
                    />
                    <span>🤫 Desativar Sussurros</span>
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--chat-text-secondary)' }}>⏱️ Modo Lento (Cooldown):</span>
                    <select
                      value={gmConfig.slowModeSeconds || 0}
                      onChange={e => {
                        const sec = parseInt(e.target.value, 10);
                        updateGMChatConfig({ slowModeSeconds: sec });
                        setGmConfig(getGMChatConfig());
                        toast.info(sec > 0 ? `⏱️ Cooldown de ${sec}s ativado!` : '⏱️ Modo lento desativado.');
                      }}
                      style={{ padding: '4px', background: 'var(--chat-bg-secondary)', border: '1px solid var(--chat-border)', color: 'var(--chat-text-primary)', borderRadius: '4px', fontSize: '0.75rem' }}
                    >
                      <option value={0}>Sem Cooldown (Desativado)</option>
                      <option value={3}>3 segundos</option>
                      <option value={5}>5 segundos</option>
                      <option value={10}>10 segundos</option>
                      <option value={30}>30 segundos</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EXPORTAR CHAT */}
          <button
            onClick={() => {
              const arr = state.chat.toArray();
              if (arr.length === 0) {
                toast.info('Nenhuma mensagem para exportar.');
                return;
              }
              const lines = arr.map((m: any) => {
                const date = new Date(m.timestamp || Date.now()).toLocaleTimeString();
                const autor = m.autor_alias || m.autor || 'Anônimo';
                return `[${date}] ${autor}: ${m.text || ''}`;
              }).join('\n');
              const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Chat_DOZERO_${new Date().toISOString().slice(0, 10)}.txt`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Histórico do chat exportado!');
            }}
            title="Exportar Histórico (.txt)"
            style={{ padding: '6px', background: 'transparent', color: 'var(--chat-text-secondary)', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            <Download size={14} />
          </button>

          {/* LIMPAR CHAT */}
          <button
            onClick={() => { if (confirm('Limpar seu chat local?')) setClearedAt(Date.now()); }}
            title="Limpar Chat Local"
            style={{ padding: '6px', background: 'transparent', color: 'var(--warning)', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* BARRA DE BUSCA EXPANDÍVEL */}
      {showSearch && (
        <div style={{ padding: '6px 8px', background: 'var(--chat-bg-secondary)', borderBottom: '1px solid var(--chat-border)', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
          <Search size={14} style={{ color: 'var(--chat-text-secondary)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar mensagem ou autor..."
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: 'var(--chat-text-primary)', fontSize: '0.8rem', outline: 'none' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--chat-text-secondary)', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
