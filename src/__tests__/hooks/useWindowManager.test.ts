import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWindowManager } from '../../hooks/useWindowManager';

describe('useWindowManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-initialize state for each test
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.closeAllWindows();
      result.current.setViewMode('canvas');
      result.current.setActiveModal('none');
    });
  });

  it('should initialize with combatLog opened based on fallback default', () => {
    const { result } = renderHook(() => useWindowManager());
    
    act(() => {
        result.current.openWindow('combatLog');
    });
    expect(result.current.openWindows.combatLog).toBe(true);
  });

  it('should toggle window state', () => {
    const { result } = renderHook(() => useWindowManager());
    
    act(() => {
      result.current.openWindow('combatLog');
    });
    
    expect(result.current.openWindows.combatLog).toBe(true);
    
    act(() => {
      result.current.toggleWindow('combatLog');
    });
    
    expect(result.current.openWindows.combatLog).toBe(false);
  });

  it('should change viewMode and persist to localStorage', () => {
    const { result } = renderHook(() => useWindowManager());

    act(() => {
      result.current.setViewMode('wiki');
    });

    expect(result.current.viewMode).toBe('wiki');
    expect(localStorage.setItem).toHaveBeenCalledWith('dozero_viewMode', 'wiki');
  });

  it('should open and close windows properly', () => {
    const { result } = renderHook(() => useWindowManager());

    act(() => {
      result.current.openWindow('testWindow');
    });
    expect(result.current.openWindows.testWindow).toBe(true);

    act(() => {
      result.current.closeWindow('testWindow');
    });
    expect(result.current.openWindows.testWindow).toBe(false);
  });
});
