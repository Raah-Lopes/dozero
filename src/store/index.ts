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
  combat: doc.getMap('combat'),
  clocks: doc.getMap('clocks'),
};

// =========================================================================
// EPHEMERAL LOCAL STATE (Not synced to other players, just for this client)
// =========================================================================
export const localState = {
  targets: new Set<string>(),
  selectedBgs: new Set<string>(),
};

export function toggleTarget(tokenId: string) {
  if (localState.targets.has(tokenId)) {
    localState.targets.delete(tokenId);
  } else {
    localState.targets.add(tokenId);
  }
  // Dispatch event so UI can react
  window.dispatchEvent(new Event('targets-updated'));
}

export function toggleBgSelection(id: string, multi: boolean) {
  if (!multi) localState.selectedBgs.clear();
  
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  const groupId = bg?.groupId;

  // Identify all IDs to toggle (the clicked one, plus any in the same group)
  const idsToToggle = new Set([id]);
  if (groupId) {
    for (const [bgId, bgData] of state.backgrounds.entries()) {
      if ((bgData as BackgroundData).groupId === groupId) {
        idsToToggle.add(bgId);
      }
    }
  }

  // Toggle them
  const isSelected = localState.selectedBgs.has(id);
  idsToToggle.forEach(toggleId => {
    if (isSelected) {
      localState.selectedBgs.delete(toggleId);
    } else {
      localState.selectedBgs.add(toggleId);
    }
  });

  window.dispatchEvent(new Event('bg-selection-updated'));
}

export function clearBgSelection() {
  localState.selectedBgs.clear();
  window.dispatchEvent(new Event('bg-selection-updated'));
}

export function getTargets(): string[] {
  return Array.from(localState.targets);
}
export function clearTargets() {
  localState.targets.clear();
  window.dispatchEvent(new Event('targets-updated'));
}

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
  groupId?: string;
  zIndex?: number;
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
  // Inicializa mapa de combate se vazio
  if (!state.combat.has('isActive')) {
    state.combat.set('isActive', false);
    state.combat.set('turnIndex', 0);
    state.combat.set('participants', []);
  }

  // Limpeza do personagem antigo
  if (state.tokens.has('goblin_boss')) {
    state.tokens.delete('goblin_boss');
  }

  const sentinel = state.tokens.get('omega_sentinel') as any;
  if (!sentinel) {
    state.tokens.set('omega_sentinel', { id: 'omega_sentinel', name: 'Sentinela Ômega', hp: 150, maxHp: 150, mana: 50, maxMana: 50, x: 800, y: 400 });
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

// =========================================================================
// COMBAT TRACKER HELPERS
// =========================================================================
export interface CombatParticipant {
  tokenId: string;
  name: string;
  initiative: number;
  imageUrl?: string;
}

export function addCombatParticipant(tokenId: string, name: string, initiative: number, imageUrl?: string) {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  const existingIndex = participants.findIndex(p => p.tokenId === tokenId);
  
  let newParticipants = [...participants];
  if (existingIndex >= 0) {
    newParticipants[existingIndex].initiative = initiative;
    if (imageUrl) newParticipants[existingIndex].imageUrl = imageUrl;
  } else {
    newParticipants.push({ tokenId, name, initiative, imageUrl });
  }

  // Sort descending by initiative
  newParticipants.sort((a, b) => b.initiative - a.initiative);
  
  state.combat.set('participants', newParticipants);
}

export function removeCombatParticipant(tokenId: string) {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  const newParticipants = participants.filter(p => p.tokenId !== tokenId);
  state.combat.set('participants', newParticipants);
  
  // Adjust turnIndex if needed
  let turnIndex = state.combat.get('turnIndex') as number;
  if (turnIndex >= newParticipants.length && newParticipants.length > 0) {
    state.combat.set('turnIndex', 0);
  }
}

export function nextCombatTurn() {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  if (participants.length === 0) return;
  
  let turnIndex = state.combat.get('turnIndex') as number;
  turnIndex = (turnIndex + 1) % participants.length;
  state.combat.set('turnIndex', turnIndex);
}

export function clearCombat() {
  state.combat.set('participants', []);
  state.combat.set('turnIndex', 0);
  state.combat.set('isActive', false);
}

// =========================================================================
// TENSION CLOCKS HELPERS
// =========================================================================
export interface TensionClock {
  id: string;
  x: number;
  y: number;
  label: string;
  durationMs: number;
  endTime: number;
  isRunning: boolean;
  hpMod: string; // Ex: '-80%', '+10'
  mpMod: string; // Ex: '-5'
  pausedRemainingMs?: number; // Guarda o tempo exato em que foi pausado
}

export function addTensionClock(clock: TensionClock) {
  state.clocks.set(clock.id, clock);
}

export function updateTensionClockProps(id: string, props: Partial<TensionClock>) {
  const clock = state.clocks.get(id) as TensionClock;
  if (clock) {
    state.clocks.set(id, { ...clock, ...props });
  }
}

export function removeTensionClock(id: string) {
  state.clocks.delete(id);
}

function applyMod(currentValue: number, modStr: string): number {
  if (!modStr || modStr === '0' || modStr === '') return currentValue;
  const str = modStr.trim();
  const isPercent = str.endsWith('%');
  const valStr = isPercent ? str.slice(0, -1) : str;
  const val = parseFloat(valStr);
  if (isNaN(val)) return currentValue;

  if (isPercent) {
     return Math.max(0, Math.floor(currentValue + (currentValue * (val / 100))));
  } else {
     return Math.max(0, Math.floor(currentValue + val));
  }
}

export function triggerClockConsequence(id: string) {
  const clock = state.clocks.get(id) as TensionClock;
  if (!clock) return;

  // Stop the clock
  state.clocks.set(id, { ...clock, isRunning: false });

  const chatArray = state.chat;
  chatArray.push([{
    text: `O relógio "${clock.label}" zerou! Consequências -> HP: ${clock.hpMod || '0'} | MP: ${clock.mpMod || '0'}`,
    timestamp: Date.now(),
    isCritical: true,
    isFailure: false
  }]);

  // Aplica as regras dinâmicas
  for (const key of state.tokens.keys()) {
    const t = state.tokens.get(key) as any;
    if (t) {
      let updated = false;
      const newT = { ...t };
      
      // Checa formato raiz (t.hp)
      if (typeof t.hp === 'number') {
         newT.hp = applyMod(t.hp, clock.hpMod);
         updated = true;
      }
      if (typeof t.mana === 'number') {
         newT.mana = applyMod(t.mana, clock.mpMod);
         updated = true;
      }
      
      // Checa formato aninhado (t.stats.hp)
      if (t.stats && typeof t.stats.hp === 'number') {
         newT.stats = { ...t.stats };
         newT.stats.hp = applyMod(t.stats.hp, clock.hpMod);
         if (typeof t.stats.mana === 'number') {
            newT.stats.mana = applyMod(t.stats.mana, clock.mpMod);
         }
         updated = true;
      }
      
      if (updated) {
         state.tokens.set(key, newT);
      }
    }
  }
}
