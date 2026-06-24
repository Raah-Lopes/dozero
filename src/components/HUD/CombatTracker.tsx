import React, { useEffect, useState } from 'react';
import { Swords, Trash2, ChevronRight, Play, Square, Dices, Skull, PlusCircle, Activity, Zap, Flame, Shield, Clock, Target, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { state, removeCombatParticipant, nextCombatTurn, clearCombat, pushChatMessage, addConditionToParticipant, removeConditionFromParticipant, updateTokenProps } from '../../store';
import type { CombatParticipant, CombatCondition } from '../../store';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';

// PPR Urgency triggers
const URGENCY_TRIGGERS = [
  { icon: '🏚️', label: 'Desmoronamento', msg: '⚠️ <b>PERIGO!</b> O teto começa a rachar e pedras caem sobre o campo de batalha!' },
  { icon: '🛡️', label: 'Reforços', msg: '⚠️ <b>REFORÇOS!</b> Mais inimigos surgem das sombras — o cerco se fecha!' },
  { icon: '💀', label: 'Magia Instável', msg: '⚠️ <b>MAGIA INSTÁVEL!</b> A energia arcana no ar pulsa descontrolada — cuidado!' },
  { icon: '🔥', label: 'Incêndio', msg: '⚠️ <b>INCÊNDIO!</b> Chamas se espalham pelo campo de batalha!' },
  { icon: '⏰', label: 'Contagem', msg: '⚠️ <b>CONTAGEM REGRESSIVA!</b> Vocês têm 3 turnos antes que seja tarde demais!' },
];

// PPR Transition prompt macros
const PROMPT_MACROS = [
  { label: '🗡️ Descrever Dano', template: 'O golpe acerta com força! {next}, é a sua vez — o que você faz?' },
  { label: '🌍 Narrar Ambiente', template: 'O vento sopra cinzas pelo campo... {next}, a cena está montada.' },
  { label: '💀 Morte', template: 'O corpo cai no chão com um baque surdo. {next}, como você reage?' },
  { label: '✨ Magia', template: 'Faíscas arcanas crepitam no ar... {next}, você sente a energia.' },
];

export const CombatTracker: React.FC<{ isGM?: boolean }> = ({ isGM = true }) => {
  const [participants, setParticipants] = useState<CombatParticipant[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [addingConditionTo, setAddingConditionTo] = useState<string | null>(null);
  const [tokensMap, setTokensMap] = useState<Map<string, any>>(new Map());

  // PPR State
  const [showUrgency, setShowUrgency] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [staticDamage, setStaticDamage] = useState(false);
  const [massAttackMode, setMassAttackMode] = useState(false);
  const [massAttackSelected, setMassAttackSelected] = useState<string[]>([]);
  const [customUrgency, setCustomUrgency] = useState('');
  const [timerDuration, setTimerDuration] = useState(0);
  const [showStakes, setShowStakes] = useState(false);
  const [stakesSuccess, setStakesSuccess] = useState('');
  const [stakesFailure, setStakesFailure] = useState('');

  useEffect(() => {
    const observer = () => {
      setParticipants(state.combat.get('participants') as CombatParticipant[] || []);
      setTurnIndex(state.combat.get('turnIndex') as number || 0);
      setIsActive(state.combat.get('isActive') as boolean || false);
    };
    const tokenObserver = () => setTokensMap(new Map(state.tokens));

    state.combat.observe(observer);
    state.tokens.observe(tokenObserver);
    observer();
    tokenObserver();
    return () => { state.combat.unobserve(observer); state.tokens.unobserve(tokenObserver); };
  }, []);

  const adjustHP = async (tokenId: string, amount: number) => {
    const token = state.tokens.get(tokenId) as any;
    if (!token) return;
    const newHp = Math.max(0, (token.hp ?? 0) + amount);
    updateTokenProps(tokenId, { hp: newHp });
    if (token.wikiPath) await syncTokenFieldToWiki(token.wikiPath, 'hp', newHp);
  };

  const handleToggleCombat = () => {
    const next = !isActive;
    state.combat.set('isActive', next);
    if (next && timerDuration > 0) {
      state.combat.set('timerStart', Date.now());
      state.combat.set('timerDuration', timerDuration);
      state.combat.set('timerPaused', false);
    }
  };

  const handleNextTurn = () => {
    nextCombatTurn();
    if (timerDuration > 0) { state.combat.set('timerStart', Date.now()); state.combat.set('timerPaused', false); }
  };

  const handleRollAll = () => {
    const tokens = Array.from(state.tokens.values() as Iterable<any>);
    if (tokens.length === 0) return;
    const newP: CombatParticipant[] = tokens.map(t => ({
      tokenId: t.id, name: t.name || 'Desconhecido', initiative: Math.floor(Math.random() * 20) + 1, imageUrl: t.imageUrl,
    }));
    newP.sort((a, b) => b.initiative - a.initiative);
    state.combat.set('participants', newP);
    state.combat.set('turnIndex', 0);
    pushChatMessage(`<b>Iniciativa Automática</b> rolada para ${tokens.length} personagens!`, false, false);
  };

  const sendUrgency = (msg: string) => pushChatMessage(msg, true, false);
  const sendPrompt = () => { if (!promptText.trim()) return; pushChatMessage(`🎭 <i>${promptText}</i>`, false, false); setPromptText(''); };

  const toggleMinion = (tokenId: string) => {
    const parts = (state.combat.get('participants') as CombatParticipant[]) || [];
    state.combat.set('participants', parts.map(p => p.tokenId === tokenId ? (p.minionMaxHits ? { ...p, minionHits: undefined, minionMaxHits: undefined } : { ...p, minionHits: 2, minionMaxHits: 2 }) : p));
  };

  const hitMinion = (tokenId: string) => {
    const parts = (state.combat.get('participants') as CombatParticipant[]) || [];
    state.combat.set('participants', parts.map(p => {
      if (p.tokenId !== tokenId || p.minionHits === undefined) return p;
      const h = Math.max(0, p.minionHits - 1);
      if (h === 0) pushChatMessage(`💀 <b>${p.name}</b> (Lacaio) foi eliminado!`, true, false);
      return { ...p, minionHits: h };
    }));
  };

  const toggleMassSelect = (id: string) => setMassAttackSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const executeMassAttack = () => {
    if (massAttackSelected.length === 0) return;
    const results = massAttackSelected.map(id => {
      const p = participants.find(pp => pp.tokenId === id);
      const t = tokensMap.get(id);
      if (!p || !t) return '';
      const roll = Math.floor(Math.random() * 20) + 1;
      const def = t.defesa ?? 10;
      return `${p.name}: <b>${roll}</b> vs CA ${def} ${roll >= def ? '✅' : '❌'}`;
    }).filter(Boolean);
    pushChatMessage(`⚔️ <b>Ataque em Massa</b><br/>${results.join('<br/>')}`, false, false);
    setMassAttackSelected([]); setMassAttackMode(false);
  };

  const launchClimaxRoll = () => {
    state.combat.set('climax', { active: true, stakes: { success: stakesSuccess || 'Sucesso!', failure: stakesFailure || 'Falha!' }, result: null });
    setShowStakes(false); setStakesSuccess(''); setStakesFailure('');
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const result = roll >= 10 ? 'success' : 'failure';
      const climax = state.combat.get('climax') as any;
      if (climax?.active) {
        state.combat.set('climax', { ...climax, result });
        pushChatMessage(`🎲 <b>Rolagem Climática:</b> ${roll} → ${result === 'success' ? `✅ ${climax.stakes?.success}` : `❌ ${climax.stakes?.failure}`}`, result === 'success', result === 'failure');
      }
    }, 2500);
  };

  const nextTurnName = isActive && participants[turnIndex + 1] ? participants[turnIndex + 1].name : (participants[0]?.name || '???');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0.5rem', gap: '0.75rem' }}>
      
      {/* Lista de Combatentes */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
        {participants.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center', gap: '1rem', padding: '2rem' }}>
            <Swords size={48} opacity={0.2} />
            <p>Ninguém na Iniciativa.</p>
            {isGM && (
              <button onClick={handleRollAll} style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(255,122,0, 0.3)' }}>
                <Dices size={18} /> Auto-Rolar do Mapa
              </button>
            )}
          </div>
        ) : (
          participants.map((p, index) => {
            const isCurrentTurn = isActive && index === turnIndex;
            const isNextTurn = isActive && ((index === turnIndex + 1) || (turnIndex === participants.length - 1 && index === 0));
            const hasPlayed = isActive && index < turnIndex;
            const isMinion = p.minionMaxHits !== undefined;
            const isMassSelected = massAttackSelected.includes(p.tokenId);

            return (
              <div key={p.tokenId} onClick={massAttackMode ? () => toggleMassSelect(p.tokenId) : undefined}
                style={{
                  display: 'flex', alignItems: 'center', padding: '0.75rem',
                  background: isMassSelected ? 'rgba(239,68,68,0.2)' : isCurrentTurn ? 'rgba(251,191,36,0.15)' : isNextTurn ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isMassSelected ? 'rgba(239,68,68,0.5)' : isCurrentTurn ? 'rgba(251,191,36,0.5)' : isNextTurn ? 'rgba(59,130,246,0.3)' : 'var(--glass-border)'}`,
                  borderRadius: '12px', gap: '1rem', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                  opacity: hasPlayed ? 0.5 : 1, transform: isCurrentTurn ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isCurrentTurn ? '0 0 20px rgba(251,191,36,0.2)' : isNextTurn ? '0 0 12px rgba(59,130,246,0.15)' : 'none',
                  position: 'relative', overflow: 'hidden', cursor: massAttackMode ? 'pointer' : 'default',
                }}
              >
                {isCurrentTurn && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#fbbf24', boxShadow: '0 0 10px #fbbf24' }} />}
                {isNextTurn && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6', animation: 'pprPulse 1.5s ease-in-out infinite' }} />}

                <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${isCurrentTurn ? '#fbbf24' : isNextTurn ? '#3b82f6' : 'var(--text-secondary)'}`, boxShadow: isNextTurn ? '0 0 10px rgba(59,130,246,0.4)' : 'none' }}>
                  <img src={p.imageUrl || '/vite.svg'} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 'bold', color: isCurrentTurn ? '#fbbf24' : isNextTurn ? '#60a5fa' : 'white', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                      {isNextTurn && <span style={{ fontSize: '0.65rem', marginLeft: '6px', color: '#60a5fa', fontWeight: 600 }}>EM ESPERA</span>}
                    </span>
                    <span style={{ fontWeight: '900', fontSize: '1.2rem', color: isCurrentTurn ? '#fbbf24' : 'var(--text-primary)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{p.initiative}</span>
                  </div>

                  {isMinion ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 'bold' }}>LACAIO</span>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {Array.from({ length: p.minionMaxHits! }).map((_, i) => (
                          <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', background: i < (p.minionHits ?? 0) ? '#ef4444' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: i < (p.minionHits ?? 0) ? '0 0 6px rgba(239,68,68,0.5)' : 'none', transition: 'all 0.3s' }} />
                        ))}
                      </div>
                      {isGM && (p.minionHits ?? 0) > 0 && (
                        <button onClick={() => hitMinion(p.tokenId)} style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '4px', padding: '1px 6px', fontSize: '9px', cursor: 'pointer', fontWeight: 'bold' }}>HIT!</button>
                      )}
                    </div>
                  ) : tokensMap.has(p.tokenId) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 'bold' }}>HP: {tokensMap.get(p.tokenId).hp ?? 0}/{tokensMap.get(p.tokenId).maxHp ?? 1}</span>
                      <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 'bold' }}>PM: {tokensMap.get(p.tokenId).mana ?? 0}/{tokensMap.get(p.tokenId).maxMana ?? 0}</span>
                      <span style={{ fontSize: '0.75rem', color: '#d1d5db', fontWeight: 'bold' }}>🛡️ {tokensMap.get(p.tokenId).defesa ?? 0}</span>
                    </div>
                  )}

                  {isGM && !isMinion && tokensMap.has(p.tokenId) && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <button onClick={() => adjustHP(p.tokenId, -5)} style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>-5 HP</button>
                      <button onClick={() => adjustHP(p.tokenId, -1)} style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>-1 HP</button>
                      <button onClick={() => adjustHP(p.tokenId, 1)} style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>+1 HP</button>
                      <button onClick={() => adjustHP(p.tokenId, 5)} style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>+5 HP</button>
                    </div>
                  )}
                  
                  {p.conditions && p.conditions.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {p.conditions.map(c => (
                        <div key={c.id} style={{ fontSize: '0.7rem', background: c.type === 'damage' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: c.type === 'damage' ? '#fca5a5' : '#6ee7b7', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', border: c.type === 'damage' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)' }}>
                          {c.type === 'damage' ? '🩸' : '💚'} {c.name} ({c.durationTurns}t)
                          {isGM && <button onClick={() => removeConditionFromParticipant(p.tokenId, c.id)} style={{ background: 'transparent', border: 'none', color: 'inherit', padding: 0, marginLeft: '2px', cursor: 'pointer' }}>×</button>}
                        </div>
                      ))}
                    </div>
                  )}

                  {isGM && !massAttackMode && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => removeCombatParticipant(p.tokenId)} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}><Skull size={10} /> Matar</button>
                      <button onClick={() => { if ((window as any).rollLootForNPC) (window as any).rollLootForNPC(p.name, 'Nv 3'); else alert('Abra o Gerador de NPCs!'); }} style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.3)', color: '#fcd34d', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>💰 Loot</button>
                      <button onClick={() => setAddingConditionTo(addingConditionTo === p.tokenId ? null : p.tokenId)} style={{ background: addingConditionTo === p.tokenId ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)', color: '#d8b4fe', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}><PlusCircle size={10} /> Status</button>
                      <button onClick={() => toggleMinion(p.tokenId)} style={{ background: isMinion ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isMinion ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'}`, color: isMinion ? '#fcd34d' : '#94a3b8', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}><Target size={10} /> {isMinion ? 'Normal' : 'Lacaio'}</button>
                    </div>
                  )}

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

      {/* PPR: Painel de Urgência */}
      {isGM && isActive && showUrgency && (
        <div style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12} /> GATILHOS DE URGÊNCIA</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {URGENCY_TRIGGERS.map((t, i) => (
              <button key={i} onClick={() => sendUrgency(t.msg)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>{t.icon} {t.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input value={customUrgency} onChange={e => setCustomUrgency(e.target.value)} placeholder="Urgência customizada..." style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '4px 8px', color: '#f1f5f9', fontSize: '11px', outline: 'none' }} />
            <button onClick={() => { if (customUrgency.trim()) { sendUrgency(`⚠️ <b>PERIGO!</b> ${customUrgency}`); setCustomUrgency(''); } }} style={{ background: 'rgba(239,68,68,0.3)', border: 'none', color: '#fca5a5', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}><Send size={12} /></button>
          </div>
        </div>
      )}

      {/* PPR: Prompts de Transição */}
      {isGM && isActive && showPrompts && (
        <div style={{ padding: '8px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}><MessageSquare size={12} /> TRANSIÇÃO NARRATIVA</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {PROMPT_MACROS.map((m, i) => (
              <button key={i} onClick={() => setPromptText(m.template.replace('{next}', nextTurnName))} style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>{m.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input value={promptText} onChange={e => setPromptText(e.target.value)} placeholder="Narração do mestre..." style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '4px 8px', color: '#f1f5f9', fontSize: '11px', outline: 'none' }} onKeyDown={e => e.key === 'Enter' && sendPrompt()} />
            <button onClick={sendPrompt} style={{ background: 'rgba(59,130,246,0.3)', border: 'none', color: '#93c5fd', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}><Send size={12} /></button>
          </div>
        </div>
      )}

      {/* PPR: Stakes / Climax */}
      {isGM && showStakes && (
        <div style={{ padding: '10px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#d8b4fe' }}>🎲 Rolagem Climática — Defina as Consequências</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#6ee7b7', marginBottom: '3px' }}>✅ SUCESSO</div>
              <input value={stakesSuccess} onChange={e => setStakesSuccess(e.target.value)} placeholder="O que acontece?" style={{ width: '100%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '6px 8px', color: '#f1f5f9', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#fca5a5', marginBottom: '3px' }}>❌ FALHA</div>
              <input value={stakesFailure} onChange={e => setStakesFailure(e.target.value)} placeholder="O que acontece?" style={{ width: '100%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '6px 8px', color: '#f1f5f9', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <button onClick={launchClimaxRoll} style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(236,72,153,0.4))', border: '1px solid rgba(168,85,247,0.5)', color: 'white', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>🎲 ROLAR COM CONSEQUÊNCIAS!</button>
        </div>
      )}

      {/* GM Toolbar */}
      {isGM && participants.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
          {isActive && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button onClick={() => { setShowUrgency(!showUrgency); setShowPrompts(false); setShowStakes(false); }} style={{ flex: 1, background: showUrgency ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '5px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Zap size={12} /> Urgência</button>
              <button onClick={() => { setShowPrompts(!showPrompts); setShowUrgency(false); setShowStakes(false); }} style={{ flex: 1, background: showPrompts ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', padding: '5px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><MessageSquare size={12} /> Narrar</button>
              <button onClick={() => { setShowStakes(!showStakes); setShowUrgency(false); setShowPrompts(false); }} style={{ flex: 1, background: showStakes ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#d8b4fe', padding: '5px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Flame size={12} /> Clímax</button>
              <button onClick={() => { setMassAttackMode(!massAttackMode); setMassAttackSelected([]); }} style={{ flex: 1, background: massAttackMode ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fcd34d', padding: '5px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Swords size={12} /> Massa</button>
            </div>
          )}

          {massAttackMode && massAttackSelected.length > 0 && (
            <button onClick={executeMassAttack} style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.4), rgba(251,191,36,0.4))', border: '1px solid rgba(251,191,36,0.5)', color: 'white', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>⚔️ ATACAR {massAttackSelected.length} ALVOS!</button>
          )}

          {isActive && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <Clock size={12} color="#64748b" />
              <span style={{ fontSize: '10px', color: '#64748b' }}>Timer:</span>
              {[0, 30, 60, 90].map(s => (
                <button key={s} onClick={() => { setTimerDuration(s * 1000); if (s > 0) { state.combat.set('timerStart', Date.now()); state.combat.set('timerDuration', s * 1000); state.combat.set('timerPaused', false); } else { state.combat.set('timerDuration', 0); } }} style={{ background: timerDuration === s * 1000 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: timerDuration === s * 1000 ? '#f1f5f9' : '#64748b', borderRadius: '4px', padding: '2px 6px', fontSize: '9px', cursor: 'pointer', fontWeight: 600 }}>{s === 0 ? 'Off' : `${s}s`}</button>
              ))}
              <button onClick={() => { setStaticDamage(!staticDamage); pushChatMessage(`🎯 Dano Fixo: ${!staticDamage ? 'ATIVADO' : 'DESATIVADO'}`, false, false); }} style={{ marginLeft: 'auto', background: staticDamage ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${staticDamage ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'}`, color: staticDamage ? '#fcd34d' : '#64748b', borderRadius: '4px', padding: '2px 6px', fontSize: '9px', cursor: 'pointer', fontWeight: 600 }}>🎯 Dano Fixo</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--glass-border)', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={handleToggleCombat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', flex: 1, justifyContent: 'center', background: isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: isActive ? 'var(--danger)' : 'var(--success)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s' }}>
              {isActive ? <><Square size={16} /> Parar</> : <><Play size={16} /> Iniciar</>}
            </button>
            {isActive && (
              <button onClick={handleNextTurn} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', flex: 1, justifyContent: 'center', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', boxShadow: '0 0 10px rgba(255,122,0, 0.4)' }}>
                Passar <ChevronRight size={18} />
              </button>
            )}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={handleRollAll} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px' }} title="Re-rolar Tudo"><Dices size={18} color="var(--warning)" /></button>
              <button onClick={clearCombat} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px' }} title="Limpar Tudo"><Trash2 size={18} color="var(--danger)" /></button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pprPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
    </div>
  );
};
