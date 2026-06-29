import { useState, useEffect, useCallback } from 'react';
import { RULES_ENGINES, DEFAULT_RULES_ENGINE_ID } from '../rules';

const STORAGE_KEY = 'rulesEngine';

export function useRulesEngine() {
  const [currentEngineId, setCurrentEngineId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_RULES_ENGINE_ID;
  });

  const setEngine = useCallback((id: string) => {
    const engine = RULES_ENGINES.find(e => e.id === id);
    if (!engine) return;
    localStorage.setItem(STORAGE_KEY, id);
    setCurrentEngineId(id);
    
    // Dispatch an event so widgets (like DiceRollerWidget) can react immediately
    window.dispatchEvent(new CustomEvent('rules-engine-changed', {
      detail: { engineId: id }
    }));
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== currentEngineId) {
        setCurrentEngineId(stored);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentEngineId]);

  const currentEngine = RULES_ENGINES.find(e => e.id === currentEngineId) ?? RULES_ENGINES[0];

  return { 
    currentEngine, 
    currentEngineId, 
    setEngine, 
    engines: RULES_ENGINES 
  };
}
