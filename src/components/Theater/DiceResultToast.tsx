// src/components/Theater/DiceResultToast.tsx
//
// Toast dramático de resultado de rolagem, renderizado no centro do Teatro.
// Controlado via CustomEvent 'theater-dice-result'.
//
import React, { useEffect, useState, useCallback } from 'react';

export interface DiceResult {
  label: string;      // ex: "Ataque"
  notation: string;   // ex: "1d20+5"
  rolls: number[];
  modifier: number;
  total: number;
  maxPossible: number; // para determinar crítico/falha
}

type ToastState = 'in' | 'hold' | 'out';

const ToastItem: React.FC<{ result: DiceResult; onDone: () => void }> = ({ result, onDone }) => {
  const [phase, setPhase] = useState<ToastState>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 200);
    const t2 = setTimeout(() => setPhase('out'), 3200);
    const t3 = setTimeout(onDone, 3700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const isCrit = result.total >= result.maxPossible * 0.9;
  const isFail = result.rolls.length > 0 && result.rolls.every(r => r === 1);

  const accentColor = isCrit ? '#10b981' : isFail ? '#ef4444' : '#a855f7';
  const glowColor = isCrit ? 'rgba(16,185,129,0.5)' : isFail ? 'rgba(239,68,68,0.5)' : 'rgba(168,85,247,0.4)';
  const label = isCrit ? '⚡ CRÍTICO!' : isFail ? '💀 FALHA!' : result.label;

  return (
    <div style={{
      transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.4,0,0.2,1)',
      opacity: phase === 'in' ? 0 : phase === 'hold' ? 1 : 0,
      transform: phase === 'in' ? 'scale(0.85) translateY(20px)' : phase === 'hold' ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(-10px)',
      background: 'rgba(2,6,23,0.92)',
      border: `1px solid ${accentColor}`,
      borderRadius: 16,
      padding: '16px 32px',
      textAlign: 'center',
      boxShadow: `0 0 40px ${glowColor}, 0 8px 32px rgba(0,0,0,0.6)`,
      backdropFilter: 'blur(16px)',
      minWidth: 200,
      pointerEvents: 'none',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.7rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: accentColor,
        marginBottom: 4,
      }}>
        {label}
      </div>

      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
        fontWeight: 800,
        lineHeight: 1,
        color: 'var(--text-primary)',
        textShadow: `0 0 30px ${glowColor}`,
      }}>
        {result.total}
      </div>

      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.72rem',
        color: 'rgba(148,163,184,0.8)',
        marginTop: 6,
      }}>
        [{result.rolls.join(', ')}]{result.modifier !== 0 ? (result.modifier > 0 ? ` +${result.modifier}` : ` ${result.modifier}`) : ''} — {result.notation}
      </div>
    </div>
  );
};

export const DiceResultToast: React.FC = () => {
  const [queue, setQueue] = useState<(DiceResult & { key: number })[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const result = (e as CustomEvent<DiceResult>).detail;
      if (result) {
        setQueue(prev => [...prev, { ...result, key: Date.now() }]);
      }
    };
    window.addEventListener('theater-dice-result', handler);
    return () => window.removeEventListener('theater-dice-result', handler);
  }, []);

  const removeFirst = useCallback(() => {
    setQueue(prev => prev.slice(1));
  }, []);

  if (queue.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      pointerEvents: 'none',
    }}>
      {/* Only show the first in queue to avoid clutter */}
      <ToastItem key={queue[0].key} result={queue[0]} onDone={removeFirst} />
    </div>
  );
};
