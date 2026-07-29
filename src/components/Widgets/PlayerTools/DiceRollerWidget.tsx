import React, { useState, useCallback, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { pushChatMessage } from '../../../store';
import { useRulesEngine } from '../../../hooks/useRulesEngine';

// ─── Tipos ─────────────────────────────────────────────────────────────────
type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100;
type DiceTheme = 'purple' | 'crimson' | 'gold';

interface RollResult {
  id: string;
  dice: string;
  rolls: { die: DieType, result: number }[];
  modifier: number;
  total: number;
  timestamp: number;
}

interface DiceMacro {
  id: string;
  label: string;
  pool: Partial<Record<DieType, number>>;
  modifier: number;
}

// ─── Utils ─────────────────────────────────────────────────────────────────
function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

// ─── Polígonos SVG de cada dado ────────────────────────────────────────────
const DieIcon: React.FC<{ sides: DieType; size?: number; color?: string }> = ({ sides, size = 32, color = 'currentColor' }) => {
  const s = size;
  const shapes: Record<DieType, React.ReactNode> = {
    4: (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <polygon points="16,2 30,28 2,28" stroke={color} strokeWidth="2" fill="none"/>
        <line x1="16" y1="2" x2="16" y2="28" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
      </svg>
    ),
    6: (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <rect x="3" y="3" width="26" height="26" rx="3" stroke={color} strokeWidth="2" fill="none"/>
        <line x1="3" y1="11" x2="29" y2="11" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
        <line x1="3" y1="21" x2="29" y2="21" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
      </svg>
    ),
    8: (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <polygon points="16,2 30,16 16,30 2,16" stroke={color} strokeWidth="2" fill="none"/>
        <line x1="2" y1="16" x2="30" y2="16" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
        <line x1="16" y1="2" x2="16" y2="30" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
      </svg>
    ),
    10: (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <polygon points="16,2 28,10 24,26 8,26 4,10" stroke={color} strokeWidth="2" fill="none"/>
        <line x1="16" y1="2" x2="16" y2="26" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
      </svg>
    ),
    12: (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <polygon points="16,2 26,7 30,18 22,28 10,28 2,18 6,7" stroke={color} strokeWidth="2" fill="none"/>
        <line x1="16" y1="2" x2="16" y2="28" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
      </svg>
    ),
    20: (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <polygon points="16,1 31,10 31,22 16,31 1,22 1,10" stroke={color} strokeWidth="2" fill="none"/>
        <polygon points="16,1 16,31" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
        <line x1="1" y1="16" x2="31" y2="16" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
      </svg>
    ),
    100: (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="13" stroke={color} strokeWidth="2" fill="none"/>
        <text x="16" y="20" textAnchor="middle" fontSize="9" fill={color} fontWeight="bold">%</text>
      </svg>
    ),
  };
  return <>{shapes[sides]}</>;
};

// ─── Tema de Cores ─────────────────────────────────────────────────────────
const THEMES: Record<DiceTheme, { primary: string; glow: string; text: string }> = {
  purple: { primary: '#a855f7', glow: 'rgba(168,85,247,0.6)', text: '#c084fc' },
  crimson: { primary: '#e11d48', glow: 'rgba(225,29,72,0.6)', text: '#fda4af' },
  gold: { primary: '#d97706', glow: 'rgba(217,119,6,0.6)', text: '#fcd34d' },
};

// ─── Componente de Dado Animado ────────────────────────────────────────────
const AnimatedDie: React.FC<{ sides: DieType; value: number; rolling: boolean; theme: DiceTheme; delay?: number }> = ({ sides, value, rolling, theme, delay = 0 }) => {
  const c = THEMES[theme];
  return (
    <div style={{
      width: '60px', height: '60px',
      border: `2px solid ${c.primary}`,
      borderRadius: '10px',
      background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.05), rgba(0,0,0,0.5))`,
      boxShadow: rolling ? `0 0 20px ${c.glow}, inset 0 0 10px ${c.glow}40` : `0 0 8px ${c.glow}40`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: rolling ? `diceRoll 0.15s linear infinite` : 'diceLand 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      animationDelay: rolling ? `${delay}ms` : '0ms',
      transition: 'box-shadow 0.3s ease',
      position: 'relative',
    }}>
      <span style={{ fontSize: '0.55rem', color: c.text, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '2px' }}>D{sides}</span>
      <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', textShadow: `0 0 10px ${c.primary}` }}>
        {rolling ? '?' : value}
      </span>
    </div>
  );
};

// ─── Widget Principal ──────────────────────────────────────────────────────
export const DiceRollerWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentEngine } = useRulesEngine();
  const [dicePool, setDicePool] = useState<Partial<Record<DieType, number>>>({ [currentEngine.defaultDie]: 1 });
  const [modifier, setModifier] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [currentRolls, setCurrentRolls] = useState<{ die: DieType, result: number }[]>([]);
  const [history, setHistory] = useState<RollResult[]>([]);
  const [theme, setTheme] = useState<DiceTheme>('purple');
  const [macros, setMacros] = useState<DiceMacro[]>([
    { id: 'atk', label: '⚔️ Ataque', pool: { 20: 1 }, modifier: 3 },
    { id: 'dmg', label: '🗡️ Dano', pool: { 6: 2 }, modifier: 0 },
    { id: 'ini', label: '⚡ Iniciativa', pool: { 20: 1 }, modifier: 2 },
  ]);
  const [newMacroLabel, setNewMacroLabel] = useState('');
  const [showMacroEditor, setShowMacroEditor] = useState(false);
  const [sendToChat, setSendToChat] = useState(() => {
     const saved = localStorage.getItem('diceSendToChat');
     return saved !== null ? saved === 'true' : true;
  });
  const [lastResult, setLastResult] = useState<{ total: number; dice: string } | null>(null);

  const colors = THEMES[theme];
  const allDice: DieType[] = [4, 6, 8, 10, 12, 20, 100];

  // Keybinding: R = rerola
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          handleRoll();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dicePool, modifier]);

  useEffect(() => {
    const handleRulesChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ engineId: string }>;
      // When the engine changes, we just reload the component state indirectly,
      // but to be safe we can force it or just rely on the user reopening.
      // Better: we can import RULES_ENGINES here, but since useRulesEngine provides currentEngine,
      // React state might not auto-update the useState initial value.
      // We will listen to it here.
    };
    window.addEventListener('rules-engine-changed', handleRulesChange);
    return () => window.removeEventListener('rules-engine-changed', handleRulesChange);
  }, []);

  useEffect(() => {
    setDicePool({ [currentEngine.defaultDie]: 1 });
  }, [currentEngine.defaultDie]);


  const handleRoll = useCallback((override?: { pool: Partial<Record<DieType, number>>, mod: number }) => {
    if (rolling) return;
    
    let activePool = dicePool;
    let mod = modifier;
    
    if (override) {
      activePool = override.pool;
      mod = override.mod;
    }
    
    const poolEntries = Object.entries(activePool) as [string, number][];
    setRolling(true);
    
    // Preparar estado inicial para animação
    const tempRolls: { die: DieType, result: number }[] = [];
    poolEntries.forEach(([dStr, qty]) => {
      const die = parseInt(dStr) as DieType;
      for (let i = 0; i < qty; i++) {
        tempRolls.push({ die, result: 0 });
      }
    });
    setCurrentRolls(tempRolls);

    setTimeout(() => {
      const results: { die: DieType, result: number }[] = [];
      let sum = 0;
      
      poolEntries.forEach(([dStr, qty]) => {
        const die = parseInt(dStr) as DieType;
        for (let i = 0; i < qty; i++) {
          const r = rollDie(die);
          results.push({ die, result: r });
          sum += r;
        }
      });
      
      const total = sum + mod;
      setCurrentRolls(results);
      setRolling(false);

      const rollId = Math.random().toString(36).slice(2);
      const diceParts = poolEntries.map(([d, q]) => `${q}d${d}`);
      const diceStr = diceParts.join(' + ') + (mod !== 0 ? (mod > 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`) : '');
      const newResult: RollResult = {
        id: rollId, dice: diceStr, rolls: results, modifier: mod, total, timestamp: Date.now()
      };
      setHistory(prev => [newResult, ...prev].slice(0, 10));
      setLastResult({ total, dice: diceStr });

      // DiceOverlay event
      window.dispatchEvent(new CustomEvent('dice-roll', {
        detail: { id: rollId, title: diceStr, result: total, type: 'utility' }
      }));

      window.dispatchEvent(new CustomEvent('dice-result-ready', {
        detail: { total, dice: diceStr, rolls: results.map(r => r.result), modifier: mod } // Keep mapped for backward compatibility if needed
      }));

      // Chat
      if (sendToChat) {
        const rollsStr = results.map(r => `[${r.result}]`).join(' + ');
        const modStr = mod !== 0 ? ` ${mod > 0 ? '+' : ''}${mod}` : '';
        pushChatMessage(`🎲 **${diceStr}** → ${rollsStr}${modStr} = **${total}**`);
      }
    }, 600);
  }, [rolling, dicePool, modifier, sendToChat]);

  const addMacro = () => {
    if (!newMacroLabel.trim()) return;
    setMacros(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      label: newMacroLabel.trim(),
      pool: { ...dicePool }, modifier
    }]);
    setNewMacroLabel('');
    setShowMacroEditor(false);
  };

  const removeMacro = (id: string) => setMacros(prev => prev.filter(m => m.id !== id));

  const totalResult = currentRolls.reduce((a, b) => a + b.result, 0) + modifier;
  const poolEntries = Object.entries(dicePool) as [string, number][];
  const diceParts = poolEntries.map(([dStr, qty]) => `${qty}d${dStr}`);
  const diceExpression = diceParts.join(' + ') + (modifier !== 0 ? (modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`) : '');

  const handleDieClick = (d: DieType) => {
    setDicePool(prev => {
      const currentQty = prev[d] || 0;
      return { ...prev, [d]: currentQty + 1 };
    });
  };

  const handleDieRemove = (e: React.MouseEvent, d: DieType) => {
    e.preventDefault();
    setDicePool(prev => {
      const currentQty = prev[d] || 0;
      if (currentQty <= 1) {
        const newPool = { ...prev };
        delete newPool[d];
        return newPool;
      }
      return { ...prev, [d]: currentQty - 1 };
    });
  };

  const clearPool = () => setDicePool({});

  return (
    <DraggableWindow
      id="diceRoller"
      title="Rolador de Dados"
      initialX={Math.max(20, window.innerWidth / 2 - 220)}
      initialY={80}
      width={440}
      height={600}
      onClose={onClose}
      variant="glass"
    >
      <style>{`
        @keyframes diceRoll {
          0% { transform: rotate(0deg) scale(1.05); }
          25% { transform: rotate(90deg) scale(0.95); }
          50% { transform: rotate(180deg) scale(1.05); }
          75% { transform: rotate(270deg) scale(0.95); }
          100% { transform: rotate(360deg) scale(1.05); }
        }
        @keyframes diceLand {
          0% { transform: scale(0.7) rotate(-15deg); opacity: 0.5; }
          60% { transform: scale(1.1) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .die-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .die-btn:hover { transform: scale(1.1); }
        .macro-chip:hover { opacity: 0.8; transform: scale(0.97); }
        .roll-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .roll-btn:active { transform: translateY(0); }
      `}</style>

      <div className="panel-neon-red" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* HEADER: Tema */}
        <div style={{ padding: '0.6rem 1rem', background: 'linear-gradient(135deg, #13101f, #0a0a14)', borderBottom: `1px solid ${colors.primary}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="text-gold" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>🎲 Rolador DOZERO</span>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#666' }}>Tema:</span>
            {(['purple', 'crimson', 'gold'] as DiceTheme[]).map(t => (
              <button key={t} onClick={() => setTheme(t)} style={{
                width: '16px', height: '16px', borderRadius: '50%',
                background: THEMES[t].primary,
                border: theme === t ? `2px solid white` : '2px solid transparent',
                cursor: 'pointer'
              }} />
            ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: '#888', cursor: 'pointer', marginLeft: '0.5rem' }}>
                <input type="checkbox" checked={sendToChat} onChange={e => {
                   setSendToChat(e.target.checked);
                   localStorage.setItem('diceSendToChat', String(e.target.checked));
                }} style={{ accentColor: colors.primary }} />
                Chat
              </label>
          </div>
        </div>

        {/* SELETOR DE DADOS */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid #1a1a2e` }}>
          <div style={{ fontSize: '0.65rem', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Adicionar Dados à Pilha</span>
            {poolEntries.length > 0 && (
              <button onClick={clearPool} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline' }}>
                Limpar Pilha
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {allDice.map(d => {
              const qty = dicePool[d] || 0;
              return (
                <button key={d} className="die-btn" 
                  onClick={() => handleDieClick(d)}
                  onContextMenu={(e) => handleDieRemove(e, d)}
                  style={{
                    position: 'relative',
                    background: qty > 0 ? `linear-gradient(135deg, ${colors.primary}40, ${colors.primary}20)` : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${qty > 0 ? colors.primary : '#2a2a3e'}`,
                    borderRadius: '8px',
                    padding: '0.4rem',
                    cursor: 'pointer',
                    color: qty > 0 ? colors.text : '#666',
                    boxShadow: qty > 0 ? `0 0 10px ${colors.glow}` : 'none',
                  }}>
                  {qty > 0 && (
                    <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: colors.primary, color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      {qty}
                    </div>
                  )}
                  <DieIcon sides={d} size={28} color={qty > 0 ? colors.primary : '#444'} />
                  <div style={{ fontSize: '0.55rem', textAlign: 'center', marginTop: '2px', fontWeight: 700 }}>D{d}</div>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: '0.55rem', color: '#555', textAlign: 'center', marginTop: '0.5rem' }}>
            Clique para adicionar • Botão direito para remover
          </div>
        </div>

        {/* MODIFICADOR E EXPRESSÃO */}
        <div style={{ padding: '0.6rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid #1a1a2e', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Modificador</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setModifier(m => m - 1)} style={{ background: '#1a1a2e', border: `1px solid #2a2a3e`, color: '#aaa', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: modifier === 0 ? '#555' : modifier > 0 ? '#6ee7b7' : '#fca5a5', minWidth: '3ch', textAlign: 'center' }}>
                {modifier > 0 ? `+${modifier}` : modifier}
              </span>
              <button onClick={() => setModifier(m => m + 1)} style={{ background: '#1a1a2e', border: `1px solid #2a2a3e`, color: '#aaa', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Expressão Total</div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: colors.text }}>
              {diceExpression || 'Vazio'}
            </span>
          </div>
        </div>

        {/* BOTÃO DE ROLAR */}
        <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'center', borderBottom: '1px solid #1a1a2e' }}>
          <button
            id="dice-roll-btn"
            className="roll-btn"
            onClick={() => handleRoll()}
            disabled={rolling}
            style={{
              padding: '0.75rem 2.5rem',
              background: rolling
                ? '#1a1a2e'
                : `linear-gradient(135deg, ${colors.primary}, ${colors.primary}80)`,
              border: `1.5px solid ${colors.primary}`,
              borderRadius: '30px',
              color: rolling ? '#555' : 'white',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: rolling ? 'not-allowed' : 'pointer',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              boxShadow: rolling ? 'none' : `0 0 20px ${colors.glow}`,
              transition: 'all 0.2s ease',
              minWidth: '200px',
            }}
          >
            {rolling ? '⟳ Rolando...' : '🎲 Rolar  [R]'}
          </button>
        </div>

        {/* RESULTADO ATUAL */}
        {currentRolls.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #1a1a2e', background: `linear-gradient(180deg, ${colors.primary}08, transparent)` }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.5rem' }}>
              {currentRolls.map((v, i) => (
                <AnimatedDie key={i} sides={v.die} value={v.result} rolling={rolling} theme={theme} delay={i * 50} />
              ))}
            </div>
            {!rolling && (
              <div 
                className={`holo-box ${currentRolls.some(r => r.die === 20 && r.result === 20) ? 'holo-critical' : ''}`}
                style={{ textAlign: 'center', padding: '15px', marginTop: '10px' }}
              >
                {currentRolls.some(r => r.die === 20 && r.result === 20) && (
                   <div className="text-gold" style={{ fontSize: '1.2rem', marginBottom: '5px' }}>CRÍTICO! Z.E.R.O.</div>
                )}
                {modifier !== 0 && (
                  <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.2rem' }}>
                    {currentRolls.map(r => r.result).join(' + ')}{modifier !== 0 ? ` ${modifier > 0 ? '+' : ''}${modifier}` : ''}
                  </div>
                )}
                <div style={{ fontSize: '3rem', fontWeight: 900, color: '#fff', textShadow: `0 0 20px ${colors.primary}, 0 0 40px ${colors.glow}`, lineHeight: 1 }}>
                  {totalResult}
                </div>
                {currentRolls.length > 1 && (
                  <div style={{ fontSize: '0.65rem', color: '#555', marginTop: '0.2rem' }}>
                    individual: {currentRolls.map((r, i) => <span key={i} style={{ color: colors.text, marginLeft: '4px' }}>{r.result}</span>)}
                  </div>
                )}
                {/* Painel de Aplicação — integração de dados físicos com fichas */}
                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.6rem', color: '#444', alignSelf: 'center', marginRight: '2px' }}>Aplicar ao alvo:</span>
                  {[
                    { label: '🗡️ Dano', color: '#f87171', event: 'dice-apply-damage' },
                    { label: '💗 Cura', color: '#34d399', event: 'dice-apply-heal' },
                    { label: '🎲 Teste', color: 'var(--mana)', event: 'dice-apply-test' },
                  ].map(({ label, color, event }) => (
                    <button
                      key={event}
                      onClick={() => window.dispatchEvent(new CustomEvent(event, { detail: { value: totalResult, dice: diceExpression } }))}
                      style={{
                        padding: '3px 10px', background: `${color}20`, border: `1px solid ${color}60`,
                        color, borderRadius: '20px', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MACROS */}
        <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #1a1a2e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '1px', textTransform: 'uppercase' }}>Macros de Atalho</div>
            <button onClick={() => setShowMacroEditor(!showMacroEditor)} style={{ background: 'none', border: `1px solid #2a2a3e`, color: '#666', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.6rem' }}>
              {showMacroEditor ? '✕ Cancelar' : '+ Novo'}
            </button>
          </div>
          {showMacroEditor && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                placeholder={`Nome (${diceExpression || 'Macro'})`}
                value={newMacroLabel}
                onChange={e => setNewMacroLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMacro()}
                style={{ flex: 1, background: '#111', border: '1px solid #2a2a3e', borderRadius: '4px', color: 'var(--text-primary)', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
              />
              <button onClick={addMacro} style={{ background: colors.primary, border: 'none', borderRadius: '4px', color: 'var(--text-primary)', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.75rem' }}>Salvar</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {macros.map(macro => (
              <div key={macro.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  className="macro-chip"
                  onClick={() => handleRoll({ pool: macro.pool, mod: macro.modifier })}
                  style={{
                    background: `${colors.primary}15`,
                    border: `1px solid ${colors.primary}40`,
                    borderRadius: '20px',
                    color: colors.text,
                    padding: '0.25rem 0.7rem',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                  title={Object.entries(macro.pool).map(([d, q]) => `${q}d${d}`).join(' + ') + (macro.modifier !== 0 ? (macro.modifier > 0 ? `+${macro.modifier}` : macro.modifier) : '')}
                >
                  {macro.label}
                </button>
                <button onClick={() => removeMacro(macro.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '0.65rem', padding: '0 2px' }} title="Remover macro">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* HISTÓRICO */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 1rem' }}>
          <div style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Histórico da Sessão</div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#333', fontSize: '0.8rem', paddingTop: '0.5rem' }}>Nenhuma rolagem ainda</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {history.map((h, idx) => (
                <div
                  key={h.id}
                  onClick={() => handleRoll()}
                  style={{
                    background: idx === 0 ? `${colors.primary}12` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${idx === 0 ? colors.primary + '30' : '#1a1a2e'}`,
                    borderRadius: '6px',
                    padding: '0.35rem 0.7rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    opacity: idx === 0 ? 1 : 0.65,
                  }}
                  title="Clique para re-rolar"
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: idx === 0 ? colors.text : '#666' }}>{h.dice}</span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: '#444' }}>{h.rolls.join(', ')}{h.modifier !== 0 ? ` ${h.modifier > 0 ? '+' : ''}${h.modifier}` : ''}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: idx === 0 ? '#fff' : '#888', textShadow: idx === 0 ? `0 0 8px ${colors.primary}` : 'none' }}>{h.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DraggableWindow>
  );
};
