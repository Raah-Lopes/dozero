import React, { useEffect, useState } from 'react';
import { state } from '../../store';
import { UserPlus, GripVertical } from 'lucide-react';

export const NPCPanel: React.FC = () => {
  const [tokens, setTokens] = useState<any[]>([]);

  useEffect(() => {
    const observer = () => {
      const allTokens = Array.from(state.tokens.values());
      setTokens(allTokens);
    };

    state.tokens.observe(observer);
    observer();

    return () => state.tokens.unobserve(observer);
  }, []);

  const createNewCharacter = () => {
    const id = 'npc_' + Date.now() + Math.random().toString(36).substr(2, 5);
    state.tokens.set(id, {
      id,
      name: 'Novo NPC',
      hp: 10,
      maxHp: 10,
      mana: 0,
      maxMana: 0,
      x: -9999, // Off-screen initially
      y: -9999
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, tokenId: string) => {
    e.dataTransfer.setData('tokenId', tokenId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Atores & NPCs</h3>
        <button onClick={createNewCharacter} className="btn-icon" title="Criar Personagem" style={{ background: 'var(--accent-primary)', color: 'white', border: 'none' }}>
          <UserPlus size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
        {tokens.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nenhum ator criado.</p>}
        {tokens.map(token => (
          <div 
            key={token.id}
            draggable
            onDragStart={(e) => handleDragStart(e, token.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)',
              cursor: 'grab', border: '1px solid transparent', transition: 'border 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.border = '1px solid var(--accent-primary)'}
            onMouseOut={e => e.currentTarget.style.border = '1px solid transparent'}
            title="Arraste para o mapa!"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GripVertical size={14} color="var(--text-secondary)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{token.name}</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>HP {token.hp}/{token.maxHp}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
