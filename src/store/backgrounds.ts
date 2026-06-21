import { state } from '../services/yjs';
import { localState } from './tokens';

export interface BackgroundData {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  opacity?: number;
  locked?: boolean;
  hidden?: boolean;
  groupId?: string;
  zIndex?: number;
}

export function toggleBgSelection(id: string, multi: boolean) {
  if (!multi) localState.selectedBgs.clear();
  
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  const groupId = bg?.groupId;

  // Identify all IDs to toggle (the clicked one, plus any in the same group)
  const idsToToggle = new Set([id]);
  if (groupId) {
    for (const [bgId, bgData] of state.backgrounds.entries()) {
      if ((bgData as BackgroundData).groupId === groupId) {
        idsToToggle.add(bgId);
      }
    }
  }

  // Toggle them
  const isSelected = localState.selectedBgs.has(id);
  idsToToggle.forEach(toggleId => {
    if (isSelected) {
      localState.selectedBgs.delete(toggleId);
    } else {
      localState.selectedBgs.add(toggleId);
    }
  });

  window.dispatchEvent(new Event('bg-selection-updated'));
}

export function clearBgSelection() {
  localState.selectedBgs.clear();
  window.dispatchEvent(new Event('bg-selection-updated'));
}

export function addBackground(bg: BackgroundData) {
  state.backgrounds.set(bg.id, bg);
}

export function toggleBackgroundLock(id: string, forceLocked?: boolean) {
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  if (bg) {
    const isLocked = forceLocked !== undefined ? forceLocked : !bg.locked;
    state.backgrounds.set(id, { ...bg, locked: isLocked });
  }
}

export function updateBackgroundProps(id: string, updates: Partial<BackgroundData>) {
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  if (bg) {
    state.backgrounds.set(id, { ...bg, ...updates });
  }
}

export function updateBackgroundPosition(id: string, x: number, y: number) {
  const bg = state.backgrounds.get(id) as BackgroundData | undefined;
  if (bg && (bg.x !== x || bg.y !== y)) {
    state.backgrounds.set(id, { ...bg, x, y });
  }
}

export function removeBackground(id: string) {
  state.backgrounds.delete(id);
}
