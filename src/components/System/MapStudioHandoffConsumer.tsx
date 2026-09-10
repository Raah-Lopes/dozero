import { useEffect } from 'react';
import { indexeddbProvider, state } from '../../services/yjs';
import { addBackground } from '../../store/backgrounds';
import { updateMapConfig } from '../../store/map';
import {
  clearMapStudioHandoff,
  readMapStudioHandoff,
} from '../../services/mapStudioHandoff';
import { toast } from '../UI/Toast';

export function MapStudioHandoffConsumer({ roomCode }: { roomCode: string }) {
  useEffect(() => {
    let cancelled = false;

    const applyPendingMap = async () => {
      if (indexeddbProvider && !indexeddbProvider.synced) {
        await new Promise<void>(resolve => indexeddbProvider.once('synced', resolve));
      }
      if (cancelled) return;

      const pending = readMapStudioHandoff(roomCode);
      if (!pending) return;

      try {
        if (!state.backgrounds.has(pending.background.id)) {
          addBackground(pending.background);
        }
        if (pending.gridSize) updateMapConfig({ gridSize: pending.gridSize });

        if (!state.backgrounds.has(pending.background.id)) {
          throw new Error('O Grid não confirmou o novo fundo.');
        }
        clearMapStudioHandoff(roomCode, pending.background.id);
        toast.success(`Mapa “${pending.background.name}” inserido no Grid.`);
      } catch (error) {
        console.error('[MapStudio] Falha ao concluir entrega ao Grid:', error);
        toast.error('O mapa continua pendente. Recarregue a mesa para tentar novamente.');
      }
    };

    void applyPendingMap();
    return () => { cancelled = true; };
  }, [roomCode]);

  return null;
}
