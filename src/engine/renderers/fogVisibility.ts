// fogVisibility.ts
// Algoritmo de Raycasting e Fusão Geométrica de Paredes de Névoa (Boolean Union / Wall Fusion)

import { FogGeomPolygon, FogGeomSquare, FogGeomCircle } from '../../store';

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

function getRawSegmentsForOp(op: any): Segment[] {
  if (op.type === 'square') {
    const geom = op.geom as FogGeomSquare;
    return rectSegments(geom.x - geom.w / 2, geom.y - geom.h / 2, geom.w, geom.h);
  }
  if (op.type === 'polygon') {
    const geom = op.geom as FogGeomPolygon;
    const segs: Segment[] = [];
    if (geom.points && geom.points.length > 2) {
      for (let i = 0; i < geom.points.length; i++) {
        const p1 = geom.points[i];
        const p2 = geom.points[(i + 1) % geom.points.length];
        segs.push({ a: { x: p1.x, y: p1.y }, b: { x: p2.x, y: p2.y } });
      }
    }
    return segs;
  }
  if (op.type === 'circle') {
    const geom = op.geom as any;
    const segments = 32;
    const segs: Segment[] = [];
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      segs.push({
        a: { x: geom.x + Math.cos(a1) * geom.r, y: geom.y + Math.sin(a1) * geom.r },
        b: { x: geom.x + Math.cos(a2) * geom.r, y: geom.y + Math.sin(a2) * geom.r }
      });
    }
    return segs;
  }
  if (op.type === 'path') {
    const geom = op.geom as any;
    const segs: Segment[] = [];
    if (geom.points && geom.points.length > 1) {
      for (let i = 0; i < geom.points.length - 1; i++) {
        const p1 = geom.points[i];
        const p2 = geom.points[i + 1];
        segs.push({ a: { x: p1.x, y: p1.y }, b: { x: p2.x, y: p2.y } });
      }
    }
    return segs;
  }
  return [];
}

export function isPointInsideOp(p: Point, op: any, eps = 0.5): boolean {
  if (op.type === 'square') {
    const g = op.geom as FogGeomSquare;
    const minX = g.x - g.w / 2;
    const maxX = g.x + g.w / 2;
    const minY = g.y - g.h / 2;
    const maxY = g.y + g.h / 2;
    return p.x > minX + eps && p.x < maxX - eps && p.y > minY + eps && p.y < maxY - eps;
  }
  if (op.type === 'circle') {
    const g = op.geom as FogGeomCircle;
    return Math.hypot(p.x - g.x, p.y - g.y) < g.r - eps;
  }
  if (op.type === 'polygon') {
    const g = op.geom as FogGeomPolygon;
    const pts = g.points;
    if (!pts || pts.length < 3) return false;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  return false;
}

function getSegmentIntersectionT(a1: Point, a2: Point, b1: Point, b2: Point): number | null {
  const dx1 = a2.x - a1.x;
  const dy1 = a2.y - a1.y;
  const dx2 = b2.x - b1.x;
  const dy2 = b2.y - b1.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom;
  const u = ((b1.x - a1.x) * dy1 - (b1.y - a1.y) * dx1) / denom;
  if (t > 1e-5 && t < 1 - 1e-5 && u >= -1e-5 && u <= 1 + 1e-5) {
    return t;
  }
  return null;
}

function getCircleIntersectionT(p1: Point, p2: Point, cx: number, cy: number, r: number): number[] {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const fx = p1.x - cx;
  const fy = p1.y - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const discriminant = b * b - 4 * a * c;
  if (discriminant <= 0 || a < 1e-9) return [];
  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);
  const res: number[] = [];
  if (t1 > 1e-5 && t1 < 1 - 1e-5) res.push(t1);
  if (t2 > 1e-5 && t2 < 1 - 1e-5) res.push(t2);
  return res;
}

/**
 * Extrai e funde todas as paredes de névoa de guerra, eliminando divisórias internas
 * entre salas e corredores sobrepostos (Boolean Union).
 */
export function extractWallSegments(fogOps: any[]): Segment[] {
  const hideOps = fogOps.filter(op => op.mode === 'hide');
  if (hideOps.length === 0) return [];

  // Se houver apenas 1 forma, retorna suas paredes normalmente
  if (hideOps.length === 1) {
    return getRawSegmentsForOp(hideOps[0]);
  }

  const resultSegments: Segment[] = [];

  for (let i = 0; i < hideOps.length; i++) {
    const op = hideOps[i];
    const rawSegs = getRawSegmentsForOp(op);
    const otherOps = hideOps.filter((_, idx) => idx !== i);

    for (const seg of rawSegs) {
      const splitTs: number[] = [0, 1];

      // Coleta interseções com outras formas
      for (const other of otherOps) {
        if (other.type === 'circle') {
          const g = other.geom as FogGeomCircle;
          const ts = getCircleIntersectionT(seg.a, seg.b, g.x, g.y, g.r);
          splitTs.push(...ts);
        } else {
          const otherSegs = getRawSegmentsForOp(other);
          for (const oSeg of otherSegs) {
            const t = getSegmentIntersectionT(seg.a, seg.b, oSeg.a, oSeg.b);
            if (t !== null) splitTs.push(t);
          }
        }
      }

      // Ordena e remove duplicatas
      splitTs.sort((a, b) => a - b);
      const uniqueTs: number[] = [];
      for (const t of splitTs) {
        if (uniqueTs.length === 0 || Math.abs(t - uniqueTs[uniqueTs.length - 1]) > 1e-4) {
          uniqueTs.push(t);
        }
      }

      // Testa cada sub-segmento: se estiver dentro de qualquer outra forma, DESCARTA (parede interna fundida)
      for (let k = 0; k < uniqueTs.length - 1; k++) {
        const tStart = uniqueTs[k];
        const tEnd = uniqueTs[k + 1];
        if (tEnd - tStart < 1e-4) continue;

        const tMid = (tStart + tEnd) / 2;
        const midPoint: Point = {
          x: seg.a.x + tMid * (seg.b.x - seg.a.x),
          y: seg.a.y + tMid * (seg.b.y - seg.a.y),
        };

        const isInsideOther = otherOps.some(other => isPointInsideOp(midPoint, other, 0.2));
        if (!isInsideOther) {
          resultSegments.push({
            a: {
              x: seg.a.x + tStart * (seg.b.x - seg.a.x),
              y: seg.a.y + tStart * (seg.b.y - seg.a.y)
            },
            b: {
              x: seg.a.x + tEnd * (seg.b.x - seg.a.x),
              y: seg.a.y + tEnd * (seg.b.y - seg.a.y)
            }
          });
        }
      }
    }
  }

  return resultSegments;
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

  const circleSegments = 128; // Alta precisão para contorno circular suave sem quinas
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
