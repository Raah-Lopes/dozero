import { describe, expect, it } from 'vitest';
import { getMoonPhase } from './fantasyCalendar';

describe('getMoonPhase', () => {
  it('calculates a stable 28-day lunar cycle across months', () => {
    expect(getMoonPhase(1, 1, 1).name).toBe('Lua Nova');
    expect(getMoonPhase(15, 1, 1).name).toBe('Lua Cheia');
    expect(getMoonPhase(29, 1, 1).name).toBe('Lua Nova');
  });
});
