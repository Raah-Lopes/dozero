import React, { useState, useEffect } from 'react';
import { LayoutGrid, BookOpen, MessageSquare, Dices, Grid, CloudFog, Ruler, Pin, PinOff, Menu as MenuIcon } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';

export const MobileBottomNav: React.FC = () => {
  const { viewMode, setViewMode, toggleWindow, openWindows, activeModal, setActiveModal, activeTool, setActiveTool } = useWindowManager();

  const isChatOpen = !!openWindows['chatWindow'];
  const isDiceOpen = !!openWindows['diceRoller'];

  const [isPinned, setIsPinned] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-collapse logic when not pinned
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!isPinned && isExpanded) {
      timeout = setTimeout(() => {
        setIsExpanded(false);
      }, 3500);
    }
    return () => clearTimeout(timeout);
  }, [isPinned, isExpanded]);

  const navItems = [
    {
      id: 'canvas',
      icon: LayoutGrid,
      label: 'Mapa',
      active: viewMode === 'canvas' && !isChatOpen && !isDiceOpen && activeModal === 'none',
      action: () => {
        setViewMode('canvas');
        if (activeModal !== 'none') setActiveModal('none');
      }
    },
    {
      id: 'fog',
      icon: CloudFog,
      label: 'Fog',
      active: activeTool === 'FOG',
      action: () => setActiveTool(activeTool === 'FOG' ? 'CURSOR' : 'FOG')
    },
    {
      id: 'ruler',
      icon: Ruler,
      label: 'Régua',
      active: activeTool === 'RULER',
      action: () => setActiveTool(activeTool === 'RULER' ? 'CURSOR' : 'RULER')
    },
    {
      id: 'wiki',
      icon: BookOpen,
      label: 'Wiki',
      active: viewMode === 'wiki',
      action: () => setViewMode(viewMode === 'wiki' ? 'canvas' : 'wiki')
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Chat',
      active: isChatOpen,
      action: () => toggleWindow('chatWindow')
    },
    {
      id: 'dice',
      icon: Dices,
      label: 'Dados',
      active: isDiceOpen,
      action: () => toggleWindow('diceRoller')
    },
    {
      id: 'menu',
      icon: Grid,
      label: 'Hub',
      active: activeModal === 'widgets',
      action: () => setActiveModal(activeModal === 'widgets' ? 'none' : 'widgets')
    }
  ];

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned(!isPinned);
    if (!isPinned) setIsExpanded(true);
  };

  return (
    <div 
      className={`dock-navigation ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => !isPinned && setIsExpanded(true)}
      onMouseLeave={() => !isPinned && setIsExpanded(false)}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      <style>{`
        .dock-navigation {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--primary-bg, rgba(15, 23, 42, 0.90));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 10px;
          box-shadow: 0 15px 25px rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 1000000;
          overflow: hidden;
        }
        
        .dock-navigation.expanded {
          width: 400px;
          max-width: 95vw;
          height: 70px;
          padding: 0 15px;
          border-radius: 10px;
        }
        
        .dock-navigation.collapsed {
          width: 50px;
          height: 50px;
          border-radius: 25px;
          cursor: pointer;
          bottom: 15px;
        }

        .dock-content {
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: space-between;
          opacity: 1;
          transition: opacity 0.3s;
          position: relative;
        }

        .dock-navigation.collapsed .dock-content {
          opacity: 0;
          pointer-events: none;
          position: absolute;
        }

        .dock-collapsed-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 0.3s, transform 0.3s;
          color: white;
        }

        .dock-navigation.collapsed .dock-collapsed-icon {
          opacity: 1;
          transform: translate(-50%, -50%) rotate(0deg);
        }
        .dock-navigation.expanded .dock-collapsed-icon {
          transform: translate(-50%, -50%) rotate(180deg);
        }

        .dock-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 4px;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 12px;
          flex: 1;
          position: relative;
        }

        .dock-item:hover {
          color: white;
          background: rgba(255,255,255,0.05);
          transform: translateY(-2px);
        }

        .dock-item.active {
          color: var(--accent-primary, #3b82f6);
        }

        .dock-item.active::after {
          content: '';
          position: absolute;
          bottom: 0px;
          width: 4px;
          height: 4px;
          background: var(--accent-primary, #3b82f6);
          border-radius: 50%;
        }

        .dock-label {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .pin-btn {
          position: absolute;
          top: -2px;
          right: -8px;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s;
        }
        .pin-btn:hover {
          color: white;
          background: rgba(255,255,255,0.1);
        }
        .pin-btn.pinned {
          color: #f59e0b;
        }
      `}</style>

      <div className="dock-collapsed-icon">
        <MenuIcon size={22} />
      </div>

      <div className="dock-content">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                item.action();
                if (!isPinned) setIsExpanded(false);
              }}
              className={`dock-item ${item.active ? 'active' : ''}`}
              title={item.label}
            >
              <Icon size={20} strokeWidth={item.active ? 2.5 : 2} />
              <span className="dock-label" style={{ display: item.active ? 'block' : 'none' }}>
                {item.label}
              </span>
            </button>
          );
        })}
        
        <button 
          className={`pin-btn ${isPinned ? 'pinned' : ''}`} 
          onClick={togglePin}
          title={isPinned ? "Desafixar menu" : "Fixar menu"}
        >
          {isPinned ? <Pin size={12} /> : <PinOff size={12} />}
        </button>
      </div>
    </div>
  );
};
