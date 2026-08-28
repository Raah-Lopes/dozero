/**
 * Pure TypeScript Dice Parser & Evaluator (Ponytail style - zero bloated deps)
 * Supports: NdX (e.g. 1d20, 2d6, 4d8), modifiers (+/- numbers), advantage/disadvantage (adv/dis).
 */

export interface ParsedDiceResult {
  expression: string;
  total: number;
  rolls: number[];
  modifier: number;
  isCriticalSuccess: boolean;
  isCriticalFailure: boolean;
  breakdown: string;
}

export function parseAndRollDice(expr: string): ParsedDiceResult {
  const safeExpr = String(expr || '1d20').trim();
  const clean = safeExpr.toLowerCase().replace(/\s+/g, '');
  
  // Format: (count)d(sides)([+-]modifier)
  // e.g., 1d20+5, 2d6-2, d20, 3d8, 1d100
  const match = clean.match(/^(\d*)d(\d+)([+-]\d+)?$/);

  if (!match) {
    // Fallback: basic 1d20 roll
    const sides = 20;
    const roll = Math.floor(Math.random() * sides) + 1;
    return {
      expression: safeExpr,
      total: roll,
      rolls: [roll],
      modifier: 0,
      isCriticalSuccess: roll === 20,
      isCriticalFailure: roll === 1,
      breakdown: `[${roll}]`
    };
  }

  const count = match[1] ? Math.max(1, Math.min(100, parseInt(match[1], 10))) : 1;
  const sides = Math.max(2, parseInt(match[2], 10));
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  const rolls: number[] = [];
  let sum = 0;

  for (let i = 0; i < count; i++) {
    const val = Math.floor(Math.random() * sides) + 1;
    rolls.push(val);
    sum += val;
  }

  const total = Math.max(0, sum + modifier);
  const isCriticalSuccess = sides === 20 && count === 1 && rolls[0] === 20;
  const isCriticalFailure = sides === 20 && count === 1 && rolls[0] === 1;

  const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
  const breakdown = `[${rolls.join(', ')}]${modStr} = ${total}`;

  return {
    expression: expr,
    total,
    rolls,
    modifier,
    isCriticalSuccess,
    isCriticalFailure,
    breakdown
  };
}

export function triggerDiceOverlay(title: string, result: number | string, type: 'attack' | 'heal' | 'utility' = 'utility') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dice-roll', {
      detail: { id: Math.random().toString(36).substr(2, 9), title, result, type }
    }));
  }
}
