import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
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
// REAL-TIME LOCAL MULTIPLAYER (CROSS-TAB SYNC)
// =========================================================================
// This creates a direct peer-to-peer tunnel between your browser tabs
const channel = new BroadcastChannel(roomName);

// Listen to local changes and broadcast them
doc.on('update', (update: Uint8Array) => {
  channel.postMessage(update);
});

// Listen to incoming broadcasts and apply them
channel.onmessage = (event) => {
  Y.applyUpdate(doc, event.data, 'broadcast-channel');
};

// =========================================================================
// OFFLINE STORAGE (INDEXEDDB)
// =========================================================================
export const indexeddbProvider = new IndexeddbPersistence(roomName, doc);

// =========================================================================
// REAL-TIME REMOTE MULTIPLAYER (WebRTC P2P)
// =========================================================================
let webrtcProvider: WebrtcProvider | any = null;
try {
  webrtcProvider = new WebrtcProvider(roomName, doc, {
    password: roomPassword || undefined,
    signaling: [
      'wss://signaling.yjs.dev',
      'wss://y-webrtc-signaling-eu.herokuapp.com',
      'wss://y-webrtc-ckyn.onrender.com'
    ]
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
  players: doc.getMap('players')
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
