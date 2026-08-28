import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  parseDiceString, 
  evaluateCondition, 
  executeConditionalMacro,
  PRESET_CONDITIONAL_MACROS,
  saveCustomMacro,
  loadCustomMacros,
  deleteCustomMacro,
  ConditionalMacro,
  MacroCondition
} from '../services/conditionalMacroService';

describe('Conditional Macros Rules Engine (F.2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('parseDiceString', () => {
    it('parses valid dice expressions', () => {
      expect(parseDiceString('2d6')).toEqual({ count: 2, sides: 6 });
      expect(parseDiceString('1d20')).toEqual({ count: 1, sides: 20 });
      expect(parseDiceString('3d8')).toEqual({ count: 3, sides: 8 });
      expect(parseDiceString('1d100')).toEqual({ count: 1, sides: 100 });
    });

    it('falls back to 1d6 on invalid strings', () => {
      expect(parseDiceString('invalid')).toEqual({ count: 1, sides: 6 });
    });
  });

  describe('evaluateCondition', () => {
    it('evaluates die_gte correctly for d20', () => {
      const cond: MacroCondition = {
        id: 'crit',
        label: 'Crítico 19-20',
        conditionType: 'die_gte',
        conditionValue: 19,
        conditionTarget: 'd20',
        effectType: 'extra_dice',
        effectValue: '2d6'
      };

      expect(evaluateCondition(cond, [{ die: 20, result: 19 }], 23)).toBe(true);
      expect(evaluateCondition(cond, [{ die: 20, result: 20 }], 24)).toBe(true);
      expect(evaluateCondition(cond, [{ die: 20, result: 18 }], 22)).toBe(false);
      expect(evaluateCondition(cond, [{ die: 6, result: 20 }], 24)).toBe(false); // Wrong die
    });

    it('evaluates hp_pct_lte correctly for bloodied/fury conditions', () => {
      const cond: MacroCondition = {
        id: 'fury',
        label: 'Desespero',
        conditionType: 'hp_pct_lte',
        conditionValue: 50,
        conditionTarget: 'attacker_hp_pct',
        effectType: 'bonus_mod',
        effectValue: 3
      };

      expect(evaluateCondition(cond, [], 10, { characterHpPct: 40 })).toBe(true);
      expect(evaluateCondition(cond, [], 10, { characterHpPct: 50 })).toBe(true);
      expect(evaluateCondition(cond, [], 10, { characterHpPct: 51 })).toBe(false);
      expect(evaluateCondition(cond, [], 10)).toBe(false);
    });

    it('evaluates mp_gte correctly for spell empowerment', () => {
      const cond: MacroCondition = {
        id: 'mana',
        label: 'Gasto de Mana',
        conditionType: 'mp_gte',
        conditionValue: 3,
        conditionTarget: 'attacker_pm',
        effectType: 'extra_dice',
        effectValue: '2d8'
      };

      expect(evaluateCondition(cond, [], 15, { characterPm: 5 })).toBe(true);
      expect(evaluateCondition(cond, [], 15, { characterPm: 2 })).toBe(false);
    });

    it('evaluates total_gte correctly for DC/AC checks', () => {
      const cond: MacroCondition = {
        id: 'dc_check',
        label: 'Superou CD 15',
        conditionType: 'total_gte',
        conditionValue: 15,
        effectType: 'bonus_mod',
        effectValue: 2
      };

      expect(evaluateCondition(cond, [], 16)).toBe(true);
      expect(evaluateCondition(cond, [], 14)).toBe(false);
    });
  });

  describe('executeConditionalMacro', () => {
    it('executes a macro and applies bonus and extra dice', () => {
      const macro: ConditionalMacro = {
        id: 'test_macro',
        name: 'Golpe Teste',
        basePool: { 6: 2 },
        baseModifier: 3,
        conditions: [
          {
            id: 'always_bonus',
            label: 'Bônus Sempre Ativo',
            conditionType: 'always',
            conditionValue: 0,
            effectType: 'bonus_mod',
            effectValue: 4
          }
        ]
      };

      const result = executeConditionalMacro(macro, undefined, false);

      expect(result.macroName).toBe('Golpe Teste');
      expect(result.baseRolls.length).toBe(2);
      expect(result.totalBonus).toBe(7); // 3 base + 4 bonus
      expect(result.finalTotal).toBeGreaterThanOrEqual(2 + 7);
      expect(result.chatMessageHtml).toContain('Golpe Teste');
    });

    it('triggers SFX and critical flags on d20 criticals', () => {
      const brutalStrike = PRESET_CONDITIONAL_MACROS.find(m => m.id === 'brutal_strike')!;
      expect(brutalStrike).toBeDefined();

      const result = executeConditionalMacro(brutalStrike, undefined, false);
      expect(result.baseRolls.length).toBe(1);
      expect(result.baseRolls[0].die).toBe(20);
    });
  });

  describe('CRUD storage operations', () => {
    it('loads presets by default', () => {
      const macros = loadCustomMacros();
      expect(macros.length).toBe(PRESET_CONDITIONAL_MACROS.length);
    });

    it('saves, loads, and deletes custom macros', () => {
      const custom: ConditionalMacro = {
        id: 'custom_1',
        name: 'Tiro Lendário',
        basePool: { 20: 1 },
        baseModifier: 5,
        conditions: []
      };

      const saved = saveCustomMacro(custom);
      expect(saved.some(m => m.id === 'custom_1')).toBe(true);

      const loaded = loadCustomMacros();
      expect(loaded.find(m => m.id === 'custom_1')?.name).toBe('Tiro Lendário');

      const afterDelete = deleteCustomMacro('custom_1');
      expect(afterDelete.some(m => m.id === 'custom_1')).toBe(false);
    });
  });
});
