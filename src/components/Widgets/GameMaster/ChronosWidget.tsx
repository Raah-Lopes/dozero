import React, { useEffect, useState } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { state, initChronos, getChronosState, getChronosConfig, setChronosConfig, getChronosEvents, addChronosEvent, updateChronosEvent, removeChronosEvent, advanceTimeOfDay, advanceDay, pushChatMessage } from '../../../store';
import type { ChronosEventLayer, ChronosState } from '../../../store';
import { Clock, Sun, Moon, Sunrise, CalendarDays, Tent, Coffee, Settings, History } from 'lucide-react';
import { CALENDAR_PRESETS, getCalendarDayNumber, getMoonPhase, parseCalendarMonths, serializeCalendarMonths, type CalendarConfig } from '../../../utils/fantasyCalendar';
import { WikiIndexer } from '../../../services/wiki/WikiIndexer';
import type { WikiEntry } from '../../../services/wiki/WikiQuery';
import { getWikiEntityType } from '../../../utils/wikiEntities';
import { ChronosTimeline } from './ChronosTimeline';

export const ChronosWidget: React.FC<{ onClose: () => void; isGM?: boolean }> = ({ onClose, isGM = true }) => {
  const [timeState, setTimeState] = useState<ChronosState | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDay, setEventDay] = useState('');
  const [eventMonth, setEventMonth] = useState('');
  const [eventYear, setEventYear] = useState('');
  const [eventLayer, setEventLayer] = useState<ChronosEventLayer>('world');
  const [eventWikiPath, setEventWikiPath] = useState('');
  const [wikiEntities, setWikiEntities] = useState<WikiEntry[]>([]);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarName, setCalendarName] = useState('');
  const [monthDefinitions, setMonthDefinitions] = useState('');
  const [weekdays, setWeekdays] = useState('');
  const [moonCycle, setMoonCycle] = useState('28');

  useEffect(() => {
    initChronos();

    const observer = () => {
      setTimeState({ ...getChronosState() });
    };

    state.chronos.observe(observer);
    observer();

    return () => {
      state.chronos.unobserve(observer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadWikiEntities = () => WikiIndexer.buildIndex().then(entries => {
      if (active) setWikiEntities(entries.filter(entry => getWikiEntityType(entry.metadata)));
    });
    void loadWikiEntities();
    window.addEventListener('wiki-updated', loadWikiEntities);
    return () => {
      active = false;
      window.removeEventListener('wiki-updated', loadWikiEntities);
    };
  }, []);

  if (!timeState) return null;
  const calendar = getChronosConfig();
  const currentMonth = calendar.months[timeState.month - 1];
  const moon = getMoonPhase(timeState.day, timeState.month, timeState.year, calendar);
  const todayEvents = getChronosEvents().filter(event => event.day === timeState.day && event.month === timeState.month && event.year === timeState.year);
  const currentDate = getCalendarDayNumber(timeState.day, timeState.month, timeState.year, calendar);
  const upcomingEvents = getChronosEvents()
    .filter(event => getCalendarDayNumber(event.day, event.month, event.year, calendar) > currentDate)
    .sort((a, b) => getCalendarDayNumber(a.day, a.month, a.year, calendar) - getCalendarDayNumber(b.day, b.month, b.year, calendar))
    .slice(0, 3);
  const weekday = calendar.weekdays.length ? calendar.weekdays[currentDate % calendar.weekdays.length] : '';

  const loadCalendarEditor = (config: CalendarConfig) => {
    setCalendarName(config.name);
    setMonthDefinitions(serializeCalendarMonths(config.months));
    setWeekdays(config.weekdays.join(', '));
    setMoonCycle(String(config.moonCycleDays));
  };
  const selectedEventMonth = calendar.months[(Number(eventMonth) || timeState.month) - 1] || currentMonth;

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
    <DraggableWindow id="chronos-widget" widgetKey="chronos" title="Motor Chronos" initialX={window.innerWidth / 2 - (timelineOpen ? 450 : 180)} initialY={80} onClose={onClose} width={timelineOpen ? 900 : 360} height={timelineOpen ? 650 : 560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', color: 'var(--text-primary)' }}>
        
        {/* Mostrador Principal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              Dia {timeState.day} <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>{currentMonth.name}</span>
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CalendarDays size={14} /> {weekday ? `${weekday} · ` : ''}{timeState.season} · Ano {timeState.year}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {moon.icon} {moon.name}
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {isGM && <button onClick={() => { loadCalendarEditor(calendar); setSettingsOpen(value => !value); }} title="Configurar calendário" style={{ alignSelf: 'flex-end', border: 0, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}><Settings size={14} /></button>}
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.1)' }}>
              {getTimeIcon(timeState.timeOfDay)}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{timeState.timeOfDay}</span>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={timelineOpen}
          onClick={() => setTimelineOpen(value => !value)}
          style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '7px', border: `1px solid ${timelineOpen ? 'var(--accent-primary)' : 'var(--glass-border)'}`, background: timelineOpen ? 'rgba(16,185,129,.14)' : 'var(--bg-secondary)', color: timelineOpen ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '.74rem', fontWeight: 700 }}
        >
          <History size={14} /> {timelineOpen ? 'Fechar linha do tempo' : 'Abrir linha do tempo'}
        </button>

        {timelineOpen ? (
          <ChronosTimeline calendar={calendar} current={timeState} events={getChronosEvents()} isGM={isGM} onMove={updateChronosEvent} onRemove={removeChronosEvent} />
        ) : null}

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
              <select value={eventLayer} onChange={event => setEventLayer(event.target.value as ChronosEventLayer)} aria-label="Camada do evento" style={{ flex: 1, minWidth: 0, padding: '5px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.72rem' }}>
                <option value="world">Mundo</option>
                <option value="campaign">Campanha</option>
                <option value="character">Personagens</option>
              </select>
              <select value={eventWikiPath} onChange={event => setEventWikiPath(event.target.value)} aria-label="Entidade da wiki vinculada" style={{ flex: 2, minWidth: 0, padding: '5px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.72rem' }}>
                <option value="">Sem vínculo com a wiki</option>
                {wikiEntities.map(entry => <option key={entry.path} value={entry.path}>{String(entry.metadata.nome || entry.metadata.name || entry.metadata.titulo || entry.slug)}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input type="number" value={eventDay} onChange={event => setEventDay(event.target.value)} placeholder={`Dia ${timeState.day}`} min="1" max={selectedEventMonth.days} style={{ width: '52px', padding: '5px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.72rem' }} />
              <select value={eventMonth} onChange={event => setEventMonth(event.target.value)} aria-label="Mês do evento" style={{ minWidth: 0, flex: 1, padding: '5px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.72rem' }}>
                <option value="">{currentMonth.name}</option>
                {calendar.months.map((month, index) => <option key={`${month.name}-${index}`} value={index + 1}>{month.name}</option>)}
              </select>
              <input type="number" value={eventYear} onChange={event => setEventYear(event.target.value)} placeholder={`Ano ${timeState.year}`} min="1" style={{ width: '66px', padding: '5px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.72rem' }} />
              <button onClick={() => { addChronosEvent(eventTitle, { day: Number(eventDay) || timeState.day, month: Number(eventMonth) || timeState.month, year: Number(eventYear) || timeState.year, timeOfDay: timeState.timeOfDay, season: selectedEventMonth.season }, { layer: eventLayer, wikiPath: eventWikiPath }); setEventTitle(''); setEventDay(''); setEventMonth(''); setEventYear(''); setEventWikiPath(''); }} style={{ padding: '5px 8px', background: 'var(--accent-primary)', border: 0, borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '0.72rem' }}>Adicionar</button>
            </div>
          </>}
        </div>

        {settingsOpen && isGM && <div style={{ display: 'grid', gap: '8px', padding: '10px', background: 'rgba(0,0,0,.3)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '.72rem' }}>
          <label style={{ display: 'grid', gap: '3px' }}>Preset
            <select value={calendar.id in CALENDAR_PRESETS ? calendar.id : 'custom'} onChange={event => {
              const preset = CALENDAR_PRESETS[event.target.value];
              if (preset) { setChronosConfig(preset); loadCalendarEditor(preset); }
            }} style={{ padding: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '5px' }}>
              <option value="custom" disabled>Personalizado</option>
              {Object.values(CALENDAR_PRESETS).map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '3px' }}>Nome
            <input value={calendarName} onChange={event => setCalendarName(event.target.value)} maxLength={60} style={{ padding: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '5px' }} />
          </label>
          <label style={{ display: 'grid', gap: '3px' }}>Meses — uma linha: nome, dias, estação
            <textarea value={monthDefinitions} onChange={event => setMonthDefinitions(event.target.value)} rows={5} style={{ padding: '6px', resize: 'vertical', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '5px' }} />
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <label style={{ display: 'grid', gap: '3px', flex: 1 }}>Dias da semana
              <input value={weekdays} onChange={event => setWeekdays(event.target.value)} placeholder="Lua, Marte, Sol" style={{ minWidth: 0, padding: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '5px' }} />
            </label>
            <label style={{ display: 'grid', gap: '3px', width: '72px' }}>Ciclo lunar
              <input type="number" min="1" max="999" step="0.01" value={moonCycle} onChange={event => setMoonCycle(event.target.value)} style={{ minWidth: 0, padding: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '5px' }} />
            </label>
          </div>
          <button onClick={() => {
            const months = parseCalendarMonths(monthDefinitions);
            if (!months.length) return;
            setChronosConfig({ id: 'custom', name: calendarName, months, weekdays: weekdays.split(',').map(day => day.trim()).filter(Boolean), moonCycleDays: Number(moonCycle) });
            setSettingsOpen(false);
          }} style={{ padding: '7px', background: 'var(--accent-primary)', border: 0, borderRadius: '6px', color: '#04130d', fontWeight: 700, cursor: 'pointer' }}>Aplicar calendário</button>
        </div>}

        {upcomingEvents.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Próximos Eventos</span>
          {upcomingEvents.map(event => <span key={event.id}>◦ {event.day} de {calendar.months[event.month - 1]?.name || event.month}, {event.year} — {event.title}</span>)}
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
