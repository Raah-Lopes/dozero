// src/components/Theater/DirectorBar.tsx
import React, { useState } from 'react';
import { Swords, Shield, Target, Zap, Heart, Droplets, Star, CloudRain, Wind, Flame, Snowflake, Moon, Sun, Film, ArrowRight, ArrowLeft, Bell, ChevronUp, ChevronDown, Palette, Dice5, Crosshair, BookOpen } from 'lucide-react';
import { setTheaterMood, setTheaterWeather, addTensionClock, addTheaterDiaryEntry, pushChatMessage, type MoodType, type WeatherType } from '../../store';
import { useSceneState } from './hooks/useSceneState';
import { useCastData } from './hooks/useCastData';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';
import { Tooltip } from '../UI/Tooltip';

const MOODS: { value: MoodType; label: string; emoji: string; color: string; description: string }[] = [
  { value: 'neutral',   label: 'Neutro',   emoji: '○',  color: '#475569', description: 'Remove filtros visuais de cena' },
  { value: 'combat',    label: 'Combate',  emoji: '⚔',  color: '#ef4444', description: 'Aplica tom vermelho e vinheta para alta tensão' },
  { value: 'suspense',  label: 'Suspense', emoji: '◉',  color: '#a855f7', description: 'Atmosfera roxa profunda de mistério e alerta' },
  { value: 'horror',    label: 'Horror',   emoji: '☠',  color: '#dc2626', description: 'Tela escura com baixo contraste para terror' },
  { value: 'adventure', label: 'Aventura', emoji: '★',  color: '#f59e0b', description: 'Brilho dourado para momentos heróicos e exploração' },
  { value: 'victory',   label: 'Vitória',  emoji: '✦',  color: '#10b981', description: 'Tons esverdeados e vibrantes de triunfo' },
  { value: 'sadness',   label: 'Tristeza', emoji: '◆',  color: 'var(--text-secondary)', description: 'Remove saturação para uma cena melancólica' },
  { value: 'mystery',   label: 'Mistério', emoji: '⬟',  color: '#8b5cf6', description: 'Filtro azul escuro com contraste investigativo' },
];

const WEATHERS: { value: WeatherType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'clear',    label: 'Claro',      icon: <Sun size={11} />, description: 'Céu aberto, sem condições climáticas adversas' },
  { value: 'rain',     label: 'Chuva',      icon: <CloudRain size={11} />, description: 'Efeito contínuo de gotas de chuva caindo' },
  { value: 'storm',    label: 'Tempestade', icon: '⛈', description: 'Chuva pesada acompanhada de clarões de relâmpagos' },
  { value: 'fog',      label: 'Névoa',      icon: <Wind size={11} />, description: 'Neblina espessa obscurecendo parte do fundo' },
  { value: 'snow',     label: 'Neve',       icon: <Snowflake size={11} />, description: 'Flocos de neve caindo lentamente na tela' },
  { value: 'fire',     label: 'Fogo',       icon: <Flame size={11} />, description: 'Brasas e faíscas incandescentes voando pelo ar' },
  { value: 'darkness', label: 'Escuridão',  icon: <Moon size={11} />, description: 'Breu total que dificulta severamente a visão' },
];

type SubMenu = null | 'atmosfera' | 'dados' | 'alvo' | 'narrativa';

