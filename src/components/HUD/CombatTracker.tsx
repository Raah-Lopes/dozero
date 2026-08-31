import React, { useEffect, useState, useRef } from 'react';
import { Tokens } from '../../store/modules';
import { Swords, Trash2, ChevronRight, Play, Square, Dices, Skull, PlusCircle, Activity, Zap, Flame, Shield, Clock, Target, MessageSquare, Send, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { state, removeCombatParticipant, nextCombatTurn, clearCombat, pushChatMessage, addConditionToParticipant, removeConditionFromParticipant, updateTokenProps } from '../../store';
import type { CombatParticipant, CombatCondition } from '../../store';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';
import { saveCombatEncounter } from '../../services/encounterCloudService';
import { tokensInsideDrawingShapes } from '../../engine/utils/drawingGeometry';

import { toast } from '../UI/Toast';
import { Tooltip } from '../UI/Tooltip';

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

const CombatParticipantRow = React.memo(({ p, index, isActive, turnIndex, isGM, tokensMap, massAttackMode, massAttackSelected, toggleMassSelect, addingConditionTo, setAddingConditionTo, hitMinion, toggleMinion, toggleAction, removeConditionFromParticipant, removeCombatParticipant, adjustHP, addConditionToParticipant }: any) => {
  const isCurrentTurn = isActive && index === turnIndex;
  const isNextTurn = isActive && ((index === turnIndex + 1) || (turnIndex === tokensMap.size - 1 && index === 0)); // Simplified
  const hasPlayed = isActive && index < turnIndex;
  const isMinion = p.minionMaxHits !== undefined;
  const isMassSelected = massAttackSelected.includes(p.tokenId);

  return (
    <div onClick={massAttackMode ? () => toggleMassSelect(p.tokenId) : undefined}
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

      <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${isCurrentTurn ? 'var(--warning)' : isNextTurn ? 'var(--mana)' : 'var(--text-secondary)'}`, boxShadow: isNextTurn ? '0 0 10px var(--accent-glow)' : 'none' }}>
        <img loading="lazy" decoding="async" src={p.imageUrl || '/vite.svg'} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 'bold', color: isCurrentTurn ? 'var(--warning)' : isNextTurn ? 'var(--mana)' : 'var(--text-primary)', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.name}
            {isNextTurn && <span style={{ fontSize: '0.65rem', marginLeft: '6px', color: 'var(--mana)', fontWeight: 600 }}>EM ESPERA</span>}
          </span>
          <span style={{ fontWeight: '900', fontSize: '1.2rem', color: isCurrentTurn ? 'var(--warning)' : 'var(--text-primary)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{p.initiative}</span>
        </div>

        {isMinion ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 'bold' }}>LACAIO</span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {Array.from({ length: p.minionMaxHits! }).map((_, i) => (
                <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', background: i < (p.minionHits ?? 0) ? 'var(--danger)' : 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', boxShadow: i < (p.minionHits ?? 0) ? '0 0 6px var(--danger)' : 'none', transition: 'all 0.3s' }} />
              ))}
            </div>
            {isGM && (p.minionHits ?? 0) > 0 && (
              <Tooltip label="Causar dano ao lacaio"><button onClick={() => hitMinion(p.tokenId)} style={{ background: 'rgba(239,68,68,0.3)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '4px', padding: '1px 6px', fontSize: '9px', cursor: 'pointer', fontWeight: 'bold' }}>HIT!</button></Tooltip>
            )}
          </div>
        ) : tokensMap.has(p.tokenId) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 'bold' }}>HP: {tokensMap.get(p.tokenId).hp ?? 0}/{tokensMap.get(p.tokenId).maxHp ?? 1}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--mana)', fontWeight: 'bold' }}>PM: {tokensMap.get(p.tokenId).mana ?? 0}/{tokensMap.get(p.tokenId).maxMana ?? 0}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>🛡️ {tokensMap.get(p.tokenId).defesa ?? 0}</span>
            <Tooltip label="Economia de 3 Ações">
              <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); toggleAction(p.tokenId, p.actionsRemaining ?? 3); }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{
                    width: '12px', height: '12px', transform: 'rotate(45deg)', cursor: 'pointer',
                    background: i < (p.actionsRemaining ?? 3) ? 'var(--warning)' : 'var(--bg-tertiary)',
                    border: `1px solid ${i < (p.actionsRemaining ?? 3) ? 'var(--warning)' : 'var(--glass-border)'}`,
                    boxShadow: i < (p.actionsRemaining ?? 3) ? '0 0 5px var(--accent-glow)' : 'none',
                    transition: 'all 0.2s'
                  }} />
                ))}
              </div>
            </Tooltip>
          </div>
        )}

        {isGM && !isMinion && tokensMap.has(p.tokenId) && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
            <Tooltip label="Subtrair 5 Pontos de Vida"><button onClick={() => adjustHP(p.tokenId, -5)} style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>-5 HP</button></Tooltip>
            <Tooltip label="Subtrair 1 Ponto de Vida"><button onClick={() => adjustHP(p.tokenId, -1)} style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>-1 HP</button></Tooltip>
            <Tooltip label="Adicionar 1 Ponto de Vida"><button onClick={() => adjustHP(p.tokenId, 1)} style={{ background: 'rgba(16,185,129,0.2)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>+1 HP</button></Tooltip>
            <Tooltip label="Adicionar 5 Pontos de Vida"><button onClick={() => adjustHP(p.tokenId, 5)} style={{ background: 'rgba(16,185,129,0.2)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>+5 HP</button></Tooltip>
          </div>
        )}
        
        {p.conditions && p.conditions.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
            {p.conditions.map((c: any) => (
              <div key={c.id} style={{ fontSize: '0.7rem', background: c.type === 'damage' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: c.type === 'damage' ? 'var(--danger)' : 'var(--success)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', border: c.type === 'damage' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)' }}>
                {c.type === 'damage' ? '🩸' : '💚'} {c.name} ({c.durationTurns}t)
                {isGM && <Tooltip label="Remover Condição"><button onClick={() => removeConditionFromParticipant(p.tokenId, c.id)} style={{ background: 'transparent', border: 'none', color: 'inherit', padding: 0, marginLeft: '2px', cursor: 'pointer' }}>×</button></Tooltip>}
              </div>
            ))}
          </div>
        )}

        {isGM && !massAttackMode && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            <Tooltip label="Remover do Combate"><button onClick={() => removeCombatParticipant(p.tokenId)} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}><Skull size={10} /> Matar</button></Tooltip>
            <Tooltip label="Gerar Loot do Alvo"><button onClick={() => { if ((window as any).rollLootForNPC) (window as any).rollLootForNPC(p.name, 'Nv 3'); else toast.info('Abra o Gerador de NPCs!'); }} style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--warning)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>💰 Loot</button></Tooltip>
            <Tooltip label="Adicionar Condição"><button onClick={() => setAddingConditionTo(addingConditionTo === p.tokenId ? null : p.tokenId)} style={{ background: addingConditionTo === p.tokenId ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)', color: 'var(--accent-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}><PlusCircle size={10} /> Status</button></Tooltip>
            <Tooltip label="Alternar Tipo de Inimigo"><button onClick={() => toggleMinion(p.tokenId)} style={{ background: isMinion ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isMinion ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'}`, color: isMinion ? '#fcd34d' : '#94a3b8', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}><Target size={10} /> {isMinion ? 'Normal' : 'Lacaio'}</button></Tooltip>
          </div>
        )}

        {addingConditionTo === p.tokenId && (
          <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(168,85,247,0.3)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginBottom: '4px', fontWeight: 'bold' }}>Novo Status</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button onClick={() => { addConditionToParticipant(p.tokenId, { id: Date.now().toString(), name: 'Sangramento', durationTurns: 3, type: 'damage', value: 5 }); setAddingConditionTo(null); }} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(239,68,68,0.3)', color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🩸 Sangramento (3t/5d)</button>
              <button onClick={() => { addConditionToParticipant(p.tokenId, { id: Date.now().toString(), name: 'Veneno', durationTurns: 5, type: 'damage', value: 2 }); setAddingConditionTo(null); }} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(16,185,129,0.3)', color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>☠️ Veneno (5t/2d)</button>
              <button onClick={() => { addConditionToParticipant(p.tokenId, { id: Date.now().toString(), name: 'Regeneração', durationTurns: 3, type: 'heal', value: 5 }); setAddingConditionTo(null); }} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(59,130,246,0.3)', color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>💚 Regeneração (3t/5c)</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.p === nextProps.p &&
    prevProps.index === nextProps.index &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.turnIndex === nextProps.turnIndex &&
    prevProps.isGM === nextProps.isGM &&
    prevProps.massAttackMode === nextProps.massAttackMode &&
    prevProps.massAttackSelected.includes(prevProps.p.tokenId) === nextProps.massAttackSelected.includes(nextProps.p.tokenId) &&
    prevProps.addingConditionTo === nextProps.addingConditionTo &&
    prevProps.tokensMap.get(prevProps.p.tokenId) === nextProps.tokensMap.get(nextProps.p.tokenId)
  );
});

