import { Config } from './modules/configModule';

export interface MapConfig {
  gridSize: number;
  gridType: 'square' | 'hex_v' | 'hex_h' | 'dots_square' | 'dots_hex';
  gridColor: string; // Hex string ex: '#1e293b'
  gridAlpha: number;
  fogOfWar: boolean;
  fowRadius: number;
  fowShape: 'circle' | 'square' | 'hexagon';
  fowHideTokens: boolean;
  fowColor?: string;
  mapBackgroundColor?: string;
}

export function getMapConfig(): MapConfig {
  const all = Config.getAll();
  return {
    gridSize: all.map?.gridSize ?? 50,
    gridType: all.map?.gridType ?? 'square',
    gridColor: all.map?.gridColor ?? '#1e293b',
    gridAlpha: all.map?.gridAlpha ?? 0.5,
    fogOfWar: all.fog?.enabled ?? false,
    fowRadius: all.fog?.radius ?? 6,
    fowShape: all.fog?.shape ?? 'circle',
    fowHideTokens: all.fog?.hideTokens ?? false,
    fowColor: all.fog?.color ?? '#000000',
    mapBackgroundColor: all.map?.mapBackgroundColor ?? 'transparent'
  };
}

export function updateMapConfig(config: Partial<MapConfig>) {
  const all = Config.getAll();
  const mapUpdates: any = {};
  const fogUpdates: any = {};

  if (config.gridSize !== undefined) mapUpdates.gridSize = config.gridSize;
  if (config.gridType !== undefined) mapUpdates.gridType = config.gridType;
  if (config.gridColor !== undefined) mapUpdates.gridColor = config.gridColor;
  if (config.gridAlpha !== undefined) mapUpdates.gridAlpha = config.gridAlpha;
  if (config.mapBackgroundColor !== undefined) mapUpdates.mapBackgroundColor = config.mapBackgroundColor;

  if (config.fogOfWar !== undefined) fogUpdates.enabled = config.fogOfWar;
  if (config.fowRadius !== undefined) fogUpdates.radius = config.fowRadius;
  if (config.fowShape !== undefined) fogUpdates.shape = config.fowShape;
  if (config.fowHideTokens !== undefined) fogUpdates.hideTokens = config.fowHideTokens;
  if (config.fowColor !== undefined) fogUpdates.color = config.fowColor;

  Config.update({
    map: { ...all.map, ...mapUpdates },
    fog: { ...all.fog, ...fogUpdates },
  });
}

