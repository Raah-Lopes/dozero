// src/components/Chat/CombatLog.tsx
import React, { useEffect, useState, useRef } from 'react';
import { state } from '../../store';
import { Trash2, Download, Settings, Filter, Dices, Sword, BookOpen, MessageSquare } from 'lucide-react';

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
    // Initial load
    setMessages(state.chat.toArray() as LogMessage[]);

    // Subscribe to Yjs changes
    const observer = () => {
      setMessages(state.chat.toArray() as LogMessage[]);
    };

    state.chat.observe(observer);

    return () => {
      state.chat.unobserve(observer);
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, filtro]);

  const classificarMensagem = (texto: string) => {
    const clean = texto.toLowerCase();
    
    // Danos, cura, PV, status, buffs, debuffs e pools vitais
    if (clean.includes('dano') || clean.includes('curou') || clean.includes('recuperou') || clean.includes('pv') || clean.includes('mana') || clean.includes('pm') || clean.includes('energia') || clean.includes('condição')) {
      if (clean.includes('rolou') || clean.includes('resultado') || clean.includes('dado')) {
        return 'rolagens';
      }
      return 'combate';
    }
    
    // Rolagens de dados pura ou testes de perícia/atributos
    if (clean.includes('rolou') || clean.includes('resultado') || clean.includes('dado') || clean.includes('🎲') || clean.includes('sucessos') || clean.includes('iniciativa') || clean.includes('teste de')) {
      return 'rolagens';
    }
    
    // Narrativa, cenas, Teatro da Mente, evocações
    if (clean.includes('conjurou') || clean.includes('forjado') || clean.includes('adicionado') || clean.includes('cena') || clean.includes('ambiente') || clean.includes('descrição')) {
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
  };

  const handleClear = () => {
    if (confirm('Tem certeza que deseja apagar todo o registro de combate?')) {
      state.chat.delete(0, state.chat.length);
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
                  background: active ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  border: 'none', borderBottom: active ? '2px solid var(--accent-primary)' : 'none',
                  color: active ? '#f0abfc' : 'var(--text-secondary)',
                  borderRadius: '4px 4px 0 0', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
                  flex: 1
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
            style={{ background: showMenu ? 'var(--accent-primary)' : 'rgba(0,0,0,0.3)', color: showMenu ? 'white' : 'var(--text-secondary)', width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Settings size={12} />
          </button>

          {showMenu && (
            <div className="animate-fade-in" style={{ 
              position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem', 
              background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', 
              padding: '0.25rem', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.25rem', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 100
            }}>
              <button onClick={() => { handleExport(); setShowMenu(false); }} className="btn-icon" title="Exportar Log (.txt)" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', width: '24px', height: '24px', padding: 0 }}>
                <Download size={12} />
              </button>
              <button onClick={() => { handleClear(); setShowMenu(false); }} className="btn-icon" title="Limpar Log" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', width: '24px', height: '24px', padding: 0 }}>
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.4rem', paddingTop: '0.5rem' }}>
        {mensagensFiltradas.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>Sem registros nesta categoria.</p>
        ) : (
          mensagensFiltradas.map((msg, index) => (
            <div 
              key={index} 
              className="animate-fade-in"
              style={{ 
                padding: '0.5rem 0.6rem', 
                background: msg.isCritical ? 'rgba(34, 197, 94, 0.08)' : msg.isFailure ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                borderLeft: `3px solid ${msg.isCritical ? 'var(--success)' : msg.isFailure ? 'var(--danger)' : 'var(--accent-primary)'}`,
                border: '1px solid var(--glass-border)',
                borderLeftWidth: '3px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                lineHeight: '1.45',
                boxShadow: msg.isCritical ? '0 0 8px rgba(34, 197, 94, 0.15)' : msg.isFailure ? '0 0 8px rgba(239, 68, 68, 0.15)' : 'none'
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: msg.text }} style={{ color: 'var(--text-primary)' }} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
