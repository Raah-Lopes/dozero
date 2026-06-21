// src/components/Theater/DirectorBar.tsx
import React, { useState } from 'react';
import { Swords, Shield, Target, Zap, Heart, Droplets, Star, CloudRain, Wind, Flame, Snowflake, Moon, Sun, Film, ArrowRight, Bell } from 'lucide-react';
import { setTheaterMood, setTheaterWeather, addTensionClock, addTheaterDiaryEntry, pushChatMessage, type MoodType, type WeatherType } from '../../store';
import { useSceneState } from './hooks/useSceneState';

const MOODS: { value: MoodType; label: string; icon: string; color: string }[] = [
  { value: 'combat',    label: 'Combate',   icon: '⚔️', color: '#ef4444' },
  { value: 'suspense',  label: 'Suspense',  icon: '🟣', color: '#a855f7' },
  { value: 'horror',    label: 'Horror',    icon: '💀', color: '#dc2626' },
  { value: 'adventure', label: 'Aventura',  icon: '🏆', color: '#f59e0b' },
  { value: 'victory',   label: 'Vitória',   icon: '✨', color: '#10b981' },
  { value: 'sadness',   label: 'Tristeza',  icon: '🔵', color: '#64748b' },
  { value: 'mystery',   label: 'Mistério',  icon: '🔮', color: '#8b5cf6' },
  { value: 'neutral',   label: 'Neutro',    icon: '⬜', color: '#475569' },
];

const WEATHERS: { value: WeatherType; label: string; icon: React.ReactNode }[] = [
  { value: 'clear',    label: 'Claro',       icon: <Sun size={14} /> },
  { value: 'rain',     label: 'Chuva',       icon: <CloudRain size={14} /> },
  { value: 'storm',    label: 'Tempestade',  icon: '⛈' },
  { value: 'fog',      label: 'Névoa',       icon: <Wind size={14} /> },
  { value: 'snow',     label: 'Neve',        icon: <Snowflake size={14} /> },
  { value: 'fire',     label: 'Fogo',        icon: <Flame size={14} /> },
  { value: 'darkness', label: 'Escuridão',   icon: <Moon size={14} /> },
];

type Tab = 'actions' | 'weather' | 'mood' | 'narrative';