export const CombatTracker: React.FC<{ isGM?: boolean }> = ({ isGM = true }) => {
  const [participants, setParticipants] = useState<CombatParticipant[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [addingConditionTo, setAddingConditionTo] = useState<string | null>(null);
  const [tokensMap, setTokensMap] = useState<Map<string, any>>(new Map());
  const [drawings, setDrawings] = useState<any[]>([]);

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
  const [showEndMenu, setShowEndMenu] = useState(false);
  const climaxTimerRef = useRef<number | null>(null);

  const handleEndCombatWithOutcome = async (outcome: 'victory' | 'defeat' | 'escaped' | 'clear') => {
    setShowEndMenu(false);
    const currentRoom = new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2';
    const roundCount = Number(state.combat.get('round')) || 1;
    const combatParticipants = (state.combat.get('participants') as CombatParticipant[]) || [];

    if (outcome !== 'clear' && combatParticipants.length > 0) {
      await saveCombatEncounter({
        campaign_id: currentRoom,
        name: `Encontro Encerrado — Rodada ${roundCount}`,
        round_count: roundCount,
        outcome: outcome,
        combatants: combatParticipants.map(p => ({
          name: p.name,
          level: 1,
          hp: 0,
          maxHp: 0,
          defense: 10,
          attack: 2,
          imageUrl: p.imageUrl
        }))
      });

      const outcomeLabels = {
        victory: '🏆 Vitória dos Aventureiros!',
        defeat: '💀 Derrota da Party...',
        escaped: '🏃 Fuga da Batalha!'
      };

      pushChatMessage(`<b>Fim de Combate:</b> ${outcomeLabels[outcome]} (Duração: ${roundCount} rodada(s))`, outcome === 'victory', outcome === 'defeat');
    }

    clearCombat();
  };

  useEffect(() => {
    return () => {
      if (climaxTimerRef.current) window.clearTimeout(climaxTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const observer = () => {
      setParticipants(state.combat.get('participants') as CombatParticipant[] || []);
      setTurnIndex(state.combat.get('turnIndex') as number || 0);
      setIsActive(state.combat.get('isActive') as boolean || false);
    };
    
    // Ponytail: debounce para não re-renderizar o painel de combate a 60fps enquanto o token é arrastado.
    let timeout: any;
    const tokenObserver = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
         setTokensMap(new Map(state.tokens));
      }, 300);
    };

    state.combat.observe(observer);
    state.tokens.observe(tokenObserver);
    const drawingObserver = () => setDrawings(Array.from(state.drawings.values()));
    state.drawings.observe(drawingObserver);
    observer();
    setTokensMap(new Map(state.tokens)); // Initial load
    drawingObserver();
    return () => { 
       state.combat.unobserve(observer); 
       state.tokens.unobserve(tokenObserver); 
       state.drawings.unobserve(drawingObserver);
       if (timeout) clearTimeout(timeout);
    };
  }, []);

  const adjustHP = async (tokenId: string, amount: number) => {
    const token = state.tokens.get(tokenId) as any;
    if (!token) return;
    const newHp = Math.max(0, (token.hp ?? 0) + amount);
    Tokens.update(tokenId, { hp: newHp });
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

  const areaTokens = React.useMemo(() => tokensInsideDrawingShapes(
    Array.from(tokensMap.values() as Iterable<any>),
    drawings,
  ), [drawings, tokensMap]);

  const handleRollAll = (scope: 'scene' | 'areas' = 'scene') => {
    const tokens = Array.from(state.tokens.values() as Iterable<any>)
      .filter(t => t.inCombat !== false && t.x > -1000 && t.y > -1000);
    const selectedTokens = scope === 'areas' ? areaTokens : tokens;
    if (scope === 'areas' && selectedTokens.length === 0) {
      toast.info('Desenhe uma forma e posicione tokens dentro dela para rolar por área.');
      return;
    }
    const initiativeTokens = scope === 'areas' ? selectedTokens : tokens;
    if (initiativeTokens.length === 0) return;
    const newP: CombatParticipant[] = initiativeTokens.map(t => ({
      tokenId: t.id, name: t.name || 'Desconhecido', initiative: Math.floor(Math.random() * 20) + 1, imageUrl: t.imageUrl,
    }));
    newP.sort((a, b) => b.initiative - a.initiative);
    state.combat.set('participants', newP);
    state.combat.set('turnIndex', 0);
    pushChatMessage(`<b>Iniciativa Automática</b> rolada para ${initiativeTokens.length} combatentes${scope === 'areas' ? ' dentro das áreas desenhadas' : ''}!`, false, false);
  };

  const sendUrgency = (msg: string) => pushChatMessage(msg, true, false);
  const sendPrompt = () => { if (!promptText.trim()) return; pushChatMessage(`🎭 <i>${promptText}</i>`, false, false); setPromptText(''); };

  const toggleMinion = (tokenId: string) => {
    const parts = (state.combat.get('participants') as CombatParticipant[]) || [];
    state.combat.set('participants', parts.map(p => p.tokenId === tokenId ? (p.minionMaxHits ? { ...p, minionHits: undefined, minionMaxHits: undefined } : { ...p, minionHits: 2, minionMaxHits: 2 }) : p));
  };

  const toggleAction = (tokenId: string, currentRemaining: number = 3) => {
    const parts = (state.combat.get('participants') as CombatParticipant[]) || [];
    state.combat.set('participants', parts.map(p => {
      if (p.tokenId === tokenId) {
        let newActions = currentRemaining - 1;
        if (newActions < 0) newActions = 3;
        return { ...p, actionsRemaining: newActions };
      }
      return p;
    }));
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
    if (climaxTimerRef.current) window.clearTimeout(climaxTimerRef.current);
    climaxTimerRef.current = window.setTimeout(() => {
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
            {areaTokens.length > 0 && (
              <p style={{ margin: 0, maxWidth: '32rem', fontSize: '0.8rem', color: '#d8b4fe' }}>
                Na área de iniciativa: {areaTokens.map(token => token.name || 'Sem nome').join(', ')}
              </p>
            )}
            {isGM && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={() => handleRollAll('scene')} style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-primary)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(255,122,0, 0.3)' }}>
                  <Dices size={18} /> Auto-Rolar do Mapa
                </button>
                {areaTokens.length > 0 && <button onClick={() => handleRollAll('areas')} style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(168,85,247,0.2)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.5)', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                  <Target size={16} /> Rolar Área ({areaTokens.length})
                </button>}
              </div>
            )}
          </div>
        ) : (
          participants.map((p, index) => (
            <CombatParticipantRow
              key={p.tokenId}
              p={p}
              index={index}
              isActive={isActive}
              turnIndex={turnIndex}
              isGM={isGM}
              tokensMap={tokensMap}
              massAttackMode={massAttackMode}
              massAttackSelected={massAttackSelected}
              toggleMassSelect={toggleMassSelect}
              addingConditionTo={addingConditionTo}
              setAddingConditionTo={setAddingConditionTo}
              hitMinion={hitMinion}
              toggleMinion={toggleMinion}
              toggleAction={toggleAction}
              removeConditionFromParticipant={removeConditionFromParticipant}
              removeCombatParticipant={removeCombatParticipant}
              adjustHP={adjustHP}
              addConditionToParticipant={addConditionToParticipant}
            />
          ))
        )}
      </div>

      {/* PPR: Painel de Urgência */}
      {isGM && isActive && showUrgency && (
        <div style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12} /> GATILHOS DE URGÊNCIA</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {URGENCY_TRIGGERS.map((t, i) => (
              <button key={i} onClick={() => sendUrgency(t.msg)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>{t.icon} {t.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input value={customUrgency} onChange={e => setCustomUrgency(e.target.value)} placeholder="Urgência customizada..." style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none' }} />
            <Tooltip label="Enviar Urgência Customizada"><button onClick={() => { if (customUrgency.trim()) { sendUrgency(`⚠️ <b>PERIGO!</b> ${customUrgency}`); setCustomUrgency(''); } }} style={{ background: 'rgba(239,68,68,0.3)', border: 'none', color: 'var(--danger)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}><Send size={12} /></button></Tooltip>
          </div>
        </div>
      )}

      {/* PPR: Prompts de Transição */}
      {isGM && isActive && showPrompts && (
        <div style={{ padding: '8px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--mana)', display: 'flex', alignItems: 'center', gap: '4px' }}><MessageSquare size={12} /> TRANSIÇÃO NARRATIVA</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {PROMPT_MACROS.map((m, i) => (
              <button key={i} onClick={() => setPromptText(m.template.replace('{next}', nextTurnName))} style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--mana)', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>{m.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input value={promptText} onChange={e => setPromptText(e.target.value)} placeholder="Narração do mestre..." style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none' }} onKeyDown={e => e.key === 'Enter' && sendPrompt()} />
            <Tooltip label="Enviar Narrativa"><button onClick={sendPrompt} style={{ background: 'rgba(59,130,246,0.3)', border: 'none', color: 'var(--mana)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}><Send size={12} /></button></Tooltip>
          </div>
        </div>
      )}

      {/* PPR: Stakes / Climax */}
      {isGM && showStakes && (
        <div style={{ padding: '10px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>🎲 Rolagem Climática — Defina as Consequências</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--success)', marginBottom: '3px' }}>✅ SUCESSO</div>
              <input value={stakesSuccess} onChange={e => setStakesSuccess(e.target.value)} placeholder="O que acontece?" style={{ width: '100%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--danger)', marginBottom: '3px' }}>❌ FALHA</div>
              <input value={stakesFailure} onChange={e => setStakesFailure(e.target.value)} placeholder="O que acontece?" style={{ width: '100%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <button onClick={launchClimaxRoll} style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(236,72,153,0.4))', border: '1px solid rgba(168,85,247,0.5)', color: 'var(--text-primary)', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>🎲 ROLAR COM CONSEQUÊNCIAS!</button>
        </div>
      )}

      {/* GM Toolbar */}
      {isGM && participants.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
          {isActive && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <Tooltip label="Gatilhos de Urgência (PPR)"><button onClick={() => { setShowUrgency(!showUrgency); setShowPrompts(false); setShowStakes(false); }} style={{ flex: 1, background: showUrgency ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', padding: '5px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Zap size={12} /> Urgência</button></Tooltip>
              <Tooltip label="Prompts de Narrativa (PPR)"><button onClick={() => { setShowPrompts(!showPrompts); setShowUrgency(false); setShowStakes(false); }} style={{ flex: 1, background: showPrompts ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--mana)', padding: '5px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><MessageSquare size={12} /> Narrar</button></Tooltip>
              <Tooltip label="Rolagem Climática (PPR)"><button onClick={() => { setShowStakes(!showStakes); setShowUrgency(false); setShowPrompts(false); }} style={{ flex: 1, background: showStakes ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: 'var(--accent-primary)', padding: '5px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Flame size={12} /> Clímax</button></Tooltip>
              <Tooltip label="Ataque em Massa contra múltiplos alvos"><button onClick={() => { setMassAttackMode(!massAttackMode); setMassAttackSelected([]); }} style={{ flex: 1, background: massAttackMode ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--warning)', padding: '5px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Swords size={12} /> Massa</button></Tooltip>
            </div>
          )}

          {massAttackMode && massAttackSelected.length > 0 && (
            <Tooltip label="Rolar ataque contra todos os alvos selecionados"><button onClick={executeMassAttack} style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.4), rgba(251,191,36,0.4))', border: '1px solid rgba(251,191,36,0.5)', color: 'var(--text-primary)', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>⚔️ ATACAR {massAttackSelected.length} ALVOS!</button></Tooltip>
          )}

          {areaTokens.length > 0 && (
            <button onClick={() => handleRollAll('areas')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '7px 10px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.35)', color: '#d8b4fe', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
              <Target size={13} /> Rolar tokens nas áreas desenhadas ({areaTokens.length})
            </button>
          )}

          {isActive && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <Clock size={12} color="var(--text-secondary)" />
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Timer:</span>
              {[0, 30, 60, 90].map(s => (
                <Tooltip key={s} label={s === 0 ? 'Desativar Timer' : `Timer de ${s} segundos`}><button onClick={() => { setTimerDuration(s * 1000); if (s > 0) { state.combat.set('timerStart', Date.now()); state.combat.set('timerDuration', s * 1000); state.combat.set('timerPaused', false); } else { state.combat.set('timerDuration', 0); } }} style={{ background: timerDuration === s * 1000 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: timerDuration === s * 1000 ? '#f1f5f9' : '#64748b', borderRadius: '4px', padding: '2px 6px', fontSize: '9px', cursor: 'pointer', fontWeight: 600 }}>{s === 0 ? 'Off' : `${s}s`}</button></Tooltip>
              ))}
              <Tooltip label="Alternar rolagem estática de dano"><button onClick={() => { setStaticDamage(!staticDamage); pushChatMessage(`🎯 Dano Fixo: ${!staticDamage ? 'ATIVADO' : 'DESATIVADO'}`, false, false); }} style={{ marginLeft: 'auto', background: staticDamage ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${staticDamage ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'}`, color: staticDamage ? '#fcd34d' : '#64748b', borderRadius: '4px', padding: '2px 6px', fontSize: '9px', cursor: 'pointer', fontWeight: 600 }}>🎯 Dano Fixo</button></Tooltip>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--glass-border)', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tooltip label={isActive ? 'Parar Combate' : 'Iniciar Combate'}>
              <button onClick={handleToggleCombat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', flex: 1, justifyContent: 'center', background: isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: isActive ? 'var(--danger)' : 'var(--success)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s' }}>
                {isActive ? <><Square size={16} /> Parar</> : <><Play size={16} /> Iniciar</>}
              </button>
            </Tooltip>
            {isActive && (
              <Tooltip label="Passar Turno">
                <button onClick={handleNextTurn} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', flex: 1, justifyContent: 'center', background: 'var(--accent-primary)', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', boxShadow: '0 0 10px var(--accent-glow)' }}>
                  Passar <ChevronRight size={18} />
                </button>
              </Tooltip>
            )}
            <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
              <Tooltip label="Re-rolar Tudo"><button onClick={() => handleRollAll()} className="btn-icon" style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '8px' }}><Dices size={18} color="var(--warning)" /></button></Tooltip>
              
              <Tooltip label="Encerrar com Desfecho">
                <button 
                  onClick={() => setShowEndMenu(!showEndMenu)} 
                  className="btn-icon" 
                  style={{ background: showEndMenu ? 'rgba(234,179,8,0.2)' : 'var(--bg-tertiary)', borderRadius: '8px', padding: '8px', border: showEndMenu ? '1px solid #eab308' : 'none' }}
                >
                  <Trophy size={18} color="#eab308" />
                </button>
              </Tooltip>

              <Tooltip label="Limpar Tudo"><button onClick={() => handleEndCombatWithOutcome('clear')} className="btn-icon" style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '8px' }}><Trash2 size={18} color="var(--danger)" /></button></Tooltip>

              {showEndMenu && (
                <div style={{
                  position: 'absolute', bottom: '44px', right: 0,
                  background: 'var(--bg-primary)', border: '1px solid var(--glass-border)',
                  borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column',
                  gap: '6px', width: '180px', boxShadow: '0 8px 24px rgba(0,0,0,0.8)', zIndex: 100
                }}>
                  <div style={{ fontSize: '0.68rem', color: '#fde047', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px' }}>
                    🏆 Desfecho do Combate:
                  </div>
                  <button
                    onClick={() => handleEndCombatWithOutcome('victory')}
                    style={{ padding: '6px 8px', background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: '6px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' }}
                  >
                    🏆 Vitória dos Jogadores
                  </button>
                  <button
                    onClick={() => handleEndCombatWithOutcome('defeat')}
                    style={{ padding: '6px 8px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '6px', color: '#f87171', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' }}
                  >
                    💀 Derrota da Party
                  </button>
                  <button
                    onClick={() => handleEndCombatWithOutcome('escaped')}
                    style={{ padding: '6px 8px', background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', borderRadius: '6px', color: '#60a5fa', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' }}
                  >
                    🏃 Fuga da Batalha
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pprPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
    </div>
  );
};
