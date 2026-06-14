import React, { useEffect, useState } from 'react';
import { state, triggerClockConsequence } from '../../store';
import type { TensionClock } from '../../store';
import { TensionClockWidget } from './TensionClockWidget';

export const TensionClockManager: React.FC<{ onEditClock: (id: string) => void }> = ({ onEditClock }) => {
  const [clocks, setClocks] = useState<TensionClock[]>([]);
  const isGM = localStorage.getItem('isGM') === 'true';

  useEffect(() => {
    // Carrega iniciais ignorando corrompidos
    const validClocks = Array.from(state.clocks.values()).filter(c => c && typeof c.endTime === 'number' && !isNaN(c.endTime));
    setClocks(validClocks);

    // Observa mudanças (Yjs)
    const observer = () => {
      const rawClocks = Array.from(state.clocks.values());
      const updatedClocks = rawClocks.filter(c => c && c.id); // Apenas valida se tem ID
      console.log('[DEBUG] TensionClockManager observer detectou mudança. Total raw:', rawClocks.length, 'Validos:', updatedClocks.length, updatedClocks);
      setClocks(updatedClocks as TensionClock[]);
    };

    state.clocks.observe(observer);

    return () => {
      state.clocks.unobserve(observer);
    };
  }, []);

  // Loop para verificar se algum relógio chegou a zero (apenas o GM verifica para não duplicar consequências)
  useEffect(() => {
    if (!isGM) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const currentClocks = Array.from(state.clocks.values());

      currentClocks.forEach(c => {
        if (c.isRunning) {
          const remaining = Math.max(0, c.endTime - now);
          if (remaining <= 0) {
            triggerClockConsequence(c.id);
          }
        }
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isGM]);

  console.log('[DEBUG] TensionClockManager renderizando widgets para', clocks.length, 'relógios');

  return (
    <>
      {clocks.map(clock => (
        <TensionClockWidget key={clock.id} clock={clock} isGM={isGM} onEdit={() => onEditClock(clock.id)} />
      ))}
    </>
  );
};
