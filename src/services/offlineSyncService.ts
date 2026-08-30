export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'conflict' | 'error';

export interface OfflineOperation {
  id: string;
  type: 'snapshot_save' | 'scene_update' | 'character_vault' | 'wiki_save';
  roomCode: string;
  payload: any;
  timestamp: string;
  retries: number;
  error?: string;
}

export interface SyncConflictData {
  roomCode: string;
  localTimestamp: string;
  remoteTimestamp: string;
  localPayload: any;
  remotePayload: any;
}

export interface SyncState {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  conflict: SyncConflictData | null;
  errorMessage: string | null;
}

// Armazenamento em memória (usado também em testes ou fallback)
let inMemoryQueue: OfflineOperation[] = [];

let syncState: SyncState = {
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  lastSyncedAt: null,
  conflict: null,
  errorMessage: null
};

type SyncListener = (state: SyncState) => void;
const listeners = new Set<SyncListener>();

function notifyListeners() {
  const current = { ...syncState };
  listeners.forEach(fn => {
    try {
      fn(current);
    } catch (e) {
      console.error('[OfflineSync] Erro no listener:', e);
    }
  });
}

export function subscribeSyncState(fn: SyncListener): () => void {
  listeners.add(fn);
  fn({ ...syncState });
  return () => listeners.delete(fn);
}

export function getSyncState(): SyncState {
  return { ...syncState };
}

// ============================================================================
// INDEXEDDB QUEUE STORAGE
// ============================================================================
function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB não suportado'));
    }
    const req = indexedDB.open('dozero_offline_queue_db', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function persistQueueIDB(queue: OfflineOperation[]): Promise<void> {
  try {
    const db = await openQueueDB();
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    store.clear();
    queue.forEach(op => store.put(op));
    await new Promise((res) => { tx.oncomplete = res; });
  } catch (e) {
    // Fallback silencioso para memória
  }
}

async function loadQueueIDB(): Promise<OfflineOperation[]> {
  try {
    const db = await openQueueDB();
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const req = store.getAll();
    return await new Promise((res) => {
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => res([]);
    });
  } catch (e) {
    return [];
  }
}

// Inicializa fila persistida
if (typeof window !== 'undefined') {
  loadQueueIDB().then(saved => {
    if (saved && saved.length > 0) {
      inMemoryQueue = saved;
      syncState.pendingCount = saved.length;
      if (syncState.status === 'synced') {
        syncState.status = 'pending';
      }
      notifyListeners();
    }
  });

  window.addEventListener('online', () => {
    syncState.isOnline = true;
    if (inMemoryQueue.length > 0) {
      syncState.status = 'pending';
      processSyncQueue();
    } else {
      syncState.status = 'synced';
      notifyListeners();
    }
  });

  window.addEventListener('offline', () => {
    syncState.isOnline = false;
    syncState.status = 'offline';
    notifyListeners();
  });
}

/**
 * Enfileira uma operação offline para sincronização posterior
 */
export async function enqueueSyncOperation(
  type: OfflineOperation['type'],
  roomCode: string,
  payload: any
): Promise<OfflineOperation> {
  const op: OfflineOperation = {
    id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    roomCode,
    payload,
    timestamp: new Date().toISOString(),
    retries: 0
  };

  inMemoryQueue.push(op);
  await persistQueueIDB(inMemoryQueue);

  syncState.pendingCount = inMemoryQueue.length;
  if (!syncState.isOnline) {
    syncState.status = 'offline';
  } else if (syncState.status !== 'syncing' && syncState.status !== 'conflict') {
    syncState.status = 'pending';
  }
  notifyListeners();

  if (syncState.isOnline && syncState.status !== 'syncing') {
    processSyncQueue();
  }

  return op;
}

export function getSyncQueue(): OfflineOperation[] {
  return [...inMemoryQueue];
}

export async function clearSyncQueue(): Promise<void> {
  inMemoryQueue = [];
  await persistQueueIDB(inMemoryQueue);
  syncState.pendingCount = 0;
  syncState.status = syncState.isOnline ? 'synced' : 'offline';
  syncState.conflict = null;
  syncState.errorMessage = null;
  notifyListeners();
}

/**
 * Disparador e processador da fila de sincronização
 */
export async function processSyncQueue(
  executor?: (op: OfflineOperation) => Promise<boolean>
): Promise<{ success: boolean; processed: number }> {
  if (inMemoryQueue.length === 0) {
    syncState.status = syncState.isOnline ? 'synced' : 'offline';
    syncState.pendingCount = 0;
    notifyListeners();
    return { success: true, processed: 0 };
  }

  if (!syncState.isOnline) {
    syncState.status = 'offline';
    notifyListeners();
    return { success: false, processed: 0 };
  }

  syncState.status = 'syncing';
  notifyListeners();

  let processed = 0;
  const remaining: OfflineOperation[] = [];

  for (const op of inMemoryQueue) {
    try {
      let ok = false;
      if (executor) {
        ok = await executor(op);
      } else {
        // Envio padrão: se for snapshot_save, delega para persistência se disponível
        if (typeof window !== 'undefined') {
          const { saveRoomBundleToCloud } = await import('./roomPersistenceService');
          ok = await saveRoomBundleToCloud(op.roomCode, op.payload);
        } else {
          ok = true;
        }
      }

      if (ok) {
        processed++;
        syncState.lastSyncedAt = new Date().toISOString();
      } else {
        op.retries += 1;
        remaining.push(op);
      }
    } catch (err: any) {
      op.retries += 1;
      op.error = err?.message || 'Falha na sincronização';
      remaining.push(op);
    }
  }

  inMemoryQueue = remaining;
  await persistQueueIDB(inMemoryQueue);

  syncState.pendingCount = inMemoryQueue.length;
  if (inMemoryQueue.length === 0) {
    syncState.status = 'synced';
    syncState.errorMessage = null;
  } else {
    syncState.status = syncState.isOnline ? 'error' : 'offline';
    syncState.errorMessage = `${inMemoryQueue.length} operações pendentes com erro`;
  }
  notifyListeners();

  return { success: inMemoryQueue.length === 0, processed };
}

/**
 * Notifica a ocorrência de um conflito de versão de snapshot
 */
export function reportSyncConflict(conflict: SyncConflictData) {
  syncState.status = 'conflict';
  syncState.conflict = conflict;
  notifyListeners();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-conflict-modal', { detail: conflict }));
  }
}

/**
 * Resolve o conflito atual escolhendo uma das estratégias
 */
export async function resolveConflict(
  strategy: 'use_local' | 'use_remote' | 'merge',
  customMergedPayload?: any
): Promise<void> {
  if (!syncState.conflict) return;

  const { roomCode, localPayload, remotePayload } = syncState.conflict;

  if (strategy === 'use_local') {
    await enqueueSyncOperation('snapshot_save', roomCode, localPayload);
  } else if (strategy === 'use_remote') {
    if (typeof window !== 'undefined') {
      const { applyRoomBundle } = await import('./roomPersistenceService');
      applyRoomBundle(remotePayload);
    }
  } else if (strategy === 'merge' && customMergedPayload) {
    await enqueueSyncOperation('snapshot_save', roomCode, customMergedPayload);
  }

  syncState.conflict = null;
  syncState.status = syncState.isOnline ? 'synced' : 'offline';
  notifyListeners();
}
