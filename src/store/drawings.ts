import { state } from '../services/yjs';

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface SubShapeData {
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'polygon';
  points: DrawingPoint[];
}

export interface DrawingData {
  id: string;
  name?: string;
  type: 'path' | 'arrow' | 'shape' | 'image' | 'polygon';
  points: DrawingPoint[];
  subPaths?: DrawingPoint[][];
  subShapes?: SubShapeData[];
  color: string;
  fillColor?: string;
  width: number;
  zIndex: number;
  // For shapes
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'polygon' | 'fused';
  isFused?: boolean;
  // For images
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  text?: string;
  layerId?: string;
  hidden?: boolean;
  locked?: boolean;
  // Transformations for images
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
  skewX?: number;
  skewY?: number;
}

export function addDrawing(drawing: DrawingData) {
  state.drawings.set(drawing.id, drawing);
}

export function updateDrawing(id: string, updates: Partial<DrawingData>) {
  const drawing = state.drawings.get(id) as DrawingData | undefined;
  if (drawing) {
    state.drawings.set(id, { ...drawing, ...updates });
  }
}

export const updateDrawingProps = updateDrawing;

export function removeDrawing(id: string) {
  state.drawings.delete(id);
}

export function clearAllDrawings() {
  state.drawings.clear();
}

export function getShapeBounds(shape: { points: DrawingPoint[]; subShapes?: SubShapeData[] }) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const allPoints = (shape.subShapes && shape.subShapes.length > 0)
    ? shape.subShapes.flatMap(s => s.points)
    : shape.points;
  for (const p of allPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function doShapesOverlap(
  s1: { points: DrawingPoint[]; subShapes?: SubShapeData[] },
  s2: { points: DrawingPoint[]; subShapes?: SubShapeData[] }
): boolean {
  if (!s1.points?.length || !s2.points?.length) return false;
  const b1 = getShapeBounds(s1);
  const b2 = getShapeBounds(s2);
  return !(b1.maxX < b2.minX || b1.minX > b2.maxX || b1.maxY < b2.minY || b1.minY > b2.maxY);
}

export function fuseDrawings(drawingIds: string[]): string | null {
  if (drawingIds.length < 2) return null;
  const targetId = drawingIds[0];
  const target = state.drawings.get(targetId) as DrawingData | undefined;
  if (!target) return null;

  const allSubShapes: SubShapeData[] = [];
  if (target.subShapes && target.subShapes.length > 0) {
    allSubShapes.push(...target.subShapes);
  } else if (target.points.length >= 2) {
    allSubShapes.push({ shapeType: (target.shapeType as any) || 'rectangle', points: [...target.points] });
  }

  for (let i = 1; i < drawingIds.length; i++) {
    const d = state.drawings.get(drawingIds[i]) as DrawingData | undefined;
    if (!d) continue;
    if (d.subShapes && d.subShapes.length > 0) {
      allSubShapes.push(...d.subShapes);
    } else if (d.points.length >= 2) {
      allSubShapes.push({ shapeType: (d.shapeType as any) || 'rectangle', points: [...d.points] });
    }
    state.drawings.delete(drawingIds[i]);
  }

  state.drawings.set(targetId, {
    ...target,
    type: 'shape',
    shapeType: 'fused',
    isFused: true,
    subShapes: allSubShapes,
    name: target.name ? `${target.name} (Fundida)` : 'Forma Fundida'
  });

  return targetId;
}

export function fuseOverlappingShapes(layerId?: string): number {
  const allShapes = Array.from(state.drawings.values() as IterableIterator<DrawingData>).filter(
    d => d.type === 'shape' && (!layerId || d.layerId === layerId)
  );

  let fusedCount = 0;
  for (let i = 0; i < allShapes.length; i++) {
    const s1 = state.drawings.get(allShapes[i].id) as DrawingData | undefined;
    if (!s1) continue;

    for (let j = i + 1; j < allShapes.length; j++) {
      const s2 = state.drawings.get(allShapes[j].id) as DrawingData | undefined;
      if (!s2) continue;

      if (doShapesOverlap(s1, s2)) {
        fuseDrawings([s1.id, s2.id]);
        fusedCount++;
        break;
      }
    }
  }

  return fusedCount;
}
