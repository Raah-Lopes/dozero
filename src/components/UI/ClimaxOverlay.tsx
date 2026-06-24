import React, { useEffect, useState, useCallback } from 'react';
import { Trophy, Skull } from 'lucide-react';
import { state } from '../../services/yjs';

interface ClimaxState {
  active: boolean;
  stakes?: {
    success: string;
    failure: string;
  };
  result?: 'success' | 'failure' | null;
}

export const ClimaxOverlay: React.FC = () => {
  const [climax, setClimax] = useState<ClimaxState>({ active: false });
  const [phase, setPhase] = useState<'stakes' | 'result' | 'closing'>('stakes');

  const readClimax = useCallback((): ClimaxState => {
    const raw = state.combat.get('climax') as ClimaxState | undefined;
    return raw || { active: false };
  }, []);

  useEffect(() => {
    const handleChange = () => {
      const current = readClimax();
      setClimax(current);

      if (current.active && current.result) {
        setPhase('result');

        // Auto-close after 4 seconds
        const closeTimer = setTimeout(() => {
          setPhase('closing');
          setTimeout(() => {
            state.combat.set('climax', { active: false });
            setClimax({ active: false });
            setPhase('stakes');
          }, 600);
        }, 4000);

        return () => clearTimeout(closeTimer);
      } else if (current.active) {
        setPhase('stakes');
      }
    };

    // Initial read
    handleChange();

    state.combat.observe(handleChange);
    return () => state.combat.unobserve(handleChange);
  }, [readClimax]);

  if (!climax.active) return null;

  const green = '#10b981';
  const red = '#ef4444';
  const greenGlow = 'rgba(16, 185, 129, 0.5)';
  const redGlow = 'rgba(239, 68, 68, 0.5)';

  const isSuccess = climax.result === 'success';
  const isFailure = climax.result === 'failure';
  const hasResult = phase === 'result' || phase === 'closing';

  const getCardAnimation = (side: 'success' | 'failure') => {
    if (phase === 'closing') return 'climaxFadeOutShrink 0.6s ease-in forwards';
    if (!hasResult) return 'climaxPulseGlow 2s ease-in-out infinite';
    if (side === climax.result) return 'climaxExplodeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    return 'climaxFadeOutShrink 0.6s ease-in forwards';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3rem',
        fontFamily: 'var(--font-body)',
        animation: phase === 'closing' ? 'climaxFadeOutShrink 0.6s ease-in forwards' : undefined,
      }}
    >
      {/* Title */}
      <div style={{
        position: 'absolute',
        top: '8%',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
      }}>
        <span style={{
          fontSize: '1rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '8px',
          color: 'rgba(255, 255, 255, 0.5)',
        }}>
          Momento Decisivo
        </span>
        <div style={{
          fontSize: '2.5rem',
          fontWeight: 900,
          color: '#ffffff',
          textShadow: '0 0 40px rgba(255, 122, 0, 0.4)',
          marginTop: '0.5rem',
          animation: 'climaxPulseGlow 2s ease-in-out infinite',
        }}>
          O QUE ESTÁ EM JOGO?
        </div>
      </div>

      {/* Success Card */}
      <div style={{
        animation: getCardAnimation('success'),
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(16, 185, 129, 0.1) 100%)',
        border: `2px solid ${isSuccess && hasResult ? green : 'rgba(16, 185, 129, 0.4)'}`,
        borderRadius: 16,
        padding: '2.5rem 2rem',
        width: 320,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        boxShadow: isSuccess && hasResult
          ? `0 0 60px ${greenGlow}, 0 0 120px rgba(16, 185, 129, 0.2), inset 0 0 30px rgba(16, 185, 129, 0.15)`
          : `0 0 20px rgba(16, 185, 129, 0.1), inset 0 0 15px rgba(16, 185, 129, 0.05)`,
        opacity: isFailure && hasResult ? 0 : 1,
        transition: 'box-shadow 0.5s ease',
      }}>
        <Trophy
          size={48}
          color={green}
          style={{
            filter: `drop-shadow(0 0 15px ${greenGlow})`,
          }}
        />
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '4px',
          color: green,
        }}>
          Sucesso
        </span>
        <p style={{
          fontSize: '1.1rem',
          fontWeight: 500,
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: 1.5,
          margin: 0,
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}>
          {climax.stakes?.success || '—'}
        </p>
        {isSuccess && hasResult && (
          <div style={{
            marginTop: '0.5rem',
            fontSize: '1.5rem',
            fontWeight: 900,
            color: green,
            textTransform: 'uppercase',
            letterSpacing: '6px',
            textShadow: `0 0 30px ${greenGlow}`,
            animation: 'climaxPulseGlow 0.8s ease-in-out infinite',
          }}>
            VITÓRIA!
          </div>
        )}
      </div>

      {/* VS divider */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        opacity: hasResult ? 0.3 : 1,
        transition: 'opacity 0.5s ease',
      }}>
        <div style={{
          width: 2,
          height: 60,
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.3), transparent)',
        }} />
        <span style={{
          fontSize: '1.5rem',
          fontWeight: 900,
          color: 'rgba(255, 255, 255, 0.4)',
          letterSpacing: '2px',
        }}>
          VS
        </span>
        <div style={{
          width: 2,
          height: 60,
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.3), transparent)',
        }} />
      </div>

      {/* Failure Card */}
      <div style={{
        animation: getCardAnimation('failure'),
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(239, 68, 68, 0.1) 100%)',
        border: `2px solid ${isFailure && hasResult ? red : 'rgba(239, 68, 68, 0.4)'}`,
        borderRadius: 16,
        padding: '2.5rem 2rem',
        width: 320,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        boxShadow: isFailure && hasResult
          ? `0 0 60px ${redGlow}, 0 0 120px rgba(239, 68, 68, 0.2), inset 0 0 30px rgba(239, 68, 68, 0.15)`
          : `0 0 20px rgba(239, 68, 68, 0.1), inset 0 0 15px rgba(239, 68, 68, 0.05)`,
        opacity: isSuccess && hasResult ? 0 : 1,
        transition: 'box-shadow 0.5s ease',
      }}>
        <Skull
          size={48}
          color={red}
          style={{
            filter: `drop-shadow(0 0 15px ${redGlow})`,
          }}
        />
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '4px',
          color: red,
        }}>
          Fracasso
        </span>
        <p style={{
          fontSize: '1.1rem',
          fontWeight: 500,
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: 1.5,
          margin: 0,
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}>
          {climax.stakes?.failure || '—'}
        </p>
        {isFailure && hasResult && (
          <div style={{
            marginTop: '0.5rem',
            fontSize: '1.5rem',
            fontWeight: 900,
            color: red,
            textTransform: 'uppercase',
            letterSpacing: '6px',
            textShadow: `0 0 30px ${redGlow}`,
            animation: 'climaxPulseGlow 0.8s ease-in-out infinite',
          }}>
            DERROTA!
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes climaxPulseGlow {
            0%, 100% { opacity: 1; filter: brightness(1); }
            50% { opacity: 0.85; filter: brightness(1.15); }
          }
          @keyframes climaxExplodeIn {
            0% { transform: scale(1); }
            40% { transform: scale(1.25); }
            60% { transform: scale(1.15); }
            100% { transform: scale(1.2); filter: brightness(1.3); }
          }
          @keyframes climaxFadeOutShrink {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(0.85); opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};
