// src/components/Theater/DirectorBar.tsx
import React, { useState } from 'react';
import { Swords, Shield, Target, Zap, Heart, Droplets, Star, CloudRain, Wind, Flame, Snowflake, Moon, Sun, Film, ArrowRight, Bell, ChevronUp, ChevronDown } from 'lucide-react';
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

export const DirectorBar: React.FC = () => {
  const { goToNextScene, createScene, theaterData, selectedCastMemberId } = useSceneState();
  const { members } = useCastData();
  const selectedMember = members.find(m => m.caminhoArquivo === selectedCastMemberId);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    const label = prompt('Nome do relógio:');
    if (!label) return;
    const mins = Number(prompt('Duração em minutos:', '5')) || 5;
    const id = `clock_director_${Date.now()}`;
    addTensionClock({ id, x: 0, y: 0, label, durationMs: mins * 60000, endTime: Date.now() + mins * 60000, isRunning: true, hpMod: '0', mpMod: '0' });
    addTheaterDiaryEntry({ timestamp: Date.now(), type: 'clock', text: `🔔 Relógio: "${label}" (${mins}min)` });
  };

  return (
    <div style={{ position: 'relative', zIndex: 20 }}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          top: '-24px',
          right: '20px',
          background: 'rgba(2,6,23,0.9)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          color: 'rgba(255,255,255,0.6)',
          padding: '2px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          zIndex: 21,
          transition: 'all 0.2s',
          height: '24px'
        }}
        title={isCollapsed ? 'Expandir Menu do Diretor' : 'Recolher Menu'}
        onMouseOver={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(15,23,42,1)'; }}
        onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(2,6,23,0.9)'; }}
      >
        {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <div className="theater-cockpit" style={{ display: isCollapsed ? 'none' : 'flex' }}>

      {/* MOOD pills */}
      <span className="theater-cockpit-label">Atmosfera</span>
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

      <div className="theater-cockpit-divider" />

      {/* WEATHER pills */}
      <span className="theater-cockpit-label">Clima</span>
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

      <div className="theater-cockpit-divider" />

      {/* QUICK DICE */}
      <span className="theater-cockpit-label">Dados</span>
      <Tooltip label="Rolagem Pura" description="Rola 1d20 sem nenhum modificador adicionado"><button className="theater-qbtn red"    onClick={() => roll('1d20', '1d20')}><Target size={11} /> 1d20</button></Tooltip>
      <Tooltip label="Rolagem de Ataque" description="Rola 1d20 com bônus de combate (+5)"><button className="theater-qbtn orange" onClick={() => roll('Ataque', '1d20+5')}><Swords size={11} /> Atq</button></Tooltip>
      <Tooltip label="Rolagem de Defesa" description="Rola 1d20 com bônus de reflexo (+3)"><button className="theater-qbtn blue"   onClick={() => roll('Defesa', '1d20+3')}><Shield size={11} /> Def</button></Tooltip>
      <Tooltip label="Dano de Impacto" description="Calcula a soma de 2 dados de 6 faces"><button className="theater-qbtn purple" onClick={() => roll('Dano', '2d6')}><Zap size={11} /> 2d6</button></Tooltip>
      <Tooltip label="Dano Massivo" description="Calcula a soma de 3 dados de 6 faces"><button className="theater-qbtn amber"  onClick={() => roll('Dano', '3d6')}>🎲 3d6</button></Tooltip>

      <div className="theater-cockpit-divider" />

      {/* HP / RESOURCES */}
      <span className="theater-cockpit-label" style={{ color: selectedMember ? '#10b981' : '#64748b' }}>
        {selectedMember ? `Alvo: ${selectedMember.nome.split(' ')[0]}` : 'Sem Alvo'}
      </span>
      <Tooltip label="Cura Leve" description="Restaura 5 Pontos de Vida ao NPC selecionado"><button className="theater-qbtn green"  onClick={() => quickStat('pv', 5)}   ><Heart size={11} /> +5</button></Tooltip>
      <Tooltip label="Cura Moderada" description="Restaura 10 Pontos de Vida ao NPC selecionado"><button className="theater-qbtn green"  onClick={() => quickStat('pv', 10)}  ><Heart size={11} /> +10</button></Tooltip>
      <Tooltip label="Ferimento Leve" description="Subtrai 5 Pontos de Vida do NPC selecionado"><button className="theater-qbtn red"    onClick={() => quickStat('pv', -5)}  ><Heart size={11} /> -5</button></Tooltip>
      <Tooltip label="Ferimento Grave" description="Subtrai 10 Pontos de Vida do NPC selecionado"><button className="theater-qbtn red"    onClick={() => quickStat('pv', -10)} ><Heart size={11} /> -10</button></Tooltip>
      <Tooltip label="Fôlego" description="Recupera 5 pontos de Mana/Energia ao NPC"><button className="theater-qbtn blue"   onClick={() => quickStat('mana', 5)}  ><Droplets size={11} /> +Mana</button></Tooltip>
      <Tooltip label="Recompensa de Cena" description="Atribui 50 de experiência ao NPC/Aliado"><button className="theater-qbtn amber"  onClick={() => quickStat('xp', 50)}><Star size={11} /> +XP</button></Tooltip>

      <div className="theater-cockpit-divider" />

      {/* NARRATIVE */}
      <span className="theater-cockpit-label">Narrativa</span>
      <Tooltip label="Nova Cena" description="Inicia uma página limpa na história para um novo contexto"><button className="theater-qbtn purple" onClick={() => createScene()}><Film size={11} /> + Cena</button></Tooltip>
      <Tooltip label="Avançar Cena" description="Conclui o ato atual e passa para o próximo estágio"><button className="theater-qbtn blue"   onClick={goToNextScene}><ArrowRight size={11} /> Próxima</button></Tooltip>
      <Tooltip label="Relógio de Tensão" description="Adiciona um relógio temporizador global para os jogadores"><button className="theater-qbtn purple" onClick={addQuickClock}><Bell size={11} /> + Relógio</button></Tooltip>
      <Tooltip label="Biblioteca de Cutscenes" description="Projete imagens cinematográficas flutuantes sobre a mesa">
        <button
          className="theater-qbtn purple"
          style={{ boxShadow: '0 0 8px rgba(168,85,247,0.3)' }}
          onClick={() => window.dispatchEvent(new CustomEvent('theater-open-drawer', { detail: 'cutscenes' }))}
        >
          🎬 Cutscenes
        </button>
      </Tooltip>
      </div>
    </div>
  );
};
