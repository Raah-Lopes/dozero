// src/components/Theater/MoodEngine.tsx
//
// Wraps the Theater scene with mood-driven color tints, particle effects, and
// weather overlays. Uses React state (not injected <style>) so that transitions
// react correctly when mood/weather changes at runtime.
//
import React, { useMemo } from 'react';
import type { MoodType, WeatherType } from '../../store';

interface MoodEngineProps {
  mood: MoodType;
  weather: WeatherType;
  children: React.ReactNode;
  bgElement?: React.ReactNode;
}

const MOOD_CONFIGS: Record<MoodType, { tint: string; accent: string; particleColor: string; filter: string }> = {
  neutral:   { tint: 'rgba(15,23,42,0)',        accent: '#6366f1', particleColor: '#818cf8', filter: 'none' },
  suspense:  { tint: 'rgba(88,28,135,0.35)',    accent: '#a855f7', particleColor: '#c084fc', filter: 'none' },
  horror:    { tint: 'rgba(127,29,29,0.45)',    accent: '#dc2626', particleColor: '#f87171', filter: 'saturate(0.5) brightness(0.85)' },
  adventure: { tint: 'rgba(120,53,15,0.35)',   accent: '#f59e0b', particleColor: '#fbbf24', filter: 'none' },
  victory:   { tint: 'rgba(6,78,59,0.35)',     accent: '#10b981', particleColor: '#34d399', filter: 'none' },
  sadness:   { tint: 'rgba(15,23,42,0.5)',     accent: '#64748b', particleColor: '#94a3b8', filter: 'saturate(0.3) brightness(0.8)' },
  mystery:   { tint: 'rgba(46,16,101,0.4)',    accent: '#8b5cf6', particleColor: '#a78bfa', filter: 'none' },
  combat:    { tint: 'rgba(153,27,27,0.45)',   accent: '#ef4444', particleColor: '#f97316', filter: 'contrast(1.05)' },
};

// CSS animations as a static string — injected once, not per render
const KEYFRAMES = `
  @keyframes theater-rain {
    from { transform: translateY(-30px) rotate(14deg); opacity: 0.9; }
    to   { transform: translateY(115vh) rotate(14deg); opacity: 0.2; }
  }
  @keyframes theater-snow {
    0%   { transform: translateY(-10px) translateX(0) rotate(0deg); opacity: 0; }
    15%  { opacity: 0.85; }
    85%  { opacity: 0.75; }
    100% { transform: translateY(110vh) translateX(40px) rotate(360deg); opacity: 0; }
  }
  @keyframes theater-fog {
    0%   { transform: translateX(-8vw) scale(1); opacity: 0; }
    30%  { opacity: 0.45; }
    70%  { opacity: 0.45; }
    100% { transform: translateX(20vw) scale(1.15); opacity: 0; }
  }
  @keyframes theater-fire {
    0%   { transform: scale(0.6) translateY(0) translateX(0); opacity: 0; }
    20%  { opacity: 0.9; transform: scale(1.1) translateY(-6vh) translateX(-8px); }
    60%  { opacity: 0.7; transform: scale(0.9) translateY(-18vh) translateX(12px); }
    100% { transform: scale(0.4) translateY(-32vh) translateX(-15px); opacity: 0; }
  }
  @keyframes theater-sparkle {
    0%   { transform: translateY(0) translateX(0) scale(0.5); opacity: 0; }
    25%  { opacity: 0.85; transform: scale(1.2); }
    75%  { opacity: 0.6; }
    100% { transform: translateY(-20vh) translateX(15px) scale(0.3); opacity: 0; }
  }
  @keyframes theater-float {
    0%   { transform: translateY(0) translateX(0); opacity: 0; }
    25%  { opacity: 0.8; }
    75%  { opacity: 0.4; }
    100% { transform: translateY(-18vh) translateX(8vw); opacity: 0; }
  }
  @keyframes theater-drip {
    0%   { transform: translateY(0); opacity: 0.85; }
    80%  { opacity: 0.7; }
    100% { transform: translateY(25vh); opacity: 0; }
  }
  @keyframes theater-darkness-pulse {
    0%, 100% { opacity: 0.85; transform: scale(1); }
    50%       { opacity: 0.98; transform: scale(1.02); }
  }
  @keyframes theater-lightning {
    0%, 94%, 100% { opacity: 0; }
    95%           { opacity: 0.85; }
    96%           { opacity: 0.1; }
    97%           { opacity: 0.65; }
    98%           { opacity: 0; }
  }
`;

