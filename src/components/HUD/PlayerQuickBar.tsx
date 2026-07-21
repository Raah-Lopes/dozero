import React, { useState, useCallback } from 'react';
import {
  Swords, Footprints, MessageCircle, Dices,
  ChevronRight, ChevronLeft
} from 'lucide-react';
import { pushAdvancedChatMessage } from '../../store/chat';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'combat' | 'explore' | 'social' | 'dice';

interface Action {
  label: string;
  emoji: string;
  dice: string;      // ex: "1d20", "2d6"
  bonus?: number;    // bônus fixo somado ao resultado
  skill?: string;    // nome da perícia p/ exibição no log
}

// ─── Dados das abas ──────────────────────────────────────────────────────────

const TABS: { id: Tab; icon: React.FC<any>; label: string }[] = [
  { id: 'combat',  icon: Swords,        label: 'Combate'    },
  { id: 'explore', icon: Footprints,    label: 'Exploração' },
  { id: 'social',  icon: MessageCircle, label: 'Social'     },
  { id: 'dice',    icon: Dices,         label: 'Dados'      },
];

const ACTIONS: Record<Tab, Action[]> = {
  combat: [
    { label: 'Atacar',   emoji: '⚔️', dice: '1d20', skill: 'Ataque' },
    { label: 'Defender', emoji: '🛡️', dice: '1d20', skill: 'Defesa' },
    { label: 'Disparar', emoji: '🏹', dice: '1d20', skill: 'Ataque à Distância' },
    { label: 'Magia',    emoji: '✨', dice: '1d20', skill: 'Conjuração' },
    { label: 'Dano',     emoji: '💥', dice: '1d6',  skill: 'Dano' },
    { label: 'Dano (2d)', emoji: '💥', dice: '2d6', skill: 'Dano Pesado' },
  ],
  explore: [
    { label: 'Percepção',    emoji: '👁️', dice: '1d20', skill: 'Percepção' },
    { label: 'Ouvir',        emoji: '👂', dice: '1d20', skill: 'Audição' },
    { label: 'Mover Furtivo',emoji: '🐾', dice: '1d20', skill: 'Furtividade' },
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

// ─── Dice engine (no dependency) ─────────────────────────────────────────────

function rollDice(notation: string): { rolls: number[]; total: number } {
  const [countStr, sidesStr] = notation.toLowerCase().split('d');
  const count = parseInt(countStr) || 1;
  const sides = parseInt(sidesStr) || 6;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  playerName?: string;
}

export const PlayerQuickBar: React.FC<Props> = ({ playerName = 'Jogador' }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('combat');
  const [bonus, setBonus] = useState(0);
  const [lastResults, setLastResults] = useState<string[]>([]);

  const handleAction = useCallback((action: Action) => {
    const { rolls, total } = rollDice(action.dice);
    const finalTotal = total + bonus;
    const isCrit = action.dice === '1d20' && rolls[0] === 20;
    const isFail = action.dice === '1d20' && rolls[0] === 1;

    const label = action.skill || action.label;
    const bonusStr = bonus !== 0 ? ` ${bonus >= 0 ? '+' : ''}${bonus}` : '';
    const rollStr = rolls.length > 1 ? `[${rolls.join('+')}]` : `[${rolls[0]}]`;
    const msg = `${action.emoji} **${label}** (${action.dice}${bonusStr}): ${rollStr} = **${finalTotal}**${isCrit ? ' 🌟 CRÍTICO!' : isFail ? ' 💀 Falha Crítica!' : ''}`;

    pushAdvancedChatMessage(msg, {
      tipo: 'in-game',
      autor: playerName,
      isCritical: isCrit,
      isFailure: isFail,
    });

    setLastResults(prev => [`${action.emoji} ${finalTotal}`, ...prev].slice(0, 5));
  }, [bonus, playerName]);

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
        width: open ? '200px' : '0px',
        overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        background: 'rgba(10,15,30,0.92)',
        backdropFilter: 'blur(12px)',
        border: open ? '1px solid rgba(255,255,255,0.1)' : 'none',
        borderRight: 'none',
        borderRadius: '12px 0 0 12px',
        boxShadow: open ? '-4px 0 20px rgba(0,0,0,0.5)' : 'none',
      }}>
        {open && (
          <div style={{ width: '200px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Abas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {TABS.map(t => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: '2px', padding: '6px 4px',
                      background: active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                      border: active ? '1px solid rgba(99,102,241,0.6)' : '1px solid transparent',
                      borderRadius: '6px', cursor: 'pointer', color: active ? '#a5b4fc' : '#94a3b8',
                      fontSize: '0.6rem', fontWeight: active ? 'bold' : 'normal',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Bônus */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap' }}>Bônus:</span>
              <div style={{ display: 'flex', flex: 1, gap: '2px' }}>
                <button onClick={() => setBonus(b => b - 1)} style={bonusBtn}>−</button>
                <span style={{
                  flex: 1, textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold',
                  color: bonus > 0 ? '#4ade80' : bonus < 0 ? '#f87171' : '#94a3b8',
                  padding: '2px',
                }}>
                  {bonus >= 0 ? '+' : ''}{bonus}
                </span>
                <button onClick={() => setBonus(b => b + 1)} style={bonusBtn}>+</button>
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {ACTIONS[tab].map(action => (
                <button
                  key={action.label}
                  onClick={() => handleAction(action)}
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

            {/* Mini-log das últimas rolagens */}
            {lastResults.length > 0 && (
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '8px',
                display: 'flex', flexDirection: 'column', gap: '2px'
              }}>
                <span style={{ fontSize: '0.6rem', color: '#475569', marginBottom: '2px' }}>Últimas rolagens:</span>
                {lastResults.map((r, i) => (
                  <span key={i} style={{ fontSize: '0.72rem', color: i === 0 ? '#a5b4fc' : '#64748b' }}>{r}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botão de toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Fechar barra rápida' : 'Abrir barra de ações do jogador'}
        style={{
          width: '28px',
          height: '72px',
          background: 'rgba(10,15,30,0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
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
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,15,30,0.92)'; }}
      >
        {open ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );
};

// ─── Helpers de estilo ────────────────────────────────────────────────────────

const bonusBtn: React.CSSProperties = {
  width: '22px', height: '22px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '4px', cursor: 'pointer',
  color: '#94a3b8', fontSize: '0.9rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0,
};
