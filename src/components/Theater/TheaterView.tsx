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
  const { mood, weather } = useSceneState();

  return (
    <MoodEngine mood={mood} weather={weather}>
      {/* Main layout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}>
        {/* Three-column body */}
        <div style={{
          flex: 1,
          display: 'flex',
          gap: '12px',
          padding: '14px 14px 0',
          overflow: 'hidden',
          minHeight: 0,
        }}>
          {/* LEFT — Narrative Track */}
          <div style={{ ...COL_STYLE('220px'), flexShrink: 0, marginTop: '48px' }}>
            <div style={{ ...PANEL_STYLE, flex: 1 }}>
              <NarrativeTrack />
            </div>
          </div>

          {/* CENTER — Scene Panel (dominant) */}
          <div style={{ ...COL_STYLE('1fr'), flex: 1, minWidth: 0 }}>
            <div style={{ ...PANEL_STYLE, flex: 1 }}>
              <ScenePanel />
            </div>
          </div>

          {/* RIGHT — Cast + Enemy + Clocks */}
          <div style={{ ...COL_STYLE('260px'), flexShrink: 0 }}>
            {/* Cast panel — top ~45% */}
            <div style={{ ...PANEL_STYLE, flex: '0 0 auto', maxHeight: '38%', minHeight: '160px' }}>
              <CastPanel />
            </div>

            {/* Enemy board — middle ~35% */}
            <div style={{ ...PANEL_STYLE, flex: '0 0 auto', maxHeight: '35%', minHeight: '140px' }}>
              <EnemyBoard />
            </div>

            {/* Clock rail — bottom */}
            <div style={{ ...PANEL_STYLE, flex: 1, minHeight: '80px' }}>
              <ClockRail />
            </div>
          </div>
        </div>

        {/* SESSION DIARY — floating bottom-left */}
        <div style={{
          position: 'absolute',
          bottom: '64px',
          left: '14px',
          width: '220px',
          zIndex: 10,
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