function buildParticles(count: number, color: string, mood: MoodType, weather: WeatherType): React.ReactNode[] {
  const items: React.ReactNode[] = [];
  const isRain = weather === 'rain' || weather === 'storm';
  const isFog = weather === 'fog';
  const isFire = weather === 'fire';
  const isSnow = weather === 'snow';
  const isArcane = mood === 'mystery' || mood === 'adventure' || mood === 'victory';

  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 6;
    const duration = isRain ? (0.25 + Math.random() * 0.45) 
      : isFire ? (1.8 + Math.random() * 2.5) 
      : isSnow ? (3.5 + Math.random() * 5)
      : isFog ? (8 + Math.random() * 8)
      : (3.5 + Math.random() * 5);
    
    let size = 3 + Math.random() * 4;
    if (isRain) size = weather === 'storm' ? 3 : 2;
    if (isSnow) size = 4 + Math.random() * 6;
    if (isFog) size = 180 + Math.random() * 220;
    if (isFire) size = 4 + Math.random() * 8;

    let style: React.CSSProperties = {
      position: 'absolute',
      left: `${left}%`,
      pointerEvents: 'none',
    };

    if (isRain) {
      const dropHeight = weather === 'storm' ? (25 + Math.random() * 30) : (18 + Math.random() * 20);
      const rainOpacity = weather === 'storm' ? (0.6 + Math.random() * 0.4) : (0.4 + Math.random() * 0.35);
      style = {
        ...style,
        width: '2px',
        height: `${dropHeight}px`,
        background: `linear-gradient(to bottom, transparent, rgba(186, 230, 253, ${rainOpacity}))`,
        top: '-35px',
        animation: `theater-rain ${duration}s linear ${delay}s infinite normal none running`,
        filter: weather === 'storm' ? 'drop-shadow(0 0 2px rgba(186,230,253,0.5))' : 'none',
      };
    } else if (isSnow) {
      const snowOpacity = 0.5 + Math.random() * 0.5;
      style = {
        ...style,
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle, rgba(255,255,255,${snowOpacity}) 0%, rgba(255,255,255,0.2) 70%, transparent 100%)`,
        borderRadius: '50%',
        top: '-20px',
        animation: `theater-snow ${duration}s ease-in-out ${delay}s infinite normal none running`,
        boxShadow: '0 0 6px rgba(255,255,255,0.7)',
      };
    } else if (isFog) {
      const fogOpacity = 0.12 + Math.random() * 0.18;
      style = {
        ...style,
        width: `${size}px`,
        height: `${size * 0.6}px`,
        background: `radial-gradient(ellipse, rgba(148, 163, 184, ${fogOpacity}), transparent 70%)`,
        borderRadius: '50%',
        top: `${40 + Math.random() * 60}%`,
        animation: `theater-fog ${duration}s ease-in-out ${delay}s infinite normal none running`,
        filter: 'blur(30px)',
      };
    } else if (isFire) {
      const fireHue = 15 + Math.random() * 30; // Golden orange to crimson
      const fireOpacity = 0.6 + Math.random() * 0.4;
      style = {
        ...style,
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle, hsl(${fireHue}, 100%, 70%) 0%, hsl(${fireHue}, 100%, 50%) 60%, transparent 100%)`,
        borderRadius: '50%',
        bottom: '-10px',
        top: 'auto',
        opacity: fireOpacity,
        animation: `theater-fire ${duration}s ease-out ${delay}s infinite normal none running`,
        boxShadow: `0 0 ${size * 2}px hsl(${fireHue}, 100%, 55%)`,
      };
    } else if (isArcane) {
      const sparkOpacity = 0.5 + Math.random() * 0.5;
      style = {
        ...style,
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle, ${color} 0%, ${color}80 50%, transparent 100%)`,
        borderRadius: '50%',
        top: `${30 + Math.random() * 70}%`,
        opacity: sparkOpacity,
        animation: `theater-sparkle ${duration}s ease-in-out ${delay}s infinite normal none running`,
        boxShadow: `0 0 10px ${color}`,
      };
    } else {
      const animName = mood === 'horror' ? 'theater-drip' : 'theater-float';
      style = {
        ...style,
        width: `${size}px`,
        height: `${size}px`,
        background: color,
        borderRadius: '50%',
        top: `${Math.random() * 100}%`,
        opacity: 0.6,
        animation: `${animName} ${duration}s ease-in-out ${delay}s infinite normal none running`,
        boxShadow: `0 0 6px ${color}`,
      };
    }

    items.push(<div key={i} style={style} />);
  }
  return items;
}

export const MoodEngine: React.FC<MoodEngineProps> = ({ mood, weather, children, bgElement }) => {
  const config = MOOD_CONFIGS[mood];

  const particleCount = weather === 'rain' ? 120
    : weather === 'storm' ? 250
    : weather === 'snow' ? 100
    : weather === 'fog' ? 35
    : weather === 'fire' ? 80
    : mood === 'neutral' ? 0
    : 40;

  // Re-generate particles only when mood or weather changes
  const particles = useMemo(
    () => particleCount > 0 ? buildParticles(particleCount, config.particleColor, mood, weather) : [],
    [mood, weather] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const weatherFilter: string = {
    clear:    'none',
    rain:     'brightness(0.88) saturate(0.85)',
    storm:    'brightness(0.75) saturate(0.8) contrast(1.1)',
    fog:      'brightness(0.9) saturate(0.6)',
    snow:     'brightness(1.05) saturate(0.75)',
    fire:     'brightness(1.0) sepia(0.3) saturate(1.3)',
    darkness: 'brightness(0.6) saturate(0.5)',
  }[weather] ?? 'none';

  // Combine mood filter + weather filter
  const combinedFilter = [config.filter, weatherFilter].filter(f => f !== 'none').join(' ') || 'none';

  return (
    <div
      className="theater-root"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        '--theater-accent': config.accent,
      } as React.CSSProperties}
    >
      {/* Static keyframes — injected once */}
      <style>{KEYFRAMES}</style>

      {/* Scene background layers — filter applied HERE only, never affects UI */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        filter: combinedFilter,
        transition: 'filter 1.2s ease',
        pointerEvents: 'none',
      }}>
        {/* Background Element (Image) rendered before the tint */}
        {bgElement}

        {/* Mood tint overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: config.tint,
          transition: 'background 1.5s ease',
        }} />

        {/* Darkness vignette */}
        {weather === 'darkness' && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.85) 100%)',
            animation: 'theater-darkness-pulse 4s ease-in-out infinite',
          }} />
        )}

        {/* Storm blue tint */}
        {weather === 'storm' && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'rgba(59,130,246,0.06)',
            animation: 'theater-lightning 8s ease-in-out infinite',
          }} />
        )}

        {/* Particles */}
        <div key={`${mood}-${weather}`} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {particles}
        </div>
      </div>

      {/* Content — completely outside the filter, UI always crisp */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
};
