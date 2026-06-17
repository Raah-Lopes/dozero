import React, { useEffect, useState } from 'react';
import { Swords, Trash2, ChevronRight, Play, Square, Dices, Skull } from 'lucide-react';
import { state, removeCombatParticipant, nextCombatTurn, clearCombat, pushChatMessage } from '../../store';
import type { CombatParticipant } from '../../store';

export const CombatTracker: React.FC<{ isGM?: boolean }> = ({ isGM = true }) => {
  const [participants, setParticipants] = useState<CombatParticipant[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0.5rem', gap: '1rem' }}>
      
      {/* Lista de Combatentes */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
        {participants.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center', gap: '1rem', padding: '2rem' }}>
            <Swords size={48} opacity={0.2} />
            <p>Ninguém na Iniciativa.</p>
            {isGM && (
              <button 
                onClick={handleRollAll}
                style={{ 
                  padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'var(--accent-primary)', color: 'white', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(255,122,0, 0.3)'
                }}
              >
                <Dices size={18} /> Auto-Rolar do Mapa
              </button>
            )}
          </div>
        ) : (
          participants.map((p, index) => {
            const isCurrentTurn = isActive && index === turnIndex;
            const hasPlayed = isActive && index < turnIndex;

            return (
              <div 
                key={p.tokenId} 
                style={{
                  display: 'flex', alignItems: 'center', padding: '0.75rem',
                  background: isCurrentTurn ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isCurrentTurn ? 'rgba(251, 191, 36, 0.5)' : 'var(--glass-border)'}`,
                  borderRadius: '12px', gap: '1rem',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: hasPlayed ? 0.5 : 1,
                  transform: isCurrentTurn ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isCurrentTurn ? '0 0 20px rgba(251, 191, 36, 0.2)' : 'none',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Indicador de Turno Esquerdo */}
                {isCurrentTurn && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#fbbf24', boxShadow: '0 0 10px #fbbf24' }} />
                )}

                {/* Avatar */}
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  border: `2px solid ${isCurrentTurn ? '#fbbf24' : 'var(--text-secondary)'}`,
                }}>
                  <img src={p.imageUrl || '/vite.svg'} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                
                {/* Detalhes */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 'bold', color: isCurrentTurn ? '#fbbf24' : 'white', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </span>
                    <span style={{ fontWeight: '900', fontSize: '1.2rem', color: isCurrentTurn ? '#fbbf24' : 'var(--text-primary)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      {p.initiative}
                    </span>
                  </div>
                  
                  {/* Actions do Cartão (Só GM) */}
                  {isGM && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button 
                        onClick={() => removeCombatParticipant(p.tokenId)}
                        style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.4)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                        title="Remover Combatente"
                      >
                        <Skull size={10} /> Matar
                      </button>
                      <button 
                        onClick={() => {
                          if ((window as any).rollLootForNPC) {
                            (window as any).rollLootForNPC(p.name, 'Nv 3');
                          } else {
                            alert('Abra o Gerador de NPCs para carregar o Banco de Loot primeiro!');
                          }
                        }}
                        style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.3)', color: '#fcd34d', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(251,191,36,0.4)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(251,191,36,0.2)'}
                        title="Rolar Saque"
                      >
                        💰 Loot
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* GM Toolbar Base */}
      {isGM && participants.length > 0 && (
        <div style={{ 
          display: 'flex', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.4)', padding: '0.75rem', 
          borderRadius: '12px', border: '1px solid var(--glass-border)', marginTop: 'auto',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <button 
            onClick={handleToggleCombat}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', flex: 1, justifyContent: 'center',
              background: isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: isActive ? 'var(--danger)' : 'var(--success)', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s'
            }}
          >
            {isActive ? <><Square size={16} /> Parar</> : <><Play size={16} /> Iniciar</>}
          </button>

          {isActive && (
            <button 
              onClick={nextCombatTurn}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', flex: 1, justifyContent: 'center',
                background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', boxShadow: '0 0 10px rgba(255,122,0, 0.4)'
              }}
            >
              Passar <ChevronRight size={18} />
            </button>
          )}

          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={handleRollAll} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px' }} title="Re-rolar Tudo">
              <Dices size={18} color="var(--warning)" />
            </button>
            <button onClick={clearCombat} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px' }} title="Limpar Tudo">
              <Trash2 size={18} color="var(--danger)" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
