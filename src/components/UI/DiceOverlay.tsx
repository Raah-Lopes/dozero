import React, { useEffect, useState } from 'react';
import { Dices, Flame, Crosshair } from 'lucide-react';

export interface DiceRollEvent {
  id: string;
  title: string;
  result: number | string;
  type: 'attack' | 'heal' | 'utility';
}

export const DiceOverlay: React.FC = () => {
  const [rolls, setRolls] = useState<DiceRollEvent[]>([]);

  useEffect(() => {
    const handleRoll = (e: Event) => {
      const customEvent = e as CustomEvent<DiceRollEvent>;
      const newRoll = { ...customEvent.detail, id: Math.random().toString(36).substr(2, 9) };
      
      setRolls(prev => [...prev, newRoll]);

      // Remove after 2.5 seconds
      setTimeout(() => {
        setRolls(prev => prev.filter(r => r.id !== newRoll.id));
      }, 2500);
    };

    window.addEventListener('dice-roll', handleRoll);
    return () => window.removeEventListener('dice-roll', handleRoll);
  }, []);

  if (rolls.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      pointerEvents: 'none', zIndex: 999999, display: 'flex', flexDirection: 'column', gap: '1rem',
      alignItems: 'center', justifyContent: 'center'
    }}>
      {rolls.map(roll => {
        const color = roll.type === 'attack' ? '#ef4444' : roll.type === 'heal' ? '#10b981' : '#0ea5e9';
        const Icon = roll.type === 'attack' ? Crosshair : roll.type === 'heal' ? Flame : Dices;
        
        return (
          <div 
            key={roll.id}
            style={{
              animation: 'dicePopIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, fadeOutUp 0.5s ease-in 2s forwards',
              background: 'rgba(15, 23, 42, 0.95)',
              border: `2px solid ${color}`,
              boxShadow: `0 0 40px ${color}80, inset 0 0 20px ${color}40`,
              padding: '1.5rem 3.5rem',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backdropFilter: 'blur(12px)',
              transform: 'scale(0)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: color, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
              <Icon size={20} />
              {roll.title}
            </div>
            <div style={{ fontSize: '5rem', lineHeight: 1, fontWeight: 900, color: 'white', textShadow: `0 0 30px ${color}, 0 0 10px white` }}>
              {roll.result}
            </div>
          </div>
        );
      })}
      
      <style>
        {`
          @keyframes dicePopIn {
            0% { transform: scale(0.5) translateY(100px) rotate(-15deg); opacity: 0; }
            70% { transform: scale(1.1) rotate(5deg); opacity: 1; }
            100% { transform: scale(1) translateY(0) rotate(0); opacity: 1; }
          }
          @keyframes fadeOutUp {
            0% { transform: scale(1) translateY(0); opacity: 1; }
            100% { transform: scale(0.8) translateY(-150px); opacity: 0; filter: blur(10px); }
          }
        `}
      </style>
    </div>
  );
};
