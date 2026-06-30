import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

// The Yjs document that holds the entire shared state
export const doc = new Y.Doc();
const roomName = 'vtt-dozero-dev-room';

// =========================================================================
// REAL-TIME LOCAL MULTIPLAYER (CROSS-TAB SYNC)
// =========================================================================
// This creates a direct peer-to-peer tunnel between your browser tabs
const channel = new BroadcastChannel(roomName);

// When this tab makes a change, broadcast the raw Yjs binary delta to other tabs
doc.on('update', (update, origin) => {
  if (origin !== channel) {
    // ArrayBuffer is strictly supported by all structured clone algorithms
    channel.postMessage(update.buffer);
  }
});

// When other tabs broadcast a change, apply it to this tab's document
channel.onmessage = (event) => {
  try {
    const update = new Uint8Array(event.data);
    Y.applyUpdate(doc, update, channel);
  } catch (e) {
    console.error("Yjs Sync Error:", e);
  }
};

// IndexeddbPersistence saves the document locally so it survives F5
export const indexeddbProvider = new IndexeddbPersistence(roomName, doc);

// Conecta ao servidor WebSocket. 
// Se for localhost (GM jogando sozinho ou em rede local), usa o servidor embutido do Vite.
// Se for um túnel na internet (ngrok, localtunnel), usa o servidor público do Yjs para desviar de bloqueios de túnel!
const isInternet = !window.location.hostname.includes('localhost') && !window.location.hostname.match(/^\d{1,3}\./);
const wsUrl = isInternet 
  ? 'wss://demos.yjs.dev/ws' 
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/yjs`;

// Nome da sala único para evitar colisões no servidor público
const uniqueRoomName = `dozero-vtt-${window.location.host.replace(/[^a-zA-Z0-9]/g, '')}`;

export const provider = new WebsocketProvider(
  wsUrl, 
  isInternet ? uniqueRoomName : roomName, 
  doc
);

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
  world: doc.getMap('world'),
  stronghold: doc.getMap('stronghold'),
  mapTexts: doc.getMap('mapTexts'),
  props: doc.getMap('props'),
  trades: doc.getMap('trades'),
};

export function connectProvider() {
  provider.connect();
}

export function disconnectProvider() {
  provider.disconnect();
}

// Initialize mock state ONLY if the database is truly empty after loading
indexeddbProvider.on('synced', () => {
  // Inicializa mapa de combate se vazio
  if (!state.combat.has('isActive')) {
    state.combat.set('isActive', false);
    state.combat.set('turnIndex', 0);
    state.combat.set('participants', []);
  }

  // Limpeza de personagens de teste antigos
  if (state.tokens.has('goblin_boss')) {
    state.tokens.delete('goblin_boss');
  }
  if (state.tokens.has('omega_sentinel')) {
    state.tokens.delete('omega_sentinel');
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
