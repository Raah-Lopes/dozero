// src/components/Theater/LiveChronicleLog.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Scroll, X, Dice5, Swords, Film, Bell, Download, Filter, 
  Trash2, Shield
} from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { removeTheaterDiaryEntry, clearTheaterDiaryEntries, type DiaryEntryType } from '../../store';
import { Tooltip } from '../UI/Tooltip';
import { toast } from '../UI/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveChronicleLog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { diaryEntries } = useSceneState();
  const [filter, setFilter] = useState<DiaryEntryType | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries appear
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [diaryEntries.length, isOpen, filter]);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = filter === 'all' 
    ? diaryEntries 
    : diaryEntries.filter(e => e.type === filter);

  const getEntryBadge = (type: DiaryEntryType) => {
    switch (type) {
      case 'combat':
        return { icon: <Swords size={12} />, color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Combate' };
      case 'scene':
        return { icon: <Film size={12} />, color: '#a855f7', bg: 'rgba(168,85,247,0.15)', label: 'Cena' };
      case 'clock':
        return { icon: <Bell size={12} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Relógio' };
      case 'objective':
        return { icon: <Shield size={12} />, color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Missão' };
      default:
        return { icon: <Scroll size={12} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', label: 'Crônica' };
    }
  };

  const handleClearAll = () => {
    if (diaryEntries.length === 0) return;
    if (!confirm('Deseja limpar todo o histórico de acontecimentos? Esta ação não pode ser desfeita.')) return;
    clearTheaterDiaryEntries();
    toast.info('Histórico do diário limpo com sucesso.');
  };

  const handleDeleteEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeTheaterDiaryEntry(id);
  };

  const exportMarkdown = () => {
    const lines = diaryEntries.map(e => {
      const d = new Date(e.timestamp);
      const time = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      return `[${time}] [${e.type.toUpperCase()}] ${e.text}`;
    });
    const content = `# Crônica da Sessão — Teatro da Mente\n\n${lines.join('\n\n')}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cronica_teatro_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="theater-chronicle-overlay" onClick={onClose}>
      <div 
        className="theater-chronicle-drawer" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="theater-chronicle-header">
          <div className="theater-chronicle-header-title">
            <Scroll size={16} color="#38bdf8" />
            <div>
              <h3>Feed de Acontecimentos</h3>
              <span className="theater-chronicle-header-count">
                {filtered.length} registro{filtered.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="theater-chronicle-actions">
            {diaryEntries.length > 0 && (
              <Tooltip label="Limpar Todo o Histórico">
                <button 
                  onClick={handleClearAll}
                  className="theater-chronicle-btn danger"
                  title="Limpar Histórico"
                >
                  <Trash2 size={14} />
                </button>
              </Tooltip>
            )}

            <Tooltip label="Exportar Diário (.md)">
              <button 
                onClick={exportMarkdown}
                className="theater-chronicle-btn"
                title="Exportar Histórico"
              >
                <Download size={14} />
              </button>
            </Tooltip>

            <Tooltip label="Fechar (ESC)">
              <button 
                onClick={onClose}
                className="theater-chronicle-btn close"
              >
                <X size={16} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="theater-chronicle-filters">
          <button 
            className={`theater-chronicle-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          <button 
            className={`theater-chronicle-filter-btn ${filter === 'combat' ? 'active' : ''}`}
            onClick={() => setFilter('combat')}
          >
            <Swords size={11} /> Combate & Dados
          </button>
          <button 
            className={`theater-chronicle-filter-btn ${filter === 'scene' ? 'active' : ''}`}
            onClick={() => setFilter('scene')}
          >
            <Film size={11} /> Cenas
          </button>
          <button 
            className={`theater-chronicle-filter-btn ${filter === 'clock' ? 'active' : ''}`}
            onClick={() => setFilter('clock')}
          >
            <Bell size={11} /> Relógios
          </button>
        </div>

        {/* Stream List */}
        <div className="theater-chronicle-stream" ref={scrollRef}>
          {filtered.length === 0 ? (
            <div className="theater-chronicle-empty">
              <Scroll size={32} opacity={0.3} />
              <p>Nenhum acontecimento registrado neste filtro.</p>
              <span>As rolagens, falas e transições aparecerão aqui em tempo real.</span>
            </div>
          ) : (
            filtered.map((entry, idx) => {
              const badge = getEntryBadge(entry.type);
              const date = new Date(entry.timestamp);
              const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

              return (
                <div 
                  key={entry.id || `${entry.timestamp}_${idx}`} 
                  className={`theater-chronicle-entry ${entry.type}`}
                >
                  <div className="theater-chronicle-entry-top">
                    <span 
                      className="theater-chronicle-badge"
                      style={{ color: badge.color, background: badge.bg, borderColor: `${badge.color}40` }}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="theater-chronicle-time">{timeStr}</span>
                      <Tooltip label="Excluir este registro">
                        <button
                          className="theater-chronicle-entry-del-btn"
                          onClick={(e) => handleDeleteEntry(entry.id, e)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="theater-chronicle-entry-text">
                    {entry.text}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
