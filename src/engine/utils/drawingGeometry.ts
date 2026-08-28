export interface GeometryPoint {
  x: number;
  y: number;
}

export type EncounterShapeType = 'rectangle' | 'circle' | 'triangle' | 'polygon' | 'fused';

export interface EncounterShape {
  type?: string;
  shapeType?: EncounterShapeType;
  points?: GeometryPoint[];
  subShapes?: Array<{ shapeType?: EncounterShapeType; points?: GeometryPoint[] }>;
  hidden?: boolean;
}

const firstAndLast = (points: GeometryPoint[] | undefined) => {
  if (!points || points.length < 2) return null;
  return { start: points[0], end: points[points.length - 1] };
};

function pointInPolygon(point: GeometryPoint, points: GeometryPoint[]): boolean {
  if (points.length < 3) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInTriangle(point: GeometryPoint, points: GeometryPoint[]): boolean {
  if (points.length < 3) return false;
  const [a, b, c] = points;
  const sign = (p1: GeometryPoint, p2: GeometryPoint, p3: GeometryPoint) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(point, a, b);
  const d2 = sign(point, b, c);
  const d3 = sign(point, c, a);
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNegative && hasPositive);
}

/** Returns true when a world-space point is inside a drawn tactical shape. */
export function pointInDrawingShape(point: GeometryPoint, shape: EncounterShape): boolean {
  if (shape.hidden || shape.type !== 'shape') return false;

  const subShapes = shape.subShapes?.filter(s => s.points && s.points.length >= 2) || [];
  if (subShapes.length > 0) {
    return subShapes.some(sub => pointInDrawingShape(point, {
      type: 'shape',
      shapeType: sub.shapeType,
      points: sub.points,
    }));
  }

  const bounds = firstAndLast(shape.points);
  if (!bounds) return false;
  const { start, end } = bounds;
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const type = shape.shapeType || 'rectangle';

  if (type === 'circle') {
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    if (rx <= 0 || ry <= 0) return false;
    const nx = (point.x - (minX + rx)) / rx;
    const ny = (point.y - (minY + ry)) / ry;
    return nx * nx + ny * ny <= 1;
  }
  if (type === 'triangle') {
    return pointInTriangle(point, [
      { x: minX + (maxX - minX) / 2, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ]);
  }
  if (type === 'polygon') return pointInPolygon(point, shape.points || []);
  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
}

export interface EncounterToken {
  id: string;
  x: number;
  y: number;
  inCombat?: boolean;
}

/** Finds placed tokens inside one or more tactical shapes. */
export function tokensInsideDrawingShapes<T extends EncounterToken>(tokens: T[], drawings: EncounterShape[]): T[] {
  const shapes = drawings.filter(d => d.type === 'shape' && !d.hidden);
  if (shapes.length === 0) return [];
  return tokens.filter(token =>
    token.x > -1000 && token.y > -1000 &&
    shapes.some(shape => pointInDrawingShape({ x: token.x, y: token.y }, shape)),
  );
}

