import React from 'react';
import { X, Swords, Timer, Eye, UserPlus, Map, Skull, BookOpen, Network, Dices, Users, Sun, Sparkles, ToyBrick, Globe, Anvil, Castle, Shield } from 'lucide-react';

interface Props {
  onClose: () => void;
  onOpenTracker: () => void;
  onOpenClockConfig: () => void;
  onOpenOracleV2: () => void;
  onOpenNPCGenerator: () => void;
  onOpenLocationGenerator: () => void;
  onOpenEncounterGenerator: () => void;
  onOpenCampaignManager: () => void;
  onOpenMindMap: () => void;
  onOpenAutomatedDice: () => void;
  onOpenCharacterRoster: () => void;
  onOpenChronos: () => void;
  onOpenLoreMachine: () => void;
  onOpenDLCManager: () => void;
  onOpenWorldEngine: () => void;
  onOpenEntityForge: () => void;
  onOpenStronghold: () => void;
  onOpenArsenalMestre: () => void;
  onOpenAudioDirector: () => void;
  onOpenWebFrame: () => void;
  onOpenDiceRoller: () => void;
}

export const WidgetHubModal: React.FC<Props> = ({ onClose, onOpenTracker, onOpenClockConfig, onOpenOracleV2, onOpenNPCGenerator, onOpenLocationGenerator, onOpenEncounterGenerator, onOpenCampaignManager, onOpenMindMap, onOpenAutomatedDice, onOpenCharacterRoster, onOpenChronos, onOpenLoreMachine, onOpenDLCManager, onOpenWorldEngine, onOpenEntityForge, onOpenStronghold, onOpenArsenalMestre, onOpenAudioDirector, onOpenWebFrame, onOpenDiceRoller }) => {
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

            .theme-yellow { color: #fef08a; border-color: rgba(234, 179, 8, 0.5); }
            .theme-yellow:hover { background: rgba(234, 179, 8, 0.2); border-color: #eab308; box-shadow: 0 0 15px rgba(234, 179, 8, 0.5); }

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

            .theme-pink { color: #f9a8d4; border-color: rgba(236, 72, 153, 0.5); }
            .theme-pink:hover { background: rgba(236, 72, 153, 0.2); border-color: #ec4899; box-shadow: 0 0 15px rgba(236, 72, 153, 0.5); }
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

        <button onClick={onOpenMindMap} title="Painel de Conspiração (Mapa Mental)" className="widget-btn theme-pink">
          <Network size={32} />
        </button>

        {/* Novos Widgets */}
        <button onClick={onOpenAutomatedDice} title="Dados Automáticos (Combate)" className="widget-btn theme-red">
          <Dices size={32} />
        </button>

        <button onClick={onOpenCharacterRoster} title="Lista de Personagens" className="widget-btn theme-green">
          <Users size={32} />
        </button>

        <button onClick={onOpenChronos} title="Motor Chronos (Simulador de Tempo)" className="widget-btn theme-yellow">
          <Sun size={32} />
        </button>

        <button onClick={onOpenLoreMachine} title="Máquina de Lores (Gerador Procedural)" className="widget-btn theme-purple">
          <Sparkles size={32} />
        </button>

        <button onClick={onOpenDLCManager} title="Gerenciador de Complementos" className="widget-btn theme-orange">
          <ToyBrick size={32} />
        </button>

        <button onClick={onOpenWorldEngine} title="Motor de Mundo (Geopolítica)" className="widget-btn theme-indigo">
          <Globe size={32} />
        </button>

        <button onClick={onOpenEntityForge} title="Forja de Entidades" className="widget-btn theme-red">
          <Anvil size={32} />
        </button>

        <button onClick={onOpenStronghold} title="Fortaleza da Party" className="widget-btn theme-green">
          <Castle size={32} />
        </button>

        <button onClick={onOpenArsenalMestre} title="Arsenal do Mestre (Gerenciador GM)" className="widget-btn theme-amber">
          <Shield size={32} />
        </button>

        <button onClick={onOpenAudioDirector} title="Audio Director (Gerenciador de Áudio e SFX)" className="widget-btn theme-blue">
          <Sparkles size={32} />
        </button>

        <button onClick={onOpenWebFrame} title="Navegador Integrado (Janela Web)" className="widget-btn theme-pink">
          <Globe size={32} />
        </button>

        <button onClick={onOpenDiceRoller} title="Rolador de Dados (D4~D100, Macros, Histórico)" className="widget-btn theme-yellow">
          <Dices size={32} />
        </button>
      </div>
    </div>
  );
};
