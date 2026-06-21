// @ts-ignore - auto fix
import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, X, Minus } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';

interface DraggableWindowProps {
  id: string;
  title: string;
  initialX: number;
  initialY: number;
  children: React.ReactNode;
  width?: string | number;
  height?: string | number;
  windowStyle?: React.CSSProperties;
  variant?: 'default' | 'bare' | 'glass';
  dragAnywhere?: boolean;
  onClose?: () => void;
}

// Global counter to track which window is on top
// Starts at 9999999 to ensure windows stay on top of ANY hardcoded zIndex (like 99999 in WikiViewer)
let globalZIndexCounter = 9999999;

export const DraggableWindow: React.FC<DraggableWindowProps> = React.memo(({ id, title, initialX, initialY, children, width = 320, height = 'auto', windowStyle, variant = 'default', dragAnywhere = true, onClose }) => {
  const storageKey = `window_prefs_${id}`;
  
  const getInitialPrefs = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
         const parsed = JSON.parse(saved);
         // Clamping to screen bounds to prevent invisible windows
         const screenW = window.innerWidth;
         const screenH = window.innerHeight;
         
         // Protection against NaN or corrupted values
         if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number' || 
             isNaN(parsed.x) || isNaN(parsed.y) ||
             parsed.x < -100 || parsed.x > screenW - 50 || 
             parsed.y < 0 || parsed.y > screenH - 50) {
            return { x: initialX, y: Math.max(0, initialY), w: width, h: height };
         }
         if (parsed.y < 0) parsed.y = 0;
         return parsed;
      }
    } catch (e) {}
    return { x: initialX, y: Math.max(0, initialY), w: width, h: height };
  };

  const initialPrefs = getInitialPrefs();
  const [pos, setPos] = useState({ x: initialPrefs.x, y: initialPrefs.y });
  const [size, setSize] = useState({ w: initialPrefs.w, h: initialPrefs.h });
  
  useEffect(() => {
    setSize(prev => ({ w: width !== undefined ? width : prev.w, h: height !== undefined ? height : prev.h }));
  }, [width, height]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [zIndex, setZIndex] = useState(() => ++globalZIndexCounter);
  const dragOffset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const snapThreshold = 20;

  const bringToFront = () => {
    globalZIndexCounter += 1;
    setZIndex(globalZIndexCounter);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // Do not initiate drag on interactive elements
    if (
      target.tagName === 'BUTTON' || 
      target.tagName === 'SELECT' || 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.tagName === 'A' ||
      target.closest('button') || 
      target.closest('select') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('a') ||
      target.closest('.interactive') ||
      target.getAttribute('role') === 'button'
    ) {
      bringToFront();
      return;
    }

    // Do not drag if we are inside a scrollable container
    let current: HTMLElement | null = target;
    while (current && windowRef.current && current !== windowRef.current) {
      const style = window.getComputedStyle(current);
      const isScrollableY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && current.scrollHeight > current.clientHeight;
      const isScrollableX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && current.scrollWidth > current.clientWidth;
      if (isScrollableY || isScrollableX) {
        bringToFront();
        return;
      }
      current = current.parentElement;
    }

    if (windowRef.current && (variant === 'default' || variant === 'glass') && !isMinimized) {
      const rect = windowRef.current.getBoundingClientRect();
      // Check if clicking in the bottom-right corner (CSS resize handle)
      const isResizeHandle = (e.clientX > rect.right - 20) && (e.clientY > rect.bottom - 20);
      if (isResizeHandle) {
        bringToFront();
        return;
      }
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    bringToFront();
    
    // Calculate offset from the top-left corner of the window
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    let newX = e.clientX - dragOffset.current.x;
    let newY = e.clientY - dragOffset.current.y;

    if (!windowRef.current) return;
    const rect = windowRef.current.getBoundingClientRect();

    // Prevent dragging above top of viewport
    if (newY < 0) {
      newY = 0;
    }

    // 1. Snapping to screen edges
    if (Math.abs(newX) < snapThreshold) newX = 0;
    if (Math.abs(newX + rect.width - window.innerWidth) < snapThreshold) newX = window.innerWidth - rect.width;
    
    if (Math.abs(newY) < snapThreshold) newY = 0;
    if (Math.abs(newY + rect.height - window.innerHeight) < snapThreshold) newY = window.innerHeight - rect.height;

    // 2. Snapping to other draggable windows
    const siblings = document.querySelectorAll('.draggable-window');
    siblings.forEach((sibling) => {
      if (sibling.id === `window-${id}`) return; // Don't snap to self

      const sRect = sibling.getBoundingClientRect();

      // Check X alignment
      // Align our left to their right
      if (Math.abs(newX - sRect.right) < snapThreshold && newY + rect.height > sRect.top && newY < sRect.bottom) newX = sRect.right;
      // Align our right to their left
      if (Math.abs(newX + rect.width - sRect.left) < snapThreshold && newY + rect.height > sRect.top && newY < sRect.bottom) newX = sRect.left - rect.width;
      // Align left-to-left
      if (Math.abs(newX - sRect.left) < snapThreshold) newX = sRect.left;

      // Check Y alignment
      // Align our top to their bottom
      if (Math.abs(newY - sRect.bottom) < snapThreshold && newX + rect.width > sRect.left && newX < sRect.right) newY = sRect.bottom;
      // Align our bottom to their top
      if (Math.abs(newY + rect.height - sRect.top) < snapThreshold && newX + rect.width > sRect.left && newX < sRect.right) newY = sRect.top - rect.height;
      // Align top-to-top
      if (Math.abs(newY - sRect.top) < snapThreshold) newY = sRect.top;
    });

    // Final safety check for y
    if (newY < 0) newY = 0;

    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // Save pos when drag ends
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      const finalY = Math.max(0, pos.y);
      localStorage.setItem(storageKey, JSON.stringify({
        x: pos.x,
        y: finalY,
        w: rect.width,
        h: rect.height
      }));
    }
  };

  return (
    <div
      id={`window-${id}`}
      ref={windowRef}
      className={(variant === 'default' || variant === 'glass') ? "draggable-window glass-panel" : "draggable-window"}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: isMinimized ? 'auto' : size.h,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isDragging ? globalZIndexCounter + 100 : zIndex,
        boxShadow: (variant === 'default' || variant === 'glass') ? (isDragging ? '0 0 20px rgba(168, 85, 247, 0.4)' : '') : 'none',
        transition: isDragging ? 'none' : 'box-shadow 0.2s',
        resize: ((variant === 'default' || variant === 'glass') && !isMinimized) ? 'both' : 'none',
        overflow: 'hidden',
        minWidth: (variant === 'default' || variant === 'glass') ? '250px' : 'auto',
        minHeight: ((variant === 'default' || variant === 'glass') && !isMinimized) ? '100px' : 'auto',
        ...windowStyle
      }}
      onPointerDownCapture={bringToFront} // Catch any click inside to bring to front
      onPointerDown={dragAnywhere ? handlePointerDown : undefined}
      onPointerMove={dragAnywhere ? handlePointerMove : undefined}
      onPointerUp={dragAnywhere ? handlePointerUp : undefined}
      onPointerCancel={dragAnywhere ? handlePointerUp : undefined}
      onMouseUp={() => {
        // Save size when native resize ends
        if (!isDragging && windowRef.current) {
          const rect = windowRef.current.getBoundingClientRect();
          setSize({ w: rect.width, h: rect.height });
          localStorage.setItem(storageKey, JSON.stringify({
            x: pos.x,
            y: pos.y,
            w: rect.width,
            h: rect.height
          }));
        }
      }}
    >
      {/* Drag Handle */}
      {(variant === 'default' || variant === 'glass') ? (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            padding: '0.5rem',
            cursor: isDragging ? 'grabbing' : 'grab',
            borderBottom: '1px solid var(--glass-border)',
            background: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            touchAction: 'none' // Prevent browser panning
          }}
          onDoubleClick={() => setIsMinimized(!isMinimized)}
        >
          <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
            <GripHorizontal size={14} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</span>
          </div>
        
        <div style={{ position: 'absolute', right: '0.25rem', top: '0.25rem', display: 'flex', gap: '0.25rem' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ 
              background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem'
            }}
          >
            <Minus size={14} />
          </button>
          
          {onClose && (
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ 
                background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      ) : (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            position: 'absolute',
            top: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '10px',
            padding: '2px 10px',
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            opacity: 0,
            transition: 'opacity 0.2s',
            zIndex: 100
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => { if (!isDragging) e.currentTarget.style.opacity = '0'; }}
          title="Arraste para mover"
        >
          <GripHorizontal size={16} />
        </div>
      )}

      {/* Content Area */}
      {!isMinimized && (
        <div style={{ flex: 1, padding: variant === 'default' ? '1rem' : '0', display: 'flex', flexDirection: 'column', overflow: (variant === 'default' || variant === 'glass') ? 'hidden' : 'visible', containerType: (variant === 'default' || variant === 'glass') ? 'inline-size' : 'normal', containerName: 'windowcontainer' }}>
          <ErrorBoundary fallbackMessage={`Erro no módulo: ${title}`}>
            {children}
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
});
