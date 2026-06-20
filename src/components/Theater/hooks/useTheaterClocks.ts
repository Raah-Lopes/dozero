// src/components/Theater/hooks/useTheaterClocks.ts
import { useState, useEffect } from 'react';
import { state, type TensionClock } from '../../../store';

export function useTheaterClocks() {
  const [clocks, setClocks] = useState<TensionClock[]>([]);

  useEffect(() => {
    const handler = () => {
      const arr: TensionClock[] = [];
      for (const [, v] of state.clocks.entries()) {
        arr.push(v as TensionClock);
      }
      setClocks(arr.sort((a, b) => a.label.localeCompare(b.label)));
    };
    handler();
    state.clocks.observe(handler);
    return () => state.clocks.unobserve(handler);
  }, []);

  return clocks;
}
