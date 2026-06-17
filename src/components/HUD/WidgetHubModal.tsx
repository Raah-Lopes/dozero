import React from 'react';
import { X, Swords, Timer, Dice3, FileText, Eye, CloudSun, UserPlus, Map, Skull, BookOpen } from 'lucide-react';

interface Props {
  onClose: () => void;
  onOpenTracker: () => void;
  onOpenClockConfig: () => void;
  onOpenOracleV2: () => void;
  onOpenNPCGenerator: () => void;
  onOpenLocationGenerator: () => void;
  onOpenEncounterGenerator: () => void;
  onOpenCampaignManager: () => void;
}

export const WidgetHubModal: React.FC<Props> = ({ onClose, onOpenTracker, onOpenClockConfig, onOpenOracleV2, onOpenNPCGenerator, onOpenLocationGenerator, onOpenEncounterGenerator, onOpenCampaignManager }) => {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '550px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Hub de Widgets
        </h3>
        <button 
          onClick={onClose} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} 
          onMouseOver={e => e.currentTarget.style.color = 'white'} 
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', justifyItems: 'center' }}>
        <style>
          {`
            .widget-btn {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 64px;
              height: 64px;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid var(--glass-border);
              color: white;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .widget-btn:hover {
              transform: scale(1.1);
            }
            .widget-btn.disabled {
              opacity: 0.3;
              cursor: not-allowed;
            }
            .widget-btn.disabled:hover {
              transform: none;
            }
            
            /* Temas Padronizados */
            .theme-red { color: #fda4af; border-color: rgba(225, 29, 72, 0.5); }
            .theme-red:hover { background: rgba(225, 29, 72, 0.2); border-color: #e11d48; box-shadow: 0 0 15px rgba(225, 29, 72, 0.5); }

            .theme-amber { color: #fcd34d; border-color: rgba(245, 158, 11, 0.5); }
            .theme-amber:hover { background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; box-shadow: 0 0 15px rgba(245, 158, 11, 0.5); }

            .theme-purple { color: #f0abfc; border-color: rgba(217, 70, 239, 0.5); }
            .theme-purple:hover { background: rgba(217, 70, 239, 0.2); border-color: #d946ef; box-shadow: 0 0 15px rgba(217, 70, 239, 0.5); }

            .theme-green { color: #6ee7b7; border-color: rgba(16, 185, 129, 0.5); }
            .theme-green:hover { background: rgba(16, 185, 129, 0.2); border-color: #10b981; box-shadow: 0 0 15px rgba(16, 185, 129, 0.5); }

            .theme-blue { color: #93c5fd; border-color: rgba(59, 130, 246, 0.5); }
            .theme-blue:hover { background: rgba(59, 130, 246, 0.2); border-color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }

            .theme-orange { color: #fdba74; border-color: rgba(249, 115, 22, 0.5); }
            .theme-orange:hover { background: rgba(249, 115, 22, 0.2); border-color: #f97316; box-shadow: 0 0 15px rgba(249, 115, 22, 0.5); }

            .theme-indigo { color: #c4b5fd; border-color: rgba(139, 92, 246, 0.5); }
            .theme-indigo:hover { background: rgba(139, 92, 246, 0.2); border-color: #8b5cf6; box-shadow: 0 0 15px rgba(139, 92, 246, 0.5); }
          `}
        </style>
        {/* Gestão de Mesa */}
        <button onClick={onOpenTracker} title="Iniciativa (Gestão de Combate)" className="widget-btn theme-red">
          <Swords size={32} />
        </button>

        <button onClick={onOpenClockConfig} title="Relógio de Tensão (Controle de Tempo)" className="widget-btn theme-amber">
          <Timer size={32} />
        </button>

        <button onClick={onOpenOracleV2} title="Mega Oráculo (Improvisação)" className="widget-btn theme-purple">
          <Eye size={32} />
        </button>

        {/* As Três Forjas */}
        <button onClick={onOpenNPCGenerator} title="Forja de NPCs (Personagens)" className="widget-btn theme-green">
          <UserPlus size={32} />
        </button>

        <button onClick={onOpenLocationGenerator} title="Forja de Mundos (Locais)" className="widget-btn theme-blue">
          <Map size={32} />
        </button>

        <button onClick={onOpenEncounterGenerator} title="Forja de Encontros (Ameaças)" className="widget-btn theme-orange">
          <Skull size={32} />
        </button>

        <button onClick={onOpenCampaignManager} title="Gestor de Campanhas (Planejamento)" className="widget-btn theme-indigo">
          <BookOpen size={32} />
        </button>
      </div>
    </div>
  );
};