export const DirectorBar: React.FC = () => {
  const { createScene, theaterData, selectedCastMemberId, scenes, setCurrentScene } = useSceneState();
  const currentSceneIdx = scenes.findIndex(s => s.id === theaterData.currentSceneId);
  const hasPrev = currentSceneIdx > 0;
  const hasNext = currentSceneIdx < scenes.length - 1;

  const handlePrevScene = () => { if (hasPrev) setCurrentScene(scenes[currentSceneIdx - 1].id); };
  const handleNextScene = () => { if (hasNext) setCurrentScene(scenes[currentSceneIdx + 1].id); };
  const { members } = useCastData();
  const selectedMember = members.find(m => m.caminhoArquivo === selectedCastMemberId);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<SubMenu>(null);

  const toggleSubmenu = (menu: SubMenu) => setActiveSubmenu(prev => prev === menu ? null : menu);

  const roll = (label: string, notation: string) => {
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
    window.dispatchEvent(new CustomEvent('theater-dice-result', {
      detail: { label, notation, rolls, modifier: mod, total, maxPossible: sides * num + mod }
    }));
  };

  const quickStat = async (field: 'pv' | 'mana' | 'xp', delta: number) => {
    if (!selectedMember) {
      pushChatMessage(`⚠️ Selecione um personagem no CastPanel para alterar ${field.toUpperCase()}`);
      return;
    }
    
    let currentVal = 0;
    if (field === 'pv') currentVal = selectedMember.pv;
    if (field === 'mana') currentVal = selectedMember.mana;
    if (field === 'xp') currentVal = selectedMember.xp || 0;
    
    const newVal = Math.max(0, currentVal + delta);
    
    let prefix = '';
    if (field === 'pv') prefix = delta > 0 ? '💚' : '❤️';
    if (field === 'mana') prefix = '💧';
    if (field === 'xp') prefix = '⭐';
    
    const signal = delta > 0 ? '+' : '';
    const msg = `${prefix} ${selectedMember.nome}: ${signal}${delta} ${field.toUpperCase()} (agora ${newVal})`;
    
    await syncTokenFieldToWiki(selectedMember.caminhoArquivo, field === 'pv' ? 'hp' : field, newVal);
    
    pushChatMessage(msg, field === 'xp', field === 'pv' && delta < 0);
    addTheaterDiaryEntry({ timestamp: Date.now(), type: 'combat', text: msg });
  };

  const addQuickClock = () => {
    window.dispatchEvent(new CustomEvent('theater-open-clock-creator'));
  };

  // ponytail: submenu tabs keep UI flat. Upgrade path: proper popover with useFloating if needed.
  const TABS: { id: SubMenu; label: string; icon: React.ReactNode; accent: string }[] = [
    { id: 'atmosfera', label: 'Atmosfera', icon: <Palette size={13} />, accent: '#a855f7' },
    { id: 'dados',     label: 'Dados',     icon: <Dice5 size={13} />,   accent: '#ef4444' },
    { id: 'alvo',      label: 'Alvo',      icon: <Crosshair size={13} />, accent: '#10b981' },
    { id: 'narrativa', label: 'Narrativa', icon: <BookOpen size={13} />, accent: '#3b82f6' },
  ];

  const activeMood = MOODS.find(m => m.value === theaterData.mood);
  const activeWeather = WEATHERS.find(w => w.value === theaterData.weather);

  return (
    <div style={{ position: 'relative', zIndex: 20 }}>
      {/* Collapse toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="theater-cockpit-collapse"
        title={isCollapsed ? 'Expandir Menu do Diretor' : 'Recolher Menu'}
      >
        {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Submenu panel (opens above the bar) */}
      {activeSubmenu && !isCollapsed && (
        <div className="theater-submenu-panel">
          {activeSubmenu === 'atmosfera' && (
            <>
              <div className="theater-submenu-section">
                <span className="theater-submenu-label">Atmosfera</span>
                <div className="theater-submenu-row">
                  {MOODS.map(m => (
                    <Tooltip key={m.value} label={m.label} description={m.description}>
                      <button
                        className={`theater-pill ${theaterData.mood === m.value ? 'active' : ''}`}
                        style={theaterData.mood === m.value ? { color: m.color, borderColor: m.color, background: `${m.color}20` } : {}}
                        onClick={() => setTheaterMood(m.value)}
                      >
                        {m.emoji} {m.label}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <div className="theater-submenu-section">
                <span className="theater-submenu-label">Clima</span>
                <div className="theater-submenu-row">
                  {WEATHERS.map(w => (
                    <Tooltip key={w.value} label={w.label} description={w.description}>
                      <button
                        className={`theater-pill ${theaterData.weather === w.value ? 'active' : ''}`}
                        style={theaterData.weather === w.value ? { color: '#38bdf8', borderColor: '#38bdf8', background: 'rgba(56,189,248,0.15)' } : {}}
                        onClick={() => setTheaterWeather(w.value)}
                      >
                        {w.icon} {w.label}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSubmenu === 'dados' && (
            <div className="theater-submenu-section">
              <span className="theater-submenu-label">Dados Rápidos</span>
              <div className="theater-submenu-row">
                <Tooltip label="Rolagem Pura" description="Rola 1d20 sem nenhum modificador adicionado"><button className="theater-qbtn red"    onClick={() => roll('1d20', '1d20')}><Target size={11} /> 1d20</button></Tooltip>
                <Tooltip label="Rolagem de Ataque" description="Rola 1d20 com bônus de combate (+5)"><button className="theater-qbtn orange" onClick={() => roll('Ataque', '1d20+5')}><Swords size={11} /> Atq</button></Tooltip>
                <Tooltip label="Rolagem de Defesa" description="Rola 1d20 com bônus de reflexo (+3)"><button className="theater-qbtn blue"   onClick={() => roll('Defesa', '1d20+3')}><Shield size={11} /> Def</button></Tooltip>
                <Tooltip label="Dano de Impacto" description="Calcula a soma de 2 dados de 6 faces"><button className="theater-qbtn purple" onClick={() => roll('Dano', '2d6')}><Zap size={11} /> 2d6</button></Tooltip>
                <Tooltip label="Dano Massivo" description="Calcula a soma de 3 dados de 6 faces"><button className="theater-qbtn amber"  onClick={() => roll('Dano', '3d6')}>🎲 3d6</button></Tooltip>
              </div>
            </div>
          )}

          {activeSubmenu === 'alvo' && (
            <div className="theater-submenu-section">
              <span className="theater-submenu-label">
                {selectedMember ? `Alvo: ${selectedMember.nome}` : 'Nenhum alvo selecionado — clique em um personagem no painel lateral'}
              </span>
              {selectedMember && (
                <div className="theater-submenu-row">
                  <Tooltip label="Cura Leve" description="Restaura 5 Pontos de Vida"><button className="theater-qbtn green"  onClick={() => quickStat('pv', 5)}><Heart size={11} /> +5 PV</button></Tooltip>
                  <Tooltip label="Cura Moderada" description="Restaura 10 Pontos de Vida"><button className="theater-qbtn green"  onClick={() => quickStat('pv', 10)}><Heart size={11} /> +10 PV</button></Tooltip>
                  <Tooltip label="Ferimento Leve" description="Subtrai 5 Pontos de Vida"><button className="theater-qbtn red"    onClick={() => quickStat('pv', -5)}><Heart size={11} /> -5 PV</button></Tooltip>
                  <Tooltip label="Ferimento Grave" description="Subtrai 10 Pontos de Vida"><button className="theater-qbtn red"    onClick={() => quickStat('pv', -10)}><Heart size={11} /> -10 PV</button></Tooltip>
                  <Tooltip label="Fôlego" description="Recupera 5 pontos de Mana/Energia"><button className="theater-qbtn blue"   onClick={() => quickStat('mana', 5)}><Droplets size={11} /> +Mana</button></Tooltip>
                  <Tooltip label="Recompensa de Cena" description="Atribui 50 de experiência"><button className="theater-qbtn amber"  onClick={() => quickStat('xp', 50)}><Star size={11} /> +XP</button></Tooltip>
                </div>
              )}
            </div>
          )}

          {activeSubmenu === 'narrativa' && (
            <div className="theater-submenu-section">
              <span className="theater-submenu-label">Ferramentas Narrativas</span>
              <div className="theater-submenu-row">
                <Tooltip label="Nova Cena" description="Inicia uma página limpa na história"><button className="theater-qbtn purple" onClick={() => createScene()}><Film size={11} /> + Cena</button></Tooltip>
                <Tooltip label="Relógio de Tensão" description="Adiciona um relógio temporizador global"><button className="theater-qbtn purple" onClick={addQuickClock}><Bell size={11} /> + Relógio</button></Tooltip>
                <Tooltip label="Biblioteca de Cutscenes" description="Projete imagens cinematográficas flutuantes">
                  <button
                    className="theater-qbtn purple"
                    style={{ boxShadow: '0 0 8px rgba(168,85,247,0.3)' }}
                    onClick={() => window.dispatchEvent(new CustomEvent('theater-open-drawer', { detail: 'narrativa' }))}
                  >
                    🎬 Cutscenes
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main bar */}
      <div className="theater-cockpit" style={{ display: isCollapsed ? 'none' : 'flex' }}>
        {/* Scene navigation — always visible */}
        <Tooltip label="Cena Anterior" description="Volta para a cena anterior">
          <button className="theater-icon-btn" onClick={handlePrevScene} disabled={!hasPrev} style={{ opacity: hasPrev ? 1 : 0.35 }}><ArrowLeft size={14} /></button>
        </Tooltip>

        <div
          className="theater-cockpit-scene-title"
          onClick={() => window.dispatchEvent(new CustomEvent('theater-open-drawer', { detail: 'ambiente' }))}
          title="Clique para abrir o Diretor de Cenas"
        >
          <Film size={12} style={{ color: '#a855f7', flexShrink: 0 }} />
          <span>{currentSceneIdx >= 0 ? scenes[currentSceneIdx]?.title : 'Sem Cena'}</span>
        </div>

        <Tooltip label="Avançar Cena" description="Avança para a próxima cena">
          <button className="theater-icon-btn" onClick={handleNextScene} disabled={!hasNext} style={{ opacity: hasNext ? 1 : 0.35 }}><ArrowRight size={14} /></button>
        </Tooltip>

        <div className="theater-cockpit-divider" />

        {/* Submenu tabs */}
        {TABS.map(t => {
          const isActive = activeSubmenu === t.id;
          // Show live indicator for atmosfera
          let badge: React.ReactNode = null;
          if (t.id === 'atmosfera' && activeMood && activeMood.value !== 'neutral') {
            badge = <span style={{ fontSize: '0.6rem', color: activeMood.color }}>{activeMood.emoji}</span>;
          }
          if (t.id === 'alvo' && selectedMember) {
            badge = selectedMember.avatar 
              ? <img src={selectedMember.avatar} style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} alt="" />
              : <span style={{ fontSize: '0.55rem', color: '#10b981' }}>{selectedMember.nome[0]}</span>;
          }

          return (
            <button
              key={t.id}
              className={`theater-cockpit-tab ${isActive ? 'active' : ''}`}
              style={isActive ? { color: t.accent, borderColor: t.accent } : {}}
              onClick={() => toggleSubmenu(t.id)}
            >
              {t.icon}
              <span className="theater-cockpit-tab-label">{t.label}</span>
              {badge}
            </button>
          );
        })}
      </div>
    </div>
  );
};
