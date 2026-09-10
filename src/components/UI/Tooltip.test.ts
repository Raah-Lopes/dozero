import { describe, expect, it } from 'vitest';
import { getTooltipViewportAdjustment } from './tooltipPosition';

describe('getTooltipViewportAdjustment', () => {
  it('moves a tooltip back inside the right edge of the viewport', () => {
    expect(getTooltipViewportAdjustment(
      { top: 80, right: 246, bottom: 130, left: 126 },
      240,
      180
    )).toEqual({ x: -14, y: 0 });
  });

  it('moves a tooltip back inside the left and top edges', () => {
    expect(getTooltipViewportAdjustment(
      { top: -12, right: 110, bottom: 38, left: -10 },
      240,
      180
    )).toEqual({ x: 18, y: 20 });
  });

  it('does not move a tooltip that is already fully visible', () => {
    expect(getTooltipViewportAdjustment(
      { top: 20, right: 220, bottom: 70, left: 100 },
      240,
      180
    )).toEqual({ x: 0, y: 0 });
  });
});
