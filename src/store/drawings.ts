import { state } from '../services/yjs';

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingData {
  id: string;
  name?: string;
  type: 'path' | 'arrow' | 'shape';
  points: DrawingPoint[];
  color: string;
  width: number;
  zIndex: number;
  // For shapes
  shapeType?: 'rectangle' | 'circle' | 'triangle';
  text?: string;
  layerId?: string;
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
