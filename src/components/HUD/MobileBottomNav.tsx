import React from 'react';
import { LayoutGrid, BookOpen, MessageSquare, Dices, Grid } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';

export const MobileBottomNav: React.FC = () => {
  const { viewMode, setViewMode, toggleWindow, openWindows, activeModal, setActiveModal } = useWindowManager();

  const isChatOpen = !!openWindows['chatWindow'];
  const isDiceOpen = !!openWindows['diceRoller'];

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

  return (
    <div className="liquid-nav-container">
      <style>{`
        .liquid-nav-container {
          position: fixed;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000000;
        }

        .liquid-navigation {
          position: relative;
          width: 350px;
          height: 70px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 10px;
          box-shadow: 0 15px 25px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.05);
        }

        .liquid-navigation ul {
          display: flex;
          width: 350px;
          padding: 0;
          margin: 0;
        }

        .liquid-navigation ul li {
          position: relative;
          list-style: none;
          width: 70px;
          height: 70px;
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
          transform: translateY(-32px);
          color: #0f172a;
        }

        .liquid-navigation ul li button .text {
          position: absolute;
          color: #fff;
          font-weight: 600;
          font-size: 0.65em;
          letter-spacing: 0.05em;
          transition: 0.5s;
          opacity: 0;
          transform: translateY(20px);
          text-transform: uppercase;
        }

        .liquid-navigation ul li.active button .text {
          opacity: 1;
          transform: translateY(10px);
        }

        .liquid-indicator {
          position: absolute;
          top: -50%;
          width: 70px;
          height: 70px;
          background: #cbd5e1; /* Cinza azulado claro para destacar */
          border-radius: 50%;
          border: 6px solid #141e30; /* Cor escura do fundo para imitar o body-bg */
          transition: 0.5s;
          left: 0; /* Starter position */
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

        @media (max-width: 380px) {
          .liquid-navigation {
            width: 320px;
          }
          .liquid-navigation ul {
            width: 320px;
          }
          .liquid-navigation ul li {
            width: 64px;
          }
          .liquid-indicator {
            width: 64px;
            height: 64px;
            border-width: 5px;
          }
          .liquid-navigation ul li.active button .icon {
            transform: translateY(-28px);
          }
        }
      `}</style>

      <div className="liquid-navigation">
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
              transform: \`translateX(calc(\${100 * activeIndex}%))\` 
            }}
          ></div>
        </ul>
      </div>
    </div>
  );
};

