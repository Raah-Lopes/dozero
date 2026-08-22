import React, { useState, useEffect } from 'react';
import { Search, X, Star } from 'lucide-react';
import { WIDGET_REGISTRY, type WidgetCategory } from '../../constants/widgetRegistry';
import { Tooltip } from '../UI/Tooltip';
import { useIsGM } from '../../store/user';
import { useWindowManager } from '../../hooks/useWindowManager';

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
  onOpenStoryDice: () => void;
  onOpenSSStoryDice: () => void;
  onOpenStoryBilderDeck: () => void;
  onOpenPlayerQuickBar: () => void;
}

const CATEGORY_NAMES: Record<WidgetCategory, string> = {
  'Narrativa': '📖 Narrativa & Cenas',
  'Personagens': '👥 Personagens & Atores',
  'Ferramentas': '🔧 Ferramentas & Mapa',
  'Jogos & Acaso': '🎲 Jogos, Oráculos & Acaso',
  'Comunicação': '💬 Comunicação & Social',
  'Configurações': '⚙️ Configurações & Mestre'
};

const ORDERED_CATEGORIES: WidgetCategory[] = [
  'Narrativa',
  'Personagens',
  'Ferramentas',
  'Jogos & Acaso',
  'Comunicação',
  'Configurações'
];

