import { state } from '../services/yjs';

export interface FogGeomCircle {
  x: number;
  y: number;
  r: number;
}

export interface FogGeomSquare {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FogGeomPolygon {
  points: { x: number, y: number }[];
}

export type FogOpType = 'circle' | 'square' | 'polygon' | 'path';
export type FogOpMode = 'reveal' | 'hide';

export interface FogOp {
  id: string;
  type: FogOpType;
  mode: FogOpMode;
  geom: FogGeomCircle | FogGeomSquare | FogGeomPolygon;
}

export function getFogOps(): FogOp[] {
  return Array.from(state.fogOps.values()) as FogOp[];
}

export function addFogOp(op: FogOp) {
  state.fogOps.set(op.id, op);
}

export function removeFogOp(id: string) {
  state.fogOps.delete(id);
}

export function clearFogOps() {
  const ids = Array.from(state.fogOps.keys());
  ids.forEach(id => state.fogOps.delete(id));
}
