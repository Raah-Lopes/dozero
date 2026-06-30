import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { 
  Swords, Timer, Eye, UserPlus, Map, Skull, BookOpen, 
  Network, Dices, Users, Sun, Sparkles, ToyBrick, Globe, 
  Anvil, Castle, Shield, Search, X, FileText, LayoutTemplate, CopyPlus, Pin
} from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { useWiki } from '../../hooks/useWiki';
import { useCommandRegistry } from '../../store';

interface ActionDef {
  id: string;
  title: string;
  icon?: React.ReactNode;
  category: string;
  onSelect: () => void;
}

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [page, setPage] = useState<'root' | 'file_options'>('root');
  const [selectedFile, setSelectedFile] = useState<{ path: string, title: string } | null>(null);
  
  const openWindow = useWindowManager(state => state.openWindow);
  const setActiveModal = useWindowManager(state => state.setActiveModal);
  const setOpenWikiDocs = useWindowManager(state => state.setOpenWikiDocs);
  const setViewMode = useWindowManager(state => state.setViewMode);
  
  const { index: wikiIndex } = useWiki();
  const dynamicCommands = useCommandRegistry(state => state.commands);

  useEffect(() => {
    const stored = localStorage.getItem('dozero_recent_commands');
    if (stored) {
      try { setRecentIds(JSON.parse(stored)); } catch(e){}
    }
    const storedPinned = localStorage.getItem('dozero_pinned_commands');
    if (storedPinned) {
      try { setPinnedIds(JSON.parse(storedPinned)); } catch(e){}
    }
  }, []);

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const newPinned = pinnedIds.includes(id) 
      ? pinnedIds.filter(pid => pid !== id)
      : [...pinnedIds, id];
    setPinnedIds(newPinned);
    localStorage.setItem('dozero_pinned_commands', JSON.stringify(newPinned));
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === 'Backspace' && !search && page !== 'root') {
        e.preventDefault();
        setPage('root');
      }
      if (e.key === 'Escape' && page !== 'root') {
        e.preventDefault();
        e.stopPropagation();
        setPage('root');
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [search, page]);

  // Reset page when closing
  useEffect(() => {
    if (!open) {
      setTimeout(() => setPage('root'), 200);
      setSearch('');
    }
  }, [open]);

  const runCommand = (id: string, action: () => void) => {
    action();
    if (page === 'root') {
      setOpen(false);
      setSearch('');
      // Update recents
      const newRecents = [id, ...recentIds.filter(r => r !== id)].slice(0, 3);
      setRecentIds(newRecents);
      localStorage.setItem('dozero_recent_commands', JSON.stringify(newRecents));
    }
  };

  const openWikiFile = (path: string, mode: 'full' | 'preview') => {
    if (mode === 'full') {
      window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path } }));
    } else {
      setOpenWikiDocs(prev => {
        if (prev.some(d => d.filepath === path)) return prev;
        return [...prev, { id: Date.now().toString(), filepath: path }];
      });
    }
    
    setOpen(false);
    setSearch('');
    setPage('root');

    const id = `wiki_${path}`;
    const newRecents = [id, ...recentIds.filter(r => r !== id)].slice(0, 3);
    setRecentIds(newRecents);
    localStorage.setItem('dozero_recent_commands', JSON.stringify(newRecents));
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
    { id: 'pt_mindmap', title: 'Mapa Mental', icon: <span>🧠</span>, category: 'PlayerTools', onSelect: () => runCommand('pt_mindmap', () => openWindow('mindMap')) },
    { id: 'pt_web', title: 'Navegador Integrado', icon: <Globe size={16} />, category: 'PlayerTools', onSelect: () => runCommand('pt_web', () => openWindow('webFrame')) },

    // Wiki actions
    { id: 'wiki_open', title: 'Abrir Wiki', icon: <BookOpen size={16} />, category: 'QuickActions', onSelect: () => runCommand('wiki_open', () => window.dispatchEvent(new CustomEvent('open-wiki'))) },
    { id: 'wiki_graph', title: 'Abrir Cérebro da Wiki', icon: <span>🕸️</span>, category: 'QuickActions', onSelect: () => runCommand('wiki_graph', () => {
      window.dispatchEvent(new CustomEvent('open-wiki'));
      setTimeout(() => window.dispatchEvent(new CustomEvent('open-wiki-graph')), 150);
    }) },

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

  // Extrair categorias dinamicas dos arquivos Wiki (ex: 'Lore', 'Fichas', 'Locais')
  const getWikiCategory = (path: string) => {
    const parts = path.split('/');
    if (parts.length > 1) return `📖 ${parts[0]}`; // Nome da pasta raiz (ex: Fichas)
    return '📖 Base de Conhecimento';
  };

  const wikiActions: ActionDef[] = wikiIndex.map(file => {
    const defaultName = (file.metadata?.nome || file.slug || file.path.split('/').pop() || 'Documento').replace('.md', '');
    const title = file.metadata?.titulo || defaultName;
    return {
      id: `wiki_${file.path}`,
      title,
      icon: <FileText size={16} />,
      category: getWikiCategory(file.path),
      onSelect: () => {
        // Switch to file_options page instead of opening immediately
        setSelectedFile({ path: file.path, title });
        setSearch('');
        setPage('file_options');
      }
    };
  });

  const allActions = [...actions, ...dynamicCommands, ...wikiActions];
  const recentActions = recentIds.map(id => allActions.find(a => a.id === id)).filter(Boolean) as ActionDef[];
  const pinnedActions = pinnedIds.map(id => allActions.find(a => a.id === id)).filter(Boolean) as ActionDef[];

  // Group wiki actions by their dynamic folder category, ONLY if user is typing
  const isSearching = search.trim().length > 0;
  const wikiCategories = Array.from(new Set(wikiActions.map(a => a.category)));
  const systemCategories = Array.from(new Set([...actions, ...dynamicCommands].map(a => a.category))).filter(c => c !== 'QuickActions');

  const renderItem = (action: ActionDef, keyPrefix = '') => (
    <Command.Item 
      key={`${keyPrefix}${action.id}`} 
      value={action.title}
      onSelect={action.onSelect} 
      className="cmd-item"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="item-icon">{action.icon}</span>
          {action.title}
        </div>
        <button 
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); togglePin(e, action.id); }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
          title={pinnedIds.includes(action.id) ? "Desafixar do Acesso Rápido" : "Fixar no Acesso Rápido"}
        >
          <Pin size={14} style={{ color: pinnedIds.includes(action.id) ? '#facc15' : 'rgba(255,255,255,0.2)', transform: 'rotate(45deg)' }} />
        </button>
      </div>
    </Command.Item>
  );

  return (
    <>
      {/* Botão Hover no Topo da Tela (mais seguro contra barras nativas do SO/Browser) */}
      <div className="cmd-hover-area">
        <button 
          className="cmd-trigger-btn"
          title="Paleta de Comandos (Ctrl+K)"
          onClick={() => setOpen(true)}
        >
          <Search size={20} />
        </button>
      </div>

      <style>
        {`
          .cmd-hover-area {
            position: fixed;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 250px;
            height: 15px; /* Área invisível que detecta o mouse no topo */
            z-index: 999999;
          }

          .cmd-trigger-btn {
            position: absolute;
            top: 0;
            left: 50%;
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid rgba(255,255,255,0.1);
            border-top: none;
            border-radius: 0 0 16px 16px;
            color: rgba(255,255,255,0.4);
            padding: 0.3rem 2.5rem;
            cursor: pointer;
            backdrop-filter: blur(8px);
            
            /* Fica recolhido pra cima */
            transform: translate(-50%, -100%);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s;
          }
          
          .cmd-hover-area:hover .cmd-trigger-btn {
            /* Desce quando o mouse encosta na borda superior */
            transform: translate(-50%, 0);
            color: white;
            box-shadow: 0 5px 25px rgba(0,0,0,0.5);
          }
        `}
      </style>

      {open && (
        <div className="cmd-overlay" onClick={() => setOpen(false)}>
          <style>
            {`
              .cmd-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: flex-start;
                justify-content: center;
                padding-top: 15vh;
                z-index: 9999999;
              }
              
              .cmd-dialog {
                width: 100%;
                max-width: 720px;
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
                padding: 1.2rem 1.5rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                gap: 1rem;
              }
              
              .cmd-badge {
                background: rgba(255,255,255,0.1);
                padding: 0.3rem 0.6rem;
                border-radius: 6px;
                font-size: 0.8rem;
                color: var(--text-secondary);
                white-space: nowrap;
              }

              .cmd-input {
                border: none;
                background: transparent;
                width: 100%;
                font-size: 1.2rem;
                color: var(--text-primary);
                outline: none;
              }
              .cmd-input::placeholder {
                color: rgba(255,255,255,0.3);
              }

              .cmd-list {
                max-height: 450px;
                overflow-y: auto;
                padding: 0.5rem;
              }

              .cmd-group-heading {
                padding: 0.8rem 1rem 0.3rem 1rem;
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
                padding: 3rem;
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
              {page === 'root' ? (
                <Search size={22} color="var(--text-secondary)" />
              ) : (
                <div className="cmd-badge">{selectedFile?.title}</div>
              )}
              <Command.Input 
                className="cmd-input" 
                placeholder={page === 'root' ? "Busque ações, fichas, lores, locais..." : "O que deseja fazer com este documento?"} 
                value={search}
                onValueChange={setSearch}
                autoFocus
              />
              <button 
                onClick={() => setOpen(false)}
                style={{ background:'transparent', border:'none', color:'var(--text-secondary)', cursor:'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <Command.List className="cmd-list">
              <Command.Empty className="cmd-empty">Nenhum comando ou documento encontrado.</Command.Empty>

              {page === 'root' && (
                <>
                  {!isSearching && pinnedActions.length > 0 && (
                    <Command.Group heading="Acesso Rápido" className="cmd-group">
                      <div className="cmd-group-heading">Acesso Rápido</div>
                      {pinnedActions.map(action => renderItem(action, 'pinned_'))}
                    </Command.Group>
                  )}

                  {!isSearching && recentActions.length > 0 && (
                    <Command.Group heading="Recentes" className="cmd-group">
                      <div className="cmd-group-heading">Recentes</div>
                      {recentActions.map(action => renderItem(action, 'recent_'))}
                    </Command.Group>
                  )}

                  {!isSearching && (
                    <>
                      {systemCategories.map(cat => {
                        const items = [...actions, ...dynamicCommands].filter(a => a.category === cat);
                        if (items.length === 0) return null;
                        
                        // Formatações cosméticas p/ categorias antigas
                        let displayName = cat;
                        if (cat === 'GameMaster') displayName = 'Game Master';
                        if (cat === 'PlayerTools') displayName = 'Player Tools';
                        if (cat === 'Generators') displayName = 'Generators & AI';
                        
                        return (
                          <Command.Group key={cat} heading={displayName} className="cmd-group">
                            <div className="cmd-group-heading">{displayName}</div>
                            {items.map(action => renderItem(action))}
                          </Command.Group>
                        )
                      })}
                    </>
                  )}

                  {/* Wiki Docs só aparecem se o usuário estiver buscando */}
                  {isSearching && wikiCategories.map(cat => {
                    const docsInCat = wikiActions.filter(a => a.category === cat);
                    if (docsInCat.length === 0) return null;
                    return (
                      <Command.Group key={cat} heading={cat} className="cmd-group">
                        <div className="cmd-group-heading">{cat}</div>
                        {docsInCat.map(action => renderItem(action))}
                      </Command.Group>
                    );
                  })}

                  {isSearching && (
                    <Command.Group heading="Ações & Widgets" className="cmd-group">
                      <div className="cmd-group-heading">Ações & Widgets</div>
                      {[...actions, ...dynamicCommands].map(action => renderItem(action, 'search_'))}
                    </Command.Group>
                  )}
                </>
              )}

              {page === 'file_options' && selectedFile && (
                <Command.Group heading="Opções do Documento" className="cmd-group">
                  <div className="cmd-group-heading">Onde abrir?</div>
                  
                  <Command.Item 
                    value="Abrir na Wiki (Visão Completa)" 
                    onSelect={() => openWikiFile(selectedFile.path, 'full')} 
                    className="cmd-item"
                  >
                    <span className="item-icon"><LayoutTemplate size={16} /></span>
                    Abrir na Wiki Completa
                  </Command.Item>

                  <Command.Item 
                    value="Abrir Prévia Flutuante" 
                    onSelect={() => openWikiFile(selectedFile.path, 'preview')} 
                    className="cmd-item"
                  >
                    <span className="item-icon"><CopyPlus size={16} /></span>
                    Abrir Prévia Flutuante sobre a Tela
                  </Command.Item>
                  
                </Command.Group>
              )}

            </Command.List>

            <div className="cmd-footer">
              {page === 'file_options' && <span><span className="cmd-kbd">Backspace</span> Voltar</span>}
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
