// World of Darkness V5 Stochastic Simulator
// Handles Hunger Dice, Messy Criticals and Bestial Failures

export interface WoDRollResult {
  pool: number;
  hunger: number;
  successes: number;
  isMessyCritical: boolean;
  isBestialFailure: boolean;
  diceResult: {
    normal: number[];
    hunger: number[];
  };
}

export class WoDParser {
  /**
   * Rolls a d10 pool incorporating Hunger mechanics (V5)
   */
  static rollV5(pool: number, hunger: number, difficulty: number = 0): WoDRollResult {
    // 1. Calculation and Substitution
    const hungerDiceCount = Math.min(pool, hunger);
    const normalDiceCount = pool - hungerDiceCount;

    const normalResults: number[] = [];
    const hungerResults: number[] = [];

    // 2. Roll Normal Dice
    for (let i = 0; i < normalDiceCount; i++) {
      normalResults.push(Math.floor(Math.random() * 10) + 1);
    }

    // 3. Roll Hunger Dice
    for (let i = 0; i < hungerDiceCount; i++) {
      hungerResults.push(Math.floor(Math.random() * 10) + 1);
    }

    // 4. Assessment
    let successes = 0;
    let normalTens = 0;
    let hungerTens = 0;
    let hungerOnes = 0;

    normalResults.forEach(val => {
      if (val >= 6) successes++;
      if (val === 10) normalTens++;
    });

    hungerResults.forEach(val => {
      if (val >= 6) successes++;
      if (val === 10) hungerTens++;
      if (val === 1) hungerOnes++;
    });

    const totalTens = normalTens + hungerTens;
    
    // Critical Bonus: +2 successes for every pair of 10s
    const criticalPairs = Math.floor(totalTens / 2);
    successes += (criticalPairs * 2);

    // 5. Edge Cases
    const isMessyCritical = criticalPairs > 0 && hungerTens > 0;
    const isBestialFailure = successes < difficulty && hungerOnes > 0;

    return {
      pool,
      hunger,
      successes,
      isMessyCritical,
      isBestialFailure,
      diceResult: {
        normal: normalResults,
        hunger: hungerResults
      }
    };
  }
}
