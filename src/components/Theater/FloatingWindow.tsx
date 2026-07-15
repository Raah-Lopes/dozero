import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Square } from 'lucide-react';

interface FloatingWindowProps {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
  onClose: () => void;
  onFocus: () => void;
  width?: number;
  height?: number;
  isActive?: boolean;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  id,
  title,
  children,
  initialX = 100,
  initialY = 100,
  onClose,
  isActive,
  onFocus,
  width = 350,
  height = 400,
}) => {
  const savedState = JSON.parse(localStorage.getItem(`theater_window_${id}`) || 'null');
  
  const [pos, setPos] = useState({ x: savedState?.x ?? initialX, y: savedState?.y ?? initialY });
  const [size, setSize] = useState({ w: savedState?.w ?? width, h: savedState?.h ?? height });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; initialW: number; initialH: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(`theater_window_${id}`, JSON.stringify({ ...pos, ...size }));
  }, [pos, size, id]);

  const handlePointerDown = (e: React.PointerEvent) => {
    onFocus();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({
        x: dragRef.current.initialX + dx,
        y: Math.max(0, dragRef.current.initialY + dy),
      });
    } else if (isResizing && resizeRef.current) {
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      setSize({
        w: Math.max(250, resizeRef.current.initialW + dx),
        h: Math.max(150, resizeRef.current.initialH + dy),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsResizing(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    onFocus();
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialW: size.w,
      initialH: size.h,
    };
    setIsResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  return (
    <div
      className={`floating-window ${isActive ? 'active' : ''} ${isMinimized ? 'minimized' : ''}`}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        zIndex: isActive ? 1000 : 900,
        width: size.w,
        height: isMinimized ? 'auto' : size.h,
      }}
      onPointerDownCapture={onFocus}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="floating-window-header"
        onPointerDown={handlePointerDown}
      >
        <div className="floating-window-title">{title}</div>
        <div 
          className="floating-window-actions"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button onClick={() => setIsMinimized(!isMinimized)} title="Minimizar">
            {isMinimized ? <Square size={12} /> : <Minus size={12} />}
          </button>
          <button onClick={onClose} title="Fechar">
            <X size={12} />
          </button>
        </div>
      </div>
      {!isMinimized && (
        <>
          <div className="floating-window-content">
            {children}
          </div>
          <div 
            className="floating-window-resizer" 
            onPointerDown={handleResizeStart} 
          />
        </>
      )}
    </div>
  );
};
