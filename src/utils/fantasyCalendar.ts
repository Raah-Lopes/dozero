export type Season = 'Primavera' | 'Verão' | 'Outono' | 'Inverno';
export interface CalendarMonth { name: string; days: number; season: Season; }
export interface CalendarConfig { id: string; name: string; months: CalendarMonth[]; weekdays: string[]; moonCycleDays: number; }
export type MoonPhase = { name: string; icon: string };

const seasons: Season[] = ['Inverno', 'Primavera', 'Verão', 'Outono'];
const gregorianNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const gregorianDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const monthSeason = (index: number): Season => index < 2 || index === 11 ? 'Inverno' : index < 5 ? 'Primavera' : index < 8 ? 'Verão' : 'Outono';
const makeMonths = (names: string[], days: number | number[]) => names.map((name, index) => ({ name, days: Array.isArray(days) ? days[index] : days, season: monthSeason(index) }));

export const CALENDAR_PRESETS: Record<string, CalendarConfig> = {
  fantasia: { id: 'fantasia', name: 'Fantasia 12×30', months: makeMonths(gregorianNames, 30), weekdays: ['Lua', 'Marte', 'Mercúrio', 'Júpiter', 'Vênus', 'Saturno', 'Sol'], moonCycleDays: 28 },
  gregoriano: { id: 'gregoriano', name: 'Gregoriano', months: makeMonths(gregorianNames, gregorianDays), weekdays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'], moonCycleDays: 29.53 },
  harptos: { id: 'harptos', name: 'Harptos (Faerûn)', months: makeMonths(['Hammer', 'Alturiak', 'Ches', 'Tarsakh', 'Mirtul', 'Kythorn', 'Flamerule', 'Eleasis', 'Eleint', 'Marpenoth', 'Uktar', 'Nightal'], 30), weekdays: ['1º dia', '2º dia', '3º dia', '4º dia', '5º dia', '6º dia', '7º dia', '8º dia', '9º dia', '10º dia'], moonCycleDays: 30 },
  golarion: { id: 'golarion', name: 'Golarion', months: makeMonths(['Abadius', 'Calistril', 'Pharast', 'Gozran', 'Desnus', 'Sarenith', 'Erastus', 'Arodus', 'Rova', 'Lamashan', 'Neth', 'Kuthona'], gregorianDays), weekdays: ['Moonday', 'Toilday', 'Wealday', 'Oathday', 'Fireday', 'Starday', 'Sunday'], moonCycleDays: 29.53 }
};

export const DEFAULT_CALENDAR = CALENDAR_PRESETS.fantasia;
const MOON_PHASES: MoonPhase[] = [
  { name: 'Lua Nova', icon: '🌑' }, { name: 'Crescente', icon: '🌒' }, { name: 'Quarto Crescente', icon: '🌓' }, { name: 'Gibosa Crescente', icon: '🌔' },
  { name: 'Lua Cheia', icon: '🌕' }, { name: 'Gibosa Minguante', icon: '🌖' }, { name: 'Quarto Minguante', icon: '🌗' }, { name: 'Minguante', icon: '🌘' }
];

export function getCalendarDayNumber(day: number, month: number, year: number, config = DEFAULT_CALENDAR) {
  const yearDays = config.months.reduce((total, item) => total + item.days, 0);
  const previousMonths = config.months.slice(0, Math.max(0, month - 1)).reduce((total, item) => total + item.days, 0);
  return (Math.max(1, year) - 1) * yearDays + previousMonths + Math.max(1, day) - 1;
}

export function getCalendarDateFromDayNumber(dayNumber: number, config = DEFAULT_CALENDAR) {
  const yearDays = config.months.reduce((total, item) => total + item.days, 0);
  const safeDayNumber = Math.max(0, Math.floor(dayNumber));
  const year = Math.floor(safeDayNumber / yearDays) + 1;
  let remainingDays = safeDayNumber % yearDays;

  for (let index = 0; index < config.months.length; index += 1) {
    const month = config.months[index];
    if (remainingDays < month.days) return { day: remainingDays + 1, month: index + 1, year };
    remainingDays -= month.days;
  }

  return { day: 1, month: 1, year: year + 1 };
}

export function getMoonPhase(day: number, month: number, year: number, config = DEFAULT_CALENDAR): MoonPhase {
  const cycleDays = Math.max(1, config.moonCycleDays);
  const progress = (getCalendarDayNumber(day, month, year, config) % cycleDays) / cycleDays;
  return MOON_PHASES[Math.floor(progress * MOON_PHASES.length) % MOON_PHASES.length];
}

export function normalizeCalendarConfig(config: CalendarConfig): CalendarConfig {
  const months = config.months.filter(month => month.name.trim()).map(month => ({ ...month, name: month.name.trim(), days: Math.min(999, Math.max(1, Math.round(month.days))), season: seasons.includes(month.season) ? month.season : 'Primavera' }));
  return { id: config.id || 'custom', name: config.name.trim() || 'Calendário Personalizado', months: months.length ? months : DEFAULT_CALENDAR.months, weekdays: config.weekdays.map(day => day.trim()).filter(Boolean), moonCycleDays: Math.min(999, Math.max(1, Number(config.moonCycleDays) || 28)) };
}

export const serializeCalendarMonths = (months: CalendarMonth[]) => months.map(month => `${month.name},${month.days},${month.season}`).join('\n');

export function parseCalendarMonths(value: string): CalendarMonth[] {
  return value.split(/\r?\n/).map(line => {
    const [name = '', days = '', season = 'Primavera'] = line.split(',').map(part => part.trim());
    return { name, days: Number(days), season: seasons.includes(season as Season) ? season as Season : 'Primavera' };
  }).filter(month => month.name && Number.isFinite(month.days) && month.days > 0);
}
