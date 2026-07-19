import React, { useState, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { state } from '../../../services/yjs';
import { User, Shield, Activity, Edit2, Palette } from 'lucide-react';

export const PlayerManagerWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [players, setPlayers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    const updatePlayers = () => {
      const pList: any[] = [];
      state.players.forEach((val, key) => {
        pList.push({ id: key, ...(val as any) });
      });
      setPlayers(pList);
    };
    state.players.observe(updatePlayers);
    updatePlayers();
    return () => state.players.unobserve(updatePlayers);
  }, []);

  const handleSave = (id: string) => {
    const current = state.players.get(id) as any;
    if (current) {
      state.players.set(id, { ...current, name: editName, color: editColor });
    }
    setEditingId(null);
  };

  return (
    <DraggableWindow id="player_manager" widgetKey="playerManager" title="👑 Controle de Jogadores (Mestre)" onClose={onClose} initialX={100} initialY={100} width={400} height={350}>
      <div style={{ padding: '15px', color: 'var(--text-primary)' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Gerencie as identidades de todos os jogadores conectados. As alterações aqui refletem instantaneamente no chat e nos navegadores deles.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {players.length === 0 && (
            <div style={{ textAlign: 'center', color: 'gray', padding: '2rem' }}>
              Nenhum jogador conectado no momento.
            </div>
          )}
          {players.map((p) => (
            <div key={p.id} style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: p.isOnline ? 'var(--success)' : 'var(--danger)',
                boxShadow: `0 0 5px ${p.isOnline ? 'var(--success)' : 'var(--danger)'}`
              }} title={p.isOnline ? 'Online' : 'Offline'} />

              {editingId === p.id ? (
                <div style={{ flex: 1, display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.5)', color: editColor || 'white', fontWeight: 'bold' }}
                    autoFocus
                  />
                  <button onClick={() => handleSave(p.id)} style={{ padding: '4px 8px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.75rem' }}>
                    Salvar
                  </button>
                  <button onClick={() => setEditingId(null)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '4px', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem' }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, fontWeight: 'bold', color: p.color || 'white' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    ID: {p.id.substring(0, 4)}...
                  </div>
                  <button 
                    onClick={() => {
                      setEditingId(p.id);
                      setEditName(p.name);
                      setEditColor(p.color || '#a855f7');
                    }}
                    title="Forçar Nome/Cor"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    <Edit2 size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </DraggableWindow>
  );
};
