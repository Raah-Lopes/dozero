import React, { useState, useEffect, useRef } from 'react';
import { Zap, X } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { WIDGET_REGISTRY, getDefaultQuickActions } from '../../constants/widgetRegistry';

export const MobileQuickActions: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const { toggleWindow, setActiveModal, setShowActors } = useWindowManager();
  
  const [favorites, setFavorites] = useState<string[]>([]);
  const [fabPos, setFabPos] = useState<{ x: number | null, y: number | null }>({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadFavs = () => {
      let favs = JSON.parse(localStorage.getItem('dozero_hub_favorites') || '[]');
      if (favs.length === 0) favs = getDefaultQuickActions();
      setFavorites(favs.slice(0, 6)); // Max 6 items
    };
    loadFavs();
    window.addEventListener('dozero_favorites_updated', loadFavs);
    return () => window.removeEventListener('dozero_favorites_updated', loadFavs);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dozero_fab_position');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
           setFabPos(parsed);
        }
      }
    } catch(e) {}
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    
    if (expanded) {
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    
    // Calcula pos atual baseada no ref ou no state
    let currentX = fabPos.x;
    let currentY = fabPos.y;
    
    if (fabRef.current && (currentX === null || currentY === null)) {
       const rect = fabRef.current.getBoundingClientRect();
       currentX = rect.left;
       currentY = rect.top;
    }
    
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: currentX || 0,
      initialY: currentY || 0
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || expanded) return;
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      setIsDragging(true);
    }

    if (isDragging) {
      const nextX = dragStart.current.initialX + dx;
      const nextY = dragStart.current.initialY + dy;
      
      const maxX = window.innerWidth - 52;
      const maxY = window.innerHeight - 52;
      
      setFabPos({
        x: Math.max(0, Math.min(nextX, maxX)),
        y: Math.max(0, Math.min(nextY, maxY))
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (isDragging) {
      localStorage.setItem('dozero_fab_position', JSON.stringify(fabPos));
    } else {
      setExpanded(v => !v);
    }
    
    setTimeout(() => setIsDragging(false), 50); 
  };

  const handleAction = (w: any) => {
    if (w.actionType === 'toggleWindow') toggleWindow(w.actionPayload);
    else if (w.actionType === 'setActiveModal') setActiveModal(w.actionPayload as any);
    else if (w.actionType === 'setShowActors') setShowActors(w.actionPayload === 'true');
    setExpanded(false);
  };

  const quickActions = favorites.map(fId => WIDGET_REGISTRY.find(w => w.id === fId)).filter(Boolean) as typeof WIDGET_REGISTRY;

  const getMenuCoords = () => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 360;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 640;
    const menuWidth = Math.min(290, screenW - 24);

    if (fabRef.current) {
      const rect = fabRef.current.getBoundingClientRect();
      const showAbove = rect.top > screenH / 2;
      let left = rect.left + rect.width / 2 - menuWidth / 2;
      left = Math.max(12, Math.min(left, screenW - menuWidth - 12));

      return {
        left: `${left}px`,
        top: showAbove ? undefined : `${rect.bottom + 12}px`,
        bottom: showAbove ? `${screenH - rect.top + 12}px` : undefined,
        width: `${menuWidth}px`,
        maxWidth: 'calc(100vw - 24px)'
      };
    }

    return {
      right: '16px',
      bottom: '140px',
      width: `${menuWidth}px`,
      maxWidth: 'calc(100vw - 24px)'
    };
  };

  const menuCoords = getMenuCoords();

  return (
    <>
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .quick-action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 64px;
          height: 68px;
        }
        .quick-action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      <div 
        ref={fabRef}
        className="fab-container" 
        style={{
          zIndex: expanded ? 99999 : 9999,
          touchAction: 'none',
          ...(fabPos.x !== null ? { left: fabPos.x, right: 'auto', bottom: 'auto', top: fabPos.y } : {})
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {expanded && (
          <div
            style={{
              position: 'fixed',
              ...menuCoords,
              background: 'rgba(15, 15, 20, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '12px',
              display: 'grid',
              gridTemplateColumns: quickActions.length > 3 ? 'repeat(3, 1fr)' : `repeat(${quickActions.length}, 1fr)`,
              gap: '8px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              animation: 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              cursor: 'default',
              zIndex: 100000
            }}
            onPointerDown={e => e.stopPropagation()} // prevent drag when interacting with menu
          >
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  className="quick-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(action);
                  }}
                  title={action.title}
                  aria-label={action.title}
                >
                  <Icon size={22} />
                  <span style={{ fontSize: '10px', fontWeight: 500, textAlign: 'center', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '64px' }}>
                    {action.title.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <button
          className="fab-main"
          aria-label="Ações Rápidas"
          title="Ações Rápidas"
        >
          {expanded ? <X size={24} /> : <Zap size={24} />}
        </button>
      </div>
    </>
  );
};
