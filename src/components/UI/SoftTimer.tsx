import React, { useEffect, useState, useRef, useCallback } from 'react';
import { state } from '../../services/yjs';

interface TimerState {
  progress: number; // 0 to 1
  expired: boolean;
  paused: boolean;
  active: boolean;
  duration: number;
}

export const SoftTimer: React.FC = () => {
  const [timer, setTimer] = useState<TimerState>({
    progress: 1,
    expired: false,
    paused: false,
    active: false,
    duration: 0,
  });
  const rafRef = useRef<number>(0);
  const flashCountRef = useRef(0);
  const flashPhaseRef = useRef(false);

  const getTimerValues = useCallback(() => {
    const combat = state.combat;
    return {
      timerStart: (combat.get('timerStart') as number) || 0,
      timerDuration: (combat.get('timerDuration') as number) || 0,
      timerPaused: (combat.get('timerPaused') as boolean) || false,
      isActive: (combat.get('isActive') as boolean) || false,
    };
  }, []);

  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;

      const { timerStart, timerDuration, timerPaused, isActive } = getTimerValues();

      if (!isActive || !timerDuration || timerDuration <= 0) {
        setTimer(prev => ({ ...prev, active: false, duration: 0 }));
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (timerPaused) {
        setTimer(prev => ({ ...prev, paused: true, active: true, duration: timerDuration }));
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      const elapsed = now - timerStart;
      const remaining = Math.max(0, timerDuration - elapsed);
      const progress = remaining / timerDuration;
      const expired = remaining <= 0;

      if (expired && flashCountRef.current < 6) {
        flashCountRef.current++;
        flashPhaseRef.current = !flashPhaseRef.current;
      }

      if (!expired) {
        flashCountRef.current = 0;
        flashPhaseRef.current = false;
      }

      setTimer({
        progress,
        expired,
        paused: false,
        active: true,
        duration: timerDuration,
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    // Also listen to Yjs map changes for reactivity
    const handleCombatChange = () => {
      // Reset flash on new timer
      const { timerStart } = getTimerValues();
      if (timerStart > 0) {
        flashCountRef.current = 0;
        flashPhaseRef.current = false;
      }
    };

    state.combat.observe(handleCombatChange);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      state.combat.unobserve(handleCombatChange);
    };
  }, [getTimerValues]);

  // Don't render if no timer
  if (!timer.active || timer.duration <= 0) return null;

  const progress = timer.progress;
  const pct = progress * 100;

  // Color based on progress
  let barColor: string;
  if (timer.expired) {
    barColor = flashPhaseRef.current ? 'rgba(239, 68, 68, 0.3)' : '#ef4444';
  } else if (progress > 0.66) {
    barColor = '#10b981';
  } else if (progress > 0.33) {
    barColor = '#fbbf24';
  } else {
    barColor = '#ef4444';
  }

  // Glow intensity increases as time decreases
  const glowIntensity = progress < 0.33 ? 12 : progress < 0.66 ? 6 : 3;
  const barHeight = progress < 0.33 ? 6 : 4;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: barHeight,
        zIndex: 99998,
        pointerEvents: 'none',
        background: 'rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
        transition: 'height 0.3s ease',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: barColor,
          boxShadow: `0 0 ${glowIntensity}px ${barColor}, 0 0 ${glowIntensity * 2}px ${barColor}40`,
          transition: timer.paused ? 'none' : 'background-color 0.5s ease',
          borderRadius: '0 2px 2px 0',
        }}
      />

      <style>
        {`
          @keyframes softTimerFlash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}
      </style>
    </div>
  );
};
