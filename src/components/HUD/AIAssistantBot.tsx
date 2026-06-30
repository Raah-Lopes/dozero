import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, X, Sparkles } from 'lucide-react';
import { generateAI } from '../../services/ai/AIProvider';
import { state } from '../../store';

export const AIAssistantBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 }); // Default position
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const [aiInput, setAiInput] = useState('');
  const [aiChat, setAiChat] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Contexto do Jogo
  const [tokensMap, setTokensMap] = useState<Map<string, any>>(new Map());
  const [backgroundStr, setBackgroundStr] = useState('');

  useEffect(() => {
    const handler = () => setIsVisible(v => !v);
    window.addEventListener('toggle-ai-bot', handler);
    return () => window.removeEventListener('toggle-ai-bot', handler);
  }, []);

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

  // Define position on mount
  useEffect(() => {
    setPos({ x: window.innerWidth - 420, y: window.innerHeight - 80 });
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = false;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    isDragging.current = true;
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
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

  if (!isVisible) return null;

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'fixed',
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
          border: '2px solid rgba(255,255,255,0.2)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging.current ? 'grabbing' : 'pointer',
          boxShadow: '0 4px 15px rgba(236, 72, 153, 0.5)',
          zIndex: 9999,
          transition: isDragging.current ? 'none' : 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
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
          className="glass-panel animate-fade-in"
          style={{
            position: 'fixed',
            left: `${Math.min(pos.x, window.innerWidth - 330)}px`,
            top: `${Math.max(20, pos.y - 460)}px`,
            width: '320px',
            height: '450px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9998,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            border: '1px solid rgba(236,72,153,0.3)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{ background: 'rgba(236,72,153,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(236,72,153,0.2)' }}>
            <Bot size={20} color="#ec4899" />
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fbcfe8', fontFamily: 'var(--font-display)' }}>Assistente de Mestre</h3>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {aiChat.length === 0 && (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                <Bot size={32} style={{ opacity: 0.3, marginBottom: '8px', display: 'inline-block' }} />
                <br/>
                Olá! Como posso te ajudar com as regras, testes ou atributos hoje?
              </div>
            )}
            
            {aiChat.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'rgba(30,41,59,0.8)',
                  padding: '10px 14px', borderRadius: '12px', maxWidth: '85%', fontSize: '0.85rem', color: '#f1f5f9',
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
                style={{ flex: 1, padding: '10px 12px', borderRadius: '20px', border: '1px solid rgba(236,72,153,0.4)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.85rem' }}
              />
              <button 
                onClick={handleAskAI}
                disabled={isAiLoading || !aiInput.trim()}
                style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #be185d)', border: 'none', color: 'white', cursor: isAiLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
