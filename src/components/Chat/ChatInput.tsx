import React, { useState, useRef, useEffect } from 'react';
import { User, Mic, MicOff, BarChart2, Send, BookOpen, Image as ImageIcon } from 'lucide-react';
import { toast } from '../UI/Toast';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';

interface SlashCommand {
  cmd: string;
  desc: string;
  example: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: '/ai',    desc: 'Perguntar ao AI Bot',         example: '/ai Como funciona este oráculo?' },
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

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  handleSend: () => void;
  playerName: string;
  playerColor: string;
  setPlayerName: (val: string) => void;
  setPlayerColor: (val: string) => void;
  showIdentityPopup: boolean;
  setShowIdentityPopup: (show: boolean) => void;
  setIsComposingPoll: (show: boolean) => void;
  setShowHelpModal: (show: boolean) => void;
  sentHistory: string[];
  historyIndex: number;
  setHistoryIndex: (idx: number) => void;
  onImageSelected: (file: File) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input, setInput, handleSend,
  playerName, playerColor, setPlayerName, setPlayerColor,
  showIdentityPopup, setShowIdentityPopup,
  setIsComposingPoll, setShowHelpModal,
  sentHistory, historyIndex, setHistoryIndex, onImageSelected
}) => {
  const [isListening, setIsListening] = useState(false);
  
  // Auto-Complete Wiki [[
  const [wikiEntries, setWikiEntries] = useState<any[]>([]);
  const [showWikiAutoComplete, setShowWikiAutoComplete] = useState(false);
  const [wikiSearchTerm, setWikiSearchTerm] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    WikiIndexer.buildIndex().then(index => {
      setWikiEntries(index || []);
    }).catch(() => {});
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    const wikiMatch = val.match(/\[\[([^\]]*)$/);
    if (wikiMatch) {
      setShowWikiAutoComplete(true);
      setWikiSearchTerm(wikiMatch[1]);
    } else {
      setShowWikiAutoComplete(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
      setShowWikiAutoComplete(false);
    } else if (e.key === 'Escape') {
      setShowIdentityPopup(false);
      setShowWikiAutoComplete(false);
      setShowHelpModal(false);
    } else if (e.key === 'ArrowUp' && input === '' && sentHistory.length > 0) {
      e.preventDefault();
      const nextIdx = historyIndex < sentHistory.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIdx);
      setInput(sentHistory[sentHistory.length - 1 - nextIdx] || '');
    } else if (e.key === 'ArrowDown' && historyIndex >= 0) {
      e.preventDefault();
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      if (nextIdx < 0) setInput('');
      else setInput(sentHistory[sentHistory.length - 1 - nextIdx] || '');
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.warn('Reconhecimento de voz não suportado neste navegador.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    setIsListening(true);
    toast.info('🎙️ Ouvindo... Fale agora.');

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
      toast.success('Voz capturada!');
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Erro ao capturar voz.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSelectCommand = (cmdStr: string) => {
    setInput(cmdStr + ' ');
    setShowWikiAutoComplete(false);
    inputRef.current?.focus();
  };

  const handleSelectWikiEntry = (title: string) => {
    setInput(prev => prev.replace(/\[\[([^\]]*)$/, `[[${title}]] `));
    setShowWikiAutoComplete(false);
    inputRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isCommandInput = input.startsWith('/');
  const matchingCommands = isCommandInput
    ? SLASH_COMMANDS.filter(c => c.cmd.toLowerCase().startsWith(input.trim().toLowerCase()))
    : [];

  const matchingWiki = showWikiAutoComplete
    ? wikiEntries.filter(w => (w.title || w.slug || '').toLowerCase().includes(wikiSearchTerm.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div style={{ padding: '6px 8px', borderTop: '1px solid var(--chat-border)', position: 'relative', width: '100%', boxSizing: 'border-box' }}>
      
      {/* AUTO-COMPLETE WIKI [[ */}
      {showWikiAutoComplete && matchingWiki.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '50px', left: '8px', right: '8px',
          background: 'var(--chat-bg-primary)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(59,130,246,0.4)', borderRadius: '8px',
          padding: '6px', boxShadow: '0 -10px 25px rgba(0,0,0,0.6)', zIndex: 110,
          display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '160px', overflowY: 'auto'
        }}>
          <div style={{ fontSize: '0.62rem', color: '#60a5fa', fontWeight: 'bold', padding: '2px 6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <BookOpen size={10} /> Linkar Página da Wiki ([[):
          </div>
          {matchingWiki.map((entry: any) => (
            <button
              key={entry.path || entry.title}
              onClick={() => handleSelectWikiEntry(entry.title || entry.slug)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid transparent', borderRadius: '4px', cursor: 'pointer',
                color: 'var(--chat-text-primary)', fontSize: '0.75rem', textAlign: 'left'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            >
              <span style={{ color: '#93c5fd', fontWeight: 'bold' }}>📜 {entry.title || entry.slug}</span>
            </button>
          ))}
        </div>
      )}

      {/* PALETA DE COMANDOS INTELIGENTE (POPOVER AO DIGITAR "/") */}
      {isCommandInput && matchingCommands.length > 0 && !showWikiAutoComplete && (
        <div style={{
          position: 'absolute', bottom: '50px', left: '8px', right: '8px',
          background: 'var(--chat-bg-primary)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--chat-border)', borderRadius: '8px',
          padding: '6px', boxShadow: '0 -10px 25px rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '180px', overflowY: 'auto'
        }}>
          <div style={{ fontSize: '0.62rem', color: 'var(--chat-accent)', fontWeight: 'bold', padding: '2px 6px', textTransform: 'uppercase' }}>
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
                color: 'var(--chat-text-primary)', fontSize: '0.75rem', textAlign: 'left'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            >
              <span style={{ fontWeight: 'bold', color: '#f0abfc' }}>{item.cmd}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--chat-text-secondary)' }}>{item.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* CONTAINER PRINCIPAL DO INPUT - FLEX WRAP FLUIDO */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
        
        {/* GRUPO DE BOTÕES DA ESQUERDA (IDENTIDADE, IMAGEM, VOZ) */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
          {/* BOTÃO DE CONFIGURAÇÃO DE NOME E COR */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowIdentityPopup(!showIdentityPopup)}
              title={`Identidade do Chat: ${playerName}`}
              style={{
                width: '30px', height: '30px', padding: 0,
                background: 'var(--chat-bg-secondary)', border: `2px solid ${playerColor}`,
                borderRadius: '6px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: playerColor, flexShrink: 0
              }}
            >
              <User size={15} />
            </button>

            {/* POPUP DE IDENTIDADE (NOME & COR) */}
            {showIdentityPopup && (
              <div style={{
                position: 'absolute', bottom: '38px', left: 0,
                background: 'var(--chat-bg-primary)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--chat-border)', borderRadius: '8px',
                padding: '10px', boxShadow: '0 8px 25px rgba(0,0,0,0.6)', zIndex: 200,
                display: 'flex', flexDirection: 'column', gap: '8px', width: '180px'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--chat-text-secondary)', fontWeight: 'bold' }}>Sua Identidade no Chat:</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="color" value={playerColor} onChange={(e) => setPlayerColor(e.target.value)} title="Cor do seu nome"
                    style={{ width: '28px', height: '28px', padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px' }}
                  />
                  <input 
                    value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Seu nome"
                    style={{ flex: 1, padding: '4px 6px', background: 'var(--chat-bg-secondary)', border: '1px solid var(--chat-border)', color: playerColor, borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}
                  />
                </div>
                <button onClick={() => setShowIdentityPopup(false)} style={{ padding: '4px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '4px', color: '#a5b4fc', fontSize: '0.7rem', cursor: 'pointer' }}>Pronto</button>
              </div>
            )}
          </div>

          {/* UPLOAD IMAGEM */}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml" style={{ display: 'none' }} />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Enviar Imagem"
            style={{ width: '30px', height: '30px', padding: 0, background: 'var(--chat-bg-secondary)', border: '1px solid var(--chat-border)', borderRadius: '4px', color: 'var(--chat-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ImageIcon size={15} />
          </button>

          {/* ENTRADA DE VOZ (MICROFONE) */}
          <button
            onClick={handleVoiceInput}
            title={isListening ? 'Ouvindo... Clique para parar' : 'Entrada por Voz (Ditado)'}
            style={{
              width: '30px', height: '30px', padding: 0,
              background: isListening ? 'rgba(239,68,68,0.25)' : 'var(--chat-bg-secondary)',
              border: isListening ? '1px solid rgba(239,68,68,0.6)' : '1px solid var(--chat-border)',
              borderRadius: '4px', color: isListening ? '#fca5a5' : 'var(--chat-text-primary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}
          >
            {isListening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
        </div>

        {/* INPUT DE MENSAGEM PRINCIPAL - CRESCE E SE ADAPTA */}
        <input 
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Mensagem..."
          style={{
            flex: '1 1 100px', minWidth: '80px', padding: '6px 8px',
            background: 'var(--chat-bg-secondary)', border: '1px solid var(--chat-border)',
            color: 'var(--chat-text-primary)', borderRadius: '4px', fontSize: '0.82rem', boxSizing: 'border-box'
          }}
        />

        {/* GRUPO DE BOTÕES DA DIREITA (ENQUETE & ENVIAR) */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0, marginLeft: 'auto' }}>
          {/* CRIAR ENQUETE */}
          <button
            onClick={() => setIsComposingPoll(true)}
            title="Criar Enquete"
            style={{ width: '30px', height: '30px', padding: 0, background: 'var(--chat-bg-secondary)', border: '1px solid var(--chat-border)', borderRadius: '4px', color: 'var(--chat-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <BarChart2 size={15} />
          </button>

          {/* ENVIAR */}
          <button
            onClick={() => { handleSend(); setShowWikiAutoComplete(false); }}
            title="Enviar Mensagem"
            style={{ height: '30px', padding: '0 10px', background: 'var(--chat-accent)', border: 'none', borderRadius: '4px', color: 'var(--chat-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.8rem' }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
