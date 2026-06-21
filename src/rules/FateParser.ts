// Fate System implementation (Core, Accelerated, Condensed)
// Manages Stress Tracks and Consequences as matrices.

export interface StressBox {
  box: number;
  value: number;
  checked: boolean;
}

export type FateSystemType = 'Core' | 'Accelerated' | 'Condensed';

export class FateParser {
  /**
   * Parses a configuration string into a Stress Track matrix.
   * e.g., config="Physical:2 1 2 3" type="Core"
   * e.g., config="Physical:3" type="Condensed"
   */
  static parseStressTrack(configString: string, type: FateSystemType): StressBox[] {
    // @ts-ignore - auto fix
    const [name, valuesPart] = configString.split(':');
    if (!valuesPart) return [];

    const track: StressBox[] = [];
    
    if (type === 'Condensed') {
      // Condensed: e.g. "Physical:3" means 3 boxes of 1 point each
      const amount = parseInt(valuesPart.trim(), 10);
      for (let i = 1; i <= amount; i++) {
        track.push({ box: i, value: 1, checked: false });
      }
    } else {
      // Core/Accelerated: e.g. "Physical:2 1 2" -> usually values are 1, 2, 3...
      const parts = valuesPart.trim().split(' ').map(Number);
      // The first number might be the base amount, but let's assume the string provides the literal values
      // e.g. "1 2 3"
      parts.forEach((val, idx) => {
        if (!isNaN(val)) {
          track.push({ box: idx + 1, value: val, checked: false });
        }
      });
    }

    return track;
  }

  /**
   * Applies damage to a stress track and returns the new track state and unabsorbed damage (needs Consequence)
   */
  static applyDamage(track: StressBox[], damage: number, type: FateSystemType): { newTrack: StressBox[], overflow: number } {
    let currentDamage = damage;
    const newTrack = [...track.map(b => ({...b}))];

    if (type === 'Condensed') {
      // Fill sequentially
      for (let i = 0; i < newTrack.length; i++) {
        if (!newTrack[i].checked && currentDamage > 0) {
          newTrack[i].checked = true;
          currentDamage -= 1;
        }
      }
    } else {
      // Core/Accelerated: Must check the box matching the shift exactly, or a higher one
      const targetBox = newTrack.find(b => b.value >= currentDamage && !b.checked);
      if (targetBox) {
        targetBox.checked = true;
        currentDamage = 0; // Fully absorbed by this single box
      } else {
        // If no single box can absorb it, the damage cannot be absorbed by stress alone
        // Needs a consequence. We return the full damage as overflow.
      }
    }

    return { newTrack, overflow: currentDamage };
  }
}
