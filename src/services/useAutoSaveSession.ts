import { useEffect } from 'react';
import { saveRoomSnapshotToCloud } from './roomPersistenceService';
import { useAuthStore } from '../store/authStore';
import { useIsGM } from '../store/user';

/**
 * Hook de Auto-Save para sessões de mesa ativa.
 * O mesmo RoomBundle usado por backup manual é a única forma gravada em campaigns.snapshot.
 */
export function useAutoSaveSession(roomCode: string) {
  const { user } = useAuthStore();
  const isGM = useIsGM();

  useEffect(() => {
    if (!roomCode || roomCode === 'default-room' || !user?.id || !isGM) return;

    const performSave = async () => {
      try {
        await saveRoomSnapshotToCloud(roomCode);
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
  }, [roomCode, user?.id, isGM]);
}
