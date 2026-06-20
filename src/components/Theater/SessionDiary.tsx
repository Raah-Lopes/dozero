// src/components/Theater/SessionDiary.tsx
import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Download, Filter, X } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import type { DiaryEntryType } from '../../store';

const TYPE_CONFIG: Record<DiaryEntryType, { icon: string; color: string; label: string }> = {
  scene:     { icon: '🎬', color: '#a855f7', label: 'Cena' },
  combat:    { icon: '⚔️', color: '#ef4444', label: 'Combate' },
  clock:     { icon: '⏱',  color: '#f59e0b', label: 'Relógio' },
  objective: { icon: '☑️', color: '#10b981', label: 'Objetivo' },
  condition: { icon: '⚡', color: '#3b82f6', label: 'Condição' },
  narrative: { icon: '📝', color: '#64748b', label: 'Narrativa' },
};

export const SessionDiary: React.FC = () => {
  const { diaryEntries } = useSceneState();
  const [filter, setFilter] = useState<DiaryEntryType | 'all'>('all');
  const [collapsed, setCollapsed] = useState(false);
  const [diaryHeight, setDiaryHeight] = useState(350);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = diaryHeight;

    const onMove = (ev: PointerEvent) => {
      // Dragging UP means smaller Y, dy is positive, height increases
      const dy = startY - ev.clientY;
      setDiaryHeight(Math.max(150, Math.min(window.innerHeight - 100, startH + dy)));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'ns-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const filtered = filter === 'all' ? diaryEntries : diaryEntries.filter(e => e.type === filter);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filtered.length]);

  const exportDiary = () => {
    const lines = diaryEntries.map(e => {
      const d = new Date(e.timestamp);
      const time = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      return `${time} — ${e.text}`;
    });
    const content = `# Diário de Sessão\n\n${lines.join('\n')}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessao_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontSize: '0.75rem' }}
      >
        <BookOpen size={13} /> Diário ({diaryEntries.length})
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: `${diaryHeight}px`, background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
      {/* Top Drag Handle */}
      <div 
        onPointerDown={handleDrag}
        style={{ 
          height: '8px', 
          cursor: 'ns-resize', 
          background: 'rgba(255,255,255,0.02)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.03)'
        }}
        title="Arraste para redimensionar"
      >
        <div style={{ width: '40px', height: '2px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BookOpen size={13} /> Diário
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={exportDiary} title="Exportar como .md" style={{ background: 'transparent', border: 'none', color: '#374151', cursor: 'pointer' }}>
            <Download size={12} />
          </button>
          <button onClick={() => setCollapsed(true)} style={{ background: 'transparent', border: 'none', color: '#374151', cursor: 'pointer' }}>
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '4px', padding: '6px 8px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <button onClick={() => setFilter('all')} style={{ padding: '2px 7px', borderRadius: '4px', background: filter === 'all' ? 'rgba(168,85,247,0.2)' : 'transparent', border: `1px solid ${filter === 'all' ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.05)'}`, color: filter === 'all' ? '#c084fc' : '#374151', cursor: 'pointer', fontSize: '0.65rem' }}>
          Todos
        </button>
        {(Object.keys(TYPE_CONFIG) as DiaryEntryType[]).map(type => {
          const cfg = TYPE_CONFIG[type];
          return (
            <button key={type} onClick={() => setFilter(type)} style={{ padding: '2px 7px', borderRadius: '4px', background: filter === type ? `${cfg.color}20` : 'transparent', border: `1px solid ${filter === type ? cfg.color + '40' : 'rgba(255,255,255,0.05)'}`, color: filter === type ? cfg.color : '#374151', cursor: 'pointer', fontSize: '0.65rem' }}>
              {cfg.icon}
            </button>
          );
        })}
      </div>

      {/* Entries */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {filtered.length === 0 && (
          <div style={{ color: '#1f2937', textAlign: 'center', padding: '20px', fontSize: '0.75rem', fontStyle: 'italic' }}>
            Nada registrado ainda
          </div>
        )}
        {filtered.map(entry => {
          const cfg = TYPE_CONFIG[entry.type];
          const d = new Date(entry.timestamp);
          const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          return (
            <div key={entry.id} style={{ display: 'flex', gap: '8px', padding: '4px 6px', borderRadius: '6px', transition: 'background 0.1s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '0.65rem', color: '#374151', flexShrink: 0, fontFamily: 'monospace', marginTop: '1px' }}>{time}</span>
              <span style={{ fontSize: '0.65rem', flexShrink: 0, marginTop: '1px' }}>{cfg.icon}</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4, flex: 1 }}>{entry.text}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
