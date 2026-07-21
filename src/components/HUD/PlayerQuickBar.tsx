import React, { useState, useEffect, useCallback } from 'react';
import {
  Swords, Footprints, MessageCircle, Dices,
  ChevronRight, ChevronLeft, User, Sparkles, Send, RotateCcw,
  Activity, Zap
} from 'lucide-react';
import { pushAdvancedChatMessage } from '../../store/chat';
import { state } from '../../services/yjs';
import { toast } from '../UI/Toast';
import { syncTokenFieldToWiki, syncMultipleFieldsToWiki } from '../../services/wiki/syncWiki';

// ponytail: Rolagem customizada, vinculação com token e sincronização de ficha markdown no Yjs/Wiki

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'combat' | 'explore' | 'social' | 'dice' | 'custom';

interface Action {
  label: string;
  emoji: string;
  dice: string;      // ex: "1d20", "2d6"
  bonus?: number;    // bônus fixo somado ao resultado
  skill?: string;    // nome da perícia p/ exibição no log
  isDamage?: boolean;
}

interface TokenItem {
  id: string;
  name: string;
  hp?: number;
  maxHp?: number;
  mana?: number;
  maxMana?: number;
  status_efeitos?: string[];
  wikiPath?: string;
  imageUrl?: string;
  isPlayer?: boolean;
}

const CONDICOES_DISPONIVEIS = [
  'Confuso', 'Amedrontado', 'Sangrando', 'Queimando', 
  'Atordoado', 'Invisível', 'Caído', 'Morto', 'Envenenado', 'Cego'
];

// ─── Dados das abas ──────────────────────────────────────────────────────────

const TABS: { id: Tab; icon: React.FC<any>; label: string }[] = [
  { id: 'combat',  icon: Swords,        label: 'Combate'    },
  { id: 'explore', icon: Footprints,    label: 'Exploração' },
  { id: 'social',  icon: MessageCircle, label: 'Social'     },
  { id: 'dice',    icon: Dices,         label: 'Dados'      },
  { id: 'custom',  icon: Sparkles,      label: 'Fórmula'    },
];

const ACTIONS: Record<Exclude<Tab, 'custom'>, Action[]> = {
  combat: [
    { label: 'Atacar',    emoji: '⚔️', dice: '1d20', skill: 'Ataque' },
    { label: 'Defender',  emoji: '🛡️', dice: '1d20', skill: 'Defesa' },
    { label: 'Disparar',  emoji: '🏹', dice: '1d20', skill: 'Ataque à Distância' },
    { label: 'Magia',     emoji: '✨', dice: '1d20', skill: 'Conjuração' },
    { label: 'Dano (1d6)',emoji: '💥', dice: '1d6',  skill: 'Dano', isDamage: true },
    { label: 'Dano (2d6)',emoji: '💥', dice: '2d6', skill: 'Dano Pesado', isDamage: true },
  ],
  explore: [
    { label: 'Percepção',    emoji: '👁️', dice: '1d20', skill: 'Percepção' },
    { label: 'Ouvir',        emoji: '👂', dice: '1d20', skill: 'Audição' },
    { label: 'Furtividade',  emoji: '🐾', dice: '1d20', skill: 'Furtividade' },
    { label: 'Investigar',   emoji: '🔍', dice: '1d20', skill: 'Investigação' },
    { label: 'Atletismo',    emoji: '🧗', dice: '1d20', skill: 'Atletismo' },
    { label: 'Sobrevivência',emoji: '🌿', dice: '1d20', skill: 'Sobrevivência' },
  ],
  social: [
    { label: 'Persuasão',    emoji: '🗣️', dice: '1d20', skill: 'Persuasão' },
    { label: 'Intimidação',  emoji: '😤', dice: '1d20', skill: 'Intimidação' },
    { label: 'Enganação',    emoji: '🎭', dice: '1d20', skill: 'Enganação' },
    { label: 'Empatia',      emoji: '💚', dice: '1d20', skill: 'Insight' },
    { label: 'Negociação',   emoji: '🤝', dice: '1d20', skill: 'Negociação' },
    { label: 'Liderança',    emoji: '👑', dice: '1d20', skill: 'Liderança' },
  ],
  dice: [
    { label: 'd4',   emoji: '🎲', dice: '1d4'  },
    { label: 'd6',   emoji: '🎲', dice: '1d6'  },
    { label: 'd8',   emoji: '🎲', dice: '1d8'  },
    { label: 'd10',  emoji: '🎲', dice: '1d10' },
    { label: 'd12',  emoji: '🎲', dice: '1d12' },
    { label: 'd20',  emoji: '🎲', dice: '1d20' },
    { label: 'd100', emoji: '🎲', dice: '1d100'},
    { label: '2d6',  emoji: '🎲', dice: '2d6'  },
  ],
};

