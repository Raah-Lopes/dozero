import React, { useEffect, useState, useRef } from 'react';
import { state } from '../../store';
import { Trash2, Download, Settings } from 'lucide-react';

interface LogMessage {
  text: string;
  isCritical: boolean;
  isFailure: boolean;
  timestamp: number;
}

export const CombatLog: React.FC = () => {
  const [messages, setMessages] = useState<LogMessage[]>([]);
  const [showMenu, setShowMenu] = useState(false);

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

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleExport = () => {
    const textContent = messages.map(m => {
      const div = document.createElement('div');
      div.innerHTML = m.text;
      const stripped = div.textContent || div.innerText || '';
      const date = new Date(m.timestamp).toLocaleTimeString();
      return `[${date}] ${stripped}`;
    }).join('\\n');

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Floating Menu Toggle */}
      <div style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', zIndex: 10 }}>
        <button 
          onClick={() => setShowMenu(!showMenu)} 
          className="btn-icon" 
          title="Opções do Log" 
          style={{ background: showMenu ? 'var(--accent-primary)' : 'rgba(0,0,0,0.5)', color: showMenu ? 'white' : 'var(--text-secondary)', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }}
        >
          <Settings size={14} />
        </button>

        {showMenu && (
          <div className="animate-fade-in" style={{ 
            position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', 
            background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', 
            padding: '0.5rem', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.5rem', 
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'
          }}>
            <button onClick={() => { handleExport(); setShowMenu(false); }} className="btn-icon" title="Exportar Log (.txt)" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
              <Download size={14} />
            </button>
            <button onClick={() => { handleClear(); setShowMenu(false); }} className="btn-icon" title="Limpar Log" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem', paddingTop: '2.5rem' }}>
        {messages.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>A batalha aguarda seu primeiro movimento.</p>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className="animate-fade-in"
              style={{ 
                padding: '0.75rem', 
                background: msg.isCritical ? 'rgba(34, 197, 94, 0.1)' : msg.isFailure ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                borderLeft: `3px solid ${msg.isCritical ? 'var(--success)' : msg.isFailure ? 'var(--danger)' : 'var(--accent-primary)'}`,
                border: '1px solid var(--glass-border)',
                borderLeftWidth: '3px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                lineHeight: '1.4',
                boxShadow: msg.isCritical ? '0 0 10px rgba(34, 197, 94, 0.2)' : msg.isFailure ? '0 0 10px rgba(239, 68, 68, 0.2)' : 'none'
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
