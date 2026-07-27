// fogVisibility.ts
// Algoritmo de Raycasting "roubado" e adaptado para o DOZERO VTT

import { FogGeomPolygon, FogGeomSquare } from '../../../store';

const EPSILON = 0.0001;

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  a: Point;
  b: Point;
}

function rectSegments(x: number, y: number, w: number, h: number): Segment[] {
  return [
    { a: { x, y }, b: { x: x + w, y } },
    { a: { x: x + w, y }, b: { x: x + w, y: y + h } },
    { a: { x: x + w, y: y + h }, b: { x, y: y + h } },
    { a: { x, y: y + h }, b: { x, y } },
  ];
}

export function extractWallSegments(fogOps: any[]): Segment[] {
  const segs: Segment[] = [];
  
  for (const op of fogOps) {
    if (op.type === 'square') {
      const geom = op.geom as FogGeomSquare;
      segs.push(...rectSegments(geom.x - geom.w / 2, geom.y - geom.h / 2, geom.w, geom.h));
    } else if (op.type === 'polygon') {
      const geom = op.geom as FogGeomPolygon;
      if (geom.points && geom.points.length > 2) {
        for (let i = 0; i < geom.points.length; i++) {
          const p1 = geom.points[i];
          const p2 = geom.points[(i + 1) % geom.points.length];
          segs.push({ a: { x: p1.x, y: p1.y }, b: { x: p2.x, y: p2.y } });
        }
      }
    } else if (op.type === 'path' && op.mode === 'hide') {
      const geom = op.geom as any;
      if (geom.points && geom.points.length > 1) {
        for (let i = 0; i < geom.points.length - 1; i++) {
          const p1 = geom.points[i];
          const p2 = geom.points[i + 1];
          segs.push({ a: { x: p1.x, y: p1.y }, b: { x: p2.x, y: p2.y } });
        }
      }
    }
  }
  return segs;
}

function intersectRay(
  px: number, py: number,
  dx: number, dy: number,
  ax: number, ay: number,
  bx: number, by: number
) {
  const sx = bx - ax;
  const sy = by - ay;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-7) return null;
  const t = ((ax - px) * sy - (ay - py) * sx) / denom;
  const u = ((ax - px) * dy - (ay - py) * dx) / denom;
  if (t >= 0 && u >= 0 && u <= 1) return { x: px + dx * t, y: py + dy * t, t };
  return null;
}

export function visibilityPolygon(px: number, py: number, segs: Segment[], radius: number) {
  const angles: number[] = [];
  
  for (const s of segs) {
    for (const p of [s.a, s.b]) {
      const a = Math.atan2(p.y - py, p.x - px);
      angles.push(a - EPSILON, a, a + EPSILON);
    }
  }

  const circleSegments = 64; // Increased for smoother circles
  for (let i = 0; i < circleSegments; i++) {
    angles.push((i * Math.PI * 2) / circleSegments);
  }

  const pts: { x: number; y: number; angle: number }[] = [];

  for (const angle of angles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let best = null;
    
    for (const s of segs) {
      const hit = intersectRay(px, py, dx, dy, s.a.x, s.a.y, s.b.x, s.b.y);
      if (hit && (!best || hit.t < best.t)) best = hit;
    }
    
    if (!best || best.t > radius) {
      pts.push({ x: px + dx * radius, y: py + dy * radius, angle });
    } else {
      pts.push({ x: best.x, y: best.y, angle });
    }
  }
  
  pts.sort((a, b) => a.angle - b.angle);
  return pts;
}
