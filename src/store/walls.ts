import { state } from '../services/yjs';

export interface WallPoint {
  x: number;
  y: number;
}

export interface MapWall {
  id: string;
  a: WallPoint;
  b: WallPoint;
  thickness?: number;
  color?: string;
  hidden?: boolean;
  locked?: boolean;
}

export function addMapWall(wall: Omit<MapWall, 'id'> & { id?: string }): string {
  const id = wall.id || `wall_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  state.walls.set(id, { ...wall, id });
  return id;
}

export function updateMapWall(id: string, updates: Partial<MapWall>) {
  const wall = state.walls.get(id) as MapWall | undefined;
  if (wall) state.walls.set(id, { ...wall, ...updates });
}

export function removeMapWall(id: string) {
  state.walls.delete(id);
}

export function clearMapWalls() {
  state.walls.clear();
}

