import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

// The Yjs document that holds the entire shared state
export const doc = new Y.Doc();

// =========================================================================
// CLIENT ID ÚNICO PARA AUTORIDADE DE ARRASTO
// =========================================================================
// Gera um ID único por sessão do navegador para identificar quem está arrastando
export const localClientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
console.log(`[Yjs] Cliente ID: ${localClientId}`);

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
export let wsProvider: WebsocketProvider | null = null;

function initializeWebsocketProvider() {
  if (wsProvider) return;
  try {
    if (customWsServer) {
      wsProvider = new WebsocketProvider(customWsServer, roomName, doc);
    } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsProvider = new WebsocketProvider(`${wsProto}//${window.location.host}/yjs`, roomName, doc);
    }
  } catch (error) {
    console.warn('WebSocket Provider falhou:', error);
  }
}

// Supabase Realtime: funciona em qualquer lugar (Vercel, localhost, mobile)
// ponytail: Supabase Realtime Broadcast é o sync universal; WebSocket local é bonus pra dev
export let supabaseRealtime: SupabaseRealtimeProvider | null = null;

function initializeSupabaseRealtime() {
  if (!supabaseRealtime) {
    supabaseRealtime = new SupabaseRealtimeProvider(roomName, doc);
  }
}

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
  walls: doc.getMap('walls'),
  drawingLayers: doc.getMap('drawingLayers'),
  fogOps: doc.getMap('fogOps'),
  lorePins: doc.getMap('lorePins'),
  roomSettings: doc.getMap('roomSettings'),
  tableScenes: doc.getMap('tableScenes'),
  tableSceneMeta: doc.getMap('tableSceneMeta')
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
  state.fogOps,
  state.walls
]);

if (typeof window !== 'undefined') {
  window.addEventListener('canvas-undo', () => {
    undoManager.undo();
  });
  window.addEventListener('canvas-redo', () => {
    undoManager.redo();
  });
}

function hasRoomMapContent() {
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

// Aguarda o IndexedDB local antes de abrir o Realtime, para que dados antigos
// deste navegador nunca sejam emitidos como uma edição nova para os pares.
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

  initializeWebsocketProvider();
  initializeSupabaseRealtime();

  // Dá tempo para o peer já conectado responder ao sync inicial. Só então a
  // máquina sozinha usa o snapshot como fallback, sem retransmiti-lo aos pares.
  window.setTimeout(() => {
    if (hasRoomMapContent()) return;
    import('./roomPersistenceService').then(({ loadRoomSnapshotFromCloud }) => {
      loadRoomSnapshotFromCloud(roomName);
    });
  }, 1200);
});

if (!indexeddbProvider) {
  initializeWebsocketProvider();
  initializeSupabaseRealtime();
}

// Durante o HMR, os módulos são substituídos sem descarregar a página. Sem
// fechar o canal anterior, o cliente do Supabase tenta acrescentar callbacks
// a uma inscrição que já está ativa e interrompe o Realtime em desenvolvimento.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    wsProvider?.destroy();
    wsProvider = null;
    supabaseRealtime?.destroy();
    supabaseRealtime = null;
  });
}
