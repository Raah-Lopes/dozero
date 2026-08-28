import React, { useState, useEffect } from 'react';
import { Search, HelpCircle, Bell, BellOff, Trash2, X, Download, Shield, User as UserIcon, UserCheck } from 'lucide-react';
import { state, useIsGM } from '../../store';
import { updateGMChatConfig, getGMChatConfig, GMChatConfig } from '../../store/chat';
import { toast } from '../UI/Toast';
import { useAuthStore } from '../../store/authStore';
import { formatChatAsMarkdown } from '../../services/chatCloudService';
import { useVoiceStore } from '../../store/voiceStore';

export type ChatMainTab = 'chat' | 'combate';

interface ChatHeaderProps {
  mainTab: ChatMainTab;
  setMainTab: (tab: ChatMainTab) => void;
  subTab: 'geral' | 'in-game' | 'sistema';
  setSubTab: (tab: 'geral' | 'in-game' | 'sistema') => void;
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
  mainTab, setMainTab, subTab, setSubTab, showSearch, setShowSearch, searchQuery, setSearchQuery,
  isSelectMode, setIsSelectMode, selectedIds, setSelectedIds,
  chatSound, setChatSound, setClearedAt, setShowHelpModal
}) => {
  const { user, setAuthModalOpen, setProfileModalOpen } = useAuthStore();
  const [showGMChatMenu, setShowGMChatMenu] = useState(false);
  const [gmConfig, setGmConfig] = useState<GMChatConfig>(() => getGMChatConfig());

  const userAvatar = user?.user_metadata?.custom_avatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const userName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Convidado');

  useEffect(() => {
    const handler = () => setGmConfig(getGMChatConfig());
    state.chatConfig?.observe(handler);
    return () => state.chatConfig?.unobserve(handler);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', boxSizing: 'border-box', background: 'var(--chat-bg-primary)' }}>
      {/* ─── ABAS PRINCIPAIS SUPERIORES (CHAT / COMBATE) ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#18110b',
        borderBottom: '1px solid rgba(90, 66, 52, 0.7)',
        padding: '4px 6px',
        gap: '4px'
      }}>
        <button
          onClick={() => setMainTab('chat')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '6px 4px',
            background: mainTab === 'chat' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
            border: `1px solid ${mainTab === 'chat' ? 'rgba(168, 85, 247, 0.5)' : 'transparent'}`,
            borderRadius: '6px',
            color: mainTab === 'chat' ? '#e9d5ff' : '#a1a1aa',
            fontSize: '0.75rem',
            fontWeight: mainTab === 'chat' ? 700 : 500,
            cursor: 'pointer'
          }}
        >
          <span>💬</span> Chat da Mesa
        </button>

        <button
          onClick={() => setMainTab('combate')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '6px 4px',
            background: mainTab === 'combate' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            border: `1px solid ${mainTab === 'combate' ? 'rgba(239, 68, 68, 0.5)' : 'transparent'}`,
            borderRadius: '6px',
            color: mainTab === 'combate' ? '#fca5a5' : '#a1a1aa',
            fontSize: '0.75rem',
            fontWeight: mainTab === 'combate' ? 700 : 500,
            cursor: 'pointer'
          }}
        >
          <span>⚔️</span> Registro de Combate
        </button>
      </div>

      {/* ─── SUB-BARRA DE AÇÕES E CANAIS ─── */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--chat-border)', alignItems: 'center',
        flexWrap: 'wrap', gap: '2px', padding: '4px', width: '100%', maxWidth: '100%', boxSizing: 'border-box'
      }}>
        {/* SUB-CANAIS DE TEXTO (Apenas quando mainTab === 'chat') */}
        {mainTab === 'chat' && (
          <div style={{ display: 'flex', flex: '1 1 120px', minWidth: '100px', gap: '2px' }}>
            <button
              onClick={() => setSubTab('geral')}
              style={{
                flex: 1, minWidth: 0, padding: '4px 3px',
                background: subTab === 'geral' ? 'var(--chat-bg-secondary)' : 'transparent',
                color: subTab === 'geral' ? 'var(--chat-accent)' : 'var(--chat-text-secondary)',
                border: 'none', fontSize: '0.72rem', cursor: 'pointer',
                borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontWeight: subTab === 'geral' ? 'bold' : 'normal'
              }}
            >
              Geral
            </button>
            <button
              onClick={() => setSubTab('in-game')}
              style={{
                flex: 1, minWidth: 0, padding: '4px 3px',
                background: subTab === 'in-game' ? 'var(--chat-bg-secondary)' : 'transparent',
                color: subTab === 'in-game' ? 'var(--chat-accent)' : 'var(--chat-text-secondary)',
                border: 'none', fontSize: '0.72rem', cursor: 'pointer',
                borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontWeight: subTab === 'in-game' ? 'bold' : 'normal'
              }}
            >
              In-Game
            </button>
            <button
              onClick={() => setSubTab('sistema')}
              style={{
                flex: 1, minWidth: 0, padding: '4px 3px',
                background: subTab === 'sistema' ? 'var(--chat-bg-secondary)' : 'transparent',
                color: subTab === 'sistema' ? 'var(--chat-accent)' : 'var(--chat-text-secondary)',
                border: 'none', fontSize: '0.72rem', cursor: 'pointer',
                borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontWeight: subTab === 'sistema' ? 'bold' : 'normal'
              }}
            >
              Sistema
            </button>
          </div>
        )}
        
        {/* ACTIONS BAR - Flex shrink 0 so icons stay intact on narrow widths */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto', flexShrink: 0, flexWrap: 'wrap' }}>
          
          {/* USER ACCOUNT / PROFILE SHORTCUT */}
          <button
            onClick={() => {
              if (user) {
                setProfileModalOpen(true);
              } else {
                setAuthModalOpen(true);
              }
            }}
            title={user ? `Meu Perfil (${userName})` : "Fazer Login / Criar Conta"}
            style={{
              padding: '3px 6px',
              background: user ? 'rgba(16, 185, 129, 0.15)' : 'rgba(168, 85, 247, 0.15)',
              border: `1px solid ${user ? 'rgba(16, 185, 129, 0.4)' : 'rgba(168, 85, 247, 0.3)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: user ? '#86efac' : '#c084fc',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}
          >
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt="Avatar" 
                style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : user ? (
              <UserCheck size={12} />
            ) : (
              <UserIcon size={12} />
            )}
            <span>{user ? userName.split(' ')[0] : 'Entrar'}</span>
          </button>

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

          {/* EXPORTAR CHAT EM MARKDOWN */}
          <button
            onClick={() => {
              const currentRoom = new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2';
              const md = formatChatAsMarkdown(state.chat.toArray(), currentRoom);
              const blob = new Blob([md], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `chat_log_${currentRoom}_${new Date().toISOString().slice(0, 10)}.md`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Log do chat exportado em Markdown!');
            }}
            title="Exportar Log do Chat (.MD)"
            style={{ padding: '6px', background: 'transparent', color: 'var(--chat-text-secondary)', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            <Download size={14} />
          </button>

          {/* PAINEL DO MESTRE DO CHAT */}
          {useIsGM() && (
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
