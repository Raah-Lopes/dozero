import React from 'react';
import { BookOpen, Brain, Crown, Hourglass } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import './LoreWorkspaceSwitcher.css';

export type LoreWorkspace = 'wiki' | 'brain' | 'lineage' | 'chronicle';

interface LoreWorkspaceSwitcherProps {
  current: LoreWorkspace;
  className?: string;
}

export const LoreWorkspaceSwitcher: React.FC<LoreWorkspaceSwitcherProps> = ({ current, className = '' }) => {
  const navigateTo = (target: LoreWorkspace) => {
    if (target === current) return;
    const { closeWindow, openWindow, setViewMode } = useWindowManager.getState();

    if (target === 'wiki') {
      closeWindow('lineage');
      closeWindow('chronicle');
      setViewMode('wiki');
    } else if (target === 'brain') {
      closeWindow('lineage');
      closeWindow('chronicle');
      setViewMode('brain');
    } else if (target === 'lineage') {
      closeWindow('chronicle');
      setViewMode('canvas');
      openWindow('lineage');
    } else if (target === 'chronicle') {
      closeWindow('lineage');
      setViewMode('canvas');
      openWindow('chronicle');
    }
  };

  return (
    <nav className={`lore-workspace-switcher ${className}`} role="navigation" aria-label="Espaços de Lore">
      <button
        type="button"
        className={`lore-nav-btn ${current === 'wiki' ? 'active' : ''}`}
        onClick={() => navigateTo('wiki')}
        title="Códice — Wiki viva da campanha"
        aria-label="Códice (Wiki)"
        aria-current={current === 'wiki' ? 'page' : undefined}
      >
        <BookOpen size={16} />
      </button>

      <button
        type="button"
        className={`lore-nav-btn ${current === 'brain' ? 'active' : ''}`}
        onClick={() => navigateTo('brain')}
        title="Cérebro — Grafo de conexões RPG"
        aria-label="Cérebro (Grafo)"
        aria-current={current === 'brain' ? 'page' : undefined}
      >
        <Brain size={16} />
      </button>

      <button
        type="button"
        className={`lore-nav-btn ${current === 'lineage' ? 'active' : ''}`}
        onClick={() => navigateTo('lineage')}
        title="Linhagem — Atlas de casas e dinastias"
        aria-label="Linhagem (Atlas de Casas)"
        aria-current={current === 'lineage' ? 'page' : undefined}
      >
        <Crown size={16} />
      </button>

      <button
        type="button"
        className={`lore-nav-btn ${current === 'chronicle' ? 'active' : ''}`}
        onClick={() => navigateTo('chronicle')}
        title="Chronica — Linha do tempo e calendários históricos"
        aria-label="Chronica (Linha do Tempo e Calendários)"
        aria-current={current === 'chronicle' ? 'page' : undefined}
      >
        <Hourglass size={16} />
      </button>
    </nav>
  );
};
