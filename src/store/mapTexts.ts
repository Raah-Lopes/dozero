import { state } from '../services/yjs';

export interface MapTextData {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  backgroundColor?: string;
  hidden?: boolean;
  wordWrapWidth?: number;
}

export function addMapText(textData: MapTextData) {
  state.mapTexts.set(textData.id, textData);
}

export function updateMapTextProps(id: string, updates: Partial<MapTextData>) {
  const t = state.mapTexts.get(id) as MapTextData | undefined;
  if (t) {
    state.mapTexts.set(id, { ...t, ...updates });
  }
}

export function updateMapTextPosition(id: string, x: number, y: number) {
  const t = state.mapTexts.get(id) as MapTextData | undefined;
  if (t && (t.x !== x || t.y !== y)) {
    state.mapTexts.set(id, { ...t, x, y });
  }
}

export function removeMapText(id: string) {
  state.mapTexts.delete(id);
}
