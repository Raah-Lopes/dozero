import React, { useState } from 'react';
import { Sparkles, Dices, BookOpen, User, X, ShieldAlert } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { useUserStore } from '../../store/user';

export const MobileQuickActions: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const { toggleWindow } = useWindowManager();
  const { isGM } = useUserStore();

  if (!isGM) return null;

  const quickActions = [
    {
      icon: Dices,
      label: 'Rolar Dados',
      action: () => toggleWindow('diceRoller')
    },
    {
      icon: BookOpen,
      label: 'Conspiração',
      action: () => toggleWindow('mindMap')
    },
    {
      icon: ShieldAlert,
      label: 'Combate',
      action: () => toggleWindow('combatTracker')
    },
    {
      icon: User,
      label: 'QuickBar',
      action: () => toggleWindow('playerQuickBar')
    }
  ];

  return (
    <div className="fab-container">
      {expanded && (
        <div className="fab-actions animate-fade-in">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  action.action();
                  setExpanded(false);
                }}
                className="fab-action"
                title={action.label}
                aria-label={action.label}
              >
                <Icon size={18} />
                <span className="fab-tooltip">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        className="fab-main"
        onClick={() => setExpanded(!expanded)}
        aria-label="Ações Rápidas"
        title="Ações Rápidas"
      >
        {expanded ? <X size={24} /> : <Sparkles size={24} />}
      </button>
    </div>
  );
};
