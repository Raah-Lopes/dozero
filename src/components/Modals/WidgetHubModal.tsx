import React, { useState } from 'react';
import { Search, X, Swords, Timer, Eye, UserPlus, Map, Skull, BookOpen, Network, Dices, Users, Sun, Sparkles, ToyBrick, Globe, Anvil, Castle, Shield, Bot, Coins } from 'lucide-react';

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
  onOpenAIStudio: () => void;
  onOpenTradeShop: () => void;
  onOpenSystemAuditor: () => void;
}

export const WidgetHubModal: React.FC<Props> = (props) => {
  const [search, setSearch] = useState('');

  const widgets = [
    // Game Master
    { id: 'ai', cat: 'Game Master', title: 'Estúdio IA do Mestre', icon: Bot, action: props.onOpenAIStudio, theme: 'theme-purple', shadow: '0 0 10px rgba(168,85,247,0.4)' },
    { id: 'arsenal', cat: 'Game Master', title: 'Arsenal do Mestre', icon: Shield, action: props.onOpenArsenalMestre, theme: 'theme-amber' },
    { id: 'campaign', cat: 'Game Master', title: 'Gestor de Campanhas', icon: BookOpen, action: props.onOpenCampaignManager, theme: 'theme-indigo' },
    { id: 'encounter', cat: 'Game Master', title: 'Forja de Encontros', icon: Skull, action: props.onOpenEncounterGenerator, theme: 'theme-orange' },
    { id: 'tracker', cat: 'Game Master', title: 'Iniciativa (Combate)', icon: Swords, action: props.onOpenTracker, theme: 'theme-red' },
    { id: 'clock', cat: 'Game Master', title: 'Relógio de Tensão', icon: Timer, action: props.onOpenClockConfig, theme: 'theme-amber' },
    { id: 'chronos', cat: 'Game Master', title: 'Motor Chronos', icon: Sun, action: props.onOpenChronos, theme: 'theme-yellow' },

    // Player Tools
    { id: 'diceroller', cat: 'Player Tools', title: 'Rolador de Dados', icon: Dices, action: props.onOpenDiceRoller, theme: 'theme-yellow' },
    { id: 'autodice', cat: 'Player Tools', title: 'Dados Automáticos', icon: Dices, action: props.onOpenAutomatedDice, theme: 'theme-red' },
    { id: 'roster', cat: 'Player Tools', title: 'Lista de Personagens', icon: Users, action: props.onOpenCharacterRoster, theme: 'theme-green' },
    { id: 'mindmap', cat: 'Player Tools', title: 'Painel de Conspiração', icon: Network, action: props.onOpenMindMap, theme: 'theme-pink' },
    { id: 'webframe', cat: 'Player Tools', title: 'Navegador Integrado', icon: Globe, action: props.onOpenWebFrame, theme: 'theme-pink' },
    { id: 'tradeshop', cat: 'Player Tools', title: 'Sistema Comercial & Lojas', icon: Coins, action: props.onOpenTradeShop, theme: 'theme-amber', shadow: '0 0 10px rgba(245,158,11,0.3)' },

    // Generators & AI
    { id: 'npcgen', cat: 'Generators & AI', title: 'Forja de NPCs', icon: UserPlus, action: props.onOpenNPCGenerator, theme: 'theme-green' },
    { id: 'locgen', cat: 'Generators & AI', title: 'Forja de Mundos', icon: Map, action: props.onOpenLocationGenerator, theme: 'theme-blue' },
    { id: 'oraclev2', cat: 'Generators & AI', title: 'Mega Oráculo', icon: Eye, action: props.onOpenOracleV2, theme: 'theme-purple' },
    { id: 'lore', cat: 'Generators & AI', title: 'Máquina de Lores', icon: Sparkles, action: props.onOpenLoreMachine, theme: 'theme-purple' },
    { id: 'worldengine', cat: 'Generators & AI', title: 'Motor de Mundo', icon: Globe, action: props.onOpenWorldEngine, theme: 'theme-indigo' },
    { id: 'entityforge', cat: 'Generators & AI', title: 'Forja de Entidades', icon: Anvil, action: props.onOpenEntityForge, theme: 'theme-red' },
    { id: 'stronghold', cat: 'Generators & AI', title: 'Fortaleza da Party', icon: Castle, action: props.onOpenStronghold, theme: 'theme-green' },

    // System
    { id: 'audiodir', cat: 'System', title: 'Audio Director', icon: Sparkles, action: props.onOpenAudioDirector, theme: 'theme-blue' },
    { id: 'dlc', cat: 'System', title: 'Gerenciador de Complementos', icon: ToyBrick, action: props.onOpenDLCManager, theme: 'theme-orange' },
    { id: 'auditor', cat: 'System', title: 'Auditor de Sistema (Linter)', icon: Shield, action: props.onOpenSystemAuditor, theme: 'theme-red' },
  ];

  const categories = ['Game Master', 'Player Tools', 'Generators & AI', 'System'];
  
  const filteredWidgets = widgets.filter(w => w.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '550px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Hub de Widgets
        </h3>
        <button 
          onClick={props.onClose} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} 
          onMouseOver={e => e.currentTarget.style.color = 'white'} 
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input 
          type="search" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ferramentas..." 
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 10px 8px 34px', borderRadius: '6px', fontSize: '0.85rem' }}
        />
      </div>

      <style>
        {\`
          .widget-category {
            margin-bottom: 1.5rem;
          }
          .widget-category-title {
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-bottom: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 0.3rem;
          }
          .widget-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 1rem;
            justify-items: center;
          }
          .widget-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 60px;
            height: 60px;
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
        \`}
      </style>

      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
        {categories.map(cat => {
          const catWidgets = filteredWidgets.filter(w => w.cat === cat);
          if (catWidgets.length === 0) return null;
          
          return (
            <div className="widget-category" key={cat}>
              <div className="widget-category-title">{cat}</div>
              <div className="widget-grid" style={{ justifyContent: cat === 'System' ? 'start' : 'center' }}>
                {catWidgets.map(w => {
                  const Icon = w.icon;
                  return (
                    <button 
                      key={w.id} 
                      onClick={w.action} 
                      title={w.title} 
                      className={\`widget-btn \${w.theme}\`} 
                      style={w.shadow ? { boxShadow: w.shadow } : {}}
                    >
                      <Icon size={28} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
