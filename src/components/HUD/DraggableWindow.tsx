import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, X } from 'lucide-react';

interface DraggableWindowProps {
  id: string;
  title: string;
  initialX: number;
  initialY: number;
  children: React.ReactNode;
  width?: string | number;
  onClose?: () => void;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({ id, title, initialX, initialY, children, width = 'auto', onClose }) => {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const snapThreshold = 20;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    
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

    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      id={`window-${id}`}
      ref={windowRef}
      className="draggable-window glass-panel"
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: width,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isDragging ? 100 : 50,
        boxShadow: isDragging ? '0 0 20px rgba(168, 85, 247, 0.4)' : '',
        transition: isDragging ? 'none' : 'box-shadow 0.2s',
      }}
    >
      {/* Drag Handle */}
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
      >
        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
          <GripHorizontal size={14} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</span>
        </div>
        
        {onClose && (
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ 
              position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem'
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
};
