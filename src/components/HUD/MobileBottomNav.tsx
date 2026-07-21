import React from 'react';
import { LayoutGrid, BookOpen, MessageSquare, Dices, Grid } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';

export const MobileBottomNav: React.FC = () => {
  const { viewMode, setViewMode, toggleWindow, openWindows, setWidgetHubOpen } = useWindowManager();

  const isChatOpen = openWindows['chatWindow']?.isOpen;
  const isDiceOpen = openWindows['diceRoller']?.isOpen;

  const navItems = [
    {
      id: 'canvas',
      icon: LayoutGrid,
      label: 'Mapa',
      active: viewMode === 'canvas' && !isChatOpen && !isDiceOpen,
      action: () => {
        setViewMode('canvas');
      }
    },
    {
      id: 'wiki',
      icon: BookOpen,
      label: 'Wiki',
      active: viewMode === 'wiki',
      action: () => {
        setViewMode(viewMode === 'wiki' ? 'canvas' : 'wiki');
      }
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Chat',
      active: !!isChatOpen,
      action: () => {
        toggleWindow('chatWindow');
      }
    },
    {
      id: 'dice',
      icon: Dices,
      label: 'Dados',
      active: !!isDiceOpen,
      action: () => {
        toggleWindow('diceRoller');
      }
    },
    {
      id: 'menu',
      icon: Grid,
      label: 'Hub',
      active: false,
      action: () => {
        setWidgetHubOpen(true);
      }
    }
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={item.action}
            className={`nav-item ${item.active ? 'active' : ''}`}
            aria-label={item.label}
          >
            <Icon size={20} />
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
