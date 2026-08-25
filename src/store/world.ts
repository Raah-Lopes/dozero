import { state } from '../services/yjs';
import { pushChatMessage } from './chat';
import { DEFAULT_CALENDAR, getCalendarDayNumber, normalizeCalendarConfig, type CalendarConfig } from '../utils/fantasyCalendar';

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

export interface ChronosEvent {
  id: string;
  title: string;
  day: number;
  month: number;
  year: number;
  layer?: ChronosEventLayer;
  wikiPath?: string;
  eraId?: string;
  datePrecision?: 'day' | 'year';
  kind?: ChronicleEventKind;
  description?: string;
  imageUrl?: string;
  tags?: string[];
}

export type ChronosEventLayer = 'world' | 'campaign' | 'character';
export type ChronicleEventKind = 'fundacao' | 'reinado' | 'batalha' | 'descoberta' | 'catastrofe' | 'pacto' | 'magia' | 'jornada' | 'queda';

export interface ChronicleEra {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  color: string;
  description: string;
  backgroundUrl?: string;
  collapsed?: boolean;
}

export interface ChronicleMeta {
  worldName: string;
  calendarLabel: string;
}

const chronicleId = (prefix: string) => `${prefix}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;

export function initChronos() {
  if (!state.chronos.get('config')) state.chronos.set('config', DEFAULT_CALENDAR);
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

export function getChronosConfig(): CalendarConfig {
  return normalizeCalendarConfig((state.chronos.get('config') as CalendarConfig) || DEFAULT_CALENDAR);
}

export function setChronosConfig(nextConfig: CalendarConfig) {
  const config = normalizeCalendarConfig(nextConfig);
  const current = getChronosState();
  const month = Math.min(config.months.length, Math.max(1, current.month));
  const selectedMonth = config.months[month - 1];
  state.chronos.set('global', { ...current, month, day: Math.min(selectedMonth.days, current.day), season: selectedMonth.season });
  state.chronos.set('config', config);
}

export function getChronosState(): ChronosState {
  return (state.chronos.get('global') as ChronosState) || { day: 1, month: 1, year: 1450, timeOfDay: 'Manhã', season: 'Primavera' };
}

export function getChronosEvents(): ChronosEvent[] {
  return (state.chronos.get('events') as ChronosEvent[]) || [];
}

export function getChronicleEras(): ChronicleEra[] {
  return (state.chronos.get('eras') as ChronicleEra[]) || [];
}

export function getChronicleMeta(): ChronicleMeta {
  return (state.chronos.get('chronicleMeta') as ChronicleMeta) || { worldName: 'Mundo da Campanha', calendarLabel: 'Ano' };
}

export function saveChronicleMeta(patch: Partial<ChronicleMeta>) {
  const current = getChronicleMeta();
  const next = {
    worldName: patch.worldName?.trim() || current.worldName,
    calendarLabel: patch.calendarLabel?.trim() || current.calendarLabel
  };
  state.chronos.set('chronicleMeta', next);
  return next;
}

export function replaceChronicle(eras: ChronicleEra[], events: ChronosEvent[], meta?: Partial<ChronicleMeta>) {
  state.chronos.set('eras', eras);
  state.chronos.set('events', [
    ...getChronosEvents().filter(event => event.datePrecision !== 'year'),
    ...events.map(event => ({ ...event, datePrecision: 'year' as const }))
  ]);
  if (meta) saveChronicleMeta(meta);
}

export function saveChronicleEra(input: Omit<ChronicleEra, 'id'> & { id?: string }) {
  const name = input.name.trim();
  if (!name || !Number.isFinite(input.startYear) || !Number.isFinite(input.endYear) || input.endYear < input.startYear) return null;
  const era: ChronicleEra = { ...input, id: input.id || chronicleId('chronicle_era'), name, description: input.description.trim() };
  const eras = getChronicleEras();
  state.chronos.set('eras', eras.some(item => item.id === era.id) ? eras.map(item => item.id === era.id ? era : item) : [...eras, era]);
  return era;
}

export function moveChronicleEra(id: string, direction: -1 | 1) {
  const eras = [...getChronicleEras()];
  const from = eras.findIndex(era => era.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= eras.length) return;
  const [era] = eras.splice(from, 1);
  eras.splice(to, 0, era);
  state.chronos.set('eras', eras);
}

export function reorderChronicleEra(id: string, targetId: string) {
  if (id === targetId) return;
  const eras = [...getChronicleEras()];
  const from = eras.findIndex(era => era.id === id);
  const to = eras.findIndex(era => era.id === targetId);
  if (from < 0 || to < 0) return;
  const [era] = eras.splice(from, 1);
  eras.splice(to, 0, era);
  state.chronos.set('eras', eras);
}

export function toggleChronicleEra(id: string) {
  state.chronos.set('eras', getChronicleEras().map(era => era.id === id ? { ...era, collapsed: !era.collapsed } : era));
}

export function duplicateChronicleEra(id: string) {
  const eras = [...getChronicleEras()];
  const index = eras.findIndex(era => era.id === id);
  if (index < 0) return null;
  const source = eras[index];
  const copy: ChronicleEra = { ...source, id: chronicleId('chronicle_era'), name: `${source.name} (cópia)` };
  eras.splice(index + 1, 0, copy);
  const copiedEvents = getChronosEvents()
    .filter(event => event.eraId === id)
    .map(event => ({ ...event, id: chronicleId('chronicle_event'), eraId: copy.id }));
  state.chronos.set('eras', eras);
  if (copiedEvents.length) state.chronos.set('events', [...getChronosEvents(), ...copiedEvents]);
  return copy;
}

export function removeChronicleEra(id: string) {
  state.chronos.set('eras', getChronicleEras().filter(era => era.id !== id));
  state.chronos.set('events', getChronosEvents().map(event => event.eraId === id ? { ...event, eraId: undefined } : event));
}

export function saveChronicleEvent(input: Partial<ChronosEvent> & Pick<ChronosEvent, 'title' | 'year'>) {
  const title = input.title.trim();
  if (!title || !Number.isFinite(input.year)) return null;
  const event: ChronosEvent = {
    id: input.id || chronicleId('chronicle_event'),
    title,
    day: input.day || 1,
    month: input.month || 1,
    year: Math.round(input.year),
    datePrecision: input.datePrecision || 'year',
    layer: input.layer || 'world',
    kind: input.kind || 'fundacao',
    description: input.description?.trim() || '',
    imageUrl: input.imageUrl?.trim() || undefined,
    tags: [...new Set((input.tags || []).map(tag => tag.trim()).filter(Boolean))],
    eraId: input.eraId,
    wikiPath: input.wikiPath
  };
  const events = getChronosEvents();
  state.chronos.set('events', events.some(item => item.id === event.id) ? events.map(item => item.id === event.id ? event : item) : [...events, event]);
  return event;
}

export function addChronosEvent(title: string, date = getChronosState(), details: { layer?: ChronosEventLayer; wikiPath?: string } = {}) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;
  const config = getChronosConfig();
  const month = Math.min(config.months.length, Math.max(1, date.month));
  state.chronos.set('events', [...getChronosEvents(), {
    id: `chronos_event_${Date.now()}`,
    title: cleanTitle,
    day: Math.min(config.months[month - 1].days, Math.max(1, date.day)),
    month,
    year: Math.max(1, date.year),
    layer: details.layer || 'world',
    wikiPath: details.wikiPath || undefined
  }]);
}

export function updateChronosEvent(id: string, patch: Partial<Omit<ChronosEvent, 'id'>>) {
  const config = getChronosConfig();
  state.chronos.set('events', getChronosEvents().map(event => {
    if (event.id !== id) return event;
    const month = Math.min(config.months.length, Math.max(1, patch.month ?? event.month));
    const title = patch.title === undefined ? event.title : patch.title.trim() || event.title;
    return {
      ...event,
      ...patch,
      title,
      day: Math.min(config.months[month - 1].days, Math.max(1, patch.day ?? event.day)),
      month,
      year: Math.max(1, patch.year ?? event.year)
    };
  }));
}

export function removeChronosEvent(id: string) {
  state.chronos.set('events', getChronosEvents().filter(event => event.id !== id));
}

export function advanceDay() {
  const current = getChronosState();
  const config = getChronosConfig();
  
  
  let newDay = current.day + 1;
  let newMonth = current.month;
  let newYear = current.year;
  let newSeason = current.season;

  if (newDay > config.months[newMonth - 1].days) {
    newDay = 1;
    newMonth += 1;
    if (newMonth > config.months.length) {
      newMonth = 1;
      newYear += 1;
    }
  }
  newSeason = config.months[newMonth - 1].season;

  state.chronos.set('global', { ...current, day: newDay, month: newMonth, year: newYear, season: newSeason, timeOfDay: 'Manhã' });
  
  getChronosEvents()
    .filter(event => event.day === newDay && event.month === newMonth && event.year === newYear)
    .forEach(event => pushChatMessage(`📅 <b>Hoje no mundo:</b> ${event.title}`, true, false));

  // LOGICA DE CONSEQUENCIAS (FOME/SEDE)
  pushChatMessage(`🌅 <b>Um novo dia amanheceu!</b> (${newDay} de ${config.months[newMonth - 1].name}, ${newYear}) - ${newSeason}`, true, false);
  
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
  if (getCalendarDayNumber(newDay, newMonth, newYear, config) % Math.max(1, config.weekdays.length) === 0) {
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
