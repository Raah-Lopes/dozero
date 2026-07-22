import React, { useState, useEffect } from 'react';
import { Search, X, Swords, Timer, Eye, UserPlus, Map, Skull, BookOpen, Network, Dices, Users, Sun, Sparkles, ToyBrick, Globe, Anvil, Castle, Shield, Bot, Coins, FileText, Palette, Video, Star } from 'lucide-react';

interface Props {
  onClose: () => void;
  onOpenTracker: () => void;
  onOpenClockConfig: () => void;
  onOpenOracleV2: () => void;
  onOpenNPCGenerator: () => void;
  onOpenLocationGenerator: () => void;
  onOpenEncounterGenerator: () => void;
  onOpenCampaignManager: () => void;
  onOpenGMNotes: () => void;
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
  onOpenMapSettings: () => void;
  onOpenActorLibrary: () => void;
  onOpenPlayerManager: () => void;
  onToggleAIBot: () => void;
  onOpenThemes: () => void;
  onOpenCutsceneDirector: () => void;
  onOpenRoomManager: () => void;
}

export const WidgetHubModal: React.FC<Props> = (props) => {
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>(
    () => JSON.parse(localStorage.getItem('dozero_hub_favorites') || '[]')
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [props.onClose]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('dozero_hub_favorites', JSON.stringify(next));
      return next;
    });
  };

  const widgets = [
    // Game Master
    { id: 'ai', cat: 'Game Master', title: 'Estúdio IA do Mestre', icon: Bot, action: props.onOpenAIStudio, theme: 'theme-purple', shadow: '0 0 10px rgba(168,85,247,0.4)' },
    { id: 'arsenal', cat: 'Game Master', title: 'Arsenal do Mestre', icon: Shield, action: props.onOpenArsenalMestre, theme: 'theme-amber' },
    { id: 'campaign', cat: 'Game Master', title: 'Gestor de Campanhas', icon: BookOpen, action: props.onOpenCampaignManager, theme: 'theme-indigo' },
    { id: 'gmnotes', cat: 'Game Master', title: 'Bloco de Notas', icon: FileText, action: props.onOpenGMNotes, theme: 'theme-green', shadow: '0 0 10px rgba(34,197,94,0.4)' },
    { id: 'players', cat: 'Game Master', title: 'Identidades (Jogadores)', icon: Users, action: props.onOpenPlayerManager, theme: 'theme-pink' },
    { id: 'encounter', cat: 'Game Master', title: 'Forja de Encontros', icon: Skull, action: props.onOpenEncounterGenerator, theme: 'theme-orange' },
    { id: 'tracker', cat: 'Game Master', title: 'Iniciativa (Combate)', icon: Swords, action: props.onOpenTracker, theme: 'theme-red' },
    { id: 'clock', cat: 'Game Master', title: 'Relógio de Tensão', icon: Timer, action: props.onOpenClockConfig, theme: 'theme-amber' },
    { id: 'chronos', cat: 'Game Master', title: 'Motor Chronos', icon: Sun, action: props.onOpenChronos, theme: 'theme-yellow' },
    { id: 'mapsettings', cat: 'Game Master', title: 'Visual da Mesa (Cenário)', icon: Map, action: props.onOpenMapSettings, theme: 'theme-blue' },
    { id: 'actors', cat: 'Game Master', title: 'Biblioteca de Atores', icon: Users, action: props.onOpenActorLibrary, theme: 'theme-amber' },
    { id: 'cutscene', cat: 'Game Master', title: 'Diretor de Cenas (Títulos)', icon: Video, action: props.onOpenCutsceneDirector, theme: 'theme-pink' },

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
    { id: 'roommgr', cat: 'System', title: 'Gestor de Salas (Multiplayer)', icon: Network, action: props.onOpenRoomManager, theme: 'theme-green', shadow: '0 0 10px rgba(34,197,94,0.4)' },
    { id: 'themes', cat: 'System', title: 'Temas Visuais (Aparência)', icon: Palette, action: props.onOpenThemes, theme: 'theme-pink', shadow: '0 0 10px rgba(236,72,153,0.4)' },
    { id: 'audiodir', cat: 'System', title: 'Audio Director', icon: Sparkles, action: props.onOpenAudioDirector, theme: 'theme-blue' },
    { id: 'dlc', cat: 'System', title: 'Gerenciador de Complementos', icon: ToyBrick, action: props.onOpenDLCManager, theme: 'theme-orange' },
    { id: 'auditor', cat: 'System', title: 'Auditor de Sistema (Linter)', icon: Shield, action: props.onOpenSystemAuditor, theme: 'theme-red' },
    { id: 'aibot', cat: 'System', title: 'Robô Assistente IA', icon: Bot, action: props.onToggleAIBot, theme: 'theme-pink' },
  ];

  const categories = ['Game Master', 'Player Tools', 'Generators & AI', 'System'];
  
  const filteredWidgets = widgets.filter(w => w.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '100%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
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
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '8px 10px 8px 34px', borderRadius: '6px', fontSize: '0.85rem' }}
        />
      </div>

      <style>
        {`
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
            grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
            gap: 1.5rem 1rem;
            justify-items: center;
            align-items: start;
          }
          .widget-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 0.5rem;
            width: 100%;
          }
          .widget-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 64px;
            height: 64px;
            border-radius: 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--glass-border);
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(5px);
          }
          .widget-btn:hover {
            transform: translateY(-4px);
            background: rgba(255, 255, 255, 0.08);
          }
          .widget-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            line-height: 1.2;
            word-break: break-word;
            transition: color 0.2s;
            font-weight: 500;
          }
          .widget-item:hover .widget-label {
            color: var(--text-primary);
          }
          
          /* Mobile Overrides for Widget Hub */
          @media (max-width: 768px) {
            .widget-grid {
              grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
              gap: 1.2rem 0.5rem;
            }
            .widget-btn {
              width: 56px;
              height: 56px;
              border-radius: 12px;
            }
            .widget-label {
              font-size: 0.68rem;
            }
          }
          .widget-btn.disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }
          .widget-btn.disabled:hover {
            transform: none;
          }
          
          /* Temas Padronizados usando Variáveis de CSS */
          .theme-red { color: var(--danger); border-color: var(--danger); opacity: 0.8; }
          .theme-red:hover { background: rgba(225, 29, 72, 0.1); opacity: 1; box-shadow: 0 0 15px rgba(225, 29, 72, 0.3); }

          .theme-amber { color: var(--warning); border-color: var(--warning); opacity: 0.8; }
          .theme-amber:hover { background: rgba(245, 158, 11, 0.1); opacity: 1; box-shadow: 0 0 15px rgba(245, 158, 11, 0.3); }

          .theme-yellow { color: var(--warning); border-color: var(--warning); opacity: 0.8; }
          .theme-yellow:hover { background: rgba(234, 179, 8, 0.1); opacity: 1; box-shadow: 0 0 15px rgba(234, 179, 8, 0.3); }

          .theme-purple { color: var(--accent-primary); border-color: var(--accent-primary); opacity: 0.8; }
          .theme-purple:hover { background: rgba(217, 70, 239, 0.1); opacity: 1; box-shadow: 0 0 15px rgba(217, 70, 239, 0.3); }

          .theme-green { color: var(--success); border-color: var(--success); opacity: 0.8; }
          .theme-green:hover { background: rgba(16, 185, 129, 0.1); opacity: 1; box-shadow: 0 0 15px rgba(16, 185, 129, 0.3); }

          .theme-blue { color: var(--mana); border-color: var(--mana); opacity: 0.8; }
          .theme-blue:hover { background: rgba(59, 130, 246, 0.1); opacity: 1; box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); }

          .theme-orange { color: var(--warning); border-color: var(--warning); opacity: 0.8; }
          .theme-orange:hover { background: rgba(249, 115, 22, 0.1); opacity: 1; box-shadow: 0 0 15px rgba(249, 115, 22, 0.3); }

          .theme-indigo { color: var(--accent-primary); border-color: var(--accent-primary); opacity: 0.8; }
          .theme-indigo:hover { background: rgba(139, 92, 246, 0.1); opacity: 1; box-shadow: 0 0 15px rgba(139, 92, 246, 0.3); }

          .theme-pink { color: var(--accent-primary); border-color: var(--accent-primary); opacity: 0.8; }
          .theme-pink:hover { background: rgba(236, 72, 153, 0.1); opacity: 1; box-shadow: 0 0 15px rgba(236, 72, 153, 0.3); }
        `}
      </style>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingRight: '10px' }}>

        {/* ⭐ Favoritos no topo */}
        {favorites.length > 0 && !search && (
          <div className="widget-category">
            <div className="widget-category-title" style={{ color: '#fbbf24' }}>⭐ Favoritos</div>
            <div className="widget-grid">
              {widgets.filter(w => favorites.includes(w.id)).map(w => {
                const Icon = w.icon;
                return (
                  <div className="widget-item" key={`fav-${w.id}`} style={{ position: 'relative' }}>
                    <button onClick={w.action} title={w.title} className={`widget-btn ${w.theme}`} style={w.shadow ? { boxShadow: w.shadow } : {}}>
                      <Icon size={30} />
                    </button>
                    <button onClick={(e) => toggleFavorite(w.id, e)} style={{ position: 'absolute', top: 0, right: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#fbbf24' }} title="Remover dos favoritos">
                      <Star size={11} fill="#fbbf24" />
                    </button>
                    <span className="widget-label">{w.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {categories.map(cat => {
          const catWidgets = filteredWidgets.filter(w => w.cat === cat);
          if (catWidgets.length === 0) return null;
          
          return (
            <div className="widget-category" key={cat}>
              <div className="widget-category-title">{cat}</div>
              <div className="widget-grid" style={{ justifyContent: cat === 'System' ? 'start' : 'center' }}>
                {catWidgets.map(w => {
                  const Icon = w.icon;
                  const isFav = favorites.includes(w.id);
                  return (
                    <div className="widget-item" key={w.id} style={{ position: 'relative' }}>
                      <button 
                        onClick={w.action} 
                        title={w.title} 
                        className={`widget-btn ${w.theme}`} 
                        style={w.shadow ? { boxShadow: w.shadow } : {}}
                      >
                        <Icon size={30} />
                      </button>
                      <button
                        onClick={(e) => toggleFavorite(w.id, e)}
                        style={{
                          position: 'absolute', top: 0, right: 0,
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '2px', color: isFav ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                          transition: 'color 0.15s',
                        }}
                        title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        <Star size={11} fill={isFav ? '#fbbf24' : 'none'} />
                      </button>
                      <span className="widget-label">{w.title}</span>
                    </div>
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
