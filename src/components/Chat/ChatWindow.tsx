import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { pushAdvancedChatMessage, ChatMessageOptions, getGMChatConfig } from '../../store/chat';
import { state } from '../../store';
import { Pin, X, Terminal } from 'lucide-react';
import { convertImageToWebP } from '../../utils/imageUtils';
import { toast } from '../UI/Toast';

// Components
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { PollComposerModal } from './PollComposerModal';
import { ImagePreviewModal } from './ImagePreviewModal';

// Hooks
import { useChatIdentity } from './hooks/useChatIdentity';
import { useChatState } from './hooks/useChatState';

export const ChatWindow: React.FC = () => {
  const { playerName, setPlayerName, playerColor, setPlayerColor, clientId } = useChatIdentity();
  const { messages, chatSound, setChatSound, typingPlayers, setTypingStatus } = useChatState(clientId, playerName);

  const [input, setInput] = useState('');
  const [tab, setTab] = useState<'geral' | 'in-game' | 'sistema'>('geral');
  const [pinned, setPinned] = useState<any | null>(null);
  const [clearedAt, setClearedAt] = useState<number>(0);
  
  // Selection
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals & UI States
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showIdentityPopup, setShowIdentityPopup] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isComposingPoll, setIsComposingPoll] = useState(false);
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
  
  // Interactions
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // History
  const [sentHistory, setSentHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, tab, searchQuery]);

  const lastSendTimeRef = useRef<number>(0);

  const handleInputChange = (val: string) => {
    setInput(val);
    setTypingStatus(val.trim().length > 0);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const isGM = localStorage.getItem('isGM') === 'true';
    const gmConfig = getGMChatConfig();

    if (!isGM) {
      if (gmConfig.chatLocked) {
        toast.error('🔒 O Mestre bloqueou o envio de mensagens no chat no momento.');
        return;
      }
      if (gmConfig.whispersDisabled && input.startsWith('/w ')) {
        toast.error('🤫 Sussurros privados estão desativados pelo Mestre.');
        return;
      }
      if (gmConfig.slowModeSeconds > 0) {
        const now = Date.now();
        const elapsed = (now - lastSendTimeRef.current) / 1000;
        if (elapsed < gmConfig.slowModeSeconds) {
          const wait = Math.ceil(gmConfig.slowModeSeconds - elapsed);
          toast.warn(`⏱️ Modo lento ativo. Aguarde ${wait}s para enviar outra mensagem.`);
          return;
        }
        lastSendTimeRef.current = now;
      }
    }

    setTypingStatus(false);
    
    let text = input;
    let options: ChatMessageOptions = { tipo: tab, autor: playerName, autor_color: playerColor };

    setSentHistory(prev => [...prev, text]);
    setHistoryIndex(-1);

    if (text.startsWith('/ai ') || text.startsWith('/ask ')) {
      const prompt = text.replace(/^\/(ai|ask)\s+/, '');
      pushAdvancedChatMessage(text, options);
      setInput('');
      // Trigger AI Response in chat
      setTimeout(() => {
        pushAdvancedChatMessage(`🤖 <b>AI Assistant:</b> Em resposta a "<i>${prompt}</i>"... Os ventos do destino sussurram sabedoria antiga sobre a sua jornada.`, {
          tipo: 'sistema', autor: 'AI Assistant', autor_color: '#38bdf8'
        });
      }, 1000);
      return;
    } else if (text.startsWith('/w ')) {
      const parts = text.substring(3).split(' ');
      options.alvo = parts[0];
      text = parts.slice(1).join(' ');
      options.tipo = 'whisper';
    } else if (text.startsWith('/me ')) {
      text = text.substring(4);
      options.tipo = 'me';
    } else if (text.startsWith('/as ')) {
      const match = text.match(/^\/as\s+"([^"]+)"\s+(.*)/);
      if (match) {
        options.autor_alias = match[1];
        text = match[2];
      }
    } else if (text.startsWith('/roll ') || text.startsWith('/r ')) {
      const expr = text.replace(/^\/(roll|r)\s+/, '');
      text = `Rolou: ${expr} = ${Math.floor(Math.random() * 20) + 1}`;
      options.tipo = 'in-game';
    } else if (text.startsWith('/play ')) {
      options.audioTrigger = text.replace('/play ', '');
      text = `[Tocando som: ${options.audioTrigger}]`;
    } else if (text.startsWith('/pin ')) {
      options.pinned = true;
      text = text.replace('/pin ', '');
    } else if (text.startsWith('/clear')) {
      setClearedAt(Date.now());
      setInput('');
      return;
    } else if (text.startsWith('/ping')) {
      pushAdvancedChatMessage(`🔔 PING! @${playerName} chamou a atenção de todos.`, { tipo: 'sistema', autor: 'Sistema' });
      setInput('');
      return;
    } else if (text.startsWith('/help')) {
      setShowHelpModal(true);
      setInput('');
      return;
    }

    pushAdvancedChatMessage(text, options);
    if (options.pinned) setPinned({ text, autor: playerName });
    setInput('');
  };

  const handleImageSelected = (file: File) => {
    convertImageToWebP(file, 0.75, 512).then(({ base64 }) => {
      setPendingImageBase64(base64);
    }).catch(err => console.error('Chat image compress failed', err));
  };

  const handleConfirmImageSend = (caption: string) => {
    if (!pendingImageBase64) return;
    const finalMsg = caption.trim() ? `${caption.trim()}\n[IMG]${pendingImageBase64}` : `[IMG]${pendingImageBase64}`;
    pushAdvancedChatMessage(finalMsg, { tipo: tab, autor: playerName });
    setPendingImageBase64(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    handleImageSelected(file);
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      if (m.timestamp < clearedAt) return false;
      if (tab !== 'geral' && m.tipo !== tab) return false;
      if (m.tipo === 'whisper') {
        const isTarget = m.alvo === playerName || m.alvo?.toLowerCase() === playerName.toLowerCase();
        const isSender = m.autor === playerName || m.autor_alias === playerName;
        if (!isTarget && !isSender) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = m.text?.toLowerCase().includes(q);
        const autorMatch = m.autor?.toLowerCase().includes(q) || m.autor_alias?.toLowerCase().includes(q);
        if (!textMatch && !autorMatch) return false;
      }
      return true;
    });
  }, [messages, tab, clearedAt, playerName, searchQuery]);

  return (
    <div 
      onDragOver={handleDragOver} 
      onDragLeave={handleDragLeave} 
      onDrop={handleDrop}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--chat-text-primary)', position: 'relative', background: 'var(--chat-bg-primary)' }}
    >
      {isDragging && (
        <div className="chat-drop-overlay">
          <span>Solte a imagem aqui</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(Será aberta na pré-visualização)</span>
        </div>
      )}
      
      <ChatHeader 
        tab={tab} setTab={setTab}
        showSearch={showSearch} setShowSearch={setShowSearch}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        isSelectMode={isSelectMode} setIsSelectMode={setIsSelectMode}
        selectedIds={selectedIds} setSelectedIds={setSelectedIds}
        chatSound={chatSound} setChatSound={setChatSound}
        setClearedAt={setClearedAt} setShowHelpModal={setShowHelpModal}
      />

      {pinned && (
        <div style={{ padding: '6px 10px', background: 'rgba(234, 179, 8, 0.15)', borderBottom: '1px solid #eab308', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Pin size={12} style={{ color: '#fde047' }} />
          <span><strong>Fixado:</strong> {pinned.text}</span>
          <button onClick={() => setPinned(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fde047', cursor: 'pointer' }}><X size={12}/></button>
        </div>
      )}

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {filteredMessages.map((msg, i) => (
          <MessageBubble 
            key={msg.id || i}
            msg={msg}
            playerName={playerName}
            isSelectMode={isSelectMode}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            hoveredMsgId={hoveredMsgId}
            setHoveredMsgId={setHoveredMsgId}
            setLightboxImg={setLightboxImg}
          />
        ))}
      </div>

      {typingPlayers.length > 0 && (
        <div style={{ padding: '2px 10px', fontSize: '0.65rem', color: '#a5b4fc', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>💬</span>
          <span>{typingPlayers.join(', ')} {typingPlayers.length > 1 ? 'estão' : 'está'} digitando...</span>
        </div>
      )}

      {isComposingPoll && (
        <PollComposerModal onClose={() => setIsComposingPoll(false)} playerName={playerName} />
      )}

      {pendingImageBase64 && (
        <ImagePreviewModal 
          base64={pendingImageBase64} 
          onConfirm={handleConfirmImageSend} 
          onCancel={() => setPendingImageBase64(null)} 
        />
      )}

      <ChatInput 
        input={input} setInput={handleInputChange} handleSend={handleSend}
        playerName={playerName} playerColor={playerColor}
        setPlayerName={setPlayerName} setPlayerColor={setPlayerColor}
        showIdentityPopup={showIdentityPopup} setShowIdentityPopup={setShowIdentityPopup}
        setIsComposingPoll={setIsComposingPoll} setShowHelpModal={setShowHelpModal}
        sentHistory={sentHistory} historyIndex={historyIndex} setHistoryIndex={setHistoryIndex}
        onImageSelected={handleImageSelected}
      />

      {/* GUIA DE COMANDOS VISUAL MODAL */}
      {showHelpModal && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(10,15,30,0.96)', backdropFilter: 'blur(12px)',
          zIndex: 500, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--chat-border)', paddingBottom: '8px' }}>
            <h4 style={{ margin: 0, color: 'var(--chat-accent)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
              <Terminal size={18} /> Guia de Comandos do Chat
            </h4>
            <button onClick={() => setShowHelpModal(false)} style={{ background: 'none', border: 'none', color: 'var(--chat-text-secondary)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { cmd: '/ai', desc: 'Perguntar ao AI Bot', example: '/ai Como funciona esse oráculo?' },
              { cmd: '/w', desc: 'Sussurro privado', example: '/w Nome mensagem' },
              { cmd: '/me', desc: 'Ação narrativa / emotiva', example: '/me sorri misteriosamente' },
              { cmd: '/as', desc: 'Falar como NPC / Alias', example: '/as "Guarda" Pare!' },
              { cmd: '/roll', desc: 'Rolar dados', example: '/roll 1d20+5' },
              { cmd: '/play', desc: 'Tocar efeito sonoro', example: '/play efeito.mp3' },
              { cmd: '/pin', desc: 'Fixar mensagem no topo', example: '/pin Regra importante' },
              { cmd: '/clear', desc: 'Limpar histórico local', example: '/clear' },
              { cmd: '/ping', desc: 'Chamar atenção de todos', example: '/ping' }
            ].map(c => (
              <div key={c.cmd} style={{ background: 'var(--chat-bg-secondary)', border: '1px solid var(--chat-border)', borderRadius: '6px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: 'var(--chat-accent)', fontWeight: 'bold', fontSize: '0.85rem' }}>{c.cmd} <span style={{ color: 'var(--chat-text-secondary)', fontWeight: 'normal', fontSize: '0.75rem' }}>— {c.desc}</span></div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--chat-text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>Exemplo: {c.example}</div>
                </div>
                <button
                  onClick={() => { setInput(c.cmd + ' '); setShowHelpModal(false); }}
                  style={{ padding: '4px 8px', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '4px', color: 'var(--chat-accent)', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  Usar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightboxImg && createPortal(
        <div className="chat-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setLightboxImg(null); }}
              title="Fechar Imagem"
              style={{ background: 'var(--danger)', border: 'none', color: 'var(--chat-text-primary)', cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 100000 }}
            >
              <X size={24} />
            </button>
            <img loading="lazy" decoding="async" src={lightboxImg} className="chat-lightbox-img" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
