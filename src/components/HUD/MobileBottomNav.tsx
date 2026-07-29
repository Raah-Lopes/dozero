import React from 'react';
import { LayoutGrid, BookOpen, MessageSquare, Dices, Grid, CloudFog, Ruler } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';

export const MobileBottomNav: React.FC = () => {
  const { viewMode, setViewMode, toggleWindow, openWindows, activeModal, setActiveModal, activeTool, setActiveTool } = useWindowManager();

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
      action: () => {
        setViewMode(viewMode === 'wiki' ? 'canvas' : 'wiki');
      }
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Chat',
      active: isChatOpen,
      action: () => {
        toggleWindow('chatWindow');
      }
    },
    {
      id: 'dice',
      icon: Dices,
      label: 'Dados',
      active: isDiceOpen,
      action: () => {
        toggleWindow('diceRoller');
      }
    },
    {
      id: 'menu',
      icon: Grid,
      label: 'Hub',
      active: activeModal === 'widgets',
      action: () => {
        setActiveModal(activeModal === 'widgets' ? 'none' : 'widgets');
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
