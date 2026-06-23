import React, { useState } from 'react';
import {  Timer, Activity, Zap } from 'lucide-react';
import { DraggableWindow } from '../HUD/DraggableWindow';

import type { TensionClock } from '../../store';

interface ClockConfigModalProps {
  existingClock?: TensionClock;
  onClose: () => void;
  onConfirm: (config: { label: string; durationMs: number; hpMod: string; mpMod: string }, isEdit: boolean) => void;
}

export const ClockConfigModal: React.FC<ClockConfigModalProps> = ({ existingClock, onClose, onConfirm }) => {
  const [label, setLabel] = useState(existingClock ? existingClock.label : 'Bomba Mágica');
  
  const initialMin = existingClock ? Math.floor(existingClock.durationMs / 60000).toString() : '5';
  const initialSec = existingClock ? Math.floor((existingClock.durationMs % 60000) / 1000).toString() : '0';
  
  const [minutes, setMinutes] = useState(initialMin);
  const [seconds, setSeconds] = useState(initialSec);
  const [hpMod, setHpMod] = useState(existingClock ? existingClock.hpMod : '-50%');
  const [mpMod, setMpMod] = useState(existingClock ? existingClock.mpMod : '0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMin = parseFloat(minutes) || 0;
    const parsedSec = parseFloat(seconds) || 0;
    
    const totalMs = (parsedMin * 60 * 1000) + (parsedSec * 1000);
    
    if (totalMs <= 0) {
      return;
    }

    onConfirm({
      label,
      durationMs: totalMs,
      hpMod,
      mpMod
    }, !!existingClock);
  };

  return (
    <DraggableWindow id="clock-config" title={existingClock ? "Editar Relógio" : "Criar Relógio de Tensão"} initialX={window.innerWidth / 2 - 150} initialY={window.innerHeight / 2 - 200} width={300} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nome do Evento</label>
          <input 
            type="text" 
            value={label} 
            onChange={e => setLabel(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Timer size={14}/> Minutos</label>
            <input 
              type="number" 
              min="0"
              value={minutes} 
              onChange={e => setMinutes(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Timer size={14}/> Segundos</label>
            <input 
              type="number" 
              min="0"
              max="59"
              value={seconds} 
              onChange={e => setSeconds(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Activity size={14}/> Modificador de HP (Vida)</label>
          <input 
            type="text" 
            placeholder="Ex: -10, +50, -80%"
            value={hpMod} 
            onChange={e => setHpMod(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}
          />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Use % para porcentagem do valor atual, ou valores fixos (+, -).</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Zap size={14}/> Modificador de MP (Mana)</label>
          <input 
            type="text" 
            placeholder="Ex: -5, +20, 0"
            value={mpMod} 
            onChange={e => setMpMod(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}
          />
        </div>

        <button type="submit" className="btn" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'var(--accent-primary)', color: 'white', fontWeight: 'bold' }}>
          {existingClock ? 'Salvar Alterações' : 'Manifestar Relógio'}
        </button>

      </form>
    </DraggableWindow>
  );
};
