import React, { useEffect, useState } from 'react';

interface TurnChangeDetail {
  name: string;
  imageUrl?: string;
}

interface TurnBanner {
  id: string;
  name: string;
  imageUrl?: string;
  phase: 'enter' | 'exit';
}

export const PPROverlay: React.FC = () => {
  const [banner, setBanner] = useState<TurnBanner | null>(null);

  useEffect(() => {
    const handleTurnChange = (e: Event) => {
      const { name, imageUrl } = (e as CustomEvent<TurnChangeDetail>).detail;
      const id = Math.random().toString(36).substr(2, 9);

      setBanner({ id, name, imageUrl, phase: 'enter' });

      // Start fade-out at 2.4s
      const exitTimer = setTimeout(() => {
        setBanner(prev => prev && prev.id === id ? { ...prev, phase: 'exit' } : prev);
      }, 2400);

      // Remove at 3s
      const removeTimer = setTimeout(() => {
        setBanner(prev => prev && prev.id === id ? null : prev);
      }, 3000);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(removeTimer);
      };
    };

    window.addEventListener('ppr-turn-change', handleTurnChange);
    return () => window.removeEventListener('ppr-turn-change', handleTurnChange);
  }, []);

  if (!banner) return null;

  const gold = '#fbbf24';
  const goldGlow = 'rgba(251, 191, 36, 0.4)';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 99999, pointerEvents: 'none', fontFamily: 'var(--font-body)' }}>
      <div
        key={banner.id}
        style={{
          animation: banner.phase === 'enter'
            ? 'pprSlideInFromTop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            : 'pprFadeOutUp 0.6s ease-in forwards',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          padding: '1.25rem 2.5rem',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,20,0,0.85) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `2px solid ${gold}`,
          boxShadow: `0 4px 40px ${goldGlow}, 0 0 80px rgba(251, 191, 36, 0.15), inset 0 -1px 20px rgba(251, 191, 36, 0.1)`,
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: `3px solid ${gold}`,
          boxShadow: `0 0 20px ${goldGlow}`,
          overflow: 'hidden',
          flexShrink: 0,
          background: 'rgba(251, 191, 36, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {banner.imageUrl ? (
            <img
              src={banner.imageUrl}
              alt={banner.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: gold }}>
              {banner.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.1rem' }}>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '4px',
            color: gold,
            opacity: 0.8,
          }}>
            Iniciativa
          </span>
          <span style={{
            fontSize: '1.6rem',
            fontWeight: 900,
            color: '#ffffff',
            textShadow: `0 0 20px ${goldGlow}`,
            lineHeight: 1.1,
          }}>
            {banner.name}
          </span>
        </div>

        {/* Divider */}
        <div style={{
          width: 2,
          height: 40,
          background: `linear-gradient(180deg, transparent, ${gold}, transparent)`,
          margin: '0 0.5rem',
        }} />

        {/* SUA VEZ! */}
        <span style={{
          fontSize: '1.8rem',
          fontWeight: 900,
          color: gold,
          textTransform: 'uppercase',
          letterSpacing: '6px',
          textShadow: `0 0 30px ${goldGlow}, 0 0 60px rgba(251, 191, 36, 0.2)`,
          animation: 'pprPulseText 1s ease-in-out infinite',
        }}>
          SUA VEZ!
        </span>
      </div>

      <style>
        {`
          @keyframes pprSlideInFromTop {
            0% { transform: translateY(-100%); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes pprFadeOutUp {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-100%); opacity: 0; }
          }
          @keyframes pprPulseText {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
    </div>
  );
};
