// src/components/Theater/NarrativeTrack.tsx
import React, { useState } from 'react';
import { Plus, ChevronRight, Trash2, BookOpen, ArrowRight } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import type { MoodType, WeatherType } from '../../store';

const MOOD_LABELS: Record<MoodType, string> = {
  neutral: '⬜ Neutro', suspense: '🟣 Suspense', horror: '🔴 Horror',
  adventure: '🟡 Aventura', victory: '🟢 Vitória', sadness: '🔵 Tristeza',
  mystery: '🟤 Mistério', combat: '🔥 Combate',
};

const WEATHER_LABELS: Record<WeatherType, string> = {
  clear: '☀️ Claro', rain: '🌧 Chuva', storm: '⛈ Tempestade',
  fog: '🌫 Névoa', snow: '❄️ Neve', fire: '🔥 Fogo', darkness: '🌑 Escuridão',
};

export const NarrativeTrack: React.FC = () => {
  const { scenes, currentScene, createScene, deleteScene, setCurrentScene, goToNextScene, goToPrevScene, theaterData } = useSceneState();
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  const currentIdx = scenes.findIndex(s => s.id === theaterData.currentSceneId);

  if (collapsed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{ padding: '8px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', color: '#a855f7', cursor: 'pointer' }}
          title="Expandir trilha narrativa"
        >
          <BookOpen size={18} />
        </button>
        {scenes.map((s, i) => (
          <div
            key={s.id}
            onClick={() => setCurrentScene(s.id)}
            title={s.title}
            style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: s.id === theaterData.currentSceneId ? '#a855f7' : 'rgba(255,255,255,0.15)',
              cursor: 'pointer', border: s.id === theaterData.currentSceneId ? '2px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s',
            }}
          />
        ))}
        <button
          onClick={() => createScene()}
          style={{ padding: '6px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}
        >
          <Plus size={14} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={15} color="#a855f7" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0' }}>
            Trilha Narrativa
          </span>
        </div>
        <button onClick={() => setCollapsed(true)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px' }}>
          ←
        </button>
      </div>

      {/* Navigation quick buttons */}
      {scenes.length > 1 && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={goToPrevScene}
            disabled={currentIdx <= 0}
            style={{ flex: 1, padding: '5px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: currentIdx <= 0 ? '#374151' : '#cbd5e1', cursor: currentIdx <= 0 ? 'not-allowed' : 'pointer' }}
          >
            ← Anterior
          </button>
          <button
            onClick={goToNextScene}
            disabled={currentIdx >= scenes.length - 1}
            style={{ flex: 1, padding: '5px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: currentIdx < scenes.length - 1 ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${currentIdx < scenes.length - 1 ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '6px', color: currentIdx >= scenes.length - 1 ? '#374151' : '#c084fc', cursor: currentIdx >= scenes.length - 1 ? 'not-allowed' : 'pointer' }}
          >
            Próxima <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Scene list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px', minHeight: 0 }}>
        {scenes.length === 0 && (
          <div style={{ color: '#475569', fontSize: '0.8rem', textAlign: 'center', padding: '20px 8px', fontStyle: 'italic' }}>
            Nenhuma cena criada
          </div>
        )}
        {scenes.map((scene, idx) => {
          const isActive = scene.id === theaterData.currentSceneId;
          return (
            <div
              key={scene.id}
              style={{
                position: 'relative',
                background: isActive ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setCurrentScene(scene.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isActive && <ChevronRight size={12} color="#a855f7" />}
                <span style={{ fontSize: '0.7rem', color: '#475569', minWidth: '18px' }}>
                  {idx + 1}.
                </span>
                {editingTitle === scene.id ? (
                  <input
                    autoFocus
                    value={editTitleValue}
                    onChange={e => setEditTitleValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (editTitleValue.trim()) {
                          import('../../store').then(({ updateTheaterScene }) => {
                            updateTheaterScene(scene.id, { title: editTitleValue.trim() });
                          });
                        }
                        setEditingTitle(null);
                      } else if (e.key === 'Escape') {
                        setEditingTitle(null);
                      }
                    }}
                    onBlur={() => {
                      if (editTitleValue.trim()) {
                        import('../../store').then(({ updateTheaterScene }) => {
                          updateTheaterScene(scene.id, { title: editTitleValue.trim() });
                        });
                      }
                      setEditingTitle(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '4px', color: 'white', padding: '2px 6px', fontSize: '0.78rem', fontFamily: 'var(--font-body)' }}
                  />
                ) : (
                  <span
                    style={{ flex: 1, fontSize: '0.78rem', color: isActive ? '#e2e8f0' : '#94a3b8', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    onDoubleClick={e => { e.stopPropagation(); setEditingTitle(scene.id); setEditTitleValue(scene.title); }}
                    title="Duplo clique para renomear"
                  >
                    {scene.title}
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); if (confirm(`Deletar "${scene.title}"?`)) deleteScene(scene.id); }}
                  style={{ background: 'transparent', border: 'none', color: '#374151', cursor: 'pointer', padding: '2px', opacity: 0, transition: 'opacity 0.2s' }}
                  className="scene-delete-btn"
                >
                  <Trash2 size={11} />
                </button>
              </div>
              {scene.subtitle && (
                <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '3px', paddingLeft: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {scene.subtitle}
                </div>
              )}
              <style>{`.scene-delete-btn:hover { opacity: 1 !important; color: #ef4444 !important; }`}</style>
            </div>
          );
        })}
      </div>

      {/* Add scene */}
      <button
        onClick={() => createScene()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '8px', borderRadius: '8px',
          border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent',
          color: '#475569', cursor: 'pointer', fontSize: '0.78rem',
          transition: 'all 0.2s',
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'; e.currentTarget.style.color = '#a855f7'; }}
        onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#475569'; }}
      >
        <Plus size={14} /> Nova Cena
      </button>
    </div>
  );
};
