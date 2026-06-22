import { state } from '../services/yjs';

export interface MapConfig {
  gridSize: number;
  gridType: 'square' | 'hex_v' | 'hex_h' | 'dots_square' | 'dots_hex';
  gridColor: string; // Hex string ex: '#1e293b'
  gridAlpha: number;
  fogOfWar: boolean;
  fowRadius: number;
  fowShape: 'circle' | 'square' | 'hexagon';
  fowHideTokens: boolean;
}

export function getMapConfig(): MapConfig {
  const current = state.mapConfig.get('global');
  if (current) {
    return current as MapConfig;
  }
  return {
    gridSize: 50,
    gridType: 'square',
    gridColor: '#1e293b',
    gridAlpha: 0.5,
    fogOfWar: false,
    fowRadius: 6,
    fowShape: 'circle',
    fowHideTokens: false
  };
}

export function updateMapConfig(config: Partial<MapConfig>) {
  const current = getMapConfig();
  state.mapConfig.set('global', { ...current, ...config });
}
