import { state, doc } from './yjs';
import { supabase, isSupabaseConfigured } from './supabase';
import { toast } from '../components/UI/Toast';

export interface RoomBundle {
  version: number;
  roomName: string;
  exportedAt: string;
  data: {
    tokens?: any[];
    backgrounds?: any[];
    drawings?: any[];
    drawingLayers?: any[];
    mapConfig?: any;
    fogOps?: any[];
    mapTexts?: any[];
    props?: any[];
    combat?: any;
    clocks?: any[];
    roomSettings?: any;
    customItems?: any[];
    dlcs?: any[];
  };
}

// ============================================================================
// INDEXEDDB LOCAL SNAPSHOT STORAGE (Sem limites de 5MB do LocalStorage)
// ============================================================================
function openSnapshotDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB não suportado'));
    }
    const req = indexedDB.open('dozero_snapshots_db', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveLocalSnapshotIDB(roomCode: string, bundle: RoomBundle): Promise<void> {
  try {
    const db = await openSnapshotDB();
    const tx = db.transaction('snapshots', 'readwrite');
    tx.objectStore('snapshots').put(bundle, roomCode);
    await new Promise((res) => { tx.oncomplete = res; });
  } catch (e) {
    console.warn('[RoomPersistence] Erro ao salvar snapshot no IndexedDB:', e);
  }
}

async function loadLocalSnapshotIDB(roomCode: string): Promise<RoomBundle | null> {
  try {
    const db = await openSnapshotDB();
    const tx = db.transaction('snapshots', 'readonly');
    const req = tx.objectStore('snapshots').get(roomCode);
    return await new Promise((res) => {
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => res(null);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Coleta todo o estado atual da sala em um objeto estruturado
 */
export function getRoomBundle(): RoomBundle {
  const urlParams = new URLSearchParams(window.location.search);
  const roomName = urlParams.get('room') || 'dozero-mesa-principal-v2';

  return {
    version: 1,
    roomName,
    exportedAt: new Date().toISOString(),
    data: {
      tokens: Array.from(state.tokens.entries()),
      backgrounds: Array.from(state.backgrounds.entries()),
      drawings: Array.from(state.drawings.entries()),
      drawingLayers: state.drawingLayers ? Array.from(state.drawingLayers.entries()) : [],
      mapConfig: (state.mapConfig as any).toJSON ? (state.mapConfig as any).toJSON() : {},
      fogOps: Array.from(state.fogOps.entries()),
      mapTexts: Array.from(state.mapTexts.entries()),
      props: Array.from(state.props.entries()),
      combat: (state.combat as any).toJSON ? (state.combat as any).toJSON() : {},
      clocks: Array.from(state.clocks.entries()),
      roomSettings: state.roomSettings ? (state.roomSettings as any).toJSON() : {},
      customItems: state.customItems ? Array.from(state.customItems.entries()) : [],
      dlcs: state.dlcs ? Array.from(state.dlcs.entries()) : []
    }
  };
}

/**
 * Aplica um bundle de sala ao documento Yjs compartilhado
 */
export function applyRoomBundle(bundle: RoomBundle): boolean {
  if (!bundle || !bundle.data) {
    console.error('[RoomPersistence] Bundle inválido');
    return false;
  }

  const { data } = bundle;

  doc.transact(() => {
    // 1. Tokens
    if (Array.isArray(data.tokens)) {
      state.tokens.clear();
      data.tokens.forEach(([key, val]) => state.tokens.set(key, val));
    }

    // 2. Backgrounds
    if (Array.isArray(data.backgrounds)) {
      state.backgrounds.clear();
      data.backgrounds.forEach(([key, val]) => state.backgrounds.set(key, val));
    }

    // 3. Drawings
    if (Array.isArray(data.drawings)) {
      state.drawings.clear();
      data.drawings.forEach(([key, val]) => state.drawings.set(key, val));
    }

    // 4. Drawing Layers
    if (state.drawingLayers && Array.isArray(data.drawingLayers)) {
      state.drawingLayers.clear();
      data.drawingLayers.forEach(([key, val]) => state.drawingLayers.set(key, val));
    }

    // 5. Map Config
    if (data.mapConfig && typeof data.mapConfig === 'object') {
      Object.entries(data.mapConfig).forEach(([key, val]) => {
        state.mapConfig.set(key, val);
      });
    }

    // 6. Fog of War
    if (Array.isArray(data.fogOps)) {
      state.fogOps.clear();
      data.fogOps.forEach(([key, val]) => state.fogOps.set(key, val));
    }

    // 7. Map Texts
    if (Array.isArray(data.mapTexts)) {
      state.mapTexts.clear();
      data.mapTexts.forEach(([key, val]) => state.mapTexts.set(key, val));
    }

    // 8. Props
    if (Array.isArray(data.props)) {
      state.props.clear();
      data.props.forEach(([key, val]) => state.props.set(key, val));
    }

    // 9. Combat
    if (data.combat && typeof data.combat === 'object') {
      Object.entries(data.combat).forEach(([key, val]) => {
        state.combat.set(key, val);
      });
    }

    // 10. Clocks
    if (Array.isArray(data.clocks)) {
      state.clocks.clear();
      data.clocks.forEach(([key, val]) => state.clocks.set(key, val));
    }

    // 11. Custom items & DLCs
    if (state.customItems && Array.isArray(data.customItems)) {
      state.customItems.clear();
      data.customItems.forEach(([key, val]) => state.customItems.set(key, val));
    }
    if (state.dlcs && Array.isArray(data.dlcs)) {
      state.dlcs.clear();
      data.dlcs.forEach(([key, val]) => state.dlcs.set(key, val));
    }

    if (state.roomSettings) {
      state.roomSettings.set('is_seeded', true);
      state.roomSettings.set('last_restored_at', new Date().toISOString());
    }
  });

  window.dispatchEvent(new Event('config-changed'));
  window.dispatchEvent(new Event('tool-changed'));
  return true;
}

/**
 * Faz download do arquivo de backup da mesa (.vtt.json)
 */
export function exportRoomToFile() {
  try {
    const bundle = getRoomBundle();
    const jsonStr = JSON.stringify(bundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bundle.roomName || 'mesa'}_backup_${new Date().toISOString().slice(0, 10)}.vtt.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Backup da mesa exportado com sucesso!');
  } catch (err) {
    console.error('[RoomPersistence] Erro ao exportar mesa:', err);
    toast.error('Erro ao exportar backup da mesa.');
  }
}

/**
 * Lê e restaura um arquivo de backup (.vtt.json) enviado pelo usuário
 */
export async function importRoomFromFile(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const bundle: RoomBundle = JSON.parse(text);
    
    if (!bundle.data || (!bundle.data.tokens && !bundle.data.backgrounds)) {
      throw new Error('Formato de arquivo inválido para backup de mesa.');
    }

    const success = applyRoomBundle(bundle);
    if (success) {
      toast.success(`Mesa '${bundle.roomName || 'importada'}' restaurada com sucesso!`);
      // Salva snapshot local e em nuvem
      saveRoomSnapshotToCloud();
    }
    return success;
  } catch (err: any) {
    console.error('[RoomPersistence] Erro ao importar mesa:', err);
    toast.error(err.message || 'Falha ao importar backup da mesa.');
    return false;
  }
}

/**
 * Salva o snapshot da sala em nuvem (Supabase Storage / Tabela) e IndexedDB local
 */
export async function saveRoomSnapshotToCloud(customRoomCode?: string): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = customRoomCode || urlParams.get('room') || 'dozero-mesa-principal-v2';
  const bundle = getRoomBundle();
  bundle.roomName = roomCode;

  // 1. Salva sempre no IndexedDB local (capacidade gigabytes, sem limite de 5MB)
  await saveLocalSnapshotIDB(roomCode, bundle);

  // 2. Se Supabase estiver disponível, salva no Supabase Storage ou Tabela
  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    let cloudSaved = false;
    const jsonBlob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
    const fileName = `snapshots/${roomCode}.json`;

    // 2.1 Tenta salvar no Supabase Storage bucket 'room-backups'
    try {
      const { error: storageErr } = await supabase.storage
        .from('room-backups')
        .upload(fileName, jsonBlob, {
          contentType: 'application/json',
          upsert: true
        });

      if (!storageErr) {
        cloudSaved = true;
      }
    } catch (sErr) {
      // Bucket pode não ter sido criado ainda
    }

    // 2.2 Tenta salvar na tabela 'campaigns' do Supabase
    try {
      const { error: tblErr } = await supabase.from('campaigns').update({
        updated_at: new Date().toISOString(),
        snapshot: bundle
      }).eq('room_code', roomCode);

      if (!tblErr) {
        cloudSaved = true;
      }
    } catch (tblErr) {
      // Tabela opcional
    }

    return true;
  } catch (err) {
    console.warn('[RoomPersistence] Erro ao sincronizar nuvem:', err);
    return true; // IndexedDB local já salvou com sucesso
  }
}

/**
 * Carrega o snapshot da sala da nuvem ou IndexedDB
 */
export async function loadRoomSnapshotFromCloud(customRoomCode?: string, forceApply = false): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = customRoomCode || urlParams.get('room') || 'dozero-mesa-principal-v2';

  // Se o documento local já tem conteúdo e não for forçado, não sobrepõe
  const hasLocalContent = state.tokens.size > 0 || state.backgrounds.size > 0 || state.drawings.size > 0;
  if (hasLocalContent && !forceApply) {
    return false;
  }

  // 1. Tenta carregar do IndexedDB local
  const localBundle = await loadLocalSnapshotIDB(roomCode);
  if (localBundle && localBundle.data) {
    applyRoomBundle(localBundle);
    console.log(`[RoomPersistence] Sala '${roomCode}' restaurada do IndexedDB local!`);
    return true;
  }

  // 2. Busca da nuvem (Supabase)
  if (!isSupabaseConfigured) {
    return false;
  }

  try {
    // 2.1 Tenta baixar do Supabase Storage
    try {
      const fileName = `snapshots/${roomCode}.json`;
      const { data: fileData, error: fileErr } = await supabase.storage
        .from('room-backups')
        .download(fileName);

      if (!fileErr && fileData) {
        const text = await fileData.text();
        const bundle: RoomBundle = JSON.parse(text);
        if (bundle && bundle.data) {
          applyRoomBundle(bundle);
          await saveLocalSnapshotIDB(roomCode, bundle);
          console.log(`[RoomPersistence] Sala '${roomCode}' restaurada do Supabase Storage!`);
          return true;
        }
      }
    } catch (fErr) {}

    // 2.2 Tenta buscar da tabela 'campaigns'
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('snapshot')
        .eq('room_code', roomCode)
        .maybeSingle();

      if (!error && data?.snapshot) {
        applyRoomBundle(data.snapshot);
        await saveLocalSnapshotIDB(roomCode, data.snapshot);
        console.log(`[RoomPersistence] Sala '${roomCode}' restaurada da tabela campaigns no Supabase!`);
        return true;
      }
    } catch (e) {}

    return false;
  } catch (err) {
    console.warn('[RoomPersistence] Falha ao carregar snapshot da nuvem:', err);
    return false;
  }
}
