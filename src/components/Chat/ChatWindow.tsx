import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { state } from '../../store';
import { pushAdvancedChatMessage, ChatMessageOptions, createPoll } from '../../store/chat';
import { useP2PNetwork } from '../../hooks/useP2PNetwork';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import { Send, Pin, Volume2, User, EyeOff, Hash, Trash2, Copy, X, BarChart2, Plus } from 'lucide-react';
import { PollWidget } from './PollWidget';

export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [playerName, setPlayerName] = useState('Jogador');
  const [tab, setTab] = useState<'geral' | 'in-game' | 'sistema'>('geral');
  const [pinned, setPinned] = useState<any | null>(null);
  const [clearedAt, setClearedAt] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  
  // Poll State
  const [isComposingPoll, setIsComposingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollIsAnonymous, setPollIsAnonymous] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // You can set roomId and player info based on your app state
  const { broadcastMessage } = useP2PNetwork('main-room', true, 'Host', (msg) => {
    if (msg.type === 'ping') {
      alert('PING! Alguém chamou sua atenção.');
    } else if (msg.type === 'chat') {
      // Handled by Yjs usually, but we can do custom logic
    }
  });

  useEffect(() => {
    const observer = () => setMessages(state.chat.toArray());
    state.chat.observe(observer);
    setMessages(state.chat.toArray());
    return () => state.chat.unobserve(observer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, tab]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    let text = input;
    let options: ChatMessageOptions = { tipo: tab, autor: playerName };

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
      text = `Rolou: ${expr} = ${Math.floor(Math.random() * 20) + 1}`; // mock roll
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
      broadcastMessage({ type: 'ping' });
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
      /help - Mostrar esta lista`;
      pushAdvancedChatMessage(helpMsg, { tipo: 'sistema', autor: 'Sistema' });
      setInput('');
      return;
    }

    pushAdvancedChatMessage(text, options);
    
    if (options.pinned) {
      setPinned({ text, options });
    }
    
    setInput('');
  };

  const renderMessage = (msg: any, i: number) => {
    // Basic Markdown logic (bold, italic)
    let display = msg.text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>');
      
    // Image URL logic
    if (display.match(/(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/i)) {
      display = display.replace(/(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/i, '<img src="$1" class="chat-image-clickable" style="max-width: 150px; max-height: 150px; object-fit: cover; border-radius: 4px; margin-top: 4px;" />');
    }

    // Mention logic
    display = display.replace(/@(\w+)/g, '<span style="color: #facc15; font-weight: bold;">@$1</span>');

    // Tooltip logic [Type:Name:Description]
    display = display.replace(/\[([^:]+):([^:]+):([^\]]+)\]/g, '<span class="chat-tooltip" data-tooltip="$3">🔗 $2</span>');

    // Ficha / Wiki Doc logic [Ficha:Name:Filepath]
    display = display.replace(/\[Ficha:([^:]+):([^\]]+)\]/gi, '<span class="chat-wiki-link" data-filepath="$2">📝 $1</span>');
    
    // Simplifed Ficha logic: "ficha: nome do personagem"
    display = display.replace(/\bficha:\s*([^\.,!?;<]+)/gi, (match, p1) => {
      const name = p1.trim();
      return `<span class="chat-wiki-link" data-searchname="${name}">📝 ${name}</span>`;
    });

    // Drag-drop image logic
    if (display.startsWith('[IMG]')) {
      const b64 = display.substring(5);
      display = `<img src="${b64}" class="chat-image-clickable" style="max-width: 150px; max-height: 150px; object-fit: cover; border-radius: 4px; margin-top: 4px; border: 1px solid var(--glass-border);" />`;
    }

    const autorName = msg.autor_alias || msg.autor;
    let bubbleClass = 'chat-bubble-player';
    if (msg.tipo === 'sistema') bubbleClass = 'chat-bubble-system';
    if (msg.autor_alias) bubbleClass = 'chat-bubble-npc';

    return (
      <div key={i} className={bubbleClass} style={{ marginBottom: '8px', padding: '6px', borderRadius: '4px', display: 'flex', gap: '8px' }}>
        {isSelectMode && msg.id && (
          <input 
            type="checkbox" 
            checked={selectedIds.has(msg.id)} 
            onChange={(e) => {
              const next = new Set(selectedIds);
              if(e.target.checked) next.add(msg.id);
              else next.delete(msg.id);
              setSelectedIds(next);
            }} 
            style={{ marginTop: '4px', cursor: 'pointer', transform: 'scale(1.2)' }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
            <span className="chat-author">
            {msg.tipo === 'whisper' ? <><EyeOff size={10} style={{display:'inline'}}/> Whisper to {msg.alvo}:</> : 
             msg.tipo === 'me' ? '' : 
             <strong>{autorName}</strong>}
          </span>
          <span style={{color: 'gray', display: 'flex', alignItems: 'center'}}>
            {new Date(msg.timestamp).toLocaleTimeString()}
            <button 
              onClick={() => navigator.clipboard.writeText(msg.text)} 
              title="Copiar mensagem"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: '4px', padding: 0 }}
            >
              <Copy size={10} />
            </button>
          </span>
        </div>
          {msg.pollId ? (
            <PollWidget pollId={msg.pollId} playerName={playerName} />
          ) : (
            <div 
              style={{ fontSize: '0.85rem', fontStyle: msg.tipo === 'me' ? 'italic' : 'normal' }} 
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
                      alert(`O documento ou ficha "${searchname}" não foi encontrado na Wiki.`);
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
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > 800) { height = Math.round((height * 800) / width); width = 800; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if(ctx) ctx.drawImage(img, 0, 0, width, height);
        const webp = canvas.toDataURL('image/webp', 0.8);
        pushAdvancedChatMessage(`[IMG]${webp}`, { tipo: tab, autor: playerName });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      onDragOver={handleDragOver} 
      onDragLeave={handleDragLeave} 
      onDrop={handleDrop}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'white', position: 'relative' }}
    >
      {isDragging && (
        <div className="chat-drop-overlay">
          <span>Solte a imagem aqui</span>
          <span style={{fontSize: '0.8rem', opacity: 0.7}}>(Será convertida para WebP)</span>
        </div>
      )}
      
      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', alignItems: 'center' }}>
        <button onClick={() => setTab('geral')} style={{ flex: 1, padding: '8px', background: tab === 'geral' ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'white', border: 'none' }}>Geral</button>
        <button onClick={() => setTab('in-game')} style={{ flex: 1, padding: '8px', background: tab === 'in-game' ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'white', border: 'none' }}>In-Game</button>
        <button onClick={() => setTab('sistema')} style={{ flex: 1, padding: '8px', background: tab === 'sistema' ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'white', border: 'none' }}>Sistema</button>
        
        <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds(new Set()); }} title="Modo Seleção" style={{ padding: '8px', background: isSelectMode ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
          {isSelectMode ? 'Cancelar' : 'Selecionar'}
        </button>
        {isSelectMode && selectedIds.size > 0 && (
          <button onClick={() => {
            if(confirm(`Apagar ${selectedIds.size} mensagens definitivamente para todos?`)) {
              const arr = state.chat.toArray();
              for(let i = arr.length - 1; i >= 0; i--) {
                if(arr[i].id && selectedIds.has(arr[i].id)) state.chat.delete(i, 1);
              }
              setSelectedIds(new Set());
              setIsSelectMode(false);
            }
          }} title="Apagar Selecionadas" style={{ padding: '8px', background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            Excluir ({selectedIds.size})
          </button>
        )}

        <button onClick={() => { if(confirm('Limpar seu chat local?')) setClearedAt(Date.now()); }} title="Limpar Chat Local" style={{ padding: '8px', background: 'transparent', color: 'var(--warning)', border: 'none', cursor: 'pointer' }}>
          <Trash2 size={16} />
        </button>
      </div>

      {/* PINNED MESSAGE */}
      {pinned && (
        <div style={{ padding: '8px', background: 'rgba(234, 179, 8, 0.2)', borderBottom: '1px solid #eab308' }}>
          <Pin size={12} style={{ marginRight: '4px' }} /> <strong>Fixado:</strong> {pinned.text}
        </div>
      )}

      {/* MESSAGES */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {messages.filter(m => m.timestamp >= clearedAt && (tab === 'geral' ? true : m.tipo === tab)).map((msg, i) => renderMessage(msg, i))}
      </div>

      {/* INPUT */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--glass-border)' }}>
        {isComposingPoll ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>📊 Nova Votação</strong>
              <button onClick={() => setIsComposingPoll(false)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            
            <input 
              value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
              placeholder="Sua pergunta..."
              style={{ padding: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {pollOptions.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '4px' }}>
                  <input 
                    value={opt} onChange={e => { const newOpts = [...pollOptions]; newOpts[idx] = e.target.value; setPollOptions(newOpts); }}
                    placeholder={`Opção ${idx + 1}`}
                    style={{ flex: 1, padding: '4px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}
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
                    alert('Preencha a pergunta e no mínimo 2 opções.');
                  }
                }} 
                style={{ padding: '6px 12px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Enviar Enquete
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '4px' }}>
            <input 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Nome"
              title="Seu nome no chat"
              style={{ width: '80px', padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'var(--accent-primary)', borderRadius: '4px', fontWeight: 'bold' }}
            />
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Mensagem ou /comando..."
              style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}
            />
            <button onClick={() => setIsComposingPoll(true)} title="Criar Enquete" style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
              <BarChart2 size={16} />
            </button>
            <button onClick={handleSend} style={{ padding: '8px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
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
              style={{ background: 'var(--danger)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 100000 }}
            >
              <X size={24} />
            </button>
            <img src={lightboxImg} className="chat-lightbox-img" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
