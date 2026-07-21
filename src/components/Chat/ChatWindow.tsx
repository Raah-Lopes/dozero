import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { state } from '../../store';
import { pushAdvancedChatMessage, ChatMessageOptions, createPoll } from '../../store/chat';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import { useCastData } from '../Theater/hooks/useCastData';
import {
  Send, Pin, Volume2, User, EyeOff, Trash2, Copy, X, BarChart2, Plus,
  Bell, BellOff, Search, Settings, HelpCircle, Terminal, Check
} from 'lucide-react';
import { PollWidget } from './PollWidget';
import { convertImageToWebP } from '../../utils/imageUtils';
import { toast } from '../UI/Toast';

// ─── Comandos do Chat para Auto-Complete ──────────────────────────────────────

interface SlashCommand {
  cmd: string;
  desc: string;
  example: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: '/w',     desc: 'Sussurro privado',            example: '/w Nome mensagem' },
  { cmd: '/me',    desc: 'Ação narrativa / emotiva',    example: '/me sorri misteriosamente' },
  { cmd: '/as',    desc: 'Falar como NPC / Alias',      example: '/as "Guarda" Pare!' },
  { cmd: '/roll',  desc: 'Rolar dados',                 example: '/roll 1d20+5' },
  { cmd: '/play',  desc: 'Tocar efeito sonoro',         example: '/play efeito.mp3' },
  { cmd: '/pin',   desc: 'Fixar mensagem no topo',      example: '/pin Regra importante' },
  { cmd: '/clear', desc: 'Limpar histórico local',      example: '/clear' },
  { cmd: '/ping',  desc: 'Chamar atenção de todos',     example: '/ping' },
  { cmd: '/help',  desc: 'Ver ajuda de comandos',       example: '/help' },
];

