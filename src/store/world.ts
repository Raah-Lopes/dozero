import { state } from '../services/yjs';
import { pushChatMessage } from './chat';

// =========================================================================
// CHRONOS ENGINE (A Campanha Viva)
// =========================================================================
export interface ChronosState {
  day: number;
  month: number;
  year: number;
  timeOfDay: 'Manhã' | 'Tarde' | 'Noite' | 'Madrugada';
  season: 'Primavera' | 'Verão' | 'Outono' | 'Inverno';
}

export function initChronos() {
  if (!state.chronos.get('global')) {
    state.chronos.set('global', {
      day: 1,
      month: 1,
      year: 1450,
      timeOfDay: 'Manhã',
      season: 'Primavera'
    });
  }
}

export function getChronosState(): ChronosState {
  return (state.chronos.get('global') as ChronosState) || { day: 1, month: 1, year: 1450, timeOfDay: 'Manhã', season: 'Primavera' };
}

export function advanceDay() {
  const current = getChronosState();
  
  
  let newDay = current.day + 1;
  let newMonth = current.month;
  let newYear = current.year;
  let newSeason = current.season;

  if (newDay > 30) {
    newDay = 1;
    newMonth += 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    // Update Season
    if (newMonth >= 3 && newMonth <= 5) newSeason = 'Outono';
    else if (newMonth >= 6 && newMonth <= 8) newSeason = 'Inverno';
    else if (newMonth >= 9 && newMonth <= 11) newSeason = 'Primavera';
    else newSeason = 'Verão';
  }

  state.chronos.set('global', { ...current, day: newDay, month: newMonth, year: newYear, season: newSeason, timeOfDay: 'Manhã' });
  
  // LOGICA DE CONSEQUENCIAS (FOME/SEDE)
  pushChatMessage(`🌅 <b>Um novo dia amanheceu!</b> (${newDay}/${newMonth}/${newYear}) - ${newSeason}`, true, false);
  
  const tokens = Array.from(state.tokens.entries()) as [string, any][];
  let famintos = 0;
  
  for (const [id, token] of tokens) {
    if (token.hp > 0 && token.isPlayer !== false) { // Apenas heróis
      let hunger = token.hunger || 0;
      let thirst = token.thirst || 0;
      let sanity = token.sanity !== undefined ? token.sanity : 100;

      // Todo dia aumenta a fome e sede
      hunger = Math.min(100, hunger + 25);
      thirst = Math.min(100, thirst + 25);
      
      let newHp = token.hp;
      if (hunger >= 100) newHp -= 5;
      if (thirst >= 100) newHp -= 5;

      newHp = Math.max(0, newHp);
      
      if (hunger >= 100 || thirst >= 100) {
        famintos++;
      }

      state.tokens.set(id, { ...token, hp: newHp, hunger, thirst, sanity });
    }
  }

  if (famintos > 0) {
    pushChatMessage(`💀 ${famintos} aventureiros estão sofrendo danos reais por Fome ou Sede Extrema (100%)!`, false, true);
  }

  // LOGICA DO MOTOR DE MUNDO (FACÇÕES E CORRUPÇÃO)
  // Roda a simulação a cada 7 dias (Semanas)
  if (newDay % 7 === 0) {
    const factions = state.world.get('factions') as any[] || [];
    const settlements = state.world.get('settlements') as any[] || [];
    
    if (factions.length > 0) {
      pushChatMessage(`🌐 <b>O Mundo Gira:</b> Uma semana se passou. Movimentos geopolíticos ocorrem nas sombras...`, true, false);
      
      const newFactions = factions.map(f => {
        // Flutuação aleatória de poder (-5 a +5)
        const shift = Math.floor(Math.random() * 11) - 5;
        return { ...f, power: Math.max(0, Math.min(100, f.power + shift)) };
      });
      state.world.set('factions', newFactions);

      // Sindicato vs Coroa
      const sindicato = newFactions.find(f => f.id === 'f2');
      const coroa = newFactions.find(f => f.id === 'f1');
      
      if (sindicato && coroa && sindicato.power > coroa.power) {
        // Corrupção aumenta
        const newSettlements = settlements.map(s => {
          if (s.id === 's1') return { ...s, corruption: Math.min(100, s.corruption + 5) };
          return s;
        });
        state.world.set('settlements', newSettlements);
        pushChatMessage(`🗡️ O Sindicato das Sombras expandiu seu poder! A Corrupção na Capital aumentou!`, false, true);
      } else if (coroa && sindicato && coroa.power > sindicato.power) {
        const newSettlements = settlements.map(s => {
          if (s.id === 's1') return { ...s, economy: Math.min(100, s.economy + 5) };
          return s;
        });
        state.world.set('settlements', newSettlements);
        pushChatMessage(`🛡️ A Coroa Imperial impôs ordem. A economia da Capital floresceu esta semana.`, false, false);
      }
    }
  }
}

export function advanceTimeOfDay() {
  const current = getChronosState();
  const times: ("Manhã" | "Tarde" | "Noite" | "Madrugada")[] = ['Manhã', 'Tarde', 'Noite', 'Madrugada'];
  const idx = times.indexOf(current.timeOfDay);
  const nextIdx = idx + 1;

  if (nextIdx >= times.length) {
    advanceDay();
  } else {
    state.chronos.set('global', { ...current, timeOfDay: times[nextIdx] });
    pushChatMessage(`⏳ O tempo passou... Agora é <b>${times[nextIdx]}</b>.`, false, false);
  }
}

export function restAtStronghold() {
  const strongholdData = state.stronghold.get('data') as any;
  if (!strongholdData) return;

  const upgrades = strongholdData.upgrades || [];
  
  // Efeitos da base
  const hasKitchen = upgrades.includes('cozinha');
  const hasWell = upgrades.includes('poco');
  const hasBeds = upgrades.includes('camas');
  const hasAltar = upgrades.includes('altar');

  const tokens = Array.from(state.tokens.entries()) as [string, any][];
  let herois = 0;

  for (const [id, token] of tokens) {
    if (token.hp > 0 && token.isPlayer !== false) {
      herois++;
      let hunger = token.hunger || 0;
      let thirst = token.thirst || 0;
      let sanity = token.sanity !== undefined ? token.sanity : 100;
      let hp = token.hp;
      let mana = token.mana || 0;

      // Cozinha reduz fome a zero. Se nao, reduz 50
      hunger = hasKitchen ? 0 : Math.max(0, hunger - 50);
      // Poço reduz sede a zero. Se nao, reduz 50
      thirst = hasWell ? 0 : Math.max(0, thirst - 50);
      // Camas curam HP cheio. Se nao, cura 20
      hp = hasBeds ? (token.maxHp || 100) : Math.min(token.maxHp || 100, hp + 20);
      // Altar restaura sanidade a 100.
      sanity = hasAltar ? 100 : sanity;

      state.tokens.set(id, { ...token, hp, hunger, thirst, sanity, mana });
    }
  }

  if (herois > 0) {
    pushChatMessage(`🏰 <b>A party descansou em ${strongholdData.name}.</b><br/><span style="color:var(--text-secondary);font-size:0.8rem">(${hasKitchen ? '🍲 Cozinha' : ''} ${hasWell ? '💧 Poço' : ''} ${hasBeds ? '🛏️ Camas' : ''} ${hasAltar ? '✨ Altar' : ''})</span>`, true, false);
  }

  // Avança o tempo
  advanceTimeOfDay();
}
