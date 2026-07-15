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
    from { transform: translateY(-20px) rotate(12deg); opacity: 1; }
    to   { transform: translateY(110vh) rotate(12deg); opacity: 0.3; }
  }
  @keyframes theater-snow {
    0%   { transform: translateY(-10px) translateX(0); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 0.8; }
    100% { transform: translateY(110vh) translateX(30px); opacity: 0; }
  }
  @keyframes theater-fog {
    0%   { transform: translateX(-5vw); opacity: 0; }
    50%  { opacity: 1; }
    100% { transform: translateX(15vw); opacity: 0; }
  }
  @keyframes theater-fire {
    0%   { transform: scaleY(1) scaleX(1) translateY(0); opacity: 0.8; }
    50%  { transform: scaleY(1.3) scaleX(0.8) translateY(-10vh); opacity: 0.6; }
    100% { transform: scaleY(0.6) scaleX(1.1) translateY(-25vh); opacity: 0; }
  }
  @keyframes theater-float {
    0%   { transform: translateY(0) translateX(0); opacity: 0; }
    20%  { opacity: 1; }
    80%  { opacity: 0.5; }
    100% { transform: translateY(-15vh) translateX(5vw); opacity: 0; }
  }
  @keyframes theater-drip {
    0%   { transform: translateY(0); opacity: 0.8; }
    100% { transform: translateY(20vh); opacity: 0; }
  }
  @keyframes theater-darkness-pulse {
    0%, 100% { opacity: 0.85; }
    50%       { opacity: 0.97; }
  }
  @keyframes theater-lightning {
    0%, 95%, 100% { opacity: 0; }
    96%           { opacity: 0.6; }
    97%           { opacity: 0; }
    98%           { opacity: 0.4; }
  }
`;

function buildParticles(count: number, color: string, mood: MoodType, weather: WeatherType): React.ReactNode[] {
  const items: React.ReactNode[] = [];
  const isRain = weather === 'rain' || weather === 'storm';
  const isFog = weather === 'fog';
  const isFire = weather === 'fire';
  const isSnow = weather === 'snow';

  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 5;
    const duration = isRain ? (0.3 + Math.random() * 0.5) : isFire ? (1.5 + Math.random() * 3) : (4 + Math.random() * 6);
    
    let size = 2 + Math.random() * 3;
    if (isRain) size = 2;
    if (isSnow) size = 4 + Math.random() * 6;
    if (isFog) size = 150 + Math.random() * 200;
    if (isFire) size = 10 + Math.random() * 25;

    const opacity = isFog ? (0.15 + Math.random() * 0.2) : isFire ? (0.5 + Math.random() * 0.5) : (0.4 + Math.random() * 0.5);

    let animationStr = `${duration}s linear ${delay}s infinite normal none running`;
    let style: React.CSSProperties = {
      position: 'absolute',
      left: `${left}%`,
      pointerEvents: 'none',
    };

    if (isRain) {
      style = { ...style, width: '2px', height: `${15 + Math.random() * 20}px`, background: `rgba(147,197,253,${0.5 + Math.random() * 0.4})`, top: '-30px', animation: `theater-rain ${animationStr}` };
    } else if (isSnow) {
      animationStr = `${duration}s ease-in-out ${delay}s infinite normal none running`;
      style = { ...style, width: `${size}px`, height: `${size}px`, background: `rgba(255,255,255,${opacity})`, borderRadius: '50%', top: '-20px', animation: `theater-snow ${animationStr}`, boxShadow: '0 0 8px rgba(255,255,255,0.8)' };
    } else if (isFog) {
      animationStr = `${duration}s ease-in-out ${delay}s infinite normal none running`;
      style = { ...style, width: `${size}px`, height: `${size * 0.6}px`, background: `radial-gradient(ellipse, rgba(148,163,184,${opacity}), transparent 70%)`, borderRadius: '50%', top: `${50 + Math.random() * 50}%`, animation: `theater-fog ${animationStr}`, filter: 'blur(20px)' };
    } else if (isFire) {
      animationStr = `${duration}s ease-in-out ${delay}s infinite normal none running`;
      const fireHue = 10 + Math.random() * 25; // Oranges and reds
      style = { ...style, width: `${size}px`, height: `${size * 1.5}px`, background: `hsl(${fireHue}, 100%, 60%)`, borderRadius: '50% 50% 20% 20%', bottom: '-20px', top: 'auto', opacity, filter: 'blur(4px)', animation: `theater-fire ${animationStr}`, boxShadow: `0 0 ${size}px hsl(${fireHue}, 100%, 50%)` };
    } else {
      animationStr = `${duration}s ease-in-out ${delay}s infinite normal none running`;
      const animName = mood === 'horror' ? 'theater-drip' : 'theater-float';
      style = { ...style, width: `${size}px`, height: `${size}px`, background: color, borderRadius: '50%', top: `${Math.random() * 100}%`, opacity, animation: `${animName} ${animationStr}`, boxShadow: `0 0 6px ${color}` };
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
