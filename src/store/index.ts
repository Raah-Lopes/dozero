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

export const provider = new WebsocketProvider(
  'ws://localhost:1234', 
  roomName, 
  doc, 
  { connect: false } // we don't connect to websocket yet to avoid console errors
);

export const state = {
  tokens: doc.getMap('tokens'),
  chat: doc.getArray('chat'),
  wiki: doc.getMap('wiki'),
  backgrounds: doc.getMap('backgrounds'),
};

export interface BackgroundData {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  opacity?: number;
  locked?: boolean;
  hidden?: boolean;
}

export function addBackground(bg: BackgroundData) {
  state.backgrounds.set(bg.id, bg);
}

export function toggleBackgroundLock(id: string, forceLocked?: boolean) {
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  if (bg) {
    const isLocked = forceLocked !== undefined ? forceLocked : !bg.locked;
    state.backgrounds.set(id, { ...bg, locked: isLocked });
  }
}

export function updateBackgroundProps(id: string, updates: Partial<BackgroundData>) {
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  if (bg) {
    state.backgrounds.set(id, { ...bg, ...updates });
  }
}

export function updateBackgroundPosition(id: string, x: number, y: number) {
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  if (bg && (bg.x !== x || bg.y !== y)) {
    state.backgrounds.set(id, { ...bg, x, y });
  }
}

export function removeBackground(id: string) {
  state.backgrounds.delete(id);
}

// Initialize mock state ONLY if the database is truly empty after loading
indexeddbProvider.on('synced', () => {
  // Limpeza do personagem antigo
  if (state.tokens.has('goblin_boss')) {
    state.tokens.delete('goblin_boss');
  }

  const sentinel = state.tokens.get('omega_sentinel') as any;
  if (!sentinel) {
    state.tokens.set('omega_sentinel', { id: 'omega_sentinel', name: 'Sentinela Ômega', hp: 150, maxHp: 150, mana: 50, maxMana: 50, x: 800, y: 400 });
  } else {
    state.tokens.set('omega_sentinel', { ...sentinel, x: 800, y: 400 });
  }
});

export function connectProvider() {
  provider.connect();
}

export function disconnectProvider() {
  provider.disconnect();
}

// Helper to push a chat message
export function pushChatMessage(message: string, isCritical: boolean = false, isFailure: boolean = false) {
  state.chat.push([{ text: message, isCritical, isFailure, timestamp: Date.now() }]);
}

// Helper to apply damage
export function applyDamageToToken(tokenId: string, damage: number) {
  const token = state.tokens.get(tokenId) as any;
  if (token) {
    const newHp = Math.max(0, token.hp - damage);
    state.tokens.set(tokenId, { ...token, hp: newHp });
  }
}

// Helper to update token properties flexibly from Character Sheet
export function updateTokenProps(tokenId: string, props: Partial<any>) {
  const token = state.tokens.get(tokenId) as any;
  if (token) {
    state.tokens.set(tokenId, { ...token, ...props });
  }
}

// Helper to update token spatial position
export function updateTokenPosition(tokenId: string, x: number, y: number) {
  const token = state.tokens.get(tokenId) as any;
  if (token) {
    // Only update if it actually moved to save network bandwidth
    if (token.x !== x || token.y !== y) {
      state.tokens.set(tokenId, { ...token, x, y });
    }
  }
}