// ─── Motor de Rolagem Avançada e Fórmulas ───────────────────────────────────

function parseAndRollExpression(formula: string): {
  total: number;
  breakdown: string;
  isCrit: boolean;
  isFail: boolean;
} {
  const clean = formula.replace(/\s+/g, '').toLowerCase();
  if (!clean) return { total: 0, breakdown: '0', isCrit: false, isFail: false };

  const regex = /([+-]?)(?:(\d*)d(\d+)|(\d+))/g;
  let match: RegExpExecArray | null;
  let total = 0;
  const parts: string[] = [];
  let isCrit = false;
  let isFail = false;

  while ((match = regex.exec(clean)) !== null) {
    if (match[0] === '') continue;
    const signStr = match[1] === '-' ? '-' : '+';
    const sign = signStr === '-' ? -1 : 1;

    if (match[3] !== undefined) {
      const count = parseInt(match[2]) || 1;
      const sides = parseInt(match[3]) || 6;
      const rolls: number[] = [];
      let sum = 0;
      for (let i = 0; i < count; i++) {
        const r = Math.floor(Math.random() * sides) + 1;
        rolls.push(r);
        sum += r;
        if (sides === 20 && count === 1) {
          if (r === 20) isCrit = true;
          if (r === 1) isFail = true;
        }
      }
      total += sign * sum;
      const rollStr = rolls.length > 1 ? `[${rolls.join('+')}]` : `[${rolls[0]}]`;
      const prefix = parts.length === 0 ? (signStr === '-' ? '-' : '') : ` ${signStr} `;
      parts.push(`${prefix}${count}d${sides}${rollStr}`);
    } else if (match[4] !== undefined) {
      const val = parseInt(match[4]);
      total += sign * val;
      const prefix = parts.length === 0 ? (signStr === '-' ? '-' : '') : ` ${signStr} `;
      parts.push(`${prefix}${val}`);
    }
  }

  return {
    total,
    breakdown: parts.length > 0 ? parts.join('') : '0',
    isCrit,
    isFail,
  };
}

// ─── Componente Principal ───────────────────────────────────────────────────

interface Props {
  playerName?: string;
}

