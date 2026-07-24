import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, X, Sparkles } from 'lucide-react';
import { generateAI } from '../../services/ai/AIProvider';
import { state } from '../../store';
import { useIsGM } from '../../store/user';

export const AIAssistantBot: React.FC = () => {
  const isGM = useIsGM();
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ 
    x: window.innerWidth / 2 - 30, 
    y: window.innerHeight / 2 - 30 
  });
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const [aiInput, setAiInput] = useState('');
  const [aiChat, setAiChat] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(() => localStorage.getItem('aiBotEnabled') === 'true');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Contexto do Jogo
  const [tokensMap, setTokensMap] = useState<Map<string, any>>(new Map());
  const [backgroundStr, setBackgroundStr] = useState('');

  // Ouvinte para evento do menu de configurações
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.forceState !== undefined) {
        setIsVisible(e.detail.forceState);
      } else {
        setIsVisible(v => !v);
      }
    };
    window.addEventListener('toggle-ai-bot', handler);
    return () => window.removeEventListener('toggle-ai-bot', handler);
  }, []);

  useEffect(() => {
    if (isGM) {
      setIsVisible(true);
      localStorage.setItem('aiBotEnabled', 'true');
    }
  }, [isGM]);

  useEffect(() => {
    const updateTokens = () => setTokensMap(new Map(state.tokens as any));
    const updateBg = () => setBackgroundStr((state.theater?.get('background') as string) || '');
    
    state.tokens.observe(updateTokens);
    if (state.theater) state.theater.observe(updateBg);
    
    updateTokens();
    updateBg();
    
    return () => {
      state.tokens.unobserve(updateTokens);
      if (state.theater) state.theater.unobserve(updateBg);
    };
  }, []);

  const clampPos = (x: number, y: number) => {
    const maxX = Math.max(10, window.innerWidth - 65);
    const maxY = Math.max(10, window.innerHeight - 65);
    return {
      x: Math.max(10, Math.min(x, maxX)),
      y: Math.max(10, Math.min(y, maxY))
    };
  };

  // Define position on mount and on resize with clamping
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      setPos(prev => clampPos(
        isMobile ? window.innerWidth - 65 : Math.min(prev.x, window.innerWidth - 65),
        isMobile ? window.innerHeight - 130 : Math.min(prev.y, window.innerHeight - 65)
      ));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = false;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    isDragging.current = true;
    const rawX = e.clientX - offset.current.x;
    const rawY = e.clientY - offset.current.y;
    setPos(clampPos(rawX, rawY));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!isDragging.current) {
      setIsOpen(!isOpen);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChat, isAiLoading, isOpen]);

  const handleAskAI = async () => {
    if (!aiInput.trim() || isAiLoading) return;
    const prompt = aiInput.trim();
    setAiInput('');
    setAiChat(prev => [...prev, { role: 'user', text: prompt }]);
    setIsAiLoading(true);

    try {
      const config = JSON.parse(localStorage.getItem('dozero_ai_studio') || '{}');
      const provider = config.provider || 'groq';
      const model = config.modelId || 'llama-3.3-70b-versatile';
      const apiKey = config.apiKey || '';
      const ollamaUrl = config.ollamaUrl;
      
      const contextTokens = Array.from(tokensMap.values()).map(t => `- ${t.name} (HP: ${t.hp}/${t.maxHp})`).join('\n');
      const systemContext = `\n\n--- CONTEXTO ATUAL DO JOGO ---\nCena Atual: ${backgroundStr}\nTokens no Mapa:\n${contextTokens || 'Nenhum token no mapa.'}`;

      const res = await generateAI({
        provider, model, apiKey, ollamaUrl,
        systemPrompt: "Você é um pequeno e sagaz robô assistente de mestre de RPG (sistema DoZero/Pathfinder 2e). Ajude o mestre dizendo quais rolagens pedir, quais atributos usar ou qual o custo de mana/hp dependendo da ação. Seja muito direto, prático, e amigável. Responda em formato markdown, de forma curta." + systemContext,
        userPrompt: prompt
      });
      setAiChat(prev => [...prev, { role: 'ai', text: res.text }]);
    } catch (e: any) {
      setAiChat(prev => [...prev, { role: 'ai', text: `❌ Erro na IA: ${e.message}. (Configure a IA no Estúdio IA primeiro).` }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isDragging.current) {
      setIsOpen(prev => !prev);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onClick={handleToggle}
        style={{
          position: 'fixed',
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
          border: '2px solid rgba(255,255,255,0.2)',
          color: 'var(--text-primary)',
          boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          transition: 'transform 0.2s ease',
          touchAction: 'none',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)',
        }}
        onMouseOver={e => (e.currentTarget.style.transform = isOpen ? 'scale(0.9)' : 'scale(1.1)')}
        onMouseOut={e => (e.currentTarget.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)')}
        title="Assistente IA de Regras"
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
        {!isOpen && (
          <Sparkles 
            size={12} 
            color="#fde047" 
            style={{ position: 'absolute', top: '-4px', right: '-4px', animation: 'pulse 2s infinite' }} 
          />
        )}
      </button>

      {/* Painel do Chat */}
      {isOpen && (
        <div 
          className="glass-panel ai-assistant-panel animate-fade-in"
          style={{
            position: 'fixed',
            left: window.innerWidth <= 768 ? '10px' : `${Math.min(pos.x, window.innerWidth - 330)}px`,
            top: window.innerWidth <= 768 ? '10px' : `${Math.max(20, pos.y - 460)}px`,
            width: window.innerWidth <= 768 ? 'calc(100vw - 20px)' : '320px',
            height: window.innerWidth <= 768 ? 'calc(100vh - 160px)' : '450px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 999999,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            border: '1px solid rgba(236,72,153,0.3)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{ background: 'rgba(236,72,153,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(236,72,153,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} color="#ec4899" />
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fbcfe8', fontFamily: 'var(--font-display)' }}>Assistente de Mestre</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ background: 'transparent', border: 'none', color: '#fbcfe8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
              title="Fechar Assistente"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {aiChat.length === 0 && (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                <Bot size={32} style={{ opacity: 0.3, marginBottom: '8px', display: 'inline-block' }} />
                <br/>
                Olá! Como posso te ajudar com as regras, testes ou atributos hoje?
              </div>
            )}
            
            {aiChat.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'rgba(30,41,59,0.8)',
                  padding: '10px 14px', borderRadius: '12px', maxWidth: '85%', fontSize: '0.85rem', color: 'var(--text-primary)',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)'
                }}>
                  {msg.role === 'ai' && <Bot size={14} style={{ marginBottom: '-2px', marginRight: '6px', color: '#ec4899', display: 'inline-block' }} />}
                  <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
                </div>
              </div>
            ))}
            
            {isAiLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'rgba(30,41,59,0.8)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  <Loader2 size={14} className="animate-spin" style={{ marginBottom: '-2px', marginRight: '6px', display: 'inline-block' }} />
                  Pensando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                placeholder="Pergunte uma regra..."
                style={{ flex: 1, padding: '10px 12px', borderRadius: '20px', border: '1px solid rgba(236,72,153,0.4)', background: 'rgba(0,0,0,0.5)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
              <button 
                onClick={handleAskAI}
                disabled={isAiLoading || !aiInput.trim()}
                style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #be185d)', border: 'none', color: 'var(--text-primary)', cursor: isAiLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Send size={16} style={{ marginLeft: '-2px' }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
