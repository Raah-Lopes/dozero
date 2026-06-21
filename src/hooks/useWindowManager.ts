import { create } from 'zustand';

export type ViewMode = 'canvas' | 'wiki' | 'theater';
export type ModalMode = 'none' | 'players' | 'settings' | 'chat' | 'clockConfig' | 'widgets';

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
  activeModal: ModalMode;
  setActiveModal: (modal: ModalMode) => void;

  // Toggle panels
  showMapSettings: boolean;
  setShowMapSettings: (show: boolean) => void;
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
}

export const useWindowManager = create<WindowManagerState>((set) => ({
  openWindows: JSON.parse(localStorage.getItem('dozero_openWindows') || '{"combatLog":true}'),
  toggleWindow: (windowId) => set((state) => {
    const isNowOpen = !state.openWindows[windowId];
    const newWindows = { ...state.openWindows, [windowId]: isNowOpen };
    localStorage.setItem('dozero_openWindows', JSON.stringify(newWindows));
    return { openWindows: newWindows };
  }),
  openWindow: (windowId) => set((state) => {
    const newWindows = { ...state.openWindows, [windowId]: true };
    localStorage.setItem('dozero_openWindows', JSON.stringify(newWindows));
    return { openWindows: newWindows };
  }),
  closeWindow: (windowId) => set((state) => {
    const newWindows = { ...state.openWindows, [windowId]: false };
    localStorage.setItem('dozero_openWindows', JSON.stringify(newWindows));
    return { openWindows: newWindows };
  }),
  closeAllWindows: () => {
    localStorage.setItem('dozero_openWindows', '{}');
    set({ openWindows: {} });
  },

  viewMode: (localStorage.getItem('dozero_viewMode') as ViewMode) || 'canvas',
  setViewMode: (mode) => {
    localStorage.setItem('dozero_viewMode', mode);
    set({ viewMode: mode });
  },

  activeModal: 'none',
  setActiveModal: (modal) => set({ activeModal: modal }),

  showMapSettings: false,
  setShowMapSettings: (show) => set({ showMapSettings: show }),

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
}));
