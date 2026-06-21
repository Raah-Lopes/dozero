import React, { useEffect, useState } from 'react';
// @ts-ignore - auto fix
import { Swords, Trash2, ChevronRight, Play, Square, Dices, Skull, PlusCircle, Activity } from 'lucide-react';
import { state, removeCombatParticipant, nextCombatTurn, clearCombat, pushChatMessage, addConditionToParticipant, removeConditionFromParticipant, updateTokenProps } from '../../store';
// @ts-ignore - auto fix
import type { CombatParticipant, CombatCondition } from '../../store';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';

export const CombatTracker: React.FC<{ isGM?: boolean }> = ({ isGM = true }) => {
  const [participants, setParticipants] = useState<CombatParticipant[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [addingConditionTo, setAddingConditionTo] = useState<string | null>(null);
  const [tokensMap, setTokensMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const observer = () => {
      setParticipants(state.combat.get('participants') as CombatParticipant[] || []);
      setTurnIndex(state.combat.get('turnIndex') as number || 0);
      setIsActive(state.combat.get('isActive') as boolean || false);
    };

    const tokenObserver = () => {
      setTokensMap(new Map(state.tokens));
    };

    state.combat.observe(observer);
    state.tokens.observe(tokenObserver);
    observer(); // initial load
    tokenObserver();

    return () => {
      state.combat.unobserve(observer);
      state.tokens.unobserve(tokenObserver);
    };
  }, []);

  const adjustHP = async (tokenId: string, amount: number) => {
    const token = state.tokens.get(tokenId) as any;
    if (!token) return;
    const currentHp = token.hp ?? 0;
    const newHp = Math.max(0, currentHp + amount);
    updateTokenProps(tokenId, { hp: newHp });
    if (token.wikiPath) {
      await syncTokenFieldToWiki(token.wikiPath, 'hp', newHp);
    }
  };

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

                  {/* Status do Token (HP, PM, Defesa) */}
                  {tokensMap.has(p.tokenId) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 'bold' }}>HP: {tokensMap.get(p.tokenId).hp ?? 0}/{tokensMap.get(p.tokenId).maxHp ?? 1}</span>
                      <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 'bold' }}>PM: {tokensMap.get(p.tokenId).mana ?? 0}/{tokensMap.get(p.tokenId).maxMana ?? 0}</span>
                      <span style={{ fontSize: '0.75rem', color: '#d1d5db', fontWeight: 'bold' }}>🛡️ {tokensMap.get(p.tokenId).defesa ?? 0}</span>
                    </div>
                  )}

                  {/* Botões Rápidos HP (Só GM) */}
                  {isGM && tokensMap.has(p.tokenId) && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <button onClick={() => adjustHP(p.tokenId, -5)} style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>-5 HP</button>
                      <button onClick={() => adjustHP(p.tokenId, -1)} style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>-1 HP</button>
                      <button onClick={() => adjustHP(p.tokenId, 1)} style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>+1 HP</button>
                      <button onClick={() => adjustHP(p.tokenId, 5)} style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>+5 HP</button>
                    </div>
                  )}
                  
                  {/* Condições Ativas */}
                  {p.conditions && p.conditions.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {p.conditions.map(c => (
                        <div key={c.id} style={{ fontSize: '0.7rem', background: c.type === 'damage' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: c.type === 'damage' ? '#fca5a5' : '#6ee7b7', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', border: c.type === 'damage' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)' }}>
                          {c.type === 'damage' ? '🩸' : '💚'} {c.name} ({c.durationTurns}t)
                          {isGM && (
                            <button onClick={() => removeConditionFromParticipant(p.tokenId, c.id)} style={{ background: 'transparent', border: 'none', color: 'inherit', padding: 0, marginLeft: '2px', cursor: 'pointer' }}>×</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions do Cartão (Só GM) */}
                  {isGM && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
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
                      <button 
                        onClick={() => setAddingConditionTo(addingConditionTo === p.tokenId ? null : p.tokenId)}
                        style={{ background: addingConditionTo === p.tokenId ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)', color: '#d8b4fe', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(168,85,247,0.4)'}
                        onMouseOut={e => { if (addingConditionTo !== p.tokenId) e.currentTarget.style.background = 'rgba(168,85,247,0.2)' }}
                        title="Adicionar Status"
                      >
                        <PlusCircle size={10} /> Status
                      </button>
                    </div>
                  )}

                  {/* Formulário de Adição de Status */}
                  {addingConditionTo === p.tokenId && (
                    <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(168,85,247,0.3)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#d8b4fe', marginBottom: '4px', fontWeight: 'bold' }}>Novo Status</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button onClick={() => { addConditionToParticipant(p.tokenId, { id: Date.now().toString(), name: 'Sangramento', durationTurns: 3, type: 'damage', value: 5 }); setAddingConditionTo(null); }} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(239,68,68,0.3)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🩸 Sangramento (3t/5d)</button>
                        <button onClick={() => { addConditionToParticipant(p.tokenId, { id: Date.now().toString(), name: 'Veneno', durationTurns: 5, type: 'damage', value: 2 }); setAddingConditionTo(null); }} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(16,185,129,0.3)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>☠️ Veneno (5t/2d)</button>
                        <button onClick={() => { addConditionToParticipant(p.tokenId, { id: Date.now().toString(), name: 'Regeneração', durationTurns: 3, type: 'heal', value: 5 }); setAddingConditionTo(null); }} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(59,130,246,0.3)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>💚 Regeneração (3t/5c)</button>
                      </div>
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
