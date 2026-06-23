import { describe, it, expect } from 'vitest';
import { FateParser } from './FateParser';

describe('FateParser', () => {
  describe('parseStressTrack', () => {
    it('should parse Condensed stress tracks correctly', () => {
      const track = FateParser.parseStressTrack('Physical:3', 'Condensed');
      expect(track).toHaveLength(3);
      expect(track[0]).toEqual({ box: 1, value: 1, checked: false });
      expect(track[2]).toEqual({ box: 3, value: 1, checked: false });
    });

    it('should parse Core stress tracks correctly', () => {
      const track = FateParser.parseStressTrack('Mental:1 2 3', 'Core');
      expect(track).toHaveLength(3);
      expect(track[0]).toEqual({ box: 1, value: 1, checked: false });
      expect(track[1]).toEqual({ box: 2, value: 2, checked: false });
      expect(track[2]).toEqual({ box: 3, value: 3, checked: false });
    });
  });

  describe('applyDamage', () => {
    it('should apply damage sequentially in Condensed mode', () => {
      const track = FateParser.parseStressTrack('Physical:3', 'Condensed');
      const result = FateParser.applyDamage(track, 2, 'Condensed');
      
      expect(result.newTrack[0].checked).toBe(true);
      expect(result.newTrack[1].checked).toBe(true);
      expect(result.newTrack[2].checked).toBe(false);
      expect(result.overflow).toBe(0);
    });

    it('should return overflow if damage exceeds Condensed track', () => {
      const track = FateParser.parseStressTrack('Physical:2', 'Condensed');
      const result = FateParser.applyDamage(track, 3, 'Condensed');
      
      expect(result.newTrack[0].checked).toBe(true);
      expect(result.newTrack[1].checked).toBe(true);
      expect(result.overflow).toBe(1);
    });

    it('should check highest available box in Core mode', () => {
      const track = FateParser.parseStressTrack('Mental:1 2 3', 'Core');
      const result = FateParser.applyDamage(track, 2, 'Core');
      
      expect(result.newTrack[0].checked).toBe(false);
      expect(result.newTrack[1].checked).toBe(true); // box with value 2
      expect(result.newTrack[2].checked).toBe(false);
      expect(result.overflow).toBe(0);
    });

    it('should overflow if exact box and higher boxes are checked or unavailable in Core mode', () => {
      const track = FateParser.parseStressTrack('Mental:1 2', 'Core');
      const result = FateParser.applyDamage(track, 3, 'Core');
      
      // Since it requires a 3 or higher, and there is none, it overflows entirely
      expect(result.newTrack[0].checked).toBe(false);
      expect(result.newTrack[1].checked).toBe(false);
      expect(result.overflow).toBe(3);
    });
  });
});
