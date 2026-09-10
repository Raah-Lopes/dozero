import type { BackgroundData } from '../store/backgrounds';

const HANDOFF_KEY_PREFIX = 'dozero.map-studio.handoff.v1.';

export interface MapStudioHandoff {
  version: 1;
  roomCode: string;
  background: BackgroundData;
  gridSize?: number;
  createdAt: string;
}

function storageKey(roomCode: string) {
  return `${HANDOFF_KEY_PREFIX}${encodeURIComponent(roomCode)}`;
}

function isValidBackground(value: unknown): value is BackgroundData {
  if (!value || typeof value !== 'object') return false;
  const background = value as Partial<BackgroundData>;
  return typeof background.id === 'string'
    && background.id.startsWith('map_studio_')
    && typeof background.name === 'string'
    && typeof background.imageUrl === 'string'
    && /^https?:\/\//.test(background.imageUrl)
    && [background.x, background.y, background.width, background.height].every(
      number => typeof number === 'number' && Number.isFinite(number) && number > 0,
    );
}

export function queueMapStudioHandoff(
  roomCode: string,
  background: BackgroundData,
  gridSize?: number,
) {
  const handoff: MapStudioHandoff = {
    version: 1,
    roomCode,
    background,
    gridSize: typeof gridSize === 'number' && gridSize > 0 ? gridSize : undefined,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(storageKey(roomCode), JSON.stringify(handoff));
  return handoff;
}

export function readMapStudioHandoff(roomCode: string): MapStudioHandoff | null {
  const raw = localStorage.getItem(storageKey(roomCode));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<MapStudioHandoff>;
    if (
      value.version !== 1
      || value.roomCode !== roomCode
      || typeof value.createdAt !== 'string'
      || !isValidBackground(value.background)
      || (value.gridSize !== undefined && (typeof value.gridSize !== 'number' || value.gridSize <= 0))
    ) return null;
    return value as MapStudioHandoff;
  } catch {
    return null;
  }
}

export function clearMapStudioHandoff(roomCode: string, backgroundId: string) {
  const pending = readMapStudioHandoff(roomCode);
  if (pending?.background.id === backgroundId) {
    localStorage.removeItem(storageKey(roomCode));
  }
}
