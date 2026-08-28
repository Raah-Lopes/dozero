import { describe, it, expect, beforeEach } from 'vitest';
import { parseAndRollDice } from '../utils/diceParser';
import { FateParser } from '../rules/FateParser';
import { normalizeCodex } from '../components/Wiki/Codex/codexModel';
import { parseChronicleArchive } from '../utils/chronicleArchive';
import { useWindowManager } from '../hooks/useWindowManager';

describe('QA System Resilience & Crash Prevention Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Dice Parser Edge Cases & Stress', () => {
    it('handles empty, null, undefined and garbage strings without throwing', () => {
      // @ts-expect-error test invalid inputs
      expect(parseAndRollDice(null).total).toBeGreaterThanOrEqual(1);
      // @ts-expect-error test invalid inputs
      expect(parseAndRollDice(undefined).total).toBeGreaterThanOrEqual(1);
      expect(parseAndRollDice('').total).toBeGreaterThanOrEqual(1);
      expect(parseAndRollDice('   ').total).toBeGreaterThanOrEqual(1);
      expect(parseAndRollDice('foo-bar-xyz').total).toBeGreaterThanOrEqual(1);
      expect(parseAndRollDice('!!!@@@###').total).toBeGreaterThanOrEqual(1);
    });

    it('clamps huge dice counts to prevent CPU freezing/infinite memory allocation', () => {
      const result = parseAndRollDice('99999999d6');
      expect(result.rolls.length).toBeLessThanOrEqual(100);
    });

    it('correctly handles modifiers and negative totals clamped to 0', () => {
      const resPositive = parseAndRollDice('1d6+10');
      expect(resPositive.total).toBeGreaterThanOrEqual(11);

      const resNegative = parseAndRollDice('1d4-100');
      expect(resNegative.total).toBe(0); // clamped to 0
    });

    it('accurately identifies critical hits on 1d20', () => {
      for (let i = 0; i < 100; i++) {
        const res = parseAndRollDice('1d20');
        expect(res.rolls[0]).toBeGreaterThanOrEqual(1);
        expect(res.rolls[0]).toBeLessThanOrEqual(20);
        if (res.rolls[0] === 20) expect(res.isCriticalSuccess).toBe(true);
        if (res.rolls[0] === 1) expect(res.isCriticalFailure).toBe(true);
      }
    });
  });

  describe('2. Fate Stress & Consequence System Bounds', () => {
    it('safely handles empty or corrupt stress track configs', () => {
      // @ts-expect-error test invalid inputs
      expect(FateParser.parseStressTrack(null, 'Core')).toEqual([]);
      // @ts-expect-error test invalid inputs
      expect(FateParser.parseStressTrack(undefined, 'Condensed')).toEqual([]);
      expect(FateParser.parseStressTrack('', 'Core')).toEqual([]);
      expect(FateParser.parseStressTrack('CorruptedStringNoColon', 'Condensed')).toEqual([]);
    });

    it('parses Condensed and Core stress tracks accurately', () => {
      const condensed = FateParser.parseStressTrack('Physical:4', 'Condensed');
      expect(condensed.length).toBe(4);
      expect(condensed[0].value).toBe(1);

      const core = FateParser.parseStressTrack('Mental:1 2 3 4', 'Core');
      expect(core.length).toBe(4);
      expect(core[2].value).toBe(3);
    });

    it('calculates damage overflow and track absorption without mutating state unexpectedly', () => {
      const track = FateParser.parseStressTrack('Physical:3', 'Condensed');
      const { newTrack, overflow } = FateParser.applyDamage(track, 5, 'Condensed');
      expect(overflow).toBe(2);
      expect(newTrack.every(b => b.checked)).toBe(true);
    });
  });

  describe('3. Codex & Archive Deserialization Integrity', () => {
    it('normalizes corrupted or empty codex documents into valid schema', () => {
      // @ts-expect-error invalid inputs
      const normNull = normalizeCodex(null);
      expect(normNull.version).toBe(1);
      expect(Array.isArray(normNull.notes)).toBe(true);

      const corrupted = {
        schemaVersion: 999,
        notes: [{ id: 'note-1', title: 'Test' }, null, undefined, {}],
        folders: 'not-an-array'
      };
      // @ts-expect-error invalid inputs
      const normalized = normalizeCodex(corrupted);
      expect(normalized.notes.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(normalized.folders)).toBe(true);
    });

    it('rejects invalid or dangerous chronicle archives gracefully', () => {
      expect(parseChronicleArchive(null)).toBeNull();
      expect(parseChronicleArchive(undefined)).toBeNull();
      expect(parseChronicleArchive({})).toBeNull();
      expect(parseChronicleArchive({ schemaVersion: 1, eras: 'bad' })).toBeNull();
    });
  });

  describe('4. Window Manager & Navigation State Transitions', () => {
    it('switches views and handles open/close toggles smoothly', () => {
      const manager = useWindowManager.getState();
      
      manager.setViewMode('canvas');
      expect(useWindowManager.getState().viewMode).toBe('canvas');

      manager.openWindow('oracle');
      expect(useWindowManager.getState().openWindows.oracle).toBe(true);

      manager.toggleWindow('oracle');
      expect(useWindowManager.getState().openWindows.oracle).toBe(false);

      manager.setViewMode('sheets');
      expect(useWindowManager.getState().viewMode).toBe('sheets');

      manager.setViewMode('wiki');
      expect(useWindowManager.getState().viewMode).toBe('wiki');

      manager.setViewMode('canvas');
      expect(useWindowManager.getState().viewMode).toBe('canvas');
    });
  });
});
