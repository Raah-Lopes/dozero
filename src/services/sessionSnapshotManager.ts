import { state, doc } from './yjs';
import { saveSessionSnapshot, loadSessionSnapshot } from './campaignCloudService';
import { toast } from '../components/UI/Toast';

export interface TableSnapshot {
  tokens?: Record<string, any>;
  backgrounds?: Record<string, any>;
  drawings?: any[];
  clocks?: Record<string, any>;
  grid?: Record<string, any>;
  combat?: Record<string, any>;
  theater?: Record<string, any>;
  savedAt: string;
  savedBy?: string;
  roomCode: string;
}

/**
 * Cria o snapshot atual em memória da mesa ativa
 */
export function captureCurrentTableSnapshot(roomCode: string, userId?: string | null): TableSnapshot {
  return {
    tokens: state.tokens.toJSON(),
    backgrounds: state.backgrounds.toJSON(),
    drawings: state.drawings.toJSON(),
    clocks: state.clocks.toJSON(),
    grid: state.grid.toJSON(),
    combat: state.combat.toJSON(),
    theater: state.theater.toJSON(),
    savedAt: new Date().toISOString(),
    savedBy: userId || 'anon',
    roomCode
  };
}

/**
 * Aplica um snapshot restaurando o estado no Yjs em uma única transação atômica
 */
export function applyTableSnapshot(snapshot: TableSnapshot): boolean {
  if (!snapshot) return false;

  doc.transact(() => {
    // 1. Tokens
    if (snapshot.tokens && typeof snapshot.tokens === 'object') {
      // Limpa tokens antigos que não estão no snapshot
      Array.from(state.tokens.keys()).forEach(k => {
        if (!snapshot.tokens![k]) state.tokens.delete(k);
      });
      // Insere/atualiza tokens do snapshot
      Object.entries(snapshot.tokens).forEach(([k, v]) => {
        state.tokens.set(k, v);
      });
    }

    // 2. Backgrounds
    if (snapshot.backgrounds && typeof snapshot.backgrounds === 'object') {
      Array.from(state.backgrounds.keys()).forEach(k => {
        if (!snapshot.backgrounds![k]) state.backgrounds.delete(k);
      });
      Object.entries(snapshot.backgrounds).forEach(([k, v]) => {
        state.backgrounds.set(k, v);
      });
    }

    // 3. Drawings
    if (Array.isArray(snapshot.drawings)) {
      state.drawings.delete(0, state.drawings.length);
      state.drawings.push(snapshot.drawings);
    }

    // 4. Clocks
    if (snapshot.clocks && typeof snapshot.clocks === 'object') {
      Array.from(state.clocks.keys()).forEach(k => {
        if (!snapshot.clocks![k]) state.clocks.delete(k);
      });
      Object.entries(snapshot.clocks).forEach(([k, v]) => {
        state.clocks.set(k, v);
      });
    }

    // 5. Grid
    if (snapshot.grid && typeof snapshot.grid === 'object') {
      Object.entries(snapshot.grid).forEach(([k, v]) => {
        state.grid.set(k, v);
      });
    }

    // 6. Combat
    if (snapshot.combat && typeof snapshot.combat === 'object') {
      Object.entries(snapshot.combat).forEach(([k, v]) => {
        state.combat.set(k, v);
      });
    }

    // 7. Notificação no chat
    state.chat.push([{
      text: `🔄 <b>Restauração de Mesa:</b> O estado da mesa foi restaurado para o ponto salvo em ${new Date(snapshot.savedAt).toLocaleString()}.`,
      timestamp: Date.now(),
      isCritical: true,
      isFailure: false
    }]);
  });

  return true;
}

/**
 * Salva o snapshot da mesa no Supabase
 */
export async function createManualSnapshot(roomCode: string, userId?: string | null): Promise<boolean> {
  const snapshot = captureCurrentTableSnapshot(roomCode, userId);
  const ok = await saveSessionSnapshot(roomCode, snapshot);
  if (ok) {
    // Também salva cópia em cache local
    localStorage.setItem(`dozero_snapshot_${roomCode}`, JSON.stringify(snapshot));
    toast.success('Ponto de restauração da mesa salvo na nuvem!');
  } else {
    toast.error('Erro ao salvar snapshot na nuvem.');
  }
  return ok;
}

/**
 * Restaura o snapshot mais recente da mesa a partir da nuvem ou cache local
 */
export async function restoreCloudSnapshot(roomCode: string): Promise<boolean> {
  const cloudSnapshot = await loadSessionSnapshot(roomCode);
  const target = cloudSnapshot || JSON.parse(localStorage.getItem(`dozero_snapshot_${roomCode}`) || 'null');

  if (!target) {
    toast.warn('Nenhum ponto de restauração encontrado para esta mesa.');
    return false;
  }

  const ok = applyTableSnapshot(target);
  if (ok) {
    toast.success(`Mesa restaurada com sucesso para ${new Date(target.savedAt).toLocaleTimeString()}!`);
  } else {
    toast.error('Falha ao restaurar dados do snapshot.');
  }
  return ok;
}

/**
 * Exporta o snapshot da mesa atual como arquivo .JSON para download
 */
export function exportSnapshotToFile(roomCode: string, userId?: string | null) {
  const snapshot = captureCurrentTableSnapshot(roomCode, userId);
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_mesa_${roomCode}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Arquivo de backup baixado com sucesso!');
}

/**
 * Importa um arquivo .JSON de backup e restaura na mesa
 */
export async function importSnapshotFromFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(String(e.target?.result));
        if (data && data.savedAt) {
          applyTableSnapshot(data);
          toast.success(`Backup do arquivo "${file.name}" restaurado na mesa!`);
          resolve(true);
        } else {
          toast.error('Arquivo de backup inválido.');
          resolve(false);
        }
      } catch {
        toast.error('Erro ao ler o arquivo JSON de backup.');
        resolve(false);
      }
    };
    reader.readAsText(file);
  });
}