export const PlayerQuickBar: React.FC<Props> = ({ playerName = 'Jogador' }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('combat');
  const [bonus, setBonus] = useState(0);
  const [lastResults, setLastResults] = useState<{ label: string; val: number; damage?: number; isDamage?: boolean }[]>([]);

  // Rolagem Personalizada (Fórmula Livre ex: 1d20+2d100-30)
  const [customFormula, setCustomFormula] = useState('1d20+2d100-30');

  // Vincular com Personagem/Token
  const [isLinkedToCharacter, setIsLinkedToCharacter] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');
  const [availableTokens, setAvailableTokens] = useState<TokenItem[]>([]);
  const [showEffectMenu, setShowEffectMenu] = useState(false);

  // Observa tokens no Yjs
  useEffect(() => {
    const updateTokens = () => {
      const tokensList: TokenItem[] = Array.from(state.tokens.values() as Iterable<any>).map(t => ({
        id: t.id,
        name: t.name || 'Token sem nome',
        hp: t.hp,
        maxHp: t.maxHp,
        mana: t.mana,
        maxMana: t.maxMana,
        status_efeitos: Array.isArray(t.status_efeitos) ? t.status_efeitos : [],
        wikiPath: t.wikiPath || t.caminhoArquivo,
        imageUrl: t.imageUrl,
        isPlayer: t.isPlayer
      }));
      setAvailableTokens(tokensList);
      if (tokensList.length > 0 && !selectedTokenId) {
        setSelectedTokenId(tokensList[0].id);
      }
    };

    state.tokens.observe(updateTokens);
    updateTokens();
    return () => state.tokens.unobserve(updateTokens);
  }, []);

  const activeToken = availableTokens.find(t => t.id === selectedTokenId);

  // Executa rolagem padrão ou de fórmula
  const executeRoll = useCallback((actionLabel: string, emoji: string, formulaStr: string, isDamage: boolean = false) => {
    let fullFormula = formulaStr;
    if (bonus !== 0) {
      fullFormula += bonus >= 0 ? `+${bonus}` : `${bonus}`;
    }

    const { total, breakdown, isCrit, isFail } = parseAndRollExpression(fullFormula);

    const autor = isLinkedToCharacter && activeToken ? activeToken.name : playerName;
    const tagToken = isLinkedToCharacter && activeToken ? ` 👤 [${activeToken.name}]` : '';

    const critMsg = isCrit ? ' 🌟 CRÍTICO!' : isFail ? ' 💀 FALHA CRÍTICA!' : '';
    const msg = `${emoji} **${actionLabel}**${tagToken} (\`${fullFormula}\`): ${breakdown} = **${total}**${critMsg}`;

    pushAdvancedChatMessage(msg, {
      tipo: 'in-game',
      autor: autor,
      autor_alias: autor,
      isCritical: isCrit,
      isFailure: isFail,
    });

    setLastResults(prev => [
      { label: `${emoji} ${actionLabel}`, val: total, damage: isDamage ? total : undefined, isDamage },
      ...prev
    ].slice(0, 5));

    if (isLinkedToCharacter && activeToken && isDamage) {
      toast.info(`Rolagem de Dano (${total}). Clique no histórico abaixo para aplicar no HP/Ficha de ${activeToken.name}.`);
    }
  }, [bonus, isLinkedToCharacter, activeToken, playerName]);

  // Aplica dano/cura direto no Token no Yjs E na Ficha Markdown (.md) da Wiki
  const handleApplyDamageToToken = async (amount: number, isHeal: boolean = false) => {
    if (!activeToken) {
      toast.warn('Nenhum token selecionado para aplicar!');
      return;
    }
    const tokenRaw = state.tokens.get(activeToken.id) as any;
    if (!tokenRaw) return;

    const currentHp = tokenRaw.hp !== undefined ? tokenRaw.hp : (tokenRaw.maxHp || 10);
    const delta = isHeal ? Math.abs(amount) : -Math.abs(amount);
    const newHp = Math.max(0, currentHp + delta);

    let currentEffects: string[] = Array.isArray(tokenRaw.status_efeitos)
      ? [...tokenRaw.status_efeitos]
      : [];

    if (newHp === 0 && !currentEffects.includes('Morto')) {
      currentEffects.push('Morto');
    } else if (newHp > 0 && isHeal && currentEffects.includes('Morto')) {
      currentEffects = currentEffects.filter(e => e !== 'Morto');
    }

    // 1. Atualiza Token no Yjs
    state.tokens.set(activeToken.id, {
      ...tokenRaw,
      hp: newHp,
      status_efeitos: currentEffects
    });

    // 2. Sincroniza diretamente na Ficha (.md) da Wiki
    const wikiPath = tokenRaw.wikiPath || tokenRaw.caminhoArquivo || activeToken.wikiPath;
    let sheetSynced = false;
    if (wikiPath) {
      sheetSynced = await syncMultipleFieldsToWiki(wikiPath, {
        hp: newHp,
        status_efeitos: currentEffects
      });
    }

    const actionText = isHeal ? `recuperou ${Math.abs(amount)} HP` : `sofreu ${Math.abs(amount)} de dano`;
    const tagFicha = sheetSynced ? ' 📄 [Ficha Sincronizada]' : '';
    toast.success(`[${tokenRaw.name}] ${actionText}! HP: ${newHp}/${tokenRaw.maxHp || '?'}${tagFicha}`);

    pushAdvancedChatMessage(`🩸 **${tokenRaw.name}** ${actionText}! (HP: ${newHp}/${tokenRaw.maxHp || '?'})${tagFicha}`, {
      tipo: 'sistema',
      autor: 'Sistema'
    });
  };

  // Alterna efeito de status diretamente no Token E na Ficha Markdown (.md)
  const handleToggleStatusEffect = async (condition: string) => {
    if (!activeToken) return;
    const tokenRaw = state.tokens.get(activeToken.id) as any;
    if (!tokenRaw) return;

    const currentEffects: string[] = Array.isArray(tokenRaw.status_efeitos)
      ? [...tokenRaw.status_efeitos]
      : [];

    const hasCond = currentEffects.includes(condition);
    const updatedEffects = hasCond
      ? currentEffects.filter(c => c !== condition)
      : [...currentEffects, condition];

    // 1. Atualiza Token no Yjs
    state.tokens.set(activeToken.id, {
      ...tokenRaw,
      status_efeitos: updatedEffects
    });

    // 2. Sincroniza diretamente na Ficha (.md) da Wiki
    const wikiPath = tokenRaw.wikiPath || tokenRaw.caminhoArquivo || activeToken.wikiPath;
    let sheetSynced = false;
    if (wikiPath) {
      sheetSynced = await syncTokenFieldToWiki(wikiPath, 'status_efeitos', updatedEffects);
    }

    const act = hasCond ? 'removida de' : 'aplicada a';
    const tagFicha = sheetSynced ? ' 📄 [Ficha Sincronizada]' : '';
    toast.success(`Condição "${condition}" ${act} [${tokenRaw.name}]!${tagFicha}`);

    pushAdvancedChatMessage(`⚠️ Condição **${condition}** ${act} **${tokenRaw.name}**!${tagFicha}`, {
      tipo: 'sistema',
      autor: 'Sistema'
    });
  };

  const appendFormula = (val: string) => {
    setCustomFormula(prev => {
      if (!prev || prev === '0') return val;
      return `${prev} ${val}`;
    });
  };

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 8000,
      display: 'flex',
      alignItems: 'center',
      pointerEvents: 'auto',
    }}>
      {/* Painel expandido */}
      <div style={{
        width: open ? '230px' : '0px',
        overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        background: 'rgba(10,15,30,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: open ? '1px solid rgba(255,255,255,0.12)' : 'none',
        borderBottom: open ? '1px solid rgba(255,255,255,0.12)' : 'none',
        borderLeft: open ? '1px solid rgba(255,255,255,0.12)' : 'none',
        borderRight: 'none',
        borderRadius: '12px 0 0 12px',
        boxShadow: open ? '-4px 0 24px rgba(0,0,0,0.6)' : 'none',
      }}>
        {open && (
          <div style={{ width: '230px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '85vh', overflowY: 'auto' }}>

            {/* Vinculação com Personagem / Token & Ficha */}
            <div style={{
              background: isLinkedToCharacter ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
              border: isLinkedToCharacter ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: isLinkedToCharacter ? '#a5b4fc' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={12} /> Vincular Token & Ficha
                </span>
                <input
                  type="checkbox"
                  checked={isLinkedToCharacter}
                  onChange={e => setIsLinkedToCharacter(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                />
              </div>

              {isLinkedToCharacter && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <select
                    value={selectedTokenId}
                    onChange={e => setSelectedTokenId(e.target.value)}
                    style={{
                      width: '100%', padding: '4px 6px', background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px',
                      color: '#e2e8f0', fontSize: '0.75rem', outline: 'none'
                    }}
                  >
                    {availableTokens.length === 0 && <option value="">Nenhum token no mapa</option>}
                    {availableTokens.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.hp !== undefined ? `(HP: ${t.hp})` : ''}
                      </option>
                    ))}
                  </select>

                  {activeToken && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: '#cbd5e1' }}>
                        <span>❤️ HP: <strong>{activeToken.hp ?? '?'}</strong>/{activeToken.maxHp ?? '?'}</span>
                        <span>✨ MP: <strong>{activeToken.mana ?? '?'}</strong>/{activeToken.maxMana ?? '?'}</span>
                      </div>

                      {/* Efeitos de Status Ativos */}
                      {activeToken.status_efeitos && activeToken.status_efeitos.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                          {activeToken.status_efeitos.map(cond => (
                            <span
                              key={cond}
                              onClick={() => handleToggleStatusEffect(cond)}
                              title="Clique para remover efeito do Token e da Ficha"
                              style={{
                                fontSize: '0.58rem', padding: '1px 5px', borderRadius: '3px',
                                background: cond === 'Morto' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.25)',
                                border: cond === 'Morto' ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(245,158,11,0.4)',
                                color: cond === 'Morto' ? '#fca5a5' : '#fde68a', cursor: 'pointer'
                              }}
                            >
                              ⚠️ {cond} ×
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Botão de Alternar Menu de Efeitos */}
                      <button
                        onClick={() => setShowEffectMenu(v => !v)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          padding: '3px', background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px',
                          color: '#a5b4fc', fontSize: '0.62rem', cursor: 'pointer'
                        }}
                      >
                        <Zap size={10} /> {showEffectMenu ? 'Fechar Efeitos' : '+ Adicionar Efeito/Status'}
                      </button>

                      {/* Grade de Efeitos Rápida */}
                      {showEffectMenu && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '4px' }}>
                          {CONDICOES_DISPONIVEIS.map(cond => {
                            const isApplied = activeToken.status_efeitos?.includes(cond);
                            return (
                              <button
                                key={cond}
                                onClick={() => handleToggleStatusEffect(cond)}
                                style={{
                                  padding: '2px 4px', fontSize: '0.58rem', textAlign: 'left',
                                  background: isApplied ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.04)',
                                  border: isApplied ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: '3px', color: isApplied ? '#a5b4fc' : '#cbd5e1', cursor: 'pointer'
                                }}
                              >
                                {isApplied ? '✓ ' : ''}{cond}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Abas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2px' }}>
              {TABS.map(t => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    title={t.label}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: '2px', padding: '6px 2px',
                      background: active ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.04)',
                      border: active ? '1px solid rgba(99,102,241,0.6)' : '1px solid transparent',
                      borderRadius: '6px', cursor: 'pointer', color: active ? '#a5b4fc' : '#94a3b8',
                      fontSize: '0.58rem', fontWeight: active ? 'bold' : 'normal',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={13} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ajuste de Bônus Fixos (+ / -) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap' }}>Bônus Mod:</span>
              <div style={{ display: 'flex', flex: 1, gap: '4px', alignItems: 'center' }}>
                <button onClick={() => setBonus(b => b - 1)} style={bonusBtn}>−</button>
                <span style={{
                  flex: 1, textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold',
                  color: bonus > 0 ? '#4ade80' : bonus < 0 ? '#f87171' : '#94a3b8',
                }}>
                  {bonus >= 0 ? '+' : ''}{bonus}
                </span>
                <button onClick={() => setBonus(b => b + 1)} style={bonusBtn}>+</button>
              </div>
            </div>

            {/* Conteúdo da Aba Normal (Combate, Exploração, Social, Dados) */}
            {tab !== 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {ACTIONS[tab].map(action => (
                  <button
                    key={action.label}
                    onClick={() => executeRoll(action.skill || action.label, action.emoji, action.dice, action.isDamage)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '7px 10px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '6px', cursor: 'pointer',
                      color: '#e2e8f0', fontSize: '0.75rem', textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.2)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    <span style={{ fontSize: '0.9rem' }}>{action.emoji}</span>
                    <span style={{ flex: 1 }}>{action.label}</span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{action.dice}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Conteúdo da Aba Personalizada / Construtor de Fórmulas */}
            {tab === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Fórmula Personalizada:</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={customFormula}
                      onChange={e => setCustomFormula(e.target.value)}
                      placeholder="ex: 1d20+2d100-30"
                      style={{
                        flex: 1, padding: '6px', background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(99,102,241,0.5)', borderRadius: '4px',
                        color: '#f8fafc', fontSize: '0.75rem', fontFamily: 'monospace'
                      }}
                    />
                    <button
                      onClick={() => setCustomFormula('')}
                      title="Limpar fórmula"
                      style={{ ...bonusBtn, width: '26px', height: '26px' }}
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                </div>

                {/* Botões Rápidos para Montar a Fórmula */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.6rem', color: '#64748b' }}>Adicionar dados/modificadores:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px' }}>
                    {['+1d4', '+1d6', '+1d8', '+1d10', '+1d12', '+1d20', '+1d100', '-1d6', '+5', '-5', '+10', '-30'].map(chip => (
                      <button
                        key={chip}
                        onClick={() => appendFormula(chip)}
                        style={{
                          padding: '3px 2px', background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px',
                          color: '#cbd5e1', fontSize: '0.62rem', cursor: 'pointer'
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botão Rolar Fórmula */}
                <button
                  onClick={() => executeRoll('Rolagem Customizada', '🎲', customFormula)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '8px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                    color: '#ffffff', fontSize: '0.8rem', fontWeight: 'bold',
                    boxShadow: '0 2px 10px rgba(99,102,241,0.4)'
                  }}
                >
                  <Send size={14} /> Rolar Fórmula
                </button>
              </div>
            )}

            {/* Mini-log de Histórico e Ações de Aplicação Direta no Token & Ficha */}
            {lastResults.length > 0 && (
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '8px',
                display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                <span style={{ fontSize: '0.6rem', color: '#64748b' }}>Últimas rolagens:</span>
                {lastResults.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: i === 0 ? '#a5b4fc' : '#94a3b8' }}>
                    <span>{r.label}: <strong>{r.val}</strong></span>
                    {isLinkedToCharacter && activeToken && (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          onClick={() => handleApplyDamageToToken(r.val, false)}
                          title={`Aplicar ${r.val} de dano no HP de ${activeToken.name} (Token + Ficha .md)`}
                          style={{ padding: '1px 4px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '3px', color: '#fca5a5', fontSize: '0.58rem', cursor: 'pointer' }}
                        >
                          -HP
                        </button>
                        <button
                          onClick={() => handleApplyDamageToToken(r.val, true)}
                          title={`Curar ${r.val} de HP em ${activeToken.name} (Token + Ficha .md)`}
                          style={{ padding: '1px 4px', background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '3px', color: '#86efac', fontSize: '0.58rem', cursor: 'pointer' }}
                        >
                          +HP
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Botão de abrir/fechar a barra lateral */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Fechar barra rápida' : 'Abrir barra de ações do jogador'}
        style={{
          width: '28px',
          height: '72px',
          background: 'rgba(10,15,30,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          borderRight: 'none',
          borderRadius: '10px 0 0 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6366f1',
          boxShadow: '-2px 0 12px rgba(0,0,0,0.4)',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.2)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,15,30,0.95)'; }}
      >
        {open ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );
};

// ─── Estilos de Botão de Bônus ────────────────────────────────────────────────

const bonusBtn: React.CSSProperties = {
  width: '22px', height: '22px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '4px', cursor: 'pointer',
  color: '#94a3b8', fontSize: '0.85rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0,
};
