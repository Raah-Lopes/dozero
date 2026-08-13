import React, { useState, useEffect } from 'react';
import { LayoutGrid, BookOpen, MessageSquare, Dices, Grid, Menu as MenuIcon, Pin, PinOff } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';

export const MobileBottomNav: React.FC = () => {
  const { viewMode, setViewMode, toggleWindow, openWindows, activeModal, setActiveModal } = useWindowManager();

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
      }, 5000); // Wait 5 seconds before hiding
    }
    return () => clearTimeout(timeout);
  }, [isPinned, isExpanded]);

  // Hide completely or collapse when chat/dice opens
  useEffect(() => {
    if (isChatOpen || isDiceOpen) {
      setIsExpanded(false);
    }
  }, [isChatOpen, isDiceOpen]);

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

  // Find active index for indicator translation
  const activeIndex = navItems.findIndex(item => item.active) === -1 ? 0 : navItems.findIndex(item => item.active);

  if (isChatOpen || isDiceOpen) {
    // Esconde totalmente se o chat ou os dados estiverem abertos pra não bugar a tela
    return null;
  }

  return (
    <div 
      className={`liquid-nav-container ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => !isPinned && setIsExpanded(true)}
      onMouseLeave={() => !isPinned && setIsExpanded(false)}
    >
      <style>{`
        .liquid-nav-container {
          position: fixed;
          bottom: 15px;
          /* Centraliza no espaço que sobra (descontando os 64px da sidebar esquerda) */
          left: calc(50% + 32px);
          transform: translateX(-50%);
          z-index: 1000000;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .liquid-navigation {
          position: relative;
          width: 280px; /* Reduced to fit mobile */
          height: 60px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 10px;
          box-shadow: 0 15px 25px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.05);
          transition: width 0.3s, opacity 0.3s;
        }

        /* Collapsed State */
        .liquid-nav-container.collapsed .liquid-navigation {
          width: 50px;
          height: 50px;
          border-radius: 25px;
          cursor: pointer;
        }

        .liquid-nav-container.collapsed .liquid-navigation ul {
          opacity: 0;
          pointer-events: none;
        }

        .liquid-nav-container.collapsed .liquid-indicator {
          opacity: 0;
        }

        /* Menu Icon when collapsed */
        .nav-collapsed-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }

        .liquid-nav-container.collapsed .nav-collapsed-icon {
          opacity: 1;
        }

        .liquid-navigation ul {
          display: flex;
          width: 280px;
          padding: 0;
          margin: 0;
          transition: opacity 0.3s;
        }

        .liquid-navigation ul li {
          position: relative;
          list-style: none;
          width: 56px; /* 280 / 5 */
          height: 60px;
          z-index: 1;
        }

        .liquid-navigation ul li button {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          width: 100%;
          height: 100%;
          text-align: center;
          font-weight: 500;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .liquid-navigation ul li button .icon {
          position: relative;
          display: block;
          transition: 0.5s;
          color: rgba(255,255,255,0.6);
        }

        .liquid-navigation ul li.active button .icon {
          transform: translateY(-28px);
          color: #0f172a;
        }

        .liquid-navigation ul li button .text {
          position: absolute;
          color: #fff;
          font-weight: 600;
          font-size: 0.6em;
          letter-spacing: 0.02em;
          transition: 0.5s;
          opacity: 0;
          transform: translateY(20px);
          text-transform: uppercase;
        }

        .liquid-navigation ul li.active button .text {
          opacity: 1;
          transform: translateY(8px);
        }

        .liquid-indicator {
          position: absolute;
          top: -40%;
          width: 56px;
          height: 56px;
          background: #cbd5e1; 
          border-radius: 50%;
          border: 6px solid #141e30; 
          transition: 0.5s;
          left: 0; 
        }

        .liquid-indicator::before {
          content: '';
          position: absolute;
          top: 50%;
          left: -22px;
          width: 20px;
          height: 20px;
          background: transparent;
          border-top-right-radius: 20px;
          box-shadow: 1px -10px 0 0 #141e30;
        }

        .liquid-indicator::after {
          content: '';
          position: absolute;
          top: 50%;
          right: -22px;
          width: 20px;
          height: 20px;
          background: transparent;
          border-top-left-radius: 20px;
          box-shadow: -1px -10px 0 0 #141e30;
        }

        .pin-nav-btn {
          position: absolute;
          top: -10px;
          right: -10px;
          width: 24px;
          height: 24px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
          z-index: 10;
        }

        .liquid-nav-container.expanded .pin-nav-btn {
          opacity: 1;
          pointer-events: auto;
        }

        .pin-nav-btn.pinned {
          color: #facc15;
        }

        @media (max-width: 380px) {
          .liquid-navigation {
            width: 260px;
          }
          .liquid-navigation ul {
            width: 260px;
          }
          .liquid-navigation ul li {
            width: 52px;
          }
          .liquid-indicator {
            width: 52px;
          }
        }
      `}</style>

      <div 
        className="liquid-navigation"
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <div className="nav-collapsed-icon">
          <MenuIcon size={24} />
        </div>

        <button 
          className={`pin-nav-btn ${isPinned ? 'pinned' : ''}`}
          onClick={(e) => { e.stopPropagation(); setIsPinned(!isPinned); }}
          title={isPinned ? "Desafixar" : "Fixar menu"}
        >
          {isPinned ? <Pin size={12} /> : <PinOff size={12} />}
        </button>
        <ul>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={item.id} className={item.active ? 'active' : ''}>
                <button onClick={(e) => {
                  e.stopPropagation();
                  item.action();
                }}>
                  <span className="icon"><Icon size={24} strokeWidth={item.active ? 2.5 : 2} /></span>
                  <span className="text">{item.label}</span>
                </button>
              </li>
            );
          })}
          
          <div 
            className="liquid-indicator" 
            style={{ 
              transform: `translateX(calc(${100 * activeIndex}%))` 
            }}
          ></div>
        </ul>
      </div>
    </div>
  );
};

