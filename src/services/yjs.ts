import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
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
const roomPassword = urlParams.get('pass') || ''; // Se estiver vazio, não criptografa

// =========================================================================
// OFFLINE STORAGE (INDEXEDDB)
// =========================================================================
export const indexeddbProvider = new IndexeddbPersistence(roomName, doc);

// =========================================================================
// REAL-TIME CLOUD SYNC & PERSISTENCE (WebSocket Central)
// =========================================================================
const customWsServer = urlParams.get('ws');
let websocketProvider: WebsocketProvider | any = null;
if (customWsServer) {
  try {
    websocketProvider = new WebsocketProvider(customWsServer, roomName, doc);
  } catch (error) {
    console.warn("WebSocket Provider falhou em iniciar", error);
  }
} else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  try {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    websocketProvider = new WebsocketProvider(`${wsProto}//${window.location.host}/yjs`, roomName, doc);
  } catch (error) {
    console.warn("Local WebSocket Provider falhou em iniciar", error);
  }
}
export const wsProvider = websocketProvider;

// =========================================================================
// REAL-TIME REMOTE MULTIPLAYER (WebRTC P2P Fallback)
// =========================================================================
let webrtcProvider: WebrtcProvider | any = null;
try {
  const signalingServers = ['wss://dozero.onrender.com'];
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    signalingServers.unshift(`${wsProto}//${window.location.host}/yjs`);
  }

  webrtcProvider = new WebrtcProvider(roomName, doc, {
    password: roomPassword || undefined,
    signaling: signalingServers
  });
} catch (error) {
  console.warn("WebRTC Provider falhou em iniciar", error);
}
export const provider = webrtcProvider;

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
  dlcs: doc.getMap('dlcs'),
  audio: doc.getMap('audio'),
  world: doc.getMap('world'),
  stronghold: doc.getMap('stronghold'),
  mapTexts: doc.getMap('mapTexts'),
  props: doc.getMap('props'),
  trades: doc.getMap('trades'),
  conspiracy: doc.getMap('conspiracy'),
  players: doc.getMap('players'),
  chatConfig: doc.getMap('chatConfig'),
  gmNotes: doc.getMap('gmNotes'),
  customItems: doc.getMap('customItems'),
  drawings: doc.getMap('drawings'),
  drawingLayers: doc.getMap('drawingLayers'),
  fogOps: doc.getMap('fogOps'),
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

export function connectProvider() {
  provider.connect();
}

export function disconnectProvider() {
  provider.disconnect();
}

// Initialize mock state ONLY on first-ever room initialization
indexeddbProvider.on('synced', () => {
  // Inicializa mapa de combate se vazio
  if (!state.combat.has('isActive')) {
    state.combat.set('isActive', false);
    state.combat.set('turnIndex', 0);
    state.combat.set('participants', []);
  }

  // Limpeza de personagens de teste antigos
  if (state.tokens.has('goblin_boss')) state.tokens.delete('goblin_boss');
  if (state.tokens.has('omega_sentinel')) state.tokens.delete('omega_sentinel');

  const seedKey = `dozero_seeded_${roomName}`;
  const isAlreadySeeded = state.roomSettings.get('is_seeded') === true || localStorage.getItem(seedKey) === 'true';

  // Tenta restaurar da nuvem primeiro se o estado local estiver vazio
  if (state.tokens.size === 0 && state.backgrounds.size === 0) {
    import('./roomPersistenceService').then(({ loadRoomSnapshotFromCloud }) => {
      loadRoomSnapshotFromCloud(roomName).then((restored) => {
        if (!restored && !isAlreadySeeded && state.tokens.size === 0) {
          state.roomSettings.set('is_seeded', true);
          try { localStorage.setItem(seedKey, 'true'); } catch (e) {}

          const heroId = `token_exemplo_heroi`;
          state.tokens.set(heroId, {
            id: heroId,
            name: 'Herói Exemplo',
            hp: 20,
            maxHp: 20,
            ca: 15,
            x: 450,
            y: 350,
            isPlayer: true,
            tokenShape: 'circle',
            borderColor: '#3b82f6',
            showName: true,
            imageUrl: ''
          });

          const enemyId = `token_exemplo_inimigo`;
          state.tokens.set(enemyId, {
            id: enemyId,
            name: 'Inimigo Exemplo',
            hp: 10,
            maxHp: 10,
            ca: 12,
            x: 650,
            y: 350,
            isPlayer: false,
            tokenShape: 'circle',
            borderColor: '#ef4444',
            showName: true,
            imageUrl: ''
          });
        }
      });
    });
  } else if (!isAlreadySeeded && state.tokens.size > 0) {
    state.roomSettings.set('is_seeded', true);
    try { localStorage.setItem(seedKey, 'true'); } catch (e) {}
  }

  if (!state.world.has('factions')) {
    state.world.set('factions', [
      { id: 'f1', name: 'A Coroa Imperial', power: 50, influence: 50 },
      { id: 'f2', name: 'O Sindicato das Sombras', power: 40, influence: 60 }
    ]);
  }
  if (!state.world.has('settlements')) {
    state.world.set('settlements', [
      { id: 's1', name: 'A Capital', corruption: 20, economy: 80 }
    ]);
  }
  if (!state.stronghold.has('data')) {
    state.stronghold.set('data', {
      name: 'Refúgio de Arcanus',
      treasury: 500,
      upgrades: [] // ex: 'cozinha', 'poco', 'camas', 'altar'
    });
  }
});
