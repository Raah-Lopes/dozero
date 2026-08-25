export type MoonPhase = {
  name: string;
  icon: string;
};

const MOON_PHASES: MoonPhase[] = [
  { name: 'Lua Nova', icon: '🌑' },
  { name: 'Crescente', icon: '🌒' },
  { name: 'Quarto Crescente', icon: '🌓' },
  { name: 'Gibosa Crescente', icon: '🌔' },
  { name: 'Lua Cheia', icon: '🌕' },
  { name: 'Gibosa Minguante', icon: '🌖' },
  { name: 'Quarto Minguante', icon: '🌗' },
  { name: 'Minguante', icon: '🌘' }
];

export function getMoonPhase(day: number, month: number, year: number, cycleDays = 28): MoonPhase {
  const totalDays = (Math.max(1, year) - 1) * 360 + (Math.max(1, month) - 1) * 30 + Math.max(1, day) - 1;
  return MOON_PHASES[Math.floor((totalDays % cycleDays) / (cycleDays / MOON_PHASES.length))];
}
