// src/components/Chat/CombatLog.tsx
import React, { useEffect, useState, useRef } from 'react';
import { state } from '../../store';
import { Trash2, Download, Settings, Filter, Dices, Sword, BookOpen, MessageSquare, FileText, Code, Search, X } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filtrosAtivos, setFiltrosAtivos] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('dozero_combatlog_filtros');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return new Set(['rolagens', 'combate', 'narrativo', 'sistema']);
  });
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
  }, [messages, filtrosAtivos]);

  // Classificação precisa com regex
  const classificarMensagem = (texto: string): 'rolagens' | 'combate' | 'narrativo' | 'sistema' => {
    const clean = texto.toLowerCase();

    if (
      /dano|curou|recuperou|pv|mana|pm|energia|ataque|atacar|defender|disparar|esquiva|defesa|crítico|falha crítica|acerto|morto|sangrando|queimando|atordoado/i.test(clean)
    ) {
      if (/rolou|resultado|dado|1d20|2d6|1d6|1d100|🎲/i.test(clean)) {
        return 'rolagens';
      }
      return 'combate';
    }

    if (/rolou|resultado|dado|1d20|2d6|1d8|1d10|1d12|1d100|🎲|sucessos|iniciativa|teste de|percepção|furtividade/i.test(clean)) {
      return 'rolagens';
    }

    if (/conjurou|forjado|adicionado|cena|ambiente|descrição|história|\/me/i.test(clean)) {
      return 'narrativo';
    }

    return 'sistema';
  };

  const handleExport = (format: 'txt' | 'md' | 'json' = 'txt') => {
    let content = '';
    let mimeType = 'text/plain';
    let ext = 'txt';

    if (format === 'json') {
      content = JSON.stringify(messages, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else if (format === 'md') {
      mimeType = 'text/markdown';
      ext = 'md';
      content = `# Registro de Combate - DOZERO VTT\nData: ${new Date().toLocaleDateString()}\n\n| Horário | Categoria | Conteúdo |\n|---|---|---|\n`;
      content += messages.map(m => {
        const div = document.createElement('div');
        div.innerHTML = m.text;
        const stripped = (div.textContent || div.innerText || '').replace(/\|/g, '\\|');
        const date = new Date(m.timestamp).toLocaleTimeString();
        const cat = classificarMensagem(m.text).toUpperCase();
        return `| ${date} | ${cat} | ${stripped} |`;
      }).join('\n');
    } else {
      content = messages.map(m => {
        const div = document.createElement('div');
        div.innerHTML = m.text;
        const stripped = div.textContent || div.innerText || '';
        const date = new Date(m.timestamp).toLocaleTimeString();
        return `[${date}] ${stripped}`;
      }).join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Log_Combate_${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Log exportado em formato .${ext}!`);
  };

  const handleClear = async () => {
    const ok = await confirmDialog('Tem certeza que deseja apagar todo o registro de combate?');
    if (ok) {
      state.chat.delete(0, state.chat.length);
      toast.info('Registro de combate limpo.');
    }
  };

  const mensagensFiltradas = messages.filter(msg => {
    const cat = classificarMensagem(msg.text);
    if (!filtrosAtivos.has(cat)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const div = document.createElement('div');
      div.innerHTML = msg.text;
      const cleanText = (div.textContent || div.innerText || '').toLowerCase();
      return cleanText.includes(q);
    }
    return true;
  });

  const toggleFiltro = (filtro: string) => {
    const next = new Set(filtrosAtivos);
    if (next.has(filtro)) {
      if (next.size > 1) {
        next.delete(filtro);
      } else {
        ['rolagens', 'combate', 'narrativo', 'sistema'].forEach(f => next.add(f));
      }
    } else {
      next.add(filtro);
    }
    setFiltrosAtivos(next);
    localStorage.setItem('dozero_combatlog_filtros', JSON.stringify(Array.from(next)));
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* Top Header with Tabs and Actions - Fluid Wrap */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', padding: '4px', flexShrink: 0, flexWrap: 'wrap', gap: '4px', width: '100%', boxSizing: 'border-box' }}>
        {/* Tabs Filter Menu */}
        <div style={{ display: 'flex', gap: '2px', flex: '1 1 140px', minWidth: '120px', flexWrap: 'wrap' }}>
          {(['rolagens', 'combate', 'narrativo', 'sistema'] as const).map(tab => {
            let label = 'Tudo';
            let icon = null;
            
            if (tab === 'rolagens') { label = 'Testes'; icon = <Dices size={11} />; }
            else if (tab === 'combate') { label = 'Combate'; icon = <Sword size={11} />; }
            else if (tab === 'narrativo') { label = 'História'; icon = <BookOpen size={11} />; }
            else if (tab === 'sistema') { label = 'Geral'; icon = <MessageSquare size={11} />; }
            
            const active = filtrosAtivos.has(tab);
            
            return (
              <button
                key={tab}
                onClick={() => toggleFiltro(tab)}
                style={{
                  padding: '4px 4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
                  background: active ? 'rgba(168, 85, 247, 0.18)' : 'transparent',
                  border: 'none', borderBottom: active ? '2px solid var(--accent-primary)' : 'none',
                  color: active ? '#f0abfc' : 'var(--text-secondary)',
                  borderRadius: '4px 4px 0 0', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                  flex: '1 1 45px', minWidth: 0, minHeight: '26px'
                }}
                title={`Alternar visualização de ${label}`}
              >
                {icon}
                <span className="tab-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '2px 6px', gap: '4px', flex: '1 1 100px', minWidth: '80px', height: '26px' }}>
          <Search size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar no log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.7rem', outline: 'none', width: '100%' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Floating Menu Toggle */}
        <div style={{ position: 'relative', marginLeft: 'auto', flexShrink: 0 }}>
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            className="btn-icon" 
            title="Opções do Log" 
            style={{ background: showMenu ? 'var(--accent-primary)' : 'rgba(0,0,0,0.3)', color: showMenu ? 'white' : 'var(--text-secondary)', width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
          >
            <Settings size={13} />
          </button>

          {showMenu && (
            <div className="animate-fade-in" style={{ 
              position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem', 
              background: 'rgba(10,15,30,0.97)', border: '1px solid var(--glass-border)', 
              padding: '0.4rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '4px', 
              boxShadow: '0 8px 25px rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 100, width: '130px'
            }}>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 'bold', padding: '2px 4px' }}>Exportar como:</div>
              <button onClick={() => { handleExport('txt'); setShowMenu(false); }} style={{ padding: '4px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#e2e8f0', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={12} /> Texto (.txt)
              </button>
              <button onClick={() => { handleExport('md'); setShowMenu(false); }} style={{ padding: '4px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#e2e8f0', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={12} /> Markdown (.md)
              </button>
              <button onClick={() => { handleExport('json'); setShowMenu(false); }} style={{ padding: '4px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#e2e8f0', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code size={12} /> JSON (.json)
              </button>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '2px 0' }} />
              <button onClick={() => { handleClear(); setShowMenu(false); }} style={{ padding: '4px 6px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', color: '#fca5a5', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={12} /> Limpar Log
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingRight: '0.4rem', paddingTop: '0.5rem', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}>
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
                  alignItems: 'flex-start',
                  maxWidth: '100%',
                  overflow: 'hidden'
                }}
              >
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', whiteSpace: 'nowrap', opacity: 0.7, flexShrink: 0 }}>[{time}]</span>
                <div 
                  dangerouslySetInnerHTML={{ __html: msg.text }} 
                  style={{ 
                    color: msg.isCritical ? '#a7f3d0' : msg.isFailure ? '#fca5a5' : '#cbd5e1', 
                    fontFamily: 'Inter, sans-serif',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    flex: 1,
                    minWidth: 0
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
