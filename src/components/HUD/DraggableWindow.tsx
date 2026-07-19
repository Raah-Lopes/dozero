import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, X, Minus, Pin, ExternalLink } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';

interface DraggableWindowProps {
  id: string;
  widgetKey?: string; // Used for popout URL matching if different from id
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

export const DraggableWindow: React.FC<DraggableWindowProps> = React.memo(({ id, widgetKey, title, initialX, initialY, children, width = 320, height = 'auto', windowStyle, variant = 'default', dragAnywhere = true, onClose }) => {
  const storageKey = `window_prefs_${id}`;
  
  const getInitialPrefs = () => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 1080;
    
    // Clamp initial positions so new windows never spawn off-screen
    const safeInitialX = Math.min(Math.max(0, initialX), screenW - 100);
    const safeInitialY = Math.min(Math.max(0, initialY), screenH - 100);
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
         const parsed = JSON.parse(saved);
         // Protection against NaN or corrupted values
         if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number' || 
             isNaN(parsed.x) || isNaN(parsed.y) ||
             parsed.x < -100 || parsed.x > screenW - 50 || 
             parsed.y < 0 || parsed.y > screenH - 50) {
            return { x: safeInitialX, y: safeInitialY, w: width, h: height, pinned: false };
         }
         if (parsed.y < 0) parsed.y = 0;
         return { ...parsed, pinned: parsed.pinned || false };
      }
    } catch (e) {}
    return { x: safeInitialX, y: safeInitialY, w: width, h: height, pinned: false };
  };

  const isPopout = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('widget') === (widgetKey || id);

  const initialPrefs = getInitialPrefs();
  const [pos, setPos] = useState({ x: initialPrefs.x, y: initialPrefs.y });
  const [size, setSize] = useState({ w: initialPrefs.w, h: initialPrefs.h });
  const [isPinned, setIsPinned] = useState(initialPrefs.pinned || false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    setSize(prev => ({ w: width !== undefined ? width : prev.w, h: height !== undefined ? height : prev.h }));
  }, [width, height]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [zIndex, setZIndex] = useState(() => ++globalZIndexCounter);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const snapThreshold = 20;

  const bringToFront = () => {
    if (isPopout) return;
    globalZIndexCounter += 1;
    setZIndex(globalZIndexCounter);
  };

  useEffect(() => {
    const handleBringToFront = (e: Event) => {
      const targetId = (e as CustomEvent).detail;
      if (targetId === id) {
        bringToFront();
        setIsMinimized(false);
      }
    };
    window.addEventListener('bring-window-to-front', handleBringToFront);
    return () => window.removeEventListener('bring-window-to-front', handleBringToFront);
  }, [id, isPopout]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const isFullscreen = isMobile && !isMinimized && !isPopout;
    if (isPinned || isPopout || isFullscreen) return;
    const target = e.target as HTMLElement;
    
    // Do not initiate drag on interactive elements
    if (
      target.tagName === 'BUTTON' || 
      target.tagName === 'SELECT' || 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.tagName === 'A' ||
      target.tagName === 'LABEL' ||
      target.tagName === 'SUMMARY' ||
      target.closest('button') || 
      target.closest('select') ||
      target.closest('input') || 
      target.closest('textarea') || 
      target.closest('a') ||
      target.closest('.interactive-area')
    ) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    
    const canResize = ((variant === 'default' || variant === 'glass') && !isMinimized && !isPinned);
    if (canResize) {
      // Native resize handle is at the bottom right, roughly 24x24 pixels
      if (e.clientX > rect.right - 24 && e.clientY > rect.bottom - 24) {
        return;
      }
    }

    setIsDragging(true);
    bringToFront();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isPopout) return;

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

    // 3. Collision with pinned windows
    let nextX = newX;
    let nextY = newY;
    const pinnedWindows = document.querySelectorAll('.draggable-window[data-pinned="true"]');
    pinnedWindows.forEach((pinned) => {
      if (pinned.id === `window-${id}`) return;
      const pRect = pinned.getBoundingClientRect();
      
      const xOverlap = (nextX < pRect.right && nextX + rect.width > pRect.left &&
                        pos.y < pRect.bottom && pos.y + rect.height > pRect.top);
      if (xOverlap) {
         if (nextX > pos.x) nextX = pRect.left - rect.width;
         else if (nextX < pos.x) nextX = pRect.right;
      }
      
      const yOverlap = (nextX < pRect.right && nextX + rect.width > pRect.left &&
                        nextY < pRect.bottom && nextY + rect.height > pRect.top);
      if (yOverlap) {
         if (nextY > pos.y) nextY = pRect.top - rect.height;
         else if (nextY < pos.y) nextY = pRect.bottom;
      }
    });

    setPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    if (isMinimized && Math.abs(dx) < 5 && Math.abs(dy) < 5) {
       setIsMinimized(false);
    }

    // Save pos when drag ends
    if (windowRef.current && !isPopout) {
      const rect = windowRef.current.getBoundingClientRect();
      const finalY = Math.max(0, pos.y);
      localStorage.setItem(storageKey, JSON.stringify({
        x: pos.x,
        y: finalY,
        w: size.w, // use state size instead of rect which might be glitching during native drag
        h: size.h,
        pinned: isPinned
      }));
    }
  };

  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 });

  const handleResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMinimized || isPinned || isPopout) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    bringToFront();
    resizeStart.current = {
      w: windowRef.current?.offsetWidth || 320,
      h: windowRef.current?.offsetHeight || 200,
      x: e.clientX,
      y: e.clientY
    };
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: PointerEvent) => {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      setSize({
        w: Math.max(250, resizeStart.current.w + dx),
        h: Math.max(100, resizeStart.current.h + dy)
      });
    };
    const handleUp = () => {
      setIsResizing(false);
      localStorage.setItem(storageKey, JSON.stringify({
        x: pos.x,
        y: pos.y,
        w: windowRef.current?.offsetWidth || 320,
        h: windowRef.current?.offsetHeight || 200,
        pinned: isPinned
      }));
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isResizing, pos.x, pos.y, isPinned, storageKey]);

  const isFullscreen = isMobile && !isMinimized && !isPopout && variant !== 'bare';
  const isBubble = isMinimized;

  return (
    <div
      id={`window-${id}`}
      ref={windowRef}
      className={`draggable-window-container ${isMinimized ? 'minimized' : ''} ${variant === 'glass' ? 'glass-panel' : ''}`}
      data-pinned={isPinned}
      style={{
        position: isPopout ? 'relative' : (isFullscreen ? 'fixed' : 'absolute'),
        left: (isFullscreen && !isPopout) ? 0 : (isPopout ? 0 : pos.x),
        top: (isFullscreen && !isPopout) ? 0 : (isPopout ? 0 : pos.y),
        width: isPopout ? '100%' : (isFullscreen ? '100vw' : (isBubble ? '48px' : size.w)),
        height: isPopout ? '100vh' : (isFullscreen ? '100vh' : (isBubble ? '48px' : size.h)),
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isFullscreen ? 99999 : (isDragging ? globalZIndexCounter + 100 : zIndex),
        boxShadow: (variant === 'default' || variant === 'glass') ? (isDragging ? '0 0 20px rgba(168, 85, 247, 0.4)' : (isPinned ? '0 0 10px rgba(168, 85, 247, 0.1)' : '')) : 'none',
        transition: (isDragging || isResizing) ? 'none' : 'box-shadow 0.2s',
        resize: 'none', // Disabled native resize to fix jitter bug
        overflow: 'hidden',
        minWidth: (variant === 'default' || variant === 'glass') ? (isBubble ? '48px' : '250px') : 'auto',
        minHeight: ((variant === 'default' || variant === 'glass') && !isBubble) ? '100px' : (isBubble ? '48px' : 'auto'),
        backgroundColor: variant === 'default' ? 'var(--bg-secondary)' : 'transparent',
        border: (variant === 'default' && !isFullscreen) ? '1px solid var(--glass-border)' : 'none',
        borderRadius: isBubble ? '24px' : (isFullscreen ? '0px' : (variant === 'default' ? '12px' : '0')),
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
            h: rect.height,
            pinned: isPinned
          }));
        }
      }}
    >
      {isBubble ? (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
            borderRadius: '24px', cursor: isDragging ? 'grabbing' : 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            touchAction: 'none',
            userSelect: 'none'
          }}
          title={title}
        >
          <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
             {title.charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <>
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
            <GripHorizontal size={14} style={{ opacity: isPinned ? 0.2 : 1 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</span>
          </div>
        
          <div style={{ position: 'absolute', right: '0.25rem', top: '0.25rem', display: 'flex', gap: '0.25rem' }}>
          {!isPopout && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsPinned(!isPinned);
                localStorage.setItem(storageKey, JSON.stringify({
                  x: pos.x, y: pos.y, w: size.w, h: size.h, pinned: !isPinned
                }));
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title={isPinned ? "Desafixar Janela" : "Fixar Janela (Bloquear sobreposição)"}
              style={{ 
                background: isPinned ? 'rgba(168, 85, 247, 0.4)' : 'transparent', border: 'none', color: isPinned ? 'white' : 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem', borderRadius: '4px'
              }}
            >
              <Pin size={14} />
            </button>
          )}
          
          {/* PopOut Button for multi-monitor - Available for ALL widgets now! */}
          {!isPopout && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                const popoutId = widgetKey || id;
                window.open(`${window.location.pathname}?widget=${popoutId}`, '_blank', 'width=450,height=700');
                if (onClose) onClose();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Destacar para outra tela (Pop-out)"
              style={{ 
                background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem'
              }}
            >
              <ExternalLink size={14} />
            </button>
          )}
          
          {!isPopout && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            onPointerDown={(e) => e.stopPropagation()}
            title={isMinimized ? "Restaurar Janela" : "Minimizar Janela"}
            style={{ 
              background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem'
            }}
          >
            <Minus size={14} />
          </button>
          )}
          
          {!isPopout && onClose && (
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Fechar Janela"
              style={{ 
                background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem'
              }}
              onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
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
        <div style={{ flex: 1, padding: variant === 'default' ? '1rem' : '0', display: 'flex', flexDirection: 'column', overflow: (variant === 'default' || variant === 'glass') ? 'auto' : 'visible', containerType: (variant === 'default' || variant === 'glass') ? 'inline-size' : 'normal', containerName: 'windowcontainer' }}>
          <ErrorBoundary fallbackMessage={`Erro no módulo: ${title}`}>
            {children}
          </ErrorBoundary>
        </div>
      )}

      {/* Custom Resize Handle to prevent jitter */}
      {((variant === 'default' || variant === 'glass') && !isMinimized && !isPinned && !isPopout && !isFullscreen) && (
        <div
          onPointerDown={handleResizeDown}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '24px',
            height: '24px',
            cursor: 'nwse-resize',
            zIndex: 10,
            background: 'transparent',
            // optional: you can add a tiny SVG or CSS triangle here to show it's resizable
          }}
        >
           <svg width="12" height="12" viewBox="0 0 12 12" style={{ position: 'absolute', bottom: '4px', right: '4px', opacity: 0.5 }}>
             <path d="M12 0 L12 12 L0 12 Z" fill="var(--glass-border)" />
           </svg>
        </div>
      )}
      </>
      )}
    </div>
  );
});
