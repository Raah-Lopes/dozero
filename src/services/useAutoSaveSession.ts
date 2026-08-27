import { useEffect, useRef } from 'react';
import { state } from './yjs';
import { saveSessionSnapshot } from './campaignCloudService';
import { useAuthStore } from '../store/authStore';

/**
 * Hook de Auto-Save para sessões de mesa ativa.
 * Salva periodicamente (a cada 5 minutos) o estado consolidado da mesa em campaigns.snapshot
 * e salva automaticamente quando a janela for fechada/descarregada.
 */
export function useAutoSaveSession(roomCode: string) {
  const { user } = useAuthStore();
  const lastSaveRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!roomCode || roomCode === 'default-room') return;

    const performSave = async () => {
      if (!user?.id) return;
      try {
        const snapshot = {
          tokens: state.tokens.toJSON(),
          backgrounds: state.backgrounds.toJSON(),
          drawings: state.drawings.toJSON(),
          clocks: state.clocks.toJSON(),
          mapConfig: state.mapConfig.toJSON(),
          wiki: state.wiki.toJSON(),
          sheets: state.sheets.toJSON(),
          savedAt: new Date().toISOString(),
          savedBy: user?.id || 'anon'
        };

        await saveSessionSnapshot(roomCode, snapshot);
        lastSaveRef.current = Date.now();
      } catch (err) {
        console.warn('[AutoSaveSession] Falha ao salvar snapshot:', err);
      }
    };

    // Auto-save a cada 5 minutos (300.000 ms)
    const interval = setInterval(performSave, 5 * 60 * 1000);

    // Save ao fechar a aba/janela
    const handleBeforeUnload = () => {
      performSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomCode, user?.id]);
}
