// src/components/Theater/CutsceneOverlay.tsx
//
// Exibe uma splash screen fullscreen temporária ao estilo "videogame chapter card".
// Controlado externamente via o hook useCutscene (estado React local no TheaterView).
//
import React, { useEffect, useState } from 'react';

export interface CutsceneConfig {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  durationMs?: number; // Default: 4000ms
}

interface Props {
  config: CutsceneConfig;
  onEnd: () => void;
}

// ponytail: 3 phases — in (0→1), hold, out (1→0). Simple CSS transitions.
type Phase = 'in' | 'hold' | 'out';

export const CutsceneOverlay: React.FC<Props> = ({ config, onEnd }) => {
  const [phase, setPhase] = useState<Phase>('in');
  const duration = config.durationMs ?? 4000;

  useEffect(() => {
    // Phase timing: fade-in 600ms, hold (duration-1200ms), fade-out 600ms
    const holdDelay = 600;
    const outDelay = holdDelay + Math.max(duration - 1200, 800);

    const t1 = setTimeout(() => setPhase('hold'), holdDelay);
    const t2 = setTimeout(() => setPhase('out'), outDelay);
    const t3 = setTimeout(() => onEnd(), outDelay + 600);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [duration, onEnd]);

  const opacity = phase === 'in' ? 0 : phase === 'hold' ? 1 : 0;
  const scale = phase === 'in' ? 1.04 : 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: config.imageUrl
          ? `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.72)), url(${config.imageUrl}) center/cover no-repeat`
          : 'linear-gradient(135deg, #020617 0%, #0f172a 60%, #1e0a3c 100%)',
        opacity,
        transition: 'opacity 0.6s ease',
        cursor: 'pointer',
      }}
      onClick={onEnd}
      title="Clique para pular"
    >
      {/* decorative side lines */}
      <div style={{ position: 'absolute', left: 60, top: '50%', transform: 'translateY(-50%)', width: 2, height: 120, background: 'rgba(168,85,247,0.5)', borderRadius: 2 }} />
      <div style={{ position: 'absolute', right: 60, top: '50%', transform: 'translateY(-50%)', width: 2, height: 120, background: 'rgba(168,85,247,0.5)', borderRadius: 2 }} />

      {/* content block */}
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 4rem',
          transform: `scale(${scale})`,
          transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
          maxWidth: 700,
        }}
      >
        {/* thin decorative line above */}
        <div style={{ width: 60, height: 2, background: 'linear-gradient(to right, transparent, #a855f7, transparent)', margin: '0 auto 1.5rem' }} />

        <h1
          style={{
            fontFamily: 'var(--font-display, Outfit, sans-serif)',
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'white',
            textShadow: '0 0 40px rgba(168,85,247,0.6), 0 2px 20px rgba(0,0,0,0.8)',
            marginBottom: '1rem',
            lineHeight: 1.1,
          }}
        >
          {config.title}
        </h1>

        {config.subtitle && (
          <p
            style={{
              fontFamily: 'var(--font-body, Inter, sans-serif)',
              fontSize: 'clamp(0.9rem, 2vw, 1.15rem)',
              color: 'rgba(203,213,225,0.85)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textShadow: '0 1px 10px rgba(0,0,0,0.6)',
            }}
          >
            {config.subtitle}
          </p>
        )}

        {/* thin decorative line below */}
        <div style={{ width: 60, height: 2, background: 'linear-gradient(to right, transparent, #a855f7, transparent)', margin: '1.5rem auto 0' }} />
      </div>

      {/* skip hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 28,
          color: 'rgba(255,255,255,0.3)',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.08em',
        }}
      >
        clique para pular
      </div>
    </div>
  );
};
