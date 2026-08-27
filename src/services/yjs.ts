import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

// The Yjs document that holds the entire shared state
export const doc = new Y.Doc();

// =========================================================================
// ROOM & SECURITY (URL Config)
// =========================================================================
const urlParams = new URLSearchParams(window.location.search);
// Default unique room to prevent global collisions on public signaling servers
const roomName = urlParams.get('room') || 'dozero-mesa-principal-v2';

// =========================================================================
// OFFLINE STORAGE (INDEXEDDB)
// =========================================================================
export const indexeddbProvider = typeof indexedDB !== 'undefined'
  ? new IndexeddbPersistence(roomName, doc)
  : (null as any);

// =========================================================================
// REAL-TIME SYNC (WebSocket local dev + Supabase Realtime produção)
// =========================================================================
import { SupabaseRealtimeProvider } from './supabaseRealtimeProvider';

const customWsServer = urlParams.get('ws');
let websocketProvider: WebsocketProvider | any = null;

// WebSocket: só conecta se tiver servidor customizado ou estiver em localhost
if (customWsServer) {
  try {
    websocketProvider = new WebsocketProvider(customWsServer, roomName, doc);
  } catch (error) {
    console.warn("WebSocket Provider falhou:", error);
  }
} else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  try {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    websocketProvider = new WebsocketProvider(`${wsProto}//${window.location.host}/yjs`, roomName, doc);
  } catch (error) {
    console.warn("Local WebSocket Provider falhou:", error);
  }
}
export const wsProvider = websocketProvider;

// Supabase Realtime: funciona em qualquer lugar (Vercel, localhost, mobile)
// ponytail: Supabase Realtime Broadcast é o sync universal; WebSocket local é bonus pra dev
export const supabaseRealtime = new SupabaseRealtimeProvider(roomName, doc);

export const state = {
  tokens: doc.getMap('tokens'),
  chat: doc.getArray('chat'),
  polls: doc.getMap('polls'),
  wiki: doc.getMap('wiki'),
  backgrounds: doc.getMap('backgrounds'),
  combat: doc.getMap('combat'),
  clocks: doc.getMap('clocks'),
  mapConfig: doc.getMap('mapConfig'),
  wikiConfig: doc.getMap('wikiConfig'),
  campaigns: doc.getMap('campaigns'),
  theater: doc.getMap('theater'),
  chronos: doc.getMap('chronos'),
  lineage: doc.getMap('lineage'),
  dlcs: doc.getMap('dlcs'),
  audio: doc.getMap('audio'),
  world: doc.getMap('world'),
  stronghold: doc.getMap('stronghold'),
  mapTexts: doc.getMap('mapTexts'),
  props: doc.getMap('props'),
  trades: doc.getMap('trades'),
  conspiracy: doc.getMap('conspiracy'),
  players: doc.getMap('players'),
  sheets: doc.getMap('sheets'),
  chatConfig: doc.getMap('chatConfig'),
  gmNotes: doc.getMap('gmNotes'),
  customItems: doc.getMap('customItems'),
  drawings: doc.getMap('drawings'),
  drawingLayers: doc.getMap('drawingLayers'),
  fogOps: doc.getMap('fogOps'),
  lorePins: doc.getMap('lorePins'),
  roomSettings: doc.getMap('roomSettings')
};

// =========================================================================
// UNDO / REDO MANAGER
// =========================================================================
export const undoManager = new Y.UndoManager([
  state.drawings,
  state.tokens,
  state.props,
  state.backgrounds,
  state.mapTexts,
  state.lorePins,
  state.fogOps
]);

if (typeof window !== 'undefined') {
  window.addEventListener('canvas-undo', () => {
    undoManager.undo();
  });
  window.addEventListener('canvas-redo', () => {
    undoManager.redo();
  });
}

// Initialize mock state ONLY on first-ever room initialization
indexeddbProvider?.on('synced', () => {
  // Inicializa mapa de combate se vazio
  if (!state.combat.has('isActive')) {
    state.combat.set('isActive', false);
    state.combat.set('turnIndex', 0);
    state.combat.set('participants', []);
  }

  // Limpeza de personagens de teste antigos
  if (state.tokens.has('goblin_boss')) state.tokens.delete('goblin_boss');
  if (state.tokens.has('omega_sentinel')) state.tokens.delete('omega_sentinel');

  // Tenta restaurar da nuvem primeiro se o estado local estiver vazio.
  // Salas novas permanecem limpas: exemplos não fazem parte do ecossistema inicial.
  if (state.tokens.size === 0 && state.backgrounds.size === 0) {
    import('./roomPersistenceService').then(({ loadRoomSnapshotFromCloud }) => {
      loadRoomSnapshotFromCloud(roomName);
    });
  }
});
