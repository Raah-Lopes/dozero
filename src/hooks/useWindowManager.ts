import { create } from 'zustand';
import { startTransition } from 'react';

export type ViewMode = 'canvas' | 'wiki' | 'theater' | 'brain' | 'sheets';
export type ModalMode = 'none' | 'players' | 'lobby' | 'settings' | 'settings-aparencia' | 'settings-modulos' | 'settings-ia' | 'settings-cenario' | 'chat' | 'clockConfig' | 'widgets' | 'playerManager' | 'tokenConfig';
export type InteractionTool = 'CURSOR' | 'FOG' | 'RULER' | 'MEASURE';

interface WindowManagerState {
  // Generic openWindows (e.g. combatLog, etc)
  openWindows: Record<string, boolean>;
  toggleWindow: (windowId: string) => void;
  openWindow: (windowId: string) => void;
  closeWindow: (windowId: string) => void;
  closeAllWindows: () => void;

  // App Level View & Modals
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeCharacterId: string | null;
  setActiveCharacterId: (id: string | null) => void;
  sheetScope: 'campaign' | 'vault';
  setSheetScope: (scope: 'campaign' | 'vault') => void;
  activeModal: ModalMode;
  setActiveModal: (modal: ModalMode) => void;

  activeTool: InteractionTool;
  setActiveTool: (tool: InteractionTool) => void;

  // Toggle panels
  showActors: boolean;
  setShowActors: (show: boolean) => void;
  showToolsDropdown: boolean;
  setShowToolsDropdown: (show: boolean) => void;

  // Document/Sheet Arrays
  openSheets: string[];
  setOpenSheets: (sheets: string[] | ((prev: string[]) => string[])) => void;
  openWikiDocs: { id: string, filepath: string }[];
  setOpenWikiDocs: (docs: { id: string, filepath: string }[] | ((prev: { id: string, filepath: string }[]) => { id: string, filepath: string }[])) => void;

  // Editor states
  wikiInitialFile: string | null;
  setWikiInitialFile: (file: string | null) => void;
  editingClockId: string | null;
  setEditingClockId: (id: string | null) => void;
  editingTokenId: string | null;
  setEditingTokenId: (id: string | null) => void;
}

let openWindowsTimeout: ReturnType<typeof setTimeout>;
function debouncedSaveOpenWindows(windows: Record<string, boolean>) {
  clearTimeout(openWindowsTimeout);
  openWindowsTimeout = setTimeout(() => {
    localStorage.setItem('dozero_openWindows', JSON.stringify(windows));
  }, 500);
}

export const useWindowManager = create<WindowManagerState>((set) => ({
  openWindows: JSON.parse(localStorage.getItem('dozero_openWindows') || '{"combatLog":true}'),
  toggleWindow: (windowId) => set((state) => {
    const isNowOpen = !state.openWindows[windowId];
    const newWindows = { ...state.openWindows, [windowId]: isNowOpen };
    debouncedSaveOpenWindows(newWindows);
    return { openWindows: newWindows };
  }),
  openWindow: (windowId) => set((state) => {
    const newWindows = { ...state.openWindows, [windowId]: true };
    debouncedSaveOpenWindows(newWindows);
    return { openWindows: newWindows };
  }),
  closeWindow: (windowId) => set((state) => {
    const newWindows = { ...state.openWindows, [windowId]: false };
    debouncedSaveOpenWindows(newWindows);
    return { openWindows: newWindows };
  }),
  closeAllWindows: () => {
    debouncedSaveOpenWindows({});
    set({ openWindows: {} });
  },

  viewMode: (() => {
    const urlView = new URLSearchParams(window.location.search).get('view') as ViewMode;
    if (urlView && ['canvas', 'wiki', 'theater', 'brain', 'sheets'].includes(urlView)) {
      return urlView;
    }
    return (localStorage.getItem('dozero_viewMode') as ViewMode) || 'canvas';
  })(),
  setViewMode: (mode) => {
    localStorage.setItem('dozero_viewMode', mode);
    startTransition(() => {
      set({ viewMode: mode });
    });
  },

  activeCharacterId: null,
  setActiveCharacterId: (id) => set({ activeCharacterId: id }),
  sheetScope: 'campaign',
  setSheetScope: (scope) => set({ sheetScope: scope }),

  activeModal: 'none',
  setActiveModal: (modal) => set({ activeModal: modal }),

  activeTool: 'CURSOR',
  setActiveTool: (tool) => set({ activeTool: tool }),

  showActors: false,
  setShowActors: (show) => set({ showActors: show }),

  showToolsDropdown: false,
  setShowToolsDropdown: (show) => set({ showToolsDropdown: show }),

  openSheets: [],
  setOpenSheets: (action) => set((state) => ({
    openSheets: typeof action === 'function' ? action(state.openSheets) : action
  })),

  openWikiDocs: [],
  setOpenWikiDocs: (action) => set((state) => ({
    openWikiDocs: typeof action === 'function' ? action(state.openWikiDocs) : action
  })),

  wikiInitialFile: null,
  setWikiInitialFile: (file) => set({ wikiInitialFile: file }),

  editingClockId: null,
  setEditingClockId: (id) => set({ editingClockId: id }),

  editingTokenId: null,
  setEditingTokenId: (id) => set({ editingTokenId: id }),
}));