export const WidgetHubModal: React.FC<Props> = (props) => {
  const isGM = useIsGM();
  const { toggleWindow, setActiveModal, setShowActors } = useWindowManager();
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
    setTimeout(() => {
      window.dispatchEvent(new Event('dozero_favorites_updated'));
    }, 0);
  };

  const widgets = WIDGET_REGISTRY.map(w => {
    let actionFn = () => {};
    if (w.actionType === 'toggleWindow' || w.actionType === 'setActiveModal' || w.actionType === 'setShowActors') {
      const propMap: Record<string, () => void> = {
        'masterForge': () => { toggleWindow('masterForge'); props.onClose(); },
        'aiStudio': props.onOpenAIStudio,
        'arsenalMestre': props.onOpenArsenalMestre,
        'campaignManager': props.onOpenCampaignManager,
        'gmNotes': props.onOpenGMNotes,
        'playerManager': props.onOpenPlayerManager,
        'encounterGenerator': props.onOpenEncounterGenerator,
        'combatTracker': props.onOpenTracker,
        'clockConfig': props.onOpenClockConfig,
        'chronos': props.onOpenChronos,
        'settings-cenario': props.onOpenMapSettings,
        'true': props.onOpenActorLibrary,
        'cutsceneDirector': props.onOpenCutsceneDirector,
        'diceRoller': props.onOpenDiceRoller,
        'automatedDice': props.onOpenAutomatedDice,
        'characterRoster': props.onOpenCharacterRoster,
        'mindMap': props.onOpenMindMap,
        'webFrame': props.onOpenWebFrame,
        'tradeShop': props.onOpenTradeShop,
        'oracle': props.onOpenOracleV2,
        'npcGenerator': props.onOpenNPCGenerator,
        'locationGenerator': props.onOpenLocationGenerator,
        'loreMachine': props.onOpenLoreMachine,
        'worldEngine': props.onOpenWorldEngine,
        'entityForge': props.onOpenEntityForge,
        'stronghold': props.onOpenStronghold,
        'systemAuditor': props.onOpenSystemAuditor,
        'settings-ia': props.onToggleAIBot,
        'settings-aparencia': props.onOpenThemes,
        'settings-modulos': props.onOpenDLCManager,
        'lobby': props.onOpenRoomManager,
        'players': props.onOpenPlayerManager,
        'storyDice': props.onOpenStoryDice,
        'ssStoryDice': props.onOpenSSStoryDice,
        'storyBilderDeck': props.onOpenStoryBilderDeck,
        'playerQuickBar': props.onOpenPlayerQuickBar,
        'audioDirector': props.onOpenAudioDirector,
      };
      
      if (propMap[w.actionPayload]) {
        actionFn = propMap[w.actionPayload];
      } else if (w.actionType === 'toggleWindow') {
        actionFn = () => { toggleWindow(w.actionPayload); props.onClose(); };
      } else if (w.actionType === 'setActiveModal') {
        actionFn = () => { setActiveModal(w.actionPayload as any); props.onClose(); };
      } else if (w.actionType === 'setShowActors') {
        actionFn = () => { setShowActors(true); props.onClose(); };
      }
    }
    
    return { ...w, action: actionFn };
  });

  const filteredWidgets = widgets.filter(w => {
    if (!isGM && w.gmOnly) return false;
    return w.title.toLowerCase().includes(search.toLowerCase()) || w.description.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '100%', maxWidth: '820px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/mascot/logo.webp" alt="Zye" style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 0 10px rgba(168,85,247,0.3)' }} />
          Central de Módulos & Ferramentas
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

      <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input 
          type="search" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ferramentas por nome ou descrição..." 
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '8px 10px 8px 34px', borderRadius: '6px', fontSize: '0.85rem' }}
        />
      </div>

      <style>
        {`
          .widget-category {
            margin-bottom: 1.5rem;
          }
          .widget-category-title {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-bottom: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 0.3rem;
            font-weight: bold;
          }
          .widget-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(95px, 1fr));
            gap: 1.2rem 0.8rem;
            justify-items: center;
            align-items: start;
          }
          .widget-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 0.4rem;
            width: 100%;
          }
          .widget-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 60px;
            height: 60px;
            border-radius: 14px;
            background: var(--bg-tertiary);
            border: 1px solid var(--glass-border);
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(5px);
          }
          .widget-btn:hover {
            transform: translateY(-3px);
            background: rgba(255, 255, 255, 0.1);
          }
          .widget-label {
            font-size: 0.72rem;
            color: var(--text-secondary);
            font-weight: 500;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.2;
          }

          .theme-purple { color: #c084fc; border-color: #a855f7; opacity: 0.9; }
          .theme-purple:hover { background: rgba(168, 85, 247, 0.15); opacity: 1; box-shadow: 0 0 15px rgba(168, 85, 247, 0.3); }

          .theme-green { color: #4ade80; border-color: #22c55e; opacity: 0.9; }
          .theme-green:hover { background: rgba(34, 197, 94, 0.15); opacity: 1; box-shadow: 0 0 15px rgba(34, 197, 94, 0.3); }

          .theme-red { color: #f87171; border-color: #ef4444; opacity: 0.9; }
          .theme-red:hover { background: rgba(239, 68, 68, 0.15); opacity: 1; box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }

          .theme-yellow { color: #facc15; border-color: #eab308; opacity: 0.9; }
          .theme-yellow:hover { background: rgba(234, 179, 8, 0.15); opacity: 1; box-shadow: 0 0 15px rgba(234, 179, 8, 0.3); }

          .theme-amber { color: #fbbf24; border-color: #f59e0b; opacity: 0.9; }
          .theme-amber:hover { background: rgba(245, 158, 11, 0.15); opacity: 1; box-shadow: 0 0 15px rgba(245, 158, 11, 0.3); }

          .theme-blue { color: #60a5fa; border-color: #3b82f6; opacity: 0.9; }
          .theme-blue:hover { background: rgba(59, 130, 246, 0.15); opacity: 1; box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); }

          .theme-orange { color: #fb923c; border-color: #f97316; opacity: 0.9; }
          .theme-orange:hover { background: rgba(249, 115, 22, 0.15); opacity: 1; box-shadow: 0 0 15px rgba(249, 115, 22, 0.3); }

          .theme-indigo { color: #818cf8; border-color: #6366f1; opacity: 0.9; }
          .theme-indigo:hover { background: rgba(99, 102, 241, 0.15); opacity: 1; box-shadow: 0 0 15px rgba(99, 102, 241, 0.3); }

          .theme-pink { color: #f472b6; border-color: #ec4899; opacity: 0.9; }
          .theme-pink:hover { background: rgba(236, 72, 153, 0.15); opacity: 1; box-shadow: 0 0 15px rgba(236, 72, 153, 0.3); }
        `}
      </style>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingRight: '6px' }}>

        {/* ⭐ Favoritos no topo */}
        {favorites.length > 0 && !search && (
          <div className="widget-category">
            <div className="widget-category-title" style={{ color: '#fbbf24' }}>⭐ Favoritos Rápidos</div>
            <div className="widget-grid">
              {widgets.filter(w => favorites.includes(w.id)).map(w => {
                const Icon = w.icon;
                return (
                  <div className="widget-item" key={`fav-${w.id}`} style={{ position: 'relative' }}>
                    <Tooltip label={w.title} description={w.description} position="bottom">
                      <button onClick={w.action} className={`widget-btn ${w.theme}`} style={w.shadow ? { boxShadow: w.shadow } : {}}>
                        <Icon size={28} />
                      </button>
                    </Tooltip>
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

        {/* Categorias Taxonômicas */}
        {ORDERED_CATEGORIES.map(cat => {
          const catWidgets = filteredWidgets.filter(w => w.cat === cat);
          if (catWidgets.length === 0) return null;
          
          return (
            <div className="widget-category" key={cat}>
              <div className="widget-category-title">{CATEGORY_NAMES[cat]}</div>
              <div className="widget-grid">
                {catWidgets.map(w => {
                  const Icon = w.icon;
                  const isFav = favorites.includes(w.id);
                  return (
                    <div className="widget-item" key={w.id} style={{ position: 'relative' }}>
                      <Tooltip label={w.title} description={w.description} position="bottom">
                        <button 
                          onClick={w.action} 
                          className={`widget-btn ${w.theme}`} 
                          style={w.shadow ? { boxShadow: w.shadow } : {}}
                        >
                          <Icon size={28} />
                        </button>
                      </Tooltip>
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
