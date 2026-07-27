import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWindowManager } from '../../hooks/useWindowManager';

describe('useWindowManager', () => {
  beforeEach(() => {
    // Clear localStorage and reset state before each test
    localStorage.clear();
    useWindowManager.setState({
      openWindows: {},
      viewMode: 'canvas',
      activeModal: 'none',
      showActors: false,
      showToolsDropdown: false,
      openSheets: [],
      openWikiDocs: [],
      wikiInitialFile: null,
      editingClockId: null,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should toggle a window state', () => {
    const { toggleWindow } = useWindowManager.getState();
    
    toggleWindow('chatWindow');
    expect(useWindowManager.getState().openWindows['chatWindow']).toBe(true);

    toggleWindow('chatWindow');
    expect(useWindowManager.getState().openWindows['chatWindow']).toBe(false);
  });

  it('should open and close a specific window', () => {
    const { openWindow, closeWindow } = useWindowManager.getState();

    openWindow('combatLog');
    expect(useWindowManager.getState().openWindows['combatLog']).toBe(true);

    closeWindow('combatLog');
    expect(useWindowManager.getState().openWindows['combatLog']).toBe(false);
  });

  it('should close all windows', () => {
    const { openWindow, closeAllWindows } = useWindowManager.getState();
    
    openWindow('window1');
    openWindow('window2');
    expect(Object.keys(useWindowManager.getState().openWindows).length).toBe(2);

    closeAllWindows();
    expect(Object.keys(useWindowManager.getState().openWindows).length).toBe(0);
  });

  it('should set view mode and persist to localStorage', () => {
    const { setViewMode } = useWindowManager.getState();
    
    setViewMode('wiki');
    expect(useWindowManager.getState().viewMode).toBe('wiki');
    expect(localStorage.getItem('dozero_viewMode')).toBe('wiki');
  });

  it('should set active modal', () => {
    const { setActiveModal } = useWindowManager.getState();
    
    setActiveModal('settings');
    expect(useWindowManager.getState().activeModal).toBe('settings');
    
    setActiveModal('none');
    expect(useWindowManager.getState().activeModal).toBe('none');
  });

  it('should debounced save openWindows to localStorage', () => {
    const { toggleWindow } = useWindowManager.getState();
    
    toggleWindow('testWindow');
    // Fast-forward time for debounce to trigger
    vi.advanceTimersByTime(600);

    const saved = localStorage.getItem('dozero_openWindows');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.testWindow).toBe(true);
  });
});
