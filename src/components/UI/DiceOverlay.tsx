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
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      pointerEvents: 'none', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '1rem',
      alignItems: 'center', justifyContent: 'center'
    }}>
      {rolls.map(roll => {
        const color = roll.type === 'attack' ? 'var(--danger)' : roll.type === 'heal' ? 'var(--success)' : 'var(--accent-primary)';
        const Icon = roll.type === 'attack' ? Crosshair : roll.type === 'heal' ? Flame : Dices;
        
        return (
          <div 
            key={roll.id}
            style={{
              animation: 'dicePopIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, fadeOutUp 0.5s ease-in 2s forwards',
              background: 'rgba(0,0,0,0.8)',
              border: `2px solid ${color}`,
              boxShadow: `0 0 30px ${color}80, inset 0 0 15px ${color}40`,
              padding: '1rem 3rem',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backdropFilter: 'blur(10px)',
              transform: 'scale(0)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: color, fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>
              <Icon size={24} />
              {roll.title}
            </div>
            <div style={{ fontSize: '4rem', fontWeight: 900, color: 'white', textShadow: `0 0 20px ${color}` }}>
              {roll.result}
            </div>
          </div>
        );
      })}
      
      <style>
        {`
          @keyframes dicePopIn {
            0% { transform: scale(0.5) translateY(50px) rotate(-10deg); opacity: 0; }
            70% { transform: scale(1.1) rotate(5deg); }
            100% { transform: scale(1) translateY(0) rotate(0); opacity: 1; }
          }
          @keyframes fadeOutUp {
            0% { transform: scale(1) translateY(0); opacity: 1; }
            100% { transform: scale(0.8) translateY(-100px); opacity: 0; filter: blur(5px); }
          }
        `}
      </style>
    </div>
  );
};
