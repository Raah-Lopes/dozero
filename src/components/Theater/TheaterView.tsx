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
  const [rightOpen, setRightOpen] = React.useState(true);
  const [rightTab, setRightTab] = React.useState<'cast' | 'enemies' | 'clocks'>('cast');

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
        {/* TOP CONTROLS FOR SIDEBARS */}
        <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 50, display: 'flex', gap: '8px' }}>
          <button onClick={() => setLeftOpen(!leftOpen)} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
            {leftOpen ? '◀ Narrativa' : '▶ Narrativa'}
          </button>
        </div>
        <div style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 50, display: 'flex', gap: '8px' }}>
          <button onClick={() => setRightOpen(!rightOpen)} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
            {rightOpen ? 'Gestão ▶' : '◀ Gestão'}
          </button>
        </div>

        {/* Three-column body */}
        <div style={{
          flex: 1,
          display: 'flex',
          gap: '16px',
          padding: '60px 14px 120px', // Extra padding at bottom for distance bands
          overflow: 'hidden',
          minHeight: 0,
        }}>
          {/* LEFT — Narrative Track */}
          {leftOpen && (
            <div style={{ ...COL_STYLE('280px'), flexShrink: 0 }}>
              <div style={{ ...PANEL_STYLE, flex: 1, background: 'rgba(15,23,42,0.65)' }}>
                <NarrativeTrack />
              </div>
            </div>
          )}

          {/* CENTER — Scene Info */}
          <div style={{ ...COL_STYLE('1fr'), flex: 1, minWidth: 0, pointerEvents: 'none' }}>
            {/* The ScenePanel is now just a floating card for scene info/objectives, aligned top or bottom */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
              <div style={{ ...PANEL_STYLE, width: '100%', maxWidth: '600px', flex: '0 0 auto', pointerEvents: 'auto', background: 'rgba(15,23,42,0.65)', maxHeight: '100%' }}>
                <ScenePanel />
              </div>
            </div>
          </div>

          {/* RIGHT — Cast + Enemy + Clocks (TABBED) */}
          {rightOpen && (
            <div style={{ ...COL_STYLE('300px'), flexShrink: 0 }}>
              <div style={{ ...PANEL_STYLE, flex: 1, background: 'rgba(15,23,42,0.65)', display: 'flex', flexDirection: 'column' }}>
                {/* TABS */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  <button onClick={() => setRightTab('cast')} style={{ flex: 1, background: rightTab === 'cast' ? 'rgba(168,85,247,0.2)' : 'transparent', border: 'none', color: rightTab === 'cast' ? '#c084fc' : '#94a3b8', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Elenco</button>
                  <button onClick={() => setRightTab('enemies')} style={{ flex: 1, background: rightTab === 'enemies' ? 'rgba(239,68,68,0.2)' : 'transparent', border: 'none', color: rightTab === 'enemies' ? '#fca5a5' : '#94a3b8', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Ameaças</button>
                  <button onClick={() => setRightTab('clocks')} style={{ flex: 1, background: rightTab === 'clocks' ? 'rgba(59,130,246,0.2)' : 'transparent', border: 'none', color: rightTab === 'clocks' ? '#93c5fd' : '#94a3b8', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Relógios</button>
                </div>
                
                {/* TAB CONTENT */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {rightTab === 'cast' && <CastPanel />}
                  {rightTab === 'enemies' && <EnemyBoard />}
                  {rightTab === 'clocks' && <ClockRail />}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ZONAS DE COMBATE (Bands) - Overlayed at bottom */}
        <div style={{
          position: 'absolute',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          maxWidth: '1000px',
          height: '140px',
          zIndex: 10,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px 16px 0 0',
          borderBottom: 'none',
          padding: '10px',
        }}>
          <DistanceBands />
        </div>

        {/* SESSION DIARY — floating bottom-left */}
        <div style={{
          position: 'absolute',
          bottom: '64px',
          left: '14px',
          width: '280px',
          zIndex: 20,
          pointerEvents: 'auto',
        }}>
          <SessionDiary />
        </div>

        {/* DIRECTOR BAR — fixed bottom */}
        <div style={{ flexShrink: 0, zIndex: 20 }}>
          <DirectorBar />
        </div>
      </div>
    </MoodEngine>
  );
};
