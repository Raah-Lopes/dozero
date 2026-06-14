import React, { useEffect, useState } from 'react';
import { Swords, Trash2, ChevronRight, Play, Square, Dices } from 'lucide-react';
import { state, removeCombatParticipant, nextCombatTurn, clearCombat, pushChatMessage } from '../../store';
import type { CombatParticipant } from '../../store';

export const CombatTracker: React.FC<{ isGM?: boolean }> = ({ isGM = true }) => {
  const [participants, setParticipants] = useState<CombatParticipant[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const observer = () => {
      setParticipants(state.combat.get('participants') as CombatParticipant[] || []);
      setTurnIndex(state.combat.get('turnIndex') as number || 0);
      setIsActive(state.combat.get('isActive') as boolean || false);
    };

    state.combat.observe(observer);
    observer(); // initial load

    return () => {
      state.combat.unobserve(observer);
    };
  }, []);

  const handleToggleCombat = () => {
    state.combat.set('isActive', !isActive);
  };

  const handleRollAll = () => {
    const tokens = Array.from(state.tokens.values() as Iterable<any>);
    if (tokens.length === 0) return;

    let newParticipants: CombatParticipant[] = [];
    tokens.forEach(t => {
      const roll = Math.floor(Math.random() * 20) + 1; // 1d20
      newParticipants.push({
        tokenId: t.id,
        name: t.name || 'Desconhecido',
        initiative: roll,
        imageUrl: t.imageUrl
      });
    });

    newParticipants.sort((a, b) => b.initiative - a.initiative);
    state.combat.set('participants', newParticipants);
    state.combat.set('turnIndex', 0);
    pushChatMessage(`<b>Iniciativa Automática</b> rolada para ${tokens.length} personagens!`, false, false);
  };

  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* Ribbon Track */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: participants.length > 0 ? 'rgba(0,0,0,0.4)' : 'transparent', padding: '0.5rem 1.5rem', borderRadius: '50px', backdropFilter: 'blur(8px)', border: participants.length > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
        {participants.length === 0 ? (
          isGM ? (
            <button 
              onClick={handleRollAll}
              style={{ 
                padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(234, 179, 8, 0.2)', color: 'var(--warning)', border: '1px solid rgba(234, 179, 8, 0.4)',
                borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', backdropFilter: 'blur(10px)', boxShadow: '0 0 15px rgba(234, 179, 8, 0.2)'
              }}
            >
              <Dices size={16} /> Rolar Iniciativa para Todos
            </button>
          ) : null
        ) : (
          participants.map((p, index) => {
            const isCurrentTurn = isActive && index === turnIndex;
            const hasPlayed = isActive && index < turnIndex;

            return (
              <div 
                key={p.tokenId} 
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  opacity: hasPlayed ? 0.4 : 1,
                  transform: isCurrentTurn ? 'scale(1.3) translateY(10px)' : 'scale(1)',
                  zIndex: isCurrentTurn ? 10 : 1,
                  margin: isCurrentTurn ? '0 1rem' : '0'
                }}
              >
                {/* Initiative Number */}
                <div style={{ 
                  position: 'absolute', top: '-8px', right: '-8px',
                  width: isCurrentTurn ? '24px' : '20px', 
                  height: isCurrentTurn ? '24px' : '20px', 
                  borderRadius: '50%', 
                  background: isCurrentTurn ? 'var(--warning)' : 'var(--background-darker)', 
                  border: `2px solid ${isCurrentTurn ? '#fff' : 'var(--text-secondary)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isCurrentTurn ? '0.8rem' : '0.65rem', 
                  fontWeight: 'bold', 
                  color: isCurrentTurn ? '#000' : 'var(--text-primary)',
                  zIndex: 2, transition: 'all 0.3s'
                }}>
                  {p.initiative}
                </div>

                {/* Avatar */}
                <div style={{
                  width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden',
                  border: `3px solid ${isCurrentTurn ? 'var(--warning)' : 'var(--glass-border)'}`,
                  boxShadow: isCurrentTurn ? '0 10px 25px rgba(234, 179, 8, 0.6)' : '0 4px 6px rgba(0,0,0,0.3)',
                  transition: 'all 0.3s'
                }}>
                  <img src={p.imageUrl || (p.tokenId === 'omega_sentinel' ? '/omega_sentinel.png' : '/vite.svg')} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                
                {/* Name (Only visible if hovered or is current turn) */}
                <span style={{ 
                  position: 'absolute', bottom: '-25px',
                  fontSize: '0.75rem', fontWeight: 'bold', 
                  color: isCurrentTurn ? 'var(--warning)' : 'white', 
                  textShadow: '0 2px 4px black',
                  whiteSpace: 'nowrap', opacity: (isHovered || isCurrentTurn) ? 1 : 0,
                  transition: 'opacity 0.2s', pointerEvents: 'none'
                }}>
                  {p.name}
                </span>
                
                {/* Remove Button */}
                {isGM && isHovered && (
                  <button 
                    onClick={() => removeCombatParticipant(p.tokenId)} 
                    style={{ 
                      position: 'absolute', top: 0, left: '-10px', 
                      background: 'rgba(239, 68, 68, 0.9)', border: '1px solid white', color: 'white', 
                      borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', padding: 0, zIndex: 5, boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                    }}
                    title="Remover"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* GM Toolbar (Floats below Ribbon, visible only when active or hovered) */}
      {isGM && participants.length > 0 && (
        <div style={{ 
          display: 'flex', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.5rem 1rem', 
          borderRadius: '20px', backdropFilter: 'blur(4px)', border: '1px solid var(--glass-border)',
          opacity: isHovered || !isActive ? 1 : 0, transform: isHovered || !isActive ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'all 0.3s', pointerEvents: isHovered || !isActive ? 'auto' : 'none',
          marginTop: '1.5rem'
        }}>
          <button 
            onClick={handleRollAll}
            className="btn-icon"
            style={{ color: 'var(--warning)' }}
            title="Rolar Todos Novamente"
          >
            <Dices size={18} />
          </button>

          <div style={{ width: '1px', height: '100%', background: 'rgba(255,255,255,0.2)' }} />

          <button 
            onClick={handleToggleCombat}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem',
              background: isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: isActive ? 'var(--danger)' : 'var(--success)', border: 'none', borderRadius: '15px',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem'
            }}
          >
            {isActive ? <><Square size={14} /> Parar</> : <><Play size={14} /> Iniciar</>}
          </button>

          {isActive && (
            <button 
              onClick={nextCombatTurn}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem',
                background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '15px',
                cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '0 0 10px rgba(168, 85, 247, 0.4)'
              }}
            >
              Próximo <ChevronRight size={16} />
            </button>
          )}

          <div style={{ width: '1px', height: '100%', background: 'rgba(255,255,255,0.2)' }} />

          <button 
            onClick={clearCombat}
            className="btn-icon"
            title="Limpar Iniciativa"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
