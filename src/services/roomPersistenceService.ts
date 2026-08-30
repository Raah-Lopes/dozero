import { state, doc } from './yjs';
import { supabase, isSupabaseConfigured } from './supabase';
import { toast } from '../components/UI/Toast';
import { enqueueSyncOperation } from './offlineSyncService';
import { synchronizeActiveTableScene } from '../store/tableScenes';

export interface RoomBundle {
  version: number;
  roomName: string;
  exportedAt: string;
  data: {
    tokens?: any[];
    backgrounds?: any[];
    drawings?: any[];
    walls?: any[];
    drawingLayers?: any[];
    mapConfig?: any;
    fogOps?: any[];
    mapTexts?: any[];
    props?: any[];
    lorePins?: any[];
    combat?: any;
    clocks?: any[];
    roomSettings?: any;
    customItems?: any[];
    dlcs?: any[];
    wiki?: Array<[string, unknown]>;
    sheets?: Array<[string, unknown]>;
    tableScenes?: Array<[string, unknown]>;
    tableSceneMeta?: Array<[string, unknown]>;
    theater?: any;
    chronos?: any;
    lineage?: any;
    world?: any;
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

type RecordLike = Record<string, unknown>;
const ROOM_DATA_KEYS = [
  'tokens', 'backgrounds', 'drawings', 'walls', 'fogOps', 'props', 'mapTexts',
  'lorePins', 'tableScenes', 'tableSceneMeta',
];

function asEntries(value: unknown): Array<[string, unknown]> | undefined {
  if (Array.isArray(value)) return value as Array<[string, unknown]>;
  if (value && typeof value === 'object') return Object.entries(value as RecordLike);
  return undefined;
}

/** Converts the legacy autosave shape before it can touch the shared document. */
export function normalizeRoomBundle(value: unknown, roomName: string): RoomBundle | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as RecordLike;
  if (raw.data && typeof raw.data === 'object') {
    const data = raw.data as RecordLike;
    if (!ROOM_DATA_KEYS.some(key => data[key] !== undefined)) return null;
    return {
      version: typeof raw.version === 'number' ? raw.version : 3,
      roomName: typeof raw.roomName === 'string' ? raw.roomName : roomName,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
      data: data as RoomBundle['data'],
    };
  }

  const hasLegacyTableState = ROOM_DATA_KEYS.some(key => raw[key] !== undefined);
  if (!hasLegacyTableState) return null;

  return {
    version: 3,
    roomName,
    exportedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
    data: {
      tokens: asEntries(raw.tokens),
      backgrounds: asEntries(raw.backgrounds),
      drawings: asEntries(raw.drawings),
      walls: asEntries(raw.walls),
      drawingLayers: asEntries(raw.drawingLayers),
      mapConfig: raw.mapConfig || raw.grid,
      fogOps: asEntries(raw.fogOps),
      mapTexts: asEntries(raw.mapTexts),
      props: asEntries(raw.props),
      lorePins: asEntries(raw.lorePins),
      combat: raw.combat,
      clocks: asEntries(raw.clocks),
      roomSettings: raw.roomSettings,
      customItems: asEntries(raw.customItems),
      dlcs: asEntries(raw.dlcs),
      wiki: asEntries(raw.wiki),
      sheets: asEntries(raw.sheets),
      tableScenes: asEntries(raw.tableScenes),
      tableSceneMeta: asEntries(raw.tableSceneMeta),
      theater: raw.theater,
    },
  };
}

export function hasLiveRoomContent(): boolean {
  return [
    state.tokens,
    state.backgrounds,
    state.drawings,
    state.walls,
    state.fogOps,
    state.mapTexts,
    state.props,
    state.lorePins,
  ].some(map => map.size > 0);
}

/**
 * Coleta todo o estado atual da sala em um objeto estruturado
 */
export function getRoomBundle(): RoomBundle {
  const urlParams = new URLSearchParams(window.location.search);
  const roomName = urlParams.get('room') || 'dozero-mesa-principal-v2';

  return {
    version: 3,
    roomName,
    exportedAt: new Date().toISOString(),
    data: {
      tokens: Array.from(state.tokens.entries()),
      backgrounds: Array.from(state.backgrounds.entries()),
      drawings: Array.from(state.drawings.entries()),
      walls: Array.from(state.walls.entries()),
      drawingLayers: state.drawingLayers ? Array.from(state.drawingLayers.entries()) : [],
      mapConfig: (state.mapConfig as any).toJSON ? (state.mapConfig as any).toJSON() : {},
      fogOps: Array.from(state.fogOps.entries()),
      mapTexts: Array.from(state.mapTexts.entries()),
      props: Array.from(state.props.entries()),
      lorePins: state.lorePins ? Array.from(state.lorePins.entries()) : [],
      combat: (state.combat as any).toJSON ? (state.combat as any).toJSON() : {},
      clocks: Array.from(state.clocks.entries()),
      roomSettings: state.roomSettings ? (state.roomSettings as any).toJSON() : {},
      customItems: state.customItems ? Array.from(state.customItems.entries()) : [],
      dlcs: state.dlcs ? Array.from(state.dlcs.entries()) : [],
      wiki: Array.from(state.wiki.entries()),
      sheets: Array.from(state.sheets.entries()),
      tableScenes: Array.from(state.tableScenes.entries()),
      tableSceneMeta: Array.from(state.tableSceneMeta.entries()),
      theater: state.theater.toJSON(),
      chronos: state.chronos.toJSON(),
      lineage: state.lineage.toJSON(),
      world: state.world.toJSON(),
    }
  };
}

/**
 * Aplica um bundle de sala ao documento Yjs compartilhado
 * IMPORTANTE: Usa transação com origem 'persistence' para não disparar sync em loop
 */
export function applyRoomBundle(bundle: RoomBundle, origin: unknown = 'room-bundle-restore'): boolean {
  if (!bundle || !bundle.data) {
    console.error('[RoomPersistence] Bundle inválido');
    return false;
  }

  const { data } = bundle;
  // A hidratação em segundo plano só completa dados ausentes. Nunca deve
  // remover uma alteração que chegou ao Yjs enquanto o backup era carregado.
  const replaceExistingData = origin !== 'room-auto-hydration';

  // Usa transação nomeada para que o provider possa identificar e ignorar
  doc.transact(() => {
    // 1. Tokens
    if (Array.isArray(data.tokens)) {
      if (replaceExistingData) state.tokens.clear();
      data.tokens.forEach(([key, val]) => state.tokens.set(key, val));
    }

    // 2. Backgrounds
    if (Array.isArray(data.backgrounds)) {
      if (replaceExistingData) state.backgrounds.clear();
      data.backgrounds.forEach(([key, val]) => state.backgrounds.set(key, val));
    }

    // 3. Drawings
    if (Array.isArray(data.drawings)) {
      if (replaceExistingData) state.drawings.clear();
      data.drawings.forEach(([key, val]) => state.drawings.set(key, val));
    }

    // 4. Drawing Layers
    // 4.1 Tactical walls
    if (Array.isArray(data.walls)) {
      if (replaceExistingData) state.walls.clear();
      data.walls.forEach(([key, val]) => state.walls.set(key, val));
    }

    // 5. Drawing Layers
    if (state.drawingLayers && Array.isArray(data.drawingLayers)) {
      if (replaceExistingData) state.drawingLayers.clear();
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
      if (replaceExistingData) state.fogOps.clear();
      data.fogOps.forEach(([key, val]) => state.fogOps.set(key, val));
    }

    // 7. Map Texts
    if (Array.isArray(data.mapTexts)) {
      if (replaceExistingData) state.mapTexts.clear();
      data.mapTexts.forEach(([key, val]) => state.mapTexts.set(key, val));
    }

    // 8. Props
    if (Array.isArray(data.props)) {
      if (replaceExistingData) state.props.clear();
      data.props.forEach(([key, val]) => state.props.set(key, val));
    }

    // 8.1 Lore Pins
    if (state.lorePins && Array.isArray(data.lorePins)) {
      if (replaceExistingData) state.lorePins.clear();
      data.lorePins.forEach(([key, val]) => state.lorePins.set(key, val));
    }

    // 9. Combat
    if (data.combat && typeof data.combat === 'object') {
      Object.entries(data.combat).forEach(([key, val]) => {
        state.combat.set(key, val);
      });
    }

    // 10. Clocks
    if (Array.isArray(data.clocks)) {
      if (replaceExistingData) state.clocks.clear();
      data.clocks.forEach(([key, val]) => state.clocks.set(key, val));
    }

    // 11. Custom items & DLCs
    if (state.customItems && Array.isArray(data.customItems)) {
      if (replaceExistingData) state.customItems.clear();
      data.customItems.forEach(([key, val]) => state.customItems.set(key, val));
    }
    if (state.dlcs && Array.isArray(data.dlcs)) {
      if (replaceExistingData) state.dlcs.clear();
      data.dlcs.forEach(([key, val]) => state.dlcs.set(key, val));
    }
    if (Array.isArray(data.wiki)) {
      if (replaceExistingData) state.wiki.clear();
      data.wiki.forEach(([key, val]) => state.wiki.set(key, val));
    }
    if (Array.isArray(data.sheets)) {
      if (replaceExistingData) state.sheets.clear();
      data.sheets.forEach(([key, val]) => state.sheets.set(key, val));
    }
    if (Array.isArray(data.tableScenes)) {
      if (replaceExistingData) state.tableScenes.clear();
      data.tableScenes.forEach(([key, val]) => state.tableScenes.set(key, val));
    }
    if (Array.isArray(data.tableSceneMeta)) {
      if (replaceExistingData) state.tableSceneMeta.clear();
      data.tableSceneMeta.forEach(([key, val]) => state.tableSceneMeta.set(key, val));
    }
    if (data.theater && typeof data.theater === 'object') {
      if (replaceExistingData) state.theater.clear();
      Object.entries(data.theater).forEach(([key, val]) => state.theater.set(key, val));
    }
    if (data.chronos && typeof data.chronos === 'object') {
      if (replaceExistingData) state.chronos.clear();
      Object.entries(data.chronos).forEach(([key, val]) => state.chronos.set(key, val));
    }
    if (data.lineage && typeof data.lineage === 'object') {
      if (replaceExistingData) state.lineage.clear();
      Object.entries(data.lineage).forEach(([key, val]) => state.lineage.set(key, val));
    }
    if (data.world && typeof data.world === 'object') {
      if (replaceExistingData) state.world.clear();
      Object.entries(data.world).forEach(([key, val]) => state.world.set(key, val));
    }

    if (state.roomSettings) {
      state.roomSettings.set('is_seeded', true);
      state.roomSettings.set('last_restored_at', new Date().toISOString());
    }
  }, 'persistence'); // <- Nome da transação para identificação no provider

  window.dispatchEvent(new Event('config-changed'));
  window.dispatchEvent(new Event('tool-changed'));
  synchronizeActiveTableScene();
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
export async function saveRoomBundleToCloud(roomCode: string, bundle: RoomBundle): Promise<boolean> {
  if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) return false;

  try {
    const fileName = `snapshots/${roomCode}.json`;
    const jsonBlob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
    const { error: storageErr } = await supabase.storage
      .from('room-backups')
      .upload(fileName, jsonBlob, { contentType: 'application/json', upsert: true });
    if (storageErr) console.warn('[RoomPersistence] Backup em Storage falhou:', storageErr.message);

    const { data, error } = await supabase
      .from('campaigns')
      .update({ snapshot: bundle, last_played_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('room_code', roomCode)
      .select('id')
      .maybeSingle();

    if (error) {
      console.warn('[RoomPersistence] Snapshot não salvo na campanha:', error.message);
      return false;
    }
    if (!data) {
      console.warn(`[RoomPersistence] Sala '${roomCode}' não encontrada ou sem permissão de gravação.`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[RoomPersistence] Falha ao salvar snapshot na nuvem:', error);
    return false;
  }
}

export async function saveRoomSnapshotToCloud(customRoomCode?: string): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = customRoomCode || urlParams.get('room') || 'dozero-mesa-principal-v2';
  const bundle = getRoomBundle();
  bundle.roomName = roomCode;
  await saveLocalSnapshotIDB(roomCode, bundle);

  if (!isSupabaseConfigured) return true;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueSyncOperation('snapshot_save', roomCode, bundle);
    return true;
  }

  const saved = await saveRoomBundleToCloud(roomCode, bundle);
  if (!saved) await enqueueSyncOperation('snapshot_save', roomCode, bundle);
  return saved;
}

/**
 * Carrega o snapshot da sala da nuvem ou IndexedDB
 */
export async function loadRoomSnapshotFromCloud(customRoomCode?: string, forceApply = false): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = customRoomCode || urlParams.get('room') || 'dozero-mesa-principal-v2';

  const applyIfSafe = async (snapshot: unknown, source: string): Promise<boolean> => {
    if (!forceApply && hasLiveRoomContent()) return false;
    const bundle = normalizeRoomBundle(snapshot, roomCode);
    if (!bundle) {
      console.warn(`[RoomPersistence] Snapshot ${source} inválido; estado local preservado.`);
      return false;
    }
    if (!forceApply && hasLiveRoomContent()) return false;
    if (!applyRoomBundle(bundle, forceApply ? 'room-manual-restore' : 'room-auto-hydration')) return false;
    await saveLocalSnapshotIDB(roomCode, bundle);
    console.log(`[RoomPersistence] Sala '${roomCode}' restaurada de ${source}.`);
    return true;
  };

  if (hasLiveRoomContent() && !forceApply) return false;

  // 1. Tenta carregar do IndexedDB local
  const localBundle = await loadLocalSnapshotIDB(roomCode);
  if (localBundle && await applyIfSafe(localBundle, 'IndexedDB local')) return true;
  if (!forceApply && hasLiveRoomContent()) return false;

  // 2. Busca da nuvem (Supabase)
  if (!isSupabaseConfigured) {
    return false;
  }

  try {
    // 2.1 Busca diretamente da tabela 'campaigns' (rápido, indexado e sem 400)
    const { data, error } = await supabase
      .from('campaigns')
      .select('snapshot')
      .eq('room_code', roomCode)
      .maybeSingle();

    if (!error && data?.snapshot) {
      return applyIfSafe(data.snapshot, 'nuvem');
    }

    return false;
  } catch (err) {
    return false;
  }
}