export const DirectorBar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('actions');
  const { goToNextScene,  createScene, theaterData } = useSceneState();

  const roll = (notation: string) => {
    const parts = notation.match(/(\d+)d(\d+)([+-]\d+)?/i);
    if (!parts) return;
    const num = parseInt(parts[1]);
    const sides = parseInt(parts[2]);
    const mod = parseInt(parts[3] || '0');
    const rolls = Array.from({ length: num }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0) + mod;
    const msg = `🎲 ${notation}: [${rolls.join(', ')}]${mod !== 0 ? (mod > 0 ? '+' + mod : mod) : ''} = **${total}**`;
    pushChatMessage(msg, total >= sides * num * 0.85, total <= num);
    addTheaterDiaryEntry({ timestamp: Date.now(), type: 'combat', text: msg });
  };

  const quickHP = (delta: number) => {
    const msg = `${delta > 0 ? '💚 +' : '❤️ '}${delta} PV (aplicado manualmente)`;
    pushChatMessage(msg);
    addTheaterDiaryEntry({ timestamp: Date.now(), type: 'combat', text: msg });
  };

  const quickXP = () => {
    const msg = `⭐ +50 XP concedido!`;
    pushChatMessage(msg, true, false);
    addTheaterDiaryEntry({ timestamp: Date.now(), type: 'narrative', text: msg });
  };

  const addQuickClock = () => {
    const label = prompt('Nome do relógio:');
    if (!label) return;
    const mins = Number(prompt('Duração em minutos:', '5')) || 5;
    const id = `clock_director_${Date.now()}`;
    addTensionClock({ id, x: 0, y: 0, label, durationMs: mins * 60000, endTime: Date.now() + mins * 60000, isRunning: true, hpMod: '0', mpMod: '0' });
    addTheaterDiaryEntry({ timestamp: Date.now(), type: 'clock', text: `🔔 Relógio criado: "${label}" (${mins}min)` });
  };

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: '6px 6px 0 0',
    background: activeTab === tab ? 'rgba(168,85,247,0.15)' : 'transparent',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #a855f7' : '2px solid transparent',
    color: activeTab === tab ? '#c084fc' : '#475569',
    cursor: 'pointer',
    fontSize: '0.72rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    transition: 'all 0.2s',
  });

  const quickBtnStyle = (color = '#6366f1'): React.CSSProperties => ({
    padding: '6px 10px',
    borderRadius: '8px',
    background: `${color}15`,
    border: `1px solid ${color}30`,
    color: color,
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{
      background: 'rgba(2,6,23,0.95)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', padding: '0 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {(['actions', 'weather', 'mood', 'narrative'] as Tab[]).map(tab => (
          <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>
            {tab === 'actions' ? '⚔️ Ações' : tab === 'weather' ? '🌦 Clima' : tab === 'mood' ? '🎭 Atmosfera' : '📖 Narrativa'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', minHeight: '52px' }}>
        {activeTab === 'actions' && (
          <>
            <button style={quickBtnStyle('#ef4444')} onClick={() => roll('1d20')} title="Rola 1d20 e envia ao log"><Target size={13} /> 1d20</button>
            <button style={quickBtnStyle('#f97316')} onClick={() => roll('1d20+5')} title="Teste com modificador +5"><Swords size={13} /> Ataque</button>
            <button style={quickBtnStyle('#3b82f6')} onClick={() => roll('1d20+3')} title="Teste de Defesa"><Shield size={13} /> Defesa</button>
            <button style={quickBtnStyle('#a855f7')} onClick={() => roll('2d6')} title="Dano 2d6"><Zap size={13} /> 2d6</button>
            <button style={quickBtnStyle('#f59e0b')} onClick={() => roll('3d6')} title="Dano 3d6">🎲 3d6</button>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />
            <button style={quickBtnStyle('#10b981')} onClick={() => quickHP(5)} title="+5 HP"><Heart size={13} /> +5</button>
            <button style={quickBtnStyle('#10b981')} onClick={() => quickHP(10)} title="+10 HP"><Heart size={13} /> +10</button>
            <button style={quickBtnStyle('#ef4444')} onClick={() => quickHP(-5)} title="-5 HP"><Heart size={13} /> -5</button>
            <button style={quickBtnStyle('#ef4444')} onClick={() => quickHP(-10)} title="-10 HP"><Heart size={13} /> -10</button>
            <button style={quickBtnStyle('#3b82f6')} onClick={() => quickHP(10)} title="+10 Mana"><Droplets size={13} /> +Mana</button>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />
            <button style={quickBtnStyle('#fbbf24')} onClick={quickXP} title="Conceder 50 XP"><Star size={13} /> +XP</button>
          </>
        )}

        {activeTab === 'weather' && (
          <>
            {WEATHERS.map(w => (
              <button key={w.value} style={quickBtnStyle(theaterData.weather === w.value ? '#a855f7' : '#475569')} onClick={() => setTheaterWeather(w.value)}>
                {w.icon} {w.label}
              </button>
            ))}
          </>
        )}

        {activeTab === 'mood' && (
          <>
            {MOODS.map(m => (
              <button key={m.value} style={quickBtnStyle(theaterData.mood === m.value ? m.color : '#475569')} onClick={() => setTheaterMood(m.value)}>
                {m.icon} {m.label}
              </button>
            ))}
          </>
        )}

        {activeTab === 'narrative' && (
          <>
            <button style={quickBtnStyle('#6366f1')} onClick={() => createScene()}><Film size={13} /> Nova Cena</button>
            <button style={quickBtnStyle('#6366f1')} onClick={goToNextScene}><ArrowRight size={13} /> Próxima</button>
            <button style={quickBtnStyle('#f59e0b')} onClick={addQuickClock}><Bell size={13} /> + Relógio</button>
            <button style={quickBtnStyle('#10b981')} onClick={() => { const note = prompt('Anotação narrativa:'); if (note) { addTheaterDiaryEntry({ timestamp: Date.now(), type: 'narrative', text: `📝 ${note}` }); pushChatMessage(`📝 Nota: ${note}`); } }}>
              📝 Anotação
            </button>
          </>
        )}
      </div>
    </div>
  );
};
