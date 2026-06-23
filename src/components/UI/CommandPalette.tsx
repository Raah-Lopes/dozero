import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { 
  Swords, Timer, Eye, UserPlus, Map, Skull, BookOpen, 
  Network, Dices, Users, Sun, Sparkles, ToyBrick, Globe, 
  Anvil, Castle, Shield, Search, X, FileText
} from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { useWiki } from '../../hooks/useWiki';

interface ActionDef {
  id: string;
  title: string;
  icon: React.ReactNode;
  category: 'GameMaster' | 'PlayerTools' | 'Generators' | 'System' | 'Wiki';
  onSelect: () => void;
}

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  
  const openWindow = useWindowManager(state => state.openWindow);
  const setActiveModal = useWindowManager(state => state.setActiveModal);
  const setOpenWikiDocs = useWindowManager(state => state.setOpenWikiDocs);
  const setViewMode = useWindowManager(state => state.setViewMode);
  
  const { index: wikiIndex } = useWiki();

  useEffect(() => {
    const stored = localStorage.getItem('dozero_recent_commands');
    if (stored) {
      try { setRecentIds(JSON.parse(stored)); } catch(e){}
    }
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (id: string, action: () => void) => {
    action();
    setOpen(false);
    setSearch('');
    
    // Update recents
    const newRecents = [id, ...recentIds.filter(r => r !== id)].slice(0, 3);
    setRecentIds(newRecents);
    localStorage.setItem('dozero_recent_commands', JSON.stringify(newRecents));
  };

  const openWikiFile = (path: string) => {
    setOpenWikiDocs(prev => {
      if (prev.some(d => d.filepath === path)) return prev;
      return [...prev, { id: Date.now().toString(), filepath: path }];
    });
    setViewMode('wiki');
  };

  const actions: ActionDef[] = [
    // GameMaster
    { id: 'gm_arsenal', title: 'Arsenal do Mestre', icon: <Shield size={16} />, category: 'GameMaster', onSelect: () => runCommand('gm_arsenal', () => openWindow('arsenalMestre')) },
    { id: 'gm_campaign', title: 'Gestor de Campanhas', icon: <BookOpen size={16} />, category: 'GameMaster', onSelect: () => runCommand('gm_campaign', () => openWindow('campaignManager')) },
    { id: 'gm_encounter', title: 'Forja de Encontros', icon: <Skull size={16} />, category: 'GameMaster', onSelect: () => runCommand('gm_encounter', () => openWindow('encounterGenerator')) },
    { id: 'gm_tracker', title: 'Iniciativa (Combate)', icon: <Swords size={16} />, category: 'GameMaster', onSelect: () => runCommand('gm_tracker', () => openWindow('tracker')) },
    { id: 'gm_clock', title: 'Relógio de Tensão', icon: <Timer size={16} />, category: 'GameMaster', onSelect: () => runCommand('gm_clock', () => setActiveModal('clockConfig')) },
    { id: 'gm_chronos', title: 'Motor Chronos', icon: <Sun size={16} />, category: 'GameMaster', onSelect: () => runCommand('gm_chronos', () => openWindow('chronos')) },
    
    // PlayerTools
    { id: 'pt_dice', title: 'Rolador de Dados', icon: <Dices size={16} />, category: 'PlayerTools', onSelect: () => runCommand('pt_dice', () => openWindow('diceRoller')) },
    { id: 'pt_autodice', title: 'Dados Automáticos', icon: <Dices size={16} />, category: 'PlayerTools', onSelect: () => runCommand('pt_autodice', () => openWindow('automatedDice')) },
    { id: 'pt_roster', title: 'Lista de Personagens', icon: <Users size={16} />, category: 'PlayerTools', onSelect: () => runCommand('pt_roster', () => openWindow('characterRoster')) },
    { id: 'pt_mindmap', title: 'Painel de Conspiração', icon: <Network size={16} />, category: 'PlayerTools', onSelect: () => runCommand('pt_mindmap', () => openWindow('mindMap')) },
    { id: 'pt_web', title: 'Navegador Integrado', icon: <Globe size={16} />, category: 'PlayerTools', onSelect: () => runCommand('pt_web', () => openWindow('webFrame')) },

    // Generators
    { id: 'gen_npc', title: 'Forja de NPCs', icon: <UserPlus size={16} />, category: 'Generators', onSelect: () => runCommand('gen_npc', () => openWindow('npcGenerator')) },
    { id: 'gen_location', title: 'Forja de Mundos', icon: <Map size={16} />, category: 'Generators', onSelect: () => runCommand('gen_location', () => openWindow('locationGenerator')) },
    { id: 'gen_oracle', title: 'Mega Oráculo', icon: <Eye size={16} />, category: 'Generators', onSelect: () => runCommand('gen_oracle', () => openWindow('oracle')) },
    { id: 'gen_lore', title: 'Máquina de Lores', icon: <Sparkles size={16} />, category: 'Generators', onSelect: () => runCommand('gen_lore', () => openWindow('loreMachine')) },
    { id: 'gen_world', title: 'Motor de Mundo', icon: <Globe size={16} />, category: 'Generators', onSelect: () => runCommand('gen_world', () => openWindow('worldEngine')) },
    { id: 'gen_entity', title: 'Forja de Entidades', icon: <Anvil size={16} />, category: 'Generators', onSelect: () => runCommand('gen_entity', () => openWindow('entityForge')) },
    { id: 'gen_stronghold', title: 'Fortaleza da Party', icon: <Castle size={16} />, category: 'Generators', onSelect: () => runCommand('gen_stronghold', () => openWindow('stronghold')) },

    // System
    { id: 'sys_audio', title: 'Audio Director', icon: <Sparkles size={16} />, category: 'System', onSelect: () => runCommand('sys_audio', () => openWindow('audioDirector')) },
    { id: 'sys_dlc', title: 'Gerenciador de Complementos', icon: <ToyBrick size={16} />, category: 'System', onSelect: () => runCommand('sys_dlc', () => openWindow('dlcManager')) },
  ];

  // Dynamic Wiki Actions
  const wikiActions: ActionDef[] = wikiIndex.map(file => ({
    id: `wiki_${file.path}`,
    title: file.title || file.name,
    icon: <FileText size={16} />,
    category: 'Wiki',
    onSelect: () => runCommand(`wiki_${file.path}`, () => openWikiFile(file.path))
  }));

  const allActions = [...actions, ...wikiActions];

  const recentActions = recentIds.map(id => allActions.find(a => a.id === id)).filter(Boolean) as ActionDef[];

  return (
    <>
      <button 
        className="cmd-trigger-btn"
        title="Paleta de Comandos (Ctrl+K)"
        onClick={() => setOpen(true)}
      >
        <Search size={20} />
      </button>

      {open && (
        <div className="cmd-overlay" onClick={() => setOpen(false)}>
          <style>
            {`
              .cmd-trigger-btn {
                position: fixed;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1);
                border-top: none;
                border-radius: 0 0 12px 12px;
                color: rgba(255,255,255,0.3);
                padding: 0.5rem 2rem;
                cursor: pointer;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s, color 0.2s, background 0.2s;
              }
              .cmd-trigger-btn:hover {
                opacity: 1;
                color: white;
                background: rgba(255,255,255,0.1);
              }

              .cmd-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: flex-start;
                justify-content: center;
                padding-top: 15vh;
                z-index: 99999;
              }
              
              .cmd-dialog {
                width: 100%;
                max-width: 640px;
                background: rgba(20, 20, 25, 0.85);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                box-shadow: 0 16px 70px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(20px);
                overflow: hidden;
                color: var(--text-primary);
                animation: cmd-slide-down 0.2s cubic-bezier(0.16, 1, 0.3, 1);
              }

              @keyframes cmd-slide-down {
                from { opacity: 0; transform: translateY(-20px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }

              .cmd-input-wrapper {
                display: flex;
                align-items: center;
                padding: 1rem 1.5rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
              }

              .cmd-input {
                border: none;
                background: transparent;
                width: 100%;
                font-size: 1.2rem;
                color: var(--text-primary);
                margin-left: 1rem;
                outline: none;
              }
              .cmd-input::placeholder {
                color: rgba(255,255,255,0.3);
              }

              .cmd-list {
                max-height: 400px;
                overflow-y: auto;
                padding: 0.5rem;
              }

              .cmd-group-heading {
                padding: 0.5rem 1rem;
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--text-secondary);
                font-weight: 600;
              }

              .cmd-item {
                padding: 0.75rem 1rem;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 1rem;
                cursor: pointer;
                transition: background 0.1s;
                color: rgba(255,255,255,0.8);
              }

              .cmd-item[data-selected="true"] {
                background: rgba(255, 255, 255, 0.1);
                color: white;
              }

              .cmd-item .item-icon {
                color: var(--text-secondary);
                display: flex;
                align-items: center;
              }
              .cmd-item[data-selected="true"] .item-icon {
                color: white;
              }

              .cmd-empty {
                padding: 2rem;
                text-align: center;
                color: var(--text-secondary);
              }
              
              .cmd-footer {
                padding: 0.5rem 1.5rem;
                border-top: 1px solid rgba(255,255,255,0.05);
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
                background: rgba(0,0,0,0.2);
                font-size: 0.75rem;
                color: var(--text-secondary);
              }
              .cmd-kbd {
                background: rgba(255,255,255,0.1);
                padding: 0.1rem 0.4rem;
                border-radius: 4px;
                font-family: monospace;
              }
            `}
          </style>

          <Command 
            className="cmd-dialog" 
            onClick={e => e.stopPropagation()}
            loop
          >
            <div className="cmd-input-wrapper">
              <Search size={20} color="var(--text-secondary)" />
              <Command.Input 
                className="cmd-input" 
                placeholder="O que você precisa fazer?" 
                value={search}
                onValueChange={setSearch}
                autoFocus
              />
              <button 
                onClick={() => setOpen(false)}
                style={{ background:'transparent', border:'none', color:'var(--text-secondary)', cursor:'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <Command.List className="cmd-list">
              <Command.Empty className="cmd-empty">Nenhum comando encontrado.</Command.Empty>

              {recentActions.length > 0 && search === '' && (
                <Command.Group heading="Recentes" className="cmd-group">
                  <div className="cmd-group-heading">Recentes</div>
                  {recentActions.map(action => (
                    <Command.Item 
                      key={`recent_${action.id}`} 
                      value={action.title}
                      onSelect={action.onSelect} 
                      className="cmd-item"
                    >
                      <span className="item-icon">{action.icon}</span>
                      {action.title}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              <Command.Group heading="Game Master" className="cmd-group">
                <div className="cmd-group-heading">Game Master</div>
                {actions.filter(a => a.category === 'GameMaster').map(action => (
                  <Command.Item key={action.id} value={action.title} onSelect={action.onSelect} className="cmd-item">
                    <span className="item-icon">{action.icon}</span>
                    {action.title}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Player Tools" className="cmd-group">
                <div className="cmd-group-heading">Player Tools</div>
                {actions.filter(a => a.category === 'PlayerTools').map(action => (
                  <Command.Item key={action.id} value={action.title} onSelect={action.onSelect} className="cmd-item">
                    <span className="item-icon">{action.icon}</span>
                    {action.title}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Generators & AI" className="cmd-group">
                <div className="cmd-group-heading">Generators & AI</div>
                {actions.filter(a => a.category === 'Generators').map(action => (
                  <Command.Item key={action.id} value={action.title} onSelect={action.onSelect} className="cmd-item">
                    <span className="item-icon">{action.icon}</span>
                    {action.title}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="System" className="cmd-group">
                <div className="cmd-group-heading">System</div>
                {actions.filter(a => a.category === 'System').map(action => (
                  <Command.Item key={action.id} value={action.title} onSelect={action.onSelect} className="cmd-item">
                    <span className="item-icon">{action.icon}</span>
                    {action.title}
                  </Command.Item>
                ))}
              </Command.Group>

              {wikiActions.length > 0 && (
                <Command.Group heading="Base de Conhecimento" className="cmd-group">
                  <div className="cmd-group-heading">Base de Conhecimento (Wiki)</div>
                  {wikiActions.map(action => (
                    <Command.Item key={action.id} value={action.title} onSelect={action.onSelect} className="cmd-item">
                      <span className="item-icon">{action.icon}</span>
                      {action.title}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

            </Command.List>

            <div className="cmd-footer">
              <span><span className="cmd-kbd">↑</span> <span className="cmd-kbd">↓</span> Navegar</span>
              <span><span className="cmd-kbd">↵</span> Selecionar</span>
              <span><span className="cmd-kbd">ESC</span> Fechar</span>
            </div>
          </Command>
        </div>
      )}
    </>
  );
};
