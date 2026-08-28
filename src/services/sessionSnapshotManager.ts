import { state, doc } from './yjs';
import { synchronizeActiveTableScene } from '../store/tableScenes';
import { saveSessionSnapshot, loadSessionSnapshot } from './campaignCloudService';
import { toast } from '../components/UI/Toast';

export interface TableSnapshot {
  tokens?: Record<string, any>;
  backgrounds?: Record<string, any>;
  drawings?: Record<string, any>;
  walls?: Record<string, any>;
  fogOps?: Record<string, any>;
  clocks?: Record<string, any>;
  grid?: Record<string, any>;
  combat?: Record<string, any>;
  theater?: Record<string, any>;
  tableScenes?: Record<string, any>;
  tableSceneMeta?: Record<string, any>;
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
    walls: state.walls.toJSON(),
    fogOps: state.fogOps.toJSON(),
    clocks: state.clocks.toJSON(),
    grid: state.mapConfig.toJSON(),
    combat: state.combat.toJSON(),
    theater: state.theater.toJSON(),
    tableScenes: state.tableScenes.toJSON(),
    tableSceneMeta: state.tableSceneMeta.toJSON(),
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
      Array.from(state.tokens.keys()).forEach(k => {
        if (!snapshot.tokens![k]) state.tokens.delete(k);
      });
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
    if (snapshot.drawings && typeof snapshot.drawings === 'object') {
      Array.from(state.drawings.keys()).forEach(k => {
        if (!snapshot.drawings![k]) state.drawings.delete(k);
      });
      Object.entries(snapshot.drawings).forEach(([k, v]) => {
        state.drawings.set(k, v);
      });
    }

    // 4. FogOps
    if (snapshot.walls && typeof snapshot.walls === 'object') {
      Array.from(state.walls.keys()).forEach(k => {
        if (!snapshot.walls![k]) state.walls.delete(k);
      });
      Object.entries(snapshot.walls).forEach(([k, v]) => state.walls.set(k, v));
    }

    // 5. FogOps
    if (snapshot.fogOps && typeof snapshot.fogOps === 'object') {
      Array.from(state.fogOps.keys()).forEach(k => {
        if (!snapshot.fogOps![k]) state.fogOps.delete(k);
      });
      Object.entries(snapshot.fogOps).forEach(([k, v]) => {
        state.fogOps.set(k, v);
      });
    }

    // 5. Clocks
    if (snapshot.clocks && typeof snapshot.clocks === 'object') {
      Array.from(state.clocks.keys()).forEach(k => {
        if (!snapshot.clocks![k]) state.clocks.delete(k);
      });
      Object.entries(snapshot.clocks).forEach(([k, v]) => {
        state.clocks.set(k, v);
      });
    }

    // 6. Grid / MapConfig
    if (snapshot.grid && typeof snapshot.grid === 'object') {
      Object.entries(snapshot.grid).forEach(([k, v]) => {
        state.mapConfig.set(k, v);
      });
    }

    // 7. Combat
    if (snapshot.combat && typeof snapshot.combat === 'object') {
      Object.entries(snapshot.combat).forEach(([k, v]) => {
        state.combat.set(k, v);
      });
    }

    if (snapshot.tableScenes && typeof snapshot.tableScenes === 'object') {
      Array.from(state.tableScenes.keys()).forEach(k => {
        if (!snapshot.tableScenes![k]) state.tableScenes.delete(k);
      });
      Object.entries(snapshot.tableScenes).forEach(([k, v]) => state.tableScenes.set(k, v));
    }

    if (snapshot.tableSceneMeta && typeof snapshot.tableSceneMeta === 'object') {
      Array.from(state.tableSceneMeta.keys()).forEach(k => {
        if (!snapshot.tableSceneMeta![k]) state.tableSceneMeta.delete(k);
      });
      Object.entries(snapshot.tableSceneMeta).forEach(([k, v]) => state.tableSceneMeta.set(k, v));
    }

    // 7. Notificação no chat
    state.chat.push([{
      text: `🔄 <b>Restauração de Mesa:</b> O estado da mesa foi restaurado para o ponto salvo em ${new Date(snapshot.savedAt).toLocaleString()}.`,
      timestamp: Date.now(),
      isCritical: true,
      isFailure: false
    }]);
  });

  synchronizeActiveTableScene();

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
