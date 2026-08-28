import { describe, expect, it } from 'vitest';
import { pointInDrawingShape, tokensInsideDrawingShapes } from './drawingGeometry';

const rect = (shapeType: 'rectangle' | 'circle' | 'triangle' = 'rectangle') => ({
  type: 'shape',
  shapeType,
  points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
});

describe('drawing geometry', () => {
  it('detects rectangle, ellipse and triangle containment', () => {
    expect(pointInDrawingShape({ x: 50, y: 50 }, rect())).toBe(true);
    expect(pointInDrawingShape({ x: 110, y: 50 }, rect())).toBe(false);
    expect(pointInDrawingShape({ x: 50, y: 50 }, rect('circle'))).toBe(true);
    expect(pointInDrawingShape({ x: 5, y: 5 }, rect('circle'))).toBe(false);
    expect(pointInDrawingShape({ x: 50, y: 25 }, rect('triangle'))).toBe(true);
    expect(pointInDrawingShape({ x: -5, y: 90 }, rect('triangle'))).toBe(false);
  });

  it('supports fused shapes and ignores hidden areas', () => {
    const fused = {
      type: 'shape',
      shapeType: 'fused' as const,
      subShapes: [
        { shapeType: 'rectangle' as const, points: [{ x: 0, y: 0 }, { x: 40, y: 40 }] },
        { shapeType: 'circle' as const, points: [{ x: 80, y: 80 }, { x: 120, y: 120 }] },
      ],
      points: [{ x: 0, y: 0 }, { x: 120, y: 120 }],
    };
    expect(pointInDrawingShape({ x: 20, y: 20 }, fused)).toBe(true);
    expect(pointInDrawingShape({ x: 100, y: 100 }, fused)).toBe(true);
    expect(pointInDrawingShape({ x: 60, y: 60 }, fused)).toBe(false);
    expect(pointInDrawingShape({ x: 20, y: 20 }, { ...fused, hidden: true })).toBe(false);
  });

  it('returns placed tokens inside at least one shape', () => {
    const tokens = [
      { id: 'inside', x: 20, y: 20 },
      { id: 'outside', x: 200, y: 200 },
      { id: 'hidden-position', x: -9999, y: -9999 },
    ];
    expect(tokensInsideDrawingShapes(tokens, [rect()]).map(t => t.id)).toEqual(['inside']);
  });
});
