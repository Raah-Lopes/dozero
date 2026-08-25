import { describe, expect, it } from 'vitest';
import { CALENDAR_PRESETS, getCalendarDateFromDayNumber, getCalendarDayNumber, getMoonPhase, normalizeCalendarConfig, parseCalendarMonths } from './fantasyCalendar';

describe('getMoonPhase', () => {
  it('calculates a stable 28-day lunar cycle across months', () => {
    expect(getMoonPhase(1, 1, 1).name).toBe('Lua Nova');
    expect(getMoonPhase(15, 1, 1).name).toBe('Lua Cheia');
    expect(getMoonPhase(29, 1, 1).name).toBe('Lua Nova');
  });

  it('supports variable month lengths and custom definitions', () => {
    expect(getCalendarDayNumber(1, 3, 1, CALENDAR_PRESETS.gregoriano)).toBe(59);
    expect(getCalendarDateFromDayNumber(59, CALENDAR_PRESETS.gregoriano)).toEqual({ day: 1, month: 3, year: 1 });
    expect(parseCalendarMonths('Aurora,20,Primavera\nNoite,40,Inverno')).toHaveLength(2);
    expect(normalizeCalendarConfig({ id: 'custom', name: '', months: [{ name: 'Lua', days: 0, season: 'Verão' }], weekdays: [], moonCycleDays: 0 }).months[0].days).toBe(1);
  });
});
