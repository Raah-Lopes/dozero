// src/components/Theater/TheaterView.tsx
import React from 'react';
import { MoodEngine } from './MoodEngine';
import { NarrativeTrack } from './NarrativeTrack';
import { ScenePanel } from './ScenePanel';
import { CastPanel } from './CastPanel';
import { EnemyBoard } from './EnemyBoard';
import { ClockRail } from './ClockRail';
import { DirectorBar } from './DirectorBar';
import { SessionDiary } from './SessionDiary';
import { DistanceBands } from './DistanceBands';
import { useSceneState } from './hooks/useSceneState';

const COL_STYLE = (width: string): React.CSSProperties => ({
  width,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  height: '100%',
  overflow: 'hidden',
});

const PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.35)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '12px',
  padding: '14px',
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

export const TheaterView: React.FC = () => {
  const { mood, weather, currentScene } = useSceneState();
  const [leftOpen, setLeftOpen] = React.useState(true);
  const [leftTab, setLeftTab] = React.useState<'narrative' | 'diary'>('narrative');
  const [rightOpen, setRightOpen] = React.useState(true);
  const [rightTab, setRightTab] = React.useState<'cast' | 'enemies' | 'clocks' | 'zones'>('cast');
  const [centerOpen, setCenterOpen] = React.useState(false);

  const bgStyle = currentScene?.imageUrl 
    ? `url(${currentScene.imageUrl}) center/cover no-repeat` 
    : 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(5,13,26,0.9) 100%)';

  return (
    <MoodEngine mood={mood} weather={weather}>
      {/* FULL SCREEN BACKGROUND */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: bgStyle,
        transition: 'background 0.5s ease',
        zIndex: 0
      }} />
      
      {/* DARKEN OVERLAY FOR READABILITY */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
        zIndex: 0
      }} />

      {/* Main layout container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        zIndex: 1
      }}>
        {/* UNIFIED TOP BAR */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'linear-gradient(to bottom, rgba(15,23,42,0.8) 0%, transparent 100%)',
          zIndex: 50,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px',
        }}>
          {/* Left toggle */}
          <button onClick={() => setLeftOpen(!leftOpen)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
            {leftOpen ? '◀ Trilha' : '▶ Trilha'}
          </button>

          {/* Center Info / Scene Control Trigger */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <button 
              onClick={() => setCenterOpen(!centerOpen)}
              style={{ background: centerOpen ? 'rgba(59,130,246,0.3)' : 'rgba(0,0,0,0.5)', padding: '6px 20px', borderRadius: '20px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontWeight: 600, letterSpacing: '1px', pointerEvents: 'auto', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {currentScene?.title || 'Teatro da Mente'} 
              <span style={{ fontSize: '0.8em', opacity: 0.7 }}>{centerOpen ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* Right toggle */}
          <button onClick={() => setRightOpen(!rightOpen)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
            {rightOpen ? 'Gestão ▶' : '◀ Gestão'}
          </button>
        </div>

        {/* Three-column body */}
        <div style={{
          flex: 1,
          display: 'flex',
          gap: '16px',
          padding: '60px 14px 60px', // Restored padding since distance bands are gone from bottom
          overflow: 'hidden',
          minHeight: 0,
        }}>
          {/* LEFT — Narrative Track & Diary */}
          {leftOpen && (
            <div style={{ ...COL_STYLE('300px'), flexShrink: 0, animation: 'fadeIn 0.2s ease-out' }}>
              <div style={{ ...PANEL_STYLE, flex: 1, background: 'rgba(15,23,42,0.65)', display: 'flex', flexDirection: 'column' }}>
                {/* TABS LEFT */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  <button onClick={() => setLeftTab('narrative')} style={{ flex: 1, background: leftTab === 'narrative' ? 'rgba(59,130,246,0.2)' : 'transparent', border: 'none', color: leftTab === 'narrative' ? '#93c5fd' : '#94a3b8', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}>Cenas</button>
                  <button onClick={() => setLeftTab('diary')} style={{ flex: 1, background: leftTab === 'diary' ? 'rgba(16,185,129,0.2)' : 'transparent', border: 'none', color: leftTab === 'diary' ? '#6ee7b7' : '#94a3b8', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}>Anotações</button>
                </div>
                {/* CONTENT */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {leftTab === 'narrative' && <NarrativeTrack />}
                  {leftTab === 'diary' && <SessionDiary />}
                </div>
              </div>
            </div>
          )}

          {/* CENTER — Scene Info */}
          <div style={{ ...COL_STYLE('1fr'), flex: 1, minWidth: 0, pointerEvents: 'none' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', opacity: centerOpen ? 1 : 0, transform: centerOpen ? 'translateY(0)' : 'translateY(-20px)' }}>
              {centerOpen && (
                <div style={{ ...PANEL_STYLE, width: '100%', maxWidth: '600px', flex: '0 0 auto', pointerEvents: 'auto', background: 'rgba(15,23,42,0.8)', maxHeight: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.2s ease-out' }}>
                  <ScenePanel />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Cast + Enemy + Clocks (TABBED) */}
          {rightOpen && (
            <div style={{ ...COL_STYLE('300px'), flexShrink: 0 }}>
              <div style={{ ...PANEL_STYLE, flex: 1, background: 'rgba(15,23,42,0.65)', display: 'flex', flexDirection: 'column' }}>
                {/* TABS */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  <button onClick={() => setRightTab('cast')} style={{ flex: 1, background: rightTab === 'cast' ? 'rgba(168,85,247,0.2)' : 'transparent', border: 'none', color: rightTab === 'cast' ? '#c084fc' : '#94a3b8', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Heróis</button>
                  <button onClick={() => setRightTab('enemies')} style={{ flex: 1, background: rightTab === 'enemies' ? 'rgba(239,68,68,0.2)' : 'transparent', border: 'none', color: rightTab === 'enemies' ? '#fca5a5' : '#94a3b8', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Ameaças</button>
                  <button onClick={() => setRightTab('zones')} style={{ flex: 1, background: rightTab === 'zones' ? 'rgba(234,179,8,0.2)' : 'transparent', border: 'none', color: rightTab === 'zones' ? '#fde047' : '#94a3b8', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Zonas</button>
                  <button onClick={() => setRightTab('clocks')} style={{ flex: 1, background: rightTab === 'clocks' ? 'rgba(59,130,246,0.2)' : 'transparent', border: 'none', color: rightTab === 'clocks' ? '#93c5fd' : '#94a3b8', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Relógios</button>
                </div>
                
                {/* TAB CONTENT */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {rightTab === 'cast' && <CastPanel />}
                  {rightTab === 'enemies' && <EnemyBoard />}
                  {rightTab === 'zones' && <DistanceBands />}
                  {rightTab === 'clocks' && <ClockRail />}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* HUD INFERIOR (Cockpit) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
        }}>
          {/* DIRECTOR BAR ONLY */}
          <div style={{ width: '100%', pointerEvents: 'auto', flexShrink: 0, background: '#0a0f1c' }}>
            <DirectorBar />
          </div>
        </div>
      </div>
    </MoodEngine>
  );
};
