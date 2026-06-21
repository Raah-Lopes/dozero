import React, { useEffect, useState } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { removeTensionClock, triggerClockConsequence, updateTensionClockProps } from '../../store';
import type { TensionClock } from '../../store';
// @ts-ignore - auto fix
import { Clock, Trash2, Pause, Play, Settings } from 'lucide-react';

interface Props {
  clock: TensionClock;
  isGM: boolean;
  onEdit: () => void;
}

export const TensionClockWidget: React.FC<Props> = ({ clock, isGM, onEdit }) => {
  const [remaining, setRemaining] = useState(() => Math.max(0, clock.endTime - Date.now()));
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (!clock.isRunning) return;
    
    const remNow = Math.max(0, clock.endTime - Date.now());
    if (remNow <= 0) return; // Se já começou zerado, não dispara evento.

    const interval = setInterval(() => {
      const rem = Math.max(0, clock.endTime - Date.now());
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(interval);
        setShowAnimation(true);
        if (isGM) {
          triggerClockConsequence(clock.id);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [clock.endTime, clock.isRunning, isGM, clock.id]);

  const percent = clock.durationMs > 0 ? remaining / clock.durationMs : 0;
  
  const sec = Math.ceil(remaining / 1000);
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  const timeStr = `${min.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <>
      {showAnimation && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          zIndex: 100000,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(239,68,68,0.5) 0%, rgba(0,0,0,0.8) 100%)',
          animation: 'clockExplode 4s ease-out forwards'
        }}>
          <h1 style={{
            fontSize: '5rem',
            color: '#ef4444',
            textShadow: '0 0 40px #ef4444, 0 0 80px #b91c1c',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            textAlign: 'center',
            textTransform: 'uppercase',
            animation: 'pulseScale 1s infinite alternate'
          }}>
            {clock.label}
          </h1>
          <p style={{
            fontSize: '2rem',
            color: 'white',
            textShadow: '0 0 20px white',
            marginTop: '1rem',
            fontFamily: 'sans-serif'
          }}>
            O TEMPO ACABOU!
          </p>
          <style>
            {`
              @keyframes clockExplode {
                0% { opacity: 0; }
                10% { opacity: 1; }
                80% { opacity: 1; }
                100% { opacity: 0; display: none; }
              }
              @keyframes pulseScale {
                0% { transform: scale(1); }
                100% { transform: scale(1.1); }
              }
            `}
          </style>
        </div>
      )}

      <DraggableWindow
        id={clock.id}
        title={clock.label}
        initialX={window.innerWidth / 2 - 110}
        initialY={window.innerHeight / 2 - 150}
        width={220}
        variant="default"
        windowStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
        onClose={() => {
          if (window.confirm(`Destruir o relógio "${clock.label}"?`)) {
            removeTensionClock(clock.id);
          }
        }}
      >
      <div style={{
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '1rem', 
        background: 'rgba(15, 23, 42, 0.8)', 
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
        borderLeft: '1px solid var(--glass-border)',
        borderRight: '1px solid var(--glass-border)',
        borderBottom: '1px solid var(--glass-border)',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
      }}>
        
        <div 
          onClick={onEdit}
          title="Clique para editar este relógio"
          style={{
            position: 'relative',
            width: '144px',
            height: '144px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {/* Anel de fundo */}
          <svg style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            transform: 'rotate(-90deg)'
          }}>
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="#1f2937"
              strokeWidth="10"
              fill="rgba(0,0,0,0.6)"
            />
            {/* Anel de Progresso */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="#ef4444"
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'all 0.1s linear',
                filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.8))'
              }}
            />
          </svg>
          
          <div style={{
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={24} color="#ef4444" style={{ marginBottom: '4px' }} />
            <span style={{
              fontSize: '1.5rem',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: 'white',
              letterSpacing: '2px',
              filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))'
            }}>
              {timeStr}
            </span>
          </div>
        </div>

        {isGM && (
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
            <button
              onClick={() => {
                if (clock.isRunning) {
                  updateTensionClockProps(clock.id, { isRunning: false, pausedRemainingMs: remaining });
                } else {
                  const rem = clock.pausedRemainingMs ?? remaining;
                  updateTensionClockProps(clock.id, { isRunning: true, endTime: Date.now() + rem });
                }
              }}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: clock.isRunning ? 'rgba(245, 158, 11, 0.5)' : 'rgba(16, 185, 129, 0.5)',
                color: clock.isRunning ? '#fcd34d' : '#6ee7b7',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                border: `1px solid ${clock.isRunning ? 'rgba(245, 158, 11, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`,
                cursor: 'pointer'
              }}
            >
              {clock.isRunning ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Retomar</>}
            </button>

            <button
              onClick={() => {
                if (window.confirm(`Destruir o relógio "${clock.label}"?`)) {
                  removeTensionClock(clock.id);
                }
              }}
              title="Destruir Relógio"
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(153, 27, 27, 0.5)',
                color: '#fca5a5',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(185, 28, 28, 0.5)',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(153, 27, 27, 0.8)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(153, 27, 27, 0.5)'}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      </DraggableWindow>
    </>
  );
};
