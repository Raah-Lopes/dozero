import { state } from '../services/yjs';
import { pushChatMessage } from './chat';
import { getTargets } from './tokens';

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

export function pauseTensionClock(id: string) {
  const clock = state.clocks.get(id) as TensionClock;
  if (!clock || !clock.isRunning) return;
  const remaining = Math.max(0, clock.endTime - Date.now());
  state.clocks.set(id, { ...clock, isRunning: false, pausedRemainingMs: remaining });
}

export function resumeTensionClock(id: string) {
  const clock = state.clocks.get(id) as TensionClock;
  if (!clock || clock.isRunning) return;
  const remaining = clock.pausedRemainingMs ?? clock.durationMs;
  state.clocks.set(id, { ...clock, isRunning: true, endTime: Date.now() + remaining, pausedRemainingMs: undefined });
}

export function addMinutesToClock(id: string, mins: number) {
  const clock = state.clocks.get(id) as TensionClock;
  if (!clock) return;
  const ms = mins * 60000;
  if (clock.isRunning) {
    state.clocks.set(id, { ...clock, endTime: Math.max(Date.now(), clock.endTime + ms), durationMs: Math.max(1000, clock.durationMs + ms) });
  } else {
    const remaining = Math.max(0, (clock.pausedRemainingMs ?? clock.durationMs) + ms);
    state.clocks.set(id, { ...clock, pausedRemainingMs: remaining, durationMs: Math.max(1000, clock.durationMs + ms) });
  }
}

export function resetTensionClock(id: string) {
  const clock = state.clocks.get(id) as TensionClock;
  if (!clock) return;
  state.clocks.set(id, { ...clock, isRunning: true, endTime: Date.now() + clock.durationMs, pausedRemainingMs: undefined });
}

function applyMod(currentValue: number, modStr: string): number {
  if (!modStr || modStr === '0' || modStr === '') return currentValue;
  const str = modStr.trim();
  const isPercent = str.endsWith('%');
  const cleanStr = isPercent ? str.slice(0, -1).trim() : str;
  const hasExplicitPlus = cleanStr.startsWith('+');
  const hasExplicitMinus = cleanStr.startsWith('-');
  const val = parseFloat(cleanStr);
  if (isNaN(val)) return currentValue;

  // Se não houver sinal explícito (ex: "50%" ou "10"), tratamos como subtração/dano por padrão em relógios de tensão
  const factor = (hasExplicitPlus || hasExplicitMinus) ? val : -Math.abs(val);

  if (isPercent) {
     return Math.max(0, Math.floor(currentValue + (currentValue * (factor / 100))));
  } else {
     return Math.max(0, Math.floor(currentValue + factor));
  }
}

export function triggerClockConsequence(id: string) {
  const clock = state.clocks.get(id) as TensionClock;
  if (!clock) return;

  // Stop the clock
  state.clocks.set(id, { ...clock, isRunning: false });

  const targets = getTargets();
  const hasTargets = targets.length > 0;
  const affectedKeys = hasTargets ? targets : Array.from(state.tokens.keys());

  const targetNames = hasTargets
    ? affectedKeys.map(k => (state.tokens.get(k) as any)?.name || 'Token').join(', ')
    : 'todos os tokens';

  pushChatMessage(
    `💥 <b>O relógio "${clock.label}" zerou!</b> Consequências aplicadas em <b>${targetNames}</b> -> HP: <b>${clock.hpMod || '0'}</b> | MP: <b>${clock.mpMod || '0'}</b>`,
    true,
    true
  );

  // Aplica as regras dinâmicas aos tokens afetados
  for (const key of affectedKeys) {
    const t = state.tokens.get(key) as any;
    if (t) {
      let updated = false;
      const newT = { ...t };
      
      const currentHp = typeof t.hp === 'number' ? t.hp : (typeof t.hp === 'string' ? parseFloat(t.hp) : (typeof t.pv === 'number' ? t.pv : (typeof t.pv === 'string' ? parseFloat(t.pv) : (typeof t.HP === 'number' ? t.HP : (typeof t.HP === 'string' ? parseFloat(t.HP) : 100)))));
      
      const currentMana = typeof t.mana === 'number' ? t.mana : (typeof t.mana === 'string' ? parseFloat(t.mana) : (typeof t.mp === 'number' ? t.mp : (typeof t.mp === 'string' ? parseFloat(t.mp) : (typeof t.pm === 'number' ? t.pm : (typeof t.pm === 'string' ? parseFloat(t.pm) : 0)))));

      if (clock.hpMod && clock.hpMod !== '0' && !isNaN(currentHp)) {
        const newHp = applyMod(currentHp, clock.hpMod);
        newT.hp = newHp;
        newT.pv = newHp;
        newT.HP = newHp;
        updated = true;
      }

      if (clock.mpMod && clock.mpMod !== '0' && !isNaN(currentMana)) {
        const newMana = applyMod(currentMana, clock.mpMod);
        newT.mana = newMana;
        newT.mp = newMana;
        newT.pm = newMana;
        updated = true;
      }
      
      // Checa formato aninhado (t.stats)
      if (t.stats) {
        newT.stats = { ...t.stats };
        if (clock.hpMod && clock.hpMod !== '0') {
          const statsHp = typeof t.stats.hp === 'number' ? t.stats.hp : (typeof t.stats.hp === 'string' ? parseFloat(t.stats.hp) : currentHp);
          newT.stats.hp = applyMod(statsHp, clock.hpMod);
        }
        if (clock.mpMod && clock.mpMod !== '0') {
          const statsMana = typeof t.stats.mana === 'number' ? t.stats.mana : (typeof t.stats.mana === 'string' ? parseFloat(t.stats.mana) : currentMana);
          newT.stats.mana = applyMod(statsMana, clock.mpMod);
        }
        updated = true;
      }
      
      if (updated) {
        state.tokens.set(key, newT);
        if (newT.wikiPath) {
          import('../services/wiki/syncWiki').then(s => {
            s.syncMultipleFieldsToWiki(newT.wikiPath, {
              hp: newT.hp,
              pv: newT.pv,
              HP: newT.HP,
              mana: newT.mana,
              mp: newT.mp,
              pm: newT.pm
            });
          }).catch(() => {});
        }
      }
    }
  }
}
