import { state } from '../services/yjs';

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
