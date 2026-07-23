import { state } from '../services/yjs';

export interface DrawingLayerData {
  id: string;
  name: string;
  hidden?: boolean;
  locked?: boolean;
  zIndex?: number;
}

export function addDrawingLayer(layer: DrawingLayerData) {
  state.drawingLayers.set(layer.id, layer);
}

export function updateDrawingLayer(id: string, updates: Partial<DrawingLayerData>) {
  const layer = state.drawingLayers.get(id) as DrawingLayerData | undefined;
  if (layer) {
    state.drawingLayers.set(id, { ...layer, ...updates });
  }
}

export function removeDrawingLayer(id: string) {
  state.drawingLayers.delete(id);
  // Also remove all drawings that belong to this layer
  const drawingsToRemove: string[] = [];
  state.drawings.forEach((d: any) => {
    if (d.layerId === id) drawingsToRemove.push(d.id);
  });
  drawingsToRemove.forEach(dId => state.drawings.delete(dId));
}

// Inicializa a camada padrão se não existir
setTimeout(() => {
  if (!state.drawingLayers.has('default')) {
    state.drawingLayers.set('default', {
      id: 'default',
      name: 'Camada Padrão',
      zIndex: 100
    });
  }
}, 1000);