export const ChatWindow: React.FC = () => {
  const { members } = useCastData();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || 'Jogador');
  const [playerColor, setPlayerColor] = useState(() => localStorage.getItem('playerColor') || '#a855f7');
  const [chatSound, setChatSound] = useState(() => localStorage.getItem('chatSound') !== 'false');
  const [clientId] = useState(() => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('deviceId', id);
    }
    return id;
  });
  const [tab, setTab] = useState<'geral' | 'in-game' | 'sistema'>('geral');
  const [pinned, setPinned] = useState<any | null>(null);
  const [clearedAt, setClearedAt] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Busca e Filtros
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Identity Popup (Nome e Cor)
  const [showIdentityPopup, setShowIdentityPopup] = useState(false);
  
  // Poll State
  const [isComposingPoll, setIsComposingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollIsAnonymous, setPollIsAnonymous] = useState(false);
  const [openedWhispers, setOpenedWhispers] = useState<Set<string>>(new Set());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const observer = (event: any) => {
      setMessages(state.chat.toArray());
      if (chatSound && event && event.changes && event.changes.added && event.changes.added.size > 0) {
        const arr = state.chat.toArray();
        const lastMsg = arr[arr.length - 1] as any;
        if (lastMsg && lastMsg.autor !== playerName && lastMsg.tipo !== 'sistema') {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
          } catch(e) {}
        }
      }
    };
    state.chat.observe(observer);
    setMessages(state.chat.toArray());
    return () => state.chat.unobserve(observer);
  }, [chatSound, playerName]);

  // Push local changes to state.players
  useEffect(() => {
    const current = state.players.get(clientId) as any;
    if (!current || current.name !== playerName || current.color !== playerColor) {
      state.players.set(clientId, { name: playerName, color: playerColor, isOnline: true });
    }
    localStorage.setItem('playerName', playerName);
    localStorage.setItem('playerColor', playerColor);
  }, [playerName, playerColor, clientId]);

  // Listen for GM changes
  useEffect(() => {
    const observer = () => {
      const myIdentity = state.players.get(clientId) as any;
      if (myIdentity) {
        setPlayerName(prev => (prev !== myIdentity.name ? myIdentity.name : prev));
        setPlayerColor(prev => (prev !== myIdentity.color ? myIdentity.color : prev));
      }
    };
    state.players.observe(observer);
    return () => {
      state.players.unobserve(observer);
      state.players.set(clientId, { name: playerName, color: playerColor, isOnline: false });
    };
  }, [clientId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, tab, searchQuery]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    let text = input;
    let options: ChatMessageOptions = { tipo: tab, autor: playerName, autor_color: playerColor };

    // Parse commands
    if (text.startsWith('/w ')) {
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
      const helpMsg = `**Comandos disponíveis:**<br>
      /w [nome] [msg] - Sussurro privado<br>
      /me [ação] - Ação narrativa<br>
      /as "[NPC]" [msg] - Falar como NPC<br>
      /roll [expr] - Rolar dados<br>
      /play [som] - Tocar som<br>
      /pin [msg] - Fixar mensagem<br>
      /clear - Limpar histórico<br>
      /ping - Chamar atenção<br>
      /help - Exibir esta lista`;
      pushAdvancedChatMessage(helpMsg, { tipo: 'sistema', autor: 'Sistema' });
      setInput('');
      return;
    }

    pushAdvancedChatMessage(text, options);
    if (options.pinned) setPinned({ text, autor: playerName });
    setInput('');
  };

  const handleSelectCommand = (cmdStr: string) => {
    setInput(cmdStr + ' ');
    inputRef.current?.focus();
  };

  const renderMessage = (msg: any, i: number) => {
    const isOwner = msg.autor === playerName;
    const isSelected = selectedIds.has(msg.id);
    
    // Process markdown wiki links like [[NomeDoCard]]
    let display = msg.text || '';

    // Image check
    if (display.startsWith('[IMG]')) {
      const imgSrc = display.substring(5);
      display = `<img src="${imgSrc}" class="chat-image-clickable" style="max-width: 100%; max-height: 200px; border-radius: 8px; cursor: pointer; border: 1px solid var(--glass-border);" />`;
    } else {
      display = display.replace(/\[\[(.*?)\]\]/g, (_m: string, p1: string) => {
        const parts = p1.split('|');
        const searchName = parts[0].trim();
        const label = parts[1] ? parts[1].trim() : searchName;
        return `<span class="chat-wiki-link" data-searchname="${searchName}" style="color: var(--accent-primary); text-decoration: underline; cursor: pointer; font-weight: bold;">📜 ${label}</span>`;
      });
    }

    // Avatar resolution
    const autorMember = members.find((m: any) => m.nome === msg.autor || m.nome === msg.autor_alias);
    const avatarUrl = autorMember?.imagem || autorMember?.avatar;
    const autorName = msg.autor_alias || msg.autor || 'Anônimo';

    return (
      <div 
        key={msg.id || i}
        style={{
          display: 'flex',
          gap: '8px',
          margin: '4px 0',
          padding: '6px 8px',
          background: isSelected ? 'rgba(168,85,247,0.2)' : msg.tipo === 'whisper' ? 'rgba(99,102,241,0.1)' : msg.tipo === 'sistema' ? 'rgba(0,0,0,0.2)' : 'transparent',
          borderLeft: msg.tipo === 'whisper' ? '3px solid #6366f1' : msg.tipo === 'me' ? '3px solid #ec4899' : 'none',
          borderRadius: '6px',
          cursor: isSelectMode ? 'pointer' : 'default',
          transition: 'background 0.15s',
        }}
        onClick={() => {
          if (isSelectMode && msg.id) {
            const next = new Set(selectedIds);
            if (next.has(msg.id)) next.delete(msg.id);
            else next.add(msg.id);
            setSelectedIds(next);
          }
        }}
      >
        {/* AVATAR */}
        {msg.tipo !== 'sistema' && (
          avatarUrl ? (
            <img 
              loading="lazy" decoding="async"
              src={avatarUrl} 
              alt={autorName}
              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--glass-border)' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', color: msg.autor_color || '#a855f7' }}>
              <User size={14} />
            </div>
          )
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="chat-author">
              {msg.tipo === 'whisper' ? <><EyeOff size={10} style={{ display: 'inline', marginRight: '3px' }} /> Sussurro para {msg.alvo}:</> : 
               msg.tipo === 'me' ? '' : 
               <strong style={{ color: msg.autor_color || 'inherit' }}>{autorName}</strong>}
            </span>
            <span style={{ color: '#64748b', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(msg.text);
                  toast.info('Mensagem copiada!');
                }} 
                title="Copiar mensagem"
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                <Copy size={10} />
              </button>
            </span>
          </div>

          {msg.pollId ? (
            <PollWidget pollId={msg.pollId} playerName={playerName} />
          ) : (
            <div 
              style={{ fontSize: '0.83rem', fontStyle: msg.tipo === 'me' ? 'italic' : 'normal', wordBreak: 'break-word', color: msg.tipo === 'sistema' ? '#94a3b8' : '#e2e8f0' }} 
              dangerouslySetInnerHTML={{ __html: display }} 
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.tagName === 'IMG' && target.classList.contains('chat-image-clickable')) {
                  setLightboxImg((target as HTMLImageElement).src);
                } else if (target.tagName === 'SPAN' && target.classList.contains('chat-wiki-link')) {
                  let filepath = target.getAttribute('data-filepath');
                  const searchname = target.getAttribute('data-searchname');
                  
                  if (searchname && !filepath) {
                    WikiIndexer.buildIndex().then(index => {
                      const match = index.find(entry => entry.slug.toLowerCase() === searchname.toLowerCase());
                      if (match) {
                        window.dispatchEvent(new CustomEvent('open-wiki-doc', { detail: match.path }));
                      } else {
                        toast.info(`O documento ou ficha "${searchname}" não foi encontrado na Wiki.`);
                      }
                    });
                  } else if (filepath) {
                    window.dispatchEvent(new CustomEvent('open-wiki-doc', { detail: filepath }));
                  }
                }
              }}
            />
          )}
        </div>
      </div>
    );
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    convertImageToWebP(file, 0.75, 512).then(({ base64 }) => {
      pushAdvancedChatMessage(`[IMG]${base64}`, { tipo: tab, autor: playerName });
    }).catch(err => console.error('Chat image compress failed', err));
  };

  // Comandos filtrados ao digitar "/"
  const isCommandInput = input.startsWith('/');
  const matchingCommands = isCommandInput
    ? SLASH_COMMANDS.filter(c => c.cmd.toLowerCase().startsWith(input.trim().toLowerCase()))
    : [];

  return (
    <div 
      onDragOver={handleDragOver} 
      onDragLeave={handleDragLeave} 
      onDrop={handleDrop}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)', position: 'relative' }}
    >
      {isDragging && (
        <div className="chat-drop-overlay">
          <span>Solte a imagem aqui</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(Será convertida para WebP)</span>
        </div>
      )}
      
      {/* HEADER E ABAS */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setTab('geral')} style={{ flex: 1, padding: '8px 4px', background: tab === 'geral' ? 'var(--glass-bg)' : 'transparent', color: 'var(--text-primary)', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>Geral</button>
        <button onClick={() => setTab('in-game')} style={{ flex: 1, padding: '8px 4px', background: tab === 'in-game' ? 'var(--glass-bg)' : 'transparent', color: 'var(--text-primary)', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>In-Game</button>
        <button onClick={() => setTab('sistema')} style={{ flex: 1, padding: '8px 4px', background: tab === 'sistema' ? 'var(--glass-bg)' : 'transparent', color: 'var(--text-primary)', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>Sistema</button>
        
        {/* BUSCA */}
        <button onClick={() => setShowSearch(!showSearch)} title="Buscar no Histórico" style={{ padding: '8px', background: showSearch ? 'rgba(168,85,247,0.2)' : 'transparent', color: showSearch ? '#a855f7' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
          <Search size={15} />
        </button>

        {/* SELEÇÃO MULTIPLA */}
        <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds(new Set()); }} title="Modo Seleção" style={{ padding: '8px', background: isSelectMode ? 'var(--accent-primary)' : 'transparent', color: isSelectMode ? 'var(--bg-primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
          {isSelectMode ? 'Cancelar' : 'Selecionar'}
        </button>

        {isSelectMode && selectedIds.size > 0 && (
          <button onClick={() => {
            if(confirm(`Apagar ${selectedIds.size} mensagens definitivamente para todos?`)) {
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
        }} title="Notificações Sonoras" style={{ padding: '8px', background: 'transparent', color: chatSound ? 'var(--accent-primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
          {chatSound ? <Bell size={15} /> : <BellOff size={15} />}
        </button>

        {/* LIMPAR CHAT */}
        <button onClick={() => { if(confirm('Limpar seu chat local?')) setClearedAt(Date.now()); }} title="Limpar Chat Local" style={{ padding: '8px', background: 'transparent', color: 'var(--warning)', border: 'none', cursor: 'pointer' }}>
          <Trash2 size={15} />
        </button>
      </div>

      {/* BARRA DE BUSCA EXPANDÍVEL */}
      {showSearch && (
        <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Search size={14} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar mensagem ou autor..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* MENSAGEM FIXADA */}
      {pinned && (
        <div style={{ padding: '6px 10px', background: 'rgba(234, 179, 8, 0.15)', borderBottom: '1px solid #eab308', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Pin size={12} style={{ color: '#fde047' }} />
          <span><strong>Fixado:</strong> {pinned.text}</span>
        </div>
      )}

      {/* LISTA DE MENSAGENS */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {React.useMemo(() => {
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
          }).map((msg, i) => renderMessage(msg, i));
        }, [messages, tab, clearedAt, playerName, isSelectMode, selectedIds, openedWhispers, searchQuery])}
      </div>

      {/* PALETA DE COMANDOS INTELIGENTE (POPOVER AO DIGITAR "/") */}
      {isCommandInput && matchingCommands.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '50px', left: '8px', right: '8px',
          background: 'rgba(10,15,30,0.97)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(168,85,247,0.4)', borderRadius: '8px',
          padding: '6px', boxShadow: '0 -10px 25px rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '180px', overflowY: 'auto'
        }}>
          <div style={{ fontSize: '0.62rem', color: '#a855f7', fontWeight: 'bold', padding: '2px 6px', textTransform: 'uppercase' }}>
            Comandos Rápidos (/):
          </div>
          {matchingCommands.map(item => (
            <button
              key={item.cmd}
              onClick={() => handleSelectCommand(item.cmd)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 8px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid transparent', borderRadius: '4px', cursor: 'pointer',
                color: '#e2e8f0', fontSize: '0.75rem', textAlign: 'left'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            >
              <span style={{ fontWeight: 'bold', color: '#f0abfc' }}>{item.cmd}</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{item.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* BARRA INFERIOR DE INPUT & IDENTIDADE */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--glass-border)', position: 'relative' }}>
        
        {/* COMPOSIÇÃO DE ENQUETE */}
        {isComposingPoll ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Nova Enquete</span>
              <button onClick={() => setIsComposingPoll(false)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            
            <input 
              value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
              placeholder="Sua pergunta..."
              style={{ padding: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '4px', fontSize: '0.85rem' }}
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {pollOptions.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '4px' }}>
                  <input 
                    value={opt} onChange={e => { const newOpts = [...pollOptions]; newOpts[idx] = e.target.value; setPollOptions(newOpts); }}
                    placeholder={`Opção ${idx + 1}`}
                    style={{ flex: 1, padding: '4px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '4px', fontSize: '0.8rem' }}
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => { const newOpts = [...pollOptions]; newOpts.splice(idx, 1); setPollOptions(newOpts); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><X size={14} /></button>
                  )}
                </div>
              ))}
              <button onClick={() => setPollOptions([...pollOptions, ''])} style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <Plus size={12} /> Adicionar Opção
              </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={pollIsAnonymous} onChange={e => setPollIsAnonymous(e.target.checked)} />
                Voto Anônimo
              </label>
              <button 
                onClick={() => {
                  const validOpts = pollOptions.filter(o => o.trim() !== '');
                  if (pollQuestion.trim() && validOpts.length >= 2) {
                    createPoll(pollQuestion.trim(), validOpts, pollIsAnonymous, playerName);
                    setPollQuestion('');
                    setPollOptions(['', '']);
                    setIsComposingPoll(false);
                  } else {
                    toast.info('Preencha a pergunta e no mínimo 2 opções.');
                  }
                }} 
                style={{ padding: '6px 12px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Enviar Enquete
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            
            {/* BOTÃO DE CONFIGURAÇÃO DE NOME E COR */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowIdentityPopup(!showIdentityPopup)}
                title={`Identidade do Chat: ${playerName}`}
                style={{
                  width: '32px', height: '32px', padding: 0,
                  background: 'rgba(0,0,0,0.4)', border: `2px solid ${playerColor}`,
                  borderRadius: '6px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: playerColor
                }}
              >
                <User size={16} />
              </button>

              {/* POPUP DE IDENTIDADE (NOME & COR) */}
              {showIdentityPopup && (
                <div style={{
                  position: 'absolute', bottom: '40px', left: 0,
                  background: 'rgba(10,15,30,0.97)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                  padding: '10px', boxShadow: '0 8px 25px rgba(0,0,0,0.6)', zIndex: 200,
                  display: 'flex', flexDirection: 'column', gap: '8px', width: '180px'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold' }}>Sua Identidade no Chat:</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={playerColor}
                      onChange={(e) => setPlayerColor(e.target.value)}
                      title="Cor do seu nome"
                      style={{ width: '28px', height: '28px', padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px' }}
                    />
                    <input 
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Seu nome"
                      style={{ flex: 1, padding: '4px 6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: playerColor, borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}
                    />
                  </div>
                  <button
                    onClick={() => setShowIdentityPopup(false)}
                    style={{ padding: '4px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '4px', color: '#a5b4fc', fontSize: '0.7rem', cursor: 'pointer' }}
                  >
                    Pronto
                  </button>
                </div>
              )}
            </div>

            {/* INPUT DE MENSAGEM PRINCIPAL */}
            <input 
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite mensagem ou /comando..."
              style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '4px', fontSize: '0.85rem' }}
            />

            {/* CRIAR ENQUETE */}
            <button onClick={() => setIsComposingPoll(true)} title="Criar Enquete" style={{ padding: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <BarChart2 size={16} />
            </button>

            {/* ENVIAR */}
            <button onClick={handleSend} title="Enviar Mensagem" style={{ padding: '8px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <Send size={16} />
            </button>
          </div>
        )}
      </div>

      {/* LIGHTBOX PORTAL */}
      {lightboxImg && createPortal(
        <div className="chat-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setLightboxImg(null); }}
              title="Fechar Imagem"
              style={{ background: 'var(--danger)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 100000 }}
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
