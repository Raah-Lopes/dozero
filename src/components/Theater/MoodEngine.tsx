// src/components/Theater/MoodEngine.tsx
import React from 'react';
import type { MoodType, WeatherType } from '../../store';

interface MoodEngineProps {
  mood: MoodType;
  weather: WeatherType;
  children: React.ReactNode;
}

const MOOD_CONFIGS: Record<MoodType, { bg: string; accent: string; particleColor: string; filter: string }> = {
  neutral:   { bg: '#0f172a', accent: '#6366f1', particleColor: '#818cf8', filter: 'none' },
  suspense:  { bg: '#110820', accent: '#a855f7', particleColor: '#c084fc', filter: 'none' },
  horror:    { bg: '#0d0000', accent: '#dc2626', particleColor: '#f87171', filter: 'saturate(0.7)' },
  adventure: { bg: '#071428', accent: '#f59e0b', particleColor: '#fbbf24', filter: 'none' },
  victory:   { bg: '#061412', accent: '#10b981', particleColor: '#34d399', filter: 'none' },
  sadness:   { bg: '#050d1a', accent: '#64748b', particleColor: '#94a3b8', filter: 'saturate(0.5)' },
  mystery:   { bg: '#0a0a1a', accent: '#8b5cf6', particleColor: '#a78bfa', filter: 'none' },
  combat:    { bg: '#180800', accent: '#ef4444', particleColor: '#f97316', filter: 'none' },
};

const WEATHER_CLASSES: Record<WeatherType, string> = {
  clear:    '',
  rain:     'weather-rain',
  storm:    'weather-storm',
  fog:      'weather-fog',
  snow:     'weather-snow',
  fire:     'weather-fire',
  darkness: 'weather-darkness',
};

function generateParticles(count: number, color: string, mood: MoodType, weather: WeatherType): React.ReactNode[] {
  const items: React.ReactNode[] = [];
  const isRain = weather === 'rain' || weather === 'storm';
  const isFog = weather === 'fog';
  const isFire = weather === 'fire';
  const isSnow = weather === 'snow';

  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 5;
    const duration = isRain ? (0.5 + Math.random() * 0.8) : (3 + Math.random() * 5);
    const size = isRain ? 1 : isSnow ? (3 + Math.random() * 5) : isFog ? (60 + Math.random() * 80) : (2 + Math.random() * 3);
    const opacity = isFog ? 0.03 + Math.random() * 0.05 : (0.3 + Math.random() * 0.6);

    let style: React.CSSProperties = {
      position: 'absolute',
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      animationIterationCount: 'infinite',
      pointerEvents: 'none',
    };

    if (isRain) {
      style = {
        ...style,
        width: '1px',
        height: `${6 + Math.random() * 12}px`,
        background: `rgba(147, 197, 253, ${0.4 + Math.random() * 0.4})`,
        top: '-20px',
        animationName: 'theater-rain',
        animationTimingFunction: 'linear',
      };
    } else if (isSnow) {
      style = {
        ...style,
        width: `${size}px`,
        height: `${size}px`,
        background: `rgba(255,255,255,${opacity})`,
        borderRadius: '50%',
        top: '-10px',
        animationName: 'theater-snow',
        animationTimingFunction: 'ease-in-out',
      };
    } else if (isFog) {
      style = {
        ...style,
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle, rgba(148,163,184,${opacity}), transparent 70%)`,
        borderRadius: '50%',
        top: `${Math.random() * 100}%`,
        animationName: 'theater-fog',
        animationTimingFunction: 'ease-in-out',
      };
    } else if (isFire) {
      const fireHue = 15 + Math.random() * 30;
      style = {
        ...style,
        width: `${size}px`,
        height: `${size * 2}px`,
        background: `hsl(${fireHue}, 100%, 55%)`,
        borderRadius: '50% 50% 20% 20%',
        bottom: '0',
        top: 'auto',
        opacity,
        filter: 'blur(1px)',
        animationName: 'theater-fire',
        animationTimingFunction: 'ease-in-out',
      };
    } else {
      // Default sparks/particles for mood
      style = {
        ...style,
        width: `${size}px`,
        height: `${size}px`,
        background: color,
        borderRadius: '50%',
        top: `${Math.random() * 100}%`,
        opacity,
        animationName: mood === 'horror' ? 'theater-drip' : 'theater-float',
        animationTimingFunction: 'ease-in-out',
      };
    }

    items.push(<div key={i} style={style} />);
  }
  return items;
}

export const MoodEngine: React.FC<MoodEngineProps> = ({ mood, weather, children }) => {
  const config = MOOD_CONFIGS[mood];
  const weatherClass = WEATHER_CLASSES[weather];

  const particleCount = weather === 'rain' ? 60 : weather === 'storm' ? 100 : weather === 'fog' ? 12 : mood === 'neutral' ? 0 : 20;

  return (
    <>
      <style>{`
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
          0%   { transform: translateX(-30px); opacity: 0; }
          50%  { opacity: 1; }
          100% { transform: translateX(60px); opacity: 0; }
        }
        @keyframes theater-fire {
          0%   { transform: scaleY(1) scaleX(1) translateY(0); opacity: 0.8; }
          50%  { transform: scaleY(1.3) scaleX(0.8) translateY(-20px); opacity: 0.6; }
          100% { transform: scaleY(0.6) scaleX(1.1) translateY(-40px); opacity: 0; }
        }
        @keyframes theater-float {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 0.5; }
          100% { transform: translateY(-80px) translateX(20px); opacity: 0; }
        }
        @keyframes theater-drip {
          0%   { transform: translateY(0); opacity: 0.8; }
          100% { transform: translateY(120px); opacity: 0; }
        }
        @keyframes theater-darkness-pulse {
          0%, 100% { opacity: 0.85; }
          50%       { opacity: 0.95; }
        }
        .theater-root {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: ${config.bg};
          filter: ${config.filter};
          transition: background 1.2s ease, filter 1.2s ease;
          --theater-accent: ${config.accent};
          --theater-bg: ${config.bg};
        }
        .theater-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }
        .theater-content {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
        }
        ${weather === 'darkness' ? `
        .theater-root::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.85) 100%);
          pointer-events: none;
          z-index: 3;
          animation: theater-darkness-pulse 4s ease-in-out infinite;
        }` : ''}
        ${weather === 'storm' ? `
        .theater-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(59, 130, 246, 0.04);
          pointer-events: none;
          z-index: 0;
          animation: theater-fog 8s ease-in-out infinite alternate;
        }` : ''}
      `}</style>

      <div className={`theater-root ${weatherClass}`}>
        <div className="theater-particles">
          {particleCount > 0 && generateParticles(particleCount, config.particleColor, mood, weather)}
        </div>
        <div className="theater-content">
          {children}
        </div>
      </div>
    </>
  );
};
