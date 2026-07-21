// src/components/Chat/CombatLog.tsx
import React, { useEffect, useState, useRef } from 'react';
import { state } from '../../store';
import { Trash2, Download, Settings, Filter, Dices, Sword, BookOpen, MessageSquare } from 'lucide-react';
import { toast } from '../UI/Toast';
import { confirmDialog } from '../UI/Toast';

interface LogMessage {
  text: string;
  isCritical: boolean;
  isFailure: boolean;
  timestamp: number;
}

export const CombatLog: React.FC = () => {
  const [messages, setMessages] = useState<LogMessage[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'rolagens' | 'combate' | 'narrativo' | 'sistema'>('todos');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(state.chat.toArray() as LogMessage[]);

    const observer = () => {
      setMessages(state.chat.toArray() as LogMessage[]);
    };

    state.chat.observe(observer);
    return () => {
      state.chat.unobserve(observer);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, filtro]);

  // Classificação mais precisa com regex
  const classificarMensagem = (texto: string): 'rolagens' | 'combate' | 'narrativo' | 'sistema' => {
    const clean = texto.toLowerCase();

    // 1. Danos, acertos, ataques, cura, PV, mana, condições de combate
    if (
      /dano|curou|recuperou|pv|mana|pm|energia|ataque|atacar|defender|disparar|esquiva|defesa|crítico|falha crítica|acerto|morto|sangrando|queimando|atordoado/i.test(clean)
    ) {
      if (/rolou|resultado|dado|1d20|2d6|1d6|1d100|🎲/i.test(clean)) {
        return 'rolagens';
      }
      return 'combate';
    }

    // 2. Rolagens de dados pura ou testes de perícia/atributos
    if (/rolou|resultado|dado|1d20|2d6|1d8|1d10|1d12|1d100|🎲|sucessos|iniciativa|teste de|percepção|furtividade/i.test(clean)) {
      return 'rolagens';
    }

    // 3. Narrativa, cenas, Teatro da Mente, evocações, /me
    if (/conjurou|forjado|adicionado|cena|ambiente|descrição|história|\/me/i.test(clean)) {
      return 'narrativo';
    }

    return 'sistema';
  };

  const handleExport = () => {
    const textContent = messages.map(m => {
      const div = document.createElement('div');
      div.innerHTML = m.text;
      const stripped = div.textContent || div.innerText || '';
      const date = new Date(m.timestamp).toLocaleTimeString();
      return `[${date}] ${stripped}`;
    }).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Log_Combate_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Log exportado com sucesso!');
  };

  const handleClear = async () => {
    const ok = await confirmDialog('Tem certeza que deseja apagar todo o registro de combate?');
    if (ok) {
      state.chat.delete(0, state.chat.length);
      toast.info('Registro de combate limpo.');
    }
  };

  const mensagensFiltradas = messages.filter(msg => {
    if (filtro === 'todos') return true;
    const cat = classificarMensagem(msg.text);
    return cat === filtro;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Top Header with Tabs and Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '4px', flexShrink: 0 }}>
        {/* Tabs Filter Menu */}
        <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
          {(['todos', 'rolagens', 'combate', 'narrativo', 'sistema'] as const).map(tab => {
            let label = 'Tudo';
            let icon = null;
            
            if (tab === 'todos') { label = 'Tudo'; icon = <Filter size={11} />; }
            else if (tab === 'rolagens') { label = 'Testes'; icon = <Dices size={11} />; }
            else if (tab === 'combate') { label = 'Combate'; icon = <Sword size={11} />; }
            else if (tab === 'narrativo') { label = 'História'; icon = <BookOpen size={11} />; }
            else if (tab === 'sistema') { label = 'Geral'; icon = <MessageSquare size={11} />; }
            
            const active = filtro === tab;
            
            return (
              <button
                key={tab}
                onClick={() => setFiltro(tab)}
                style={{
                  padding: '6px 4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
                  background: active ? 'rgba(168, 85, 247, 0.18)' : 'transparent',
                  border: 'none', borderBottom: active ? '2px solid var(--accent-primary)' : 'none',
                  color: active ? '#f0abfc' : 'var(--text-secondary)',
                  borderRadius: '4px 4px 0 0', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                  flex: 1, minHeight: '32px'
                }}
              >
                {icon}
                <span className="tab-label">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Floating Menu Toggle */}
        <div style={{ position: 'relative', marginLeft: '4px', marginRight: '4px' }}>
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            className="btn-icon" 
            title="Opções do Log" 
            style={{ background: showMenu ? 'var(--accent-primary)' : 'rgba(0,0,0,0.3)', color: showMenu ? 'white' : 'var(--text-secondary)', width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Settings size={13} />
          </button>

          {showMenu && (
            <div className="animate-fade-in" style={{ 
              position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem', 
              background: 'rgba(10,15,30,0.97)', border: '1px solid var(--glass-border)', 
              padding: '0.3rem', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.25rem', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 100
            }}>
              <button onClick={() => { handleExport(); setShowMenu(false); }} className="btn-icon" title="Exportar Log (.txt)" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', width: '28px', height: '28px', padding: 0 }}>
                <Download size={13} />
              </button>
              <button onClick={() => { handleClear(); setShowMenu(false); }} className="btn-icon" title="Limpar Log" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', width: '28px', height: '28px', padding: 0 }}>
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingRight: '0.4rem', paddingTop: '0.5rem', fontFamily: 'monospace' }}>
        {mensagensFiltradas.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>[ Registros de combate vazios ]</p>
        ) : (
          mensagensFiltradas.map((msg, index) => {
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            return (
              <div 
                key={index} 
                className="animate-fade-in"
                style={{ 
                  padding: '0.25rem 0.4rem', 
                  display: 'flex',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  borderLeft: `2px solid ${msg.isCritical ? '#10b981' : msg.isFailure ? '#ef4444' : 'transparent'}`,
                  background: msg.isCritical ? 'rgba(16, 185, 129, 0.08)' : msg.isFailure ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  borderBottom: '1px dotted rgba(255,255,255,0.06)',
                  alignItems: 'flex-start'
                }}
              >
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', whiteSpace: 'nowrap', opacity: 0.7 }}>[{time}]</span>
                <div 
                  dangerouslySetInnerHTML={{ __html: msg.text }} 
                  style={{ 
                    color: msg.isCritical ? '#a7f3d0' : msg.isFailure ? '#fca5a5' : '#cbd5e1', 
                    fontFamily: 'Inter, sans-serif',
                    wordBreak: 'break-word',
                    flex: 1
                  }} 
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
