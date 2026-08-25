import React, { useEffect, useState } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { state, initChronos, getChronosState, getChronosEvents, addChronosEvent, removeChronosEvent, advanceTimeOfDay, advanceDay, pushChatMessage } from '../../../store';
import type { ChronosState } from '../../../store';
import { Clock, Sun, Moon, Sunrise,  CalendarDays, Tent, Coffee } from 'lucide-react';
import { getMoonPhase } from '../../../utils/fantasyCalendar';

export const ChronosWidget: React.FC<{ onClose: () => void; isGM?: boolean }> = ({ onClose, isGM = true }) => {
  const [timeState, setTimeState] = useState<ChronosState | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDay, setEventDay] = useState('');
  const [eventMonth, setEventMonth] = useState('');
  const [eventYear, setEventYear] = useState('');

  useEffect(() => {
    initChronos();

    const observer = () => {
      setTimeState(getChronosState());
    };

    state.chronos.observe(observer);
    observer();

    return () => {
      state.chronos.unobserve(observer);
    };
  }, []);

  if (!timeState) return null;
  const moon = getMoonPhase(timeState.day, timeState.month, timeState.year);
  const todayEvents = getChronosEvents().filter(event => event.day === timeState.day && event.month === timeState.month && event.year === timeState.year);
  const currentDate = timeState.year * 360 + timeState.month * 30 + timeState.day;
  const upcomingEvents = getChronosEvents()
    .filter(event => event.year * 360 + event.month * 30 + event.day > currentDate)
    .sort((a, b) => (a.year * 360 + a.month * 30 + a.day) - (b.year * 360 + b.month * 30 + b.day))
    .slice(0, 3);

  const getTimeIcon = (time: string) => {
    switch (time) {
      case 'Manhã': return <Sunrise size={24} color="#fcd34d" />;
      case 'Tarde': return <Sun size={24} color="#fb923c" />;
      case 'Noite': return <Moon size={24} color="#818cf8" />;
      case 'Madrugada': return <Moon size={24} color="#4f46e5" />;
      default: return <Clock size={24} />;
    }
  };

  const handleCamp = () => {
    // Restores HP/Mana for everyone, logs to chat
    const tokens = Array.from(state.tokens.entries()) as [string, any][];
    let curados = 0;
    for (const [id, token] of tokens) {
      if (token.hp > 0 && token.isPlayer !== false) {
        state.tokens.set(id, { ...token, hp: token.maxHp || token.hp, mana: token.maxMana || token.mana });
        curados++;
      }
    }
    pushChatMessage(`🏕️ <b>Acampamento Longo!</b> ${curados} aventureiros descansaram e recuperaram todas as energias.`, false, false);
    advanceTimeOfDay();
  };

  return (
    <DraggableWindow id="chronos-widget" widgetKey="chronos" title="Motor Chronos" initialX={window.innerWidth / 2 - 160} initialY={100} onClose={onClose} width={320} height={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', color: 'var(--text-primary)' }}>
        
        {/* Mostrador Principal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              Dia {timeState.day} <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Mês {timeState.month}</span>
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CalendarDays size={14} /> {timeState.season} - Ano {timeState.year}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {moon.icon} {moon.name}
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.1)' }}>
              {getTimeIcon(timeState.timeOfDay)}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{timeState.timeOfDay}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Eventos de Hoje</span>
          {todayEvents.map(event => (
            <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.75rem', color: '#fde68a' }}>
              <span>📌 {event.title}</span>
              {isGM && <button onClick={() => removeChronosEvent(event.id)} style={{ background: 'none', border: 0, color: 'var(--danger)', cursor: 'pointer' }} title="Remover evento">×</button>}
            </div>
          ))}
          {isGM && <>
            <input value={eventTitle} onChange={event => setEventTitle(event.target.value)} placeholder="Novo evento" style={{ minWidth: 0, padding: '5px 7px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.72rem' }} />
            <div style={{ display: 'flex', gap: '4px' }}>
              <input type="number" value={eventDay} onChange={event => setEventDay(event.target.value)} placeholder={`Dia ${timeState.day}`} min="1" max="30" style={{ width: '52px', padding: '5px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.72rem' }} />
              <input type="number" value={eventMonth} onChange={event => setEventMonth(event.target.value)} placeholder={`Mês ${timeState.month}`} min="1" max="12" style={{ width: '58px', padding: '5px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.72rem' }} />
              <input type="number" value={eventYear} onChange={event => setEventYear(event.target.value)} placeholder={`Ano ${timeState.year}`} min="1" style={{ width: '66px', padding: '5px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.72rem' }} />
              <button onClick={() => { addChronosEvent(eventTitle, { day: Number(eventDay) || timeState.day, month: Number(eventMonth) || timeState.month, year: Number(eventYear) || timeState.year, timeOfDay: timeState.timeOfDay, season: timeState.season }); setEventTitle(''); setEventDay(''); setEventMonth(''); setEventYear(''); }} style={{ padding: '5px 8px', background: 'var(--accent-primary)', border: 0, borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '0.72rem' }}>Adicionar</button>
            </div>
          </>}
        </div>

        {upcomingEvents.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Próximos Eventos</span>
          {upcomingEvents.map(event => <span key={event.id}>◦ {event.day}/{event.month}/{event.year} — {event.title}</span>)}
        </div>}

        {/* Controles do Mestre */}
        {isGM && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Simulador de Tempo</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={advanceTimeOfDay}
                style={{ flex: 1, padding: '0.5rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', color: 'var(--mana)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}
              >
                <Clock size={14} /> +1 Período
              </button>
              
              <button 
                onClick={advanceDay}
                style={{ flex: 1, padding: '0.5rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}
                title="Avança um dia inteiro e aplica Dano de Fome passivo"
              >
                <Sun size={14} /> Avançar Dia
              </button>
            </div>
            
            <button onClick={handleCamp} style={{ padding: '0.6rem', flex: 1, background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '4px', color: '#22c55e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <Tent size={16} /> Acampamento (Restaurar)
            </button>

            {/* DLC: Downtime */}
            {(() => {
              const raw = state.dlcs.get('active');
              let active: string[] = [];
              if (raw) {
                if (typeof (raw as any).toArray === 'function') active = (raw as any).toArray();
                else if (Array.isArray(raw)) active = raw as string[];
                else active = Array.from(raw as any) as string[];
              }
              return active.includes('dlc_downtime');
            })() && (
              <button 
                onClick={() => {
                  const events = [
                    'Trabalhou na Taverna: Ganhou 50 de Ouro.',
                    'Entrou numa briga de rua: Perdeu 20 de Ouro e tomou 5 de Dano.',
                    'Estudou nos arquivos: Ganhou 100 XP.',
                    'Fez amizade com os guardas locais: Pode acessar a cidade à noite.',
                    'Ficou bêbado e perdeu a bolsa: Perdeu 1d100 de Ouro.',
                    'Ajudou um mercador: Ganhou 1 Poção de Cura.',
                  ];
                  const rnd = Math.floor(Math.random() * events.length);
                  pushChatMessage(`☕ **[TEMPOS DE CALMA]** Evento de Folga da Party: ${events[rnd]}`, true, false);
                }}
                style={{ padding: '0.6rem', flex: 1, background: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.4)', borderRadius: '4px', color: '#f472b6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 'bold', marginTop: '4px' }}
              >
                <Coffee size={16} /> Atividade de Downtime
              </button>
            )}
          </div>
        )}
        
      </div>
    </DraggableWindow>
  );
};
