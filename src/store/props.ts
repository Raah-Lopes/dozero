import { state } from '../services/yjs';

export interface MapProp {
  id: string;
  name: string;
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  
  // Interaction & Mechanics
  description?: string;
  isHidden?: boolean;
  isLocked?: boolean;
  requiredCheck?: { attribute: string; difficulty: number };
  lootItems?: any[];
}

export function addMapProp(propData: Omit<MapProp, 'id'>) {
  const id = `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  state.props.set(id, { id, ...propData });
  return id;
}

export function updateMapProp(id: string, updates: Partial<MapProp>) {
  const prop = state.props.get(id) as MapProp | undefined;
  if (prop) {
    state.props.set(id, { ...prop, ...updates });
  }
}

export function removeMapProp(id: string) {
  state.props.delete(id);
}

// Temporary holding for prop library images (local only, or could be synced if needed)
export const localPropLibrary: { url: string, name: string }[] = [];
