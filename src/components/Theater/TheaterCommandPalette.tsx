import React, { useState, useEffect, useRef } from 'react';
import { Search, Dice5, UserPlus, Trash2, Map } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';

export const TheaterCommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { currentScene, patchCurrentScene } = useSceneState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const roll = (label: string, notation: string) => {
    const parts = notation.match(/(\d+)d(\d+)([+-]\d+)?/i);
    if (!parts) return;
    const num = parseInt(parts[1]);
    const sides = parseInt(parts[2]);
    const mod = parseInt(parts[3] || '0');
    const rolls = Array.from({ length: num }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0) + mod;
    const msg = `🎲 ${notation}: [${rolls.join(', ')}]${mod !== 0 ? (mod > 0 ? '+' + mod : mod) : ''} = **${total}**`;
    // ponytail: importações dinâmicas evitam dependência circular com store
    import('../../store').then(({ pushChatMessage, addTheaterDiaryEntry }) => {
      pushChatMessage(msg, total >= sides * num * 0.85, total <= num);
      addTheaterDiaryEntry({ timestamp: Date.now(), type: 'combat', text: msg });
    });
    window.dispatchEvent(new CustomEvent('theater-dice-result', {
      detail: { label, notation, rolls, modifier: mod, total, maxPossible: sides * num + mod }
    }));
  };

  const actions = [
    {
      id: 'roll_d20',
      label: 'Rolar 1d20',
      icon: <Dice5 size={14} />,
      execute: () => roll('1d20', '1d20'),
    },
    {
      id: 'roll_2d6',
      label: 'Rolar 2d6',
      icon: <Dice5 size={14} />,
      execute: () => roll('2d6', '2d6'),
    },
    {
      id: 'add_token',
      label: 'Adicionar Token Rápido',
      icon: <UserPlus size={14} />,
      execute: () => {
        if (!currentScene) return;
        const newProp = {
          id: `prop_${Date.now()}`,
          type: 'token' as const,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          label: 'Novo',
          x: window.innerWidth / 2 - 40,
          y: window.innerHeight / 2 - 40,
          width: 80,
          height: 80,
          zIndex: (currentScene.props?.length || 0) + 1
        };
        patchCurrentScene({ props: [...(currentScene.props || []), newProp] });
      }
    },
    {
      id: 'clear_props',
      label: 'Limpar todos os Props do Palco',
      icon: <Trash2 size={14} />,
      execute: () => {
        if (!currentScene) return;
        if (confirm('Limpar o palco?')) {
          patchCurrentScene({ props: [] });
        }
      }
    },
    {
      id: 'change_bg',
      label: 'Alterar Imagem de Fundo (URL)',
      icon: <Map size={14} />,
      execute: () => {
        if (!currentScene) return;
        const url = prompt('URL da Imagem:');
        if (url) {
          patchCurrentScene({ imageUrl: url });
        }
      }
    }
  ];

  const filtered = actions.filter(a => a.label.toLowerCase().includes(search.toLowerCase()));

  const handleExecute = (action: typeof actions[0]) => {
    action.execute();
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleExecute(filtered[selectedIndex]);
      }
    }
  };

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh',
        backdropFilter: 'blur(2px)'
      }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        style={{
          width: '500px', maxWidth: '90%', background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Search size={18} color="#94a3b8" />
          <input
            ref={inputRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Digite um comando... (ex: rolar)"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'white', fontSize: '1rem', marginLeft: '12px'
            }}
          />
          <div style={{ fontSize: '0.6rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>ESC para fechar</div>
        </div>

        <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              Nenhum comando encontrado.
            </div>
          ) : (
            filtered.map((action, idx) => (
              <div
                key={action.id}
                onClick={() => handleExecute(action)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
                  background: selectedIndex === idx ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: selectedIndex === idx ? 'white' : '#cbd5e1',
                  cursor: 'pointer', borderLeft: selectedIndex === idx ? '3px solid #818cf8' : '3px solid transparent'
                }}
              >
                {action.icon}
                <span style={{ fontSize: '0.9rem' }}>{action.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
