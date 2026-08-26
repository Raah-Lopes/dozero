import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, Compass, Flame, Info, Landmark, LocateFixed, Moon, Plus, ScrollText, Search, Shield, Ship, Sparkles, Sun, Swords, X } from 'lucide-react';
import type { ChronicleEventKind, ChronosEvent, ChronosEventLayer, ChronosState } from '../../../store';
import { getCalendarDayNumber, getMoonPhase, type CalendarConfig, type Season } from '../../../utils/fantasyCalendar';

const KINDS: Record<ChronicleEventKind, { label: string; icon: React.FC<{ size?: number }> }> = {
  fundacao: { label: 'Fundação', icon: Landmark },
  reinado: { label: 'Reinado', icon: Sparkles },
  batalha: { label: 'Batalha', icon: Swords },
  descoberta: { label: 'Descoberta', icon: Search },
  catastrofe: { label: 'Catástrofe', icon: Flame },
  pacto: { label: 'Pacto', icon: ScrollText },
  magia: { label: 'Magia', icon: Sparkles },
  jornada: { label: 'Jornada', icon: Ship },
  queda: { label: 'Queda', icon: Shield }
};

const LAYER_COLORS: Record<ChronosEventLayer, string> = {
  world: '#38bdf8',
  campaign: '#fbbf24',
  character: '#c084fc'
};

const SEASON_STYLES: Record<Season, { color: string; bg: string; icon: string }> = {
  Primavera: { color: '#34d399', bg: '#064e3b33', icon: '🌱' },
  Verão: { color: '#fbbf24', bg: '#78350f33', icon: '☀️' },
  Outono: { color: '#fb923c', bg: '#7c2d1233', icon: '🍂' },
  Inverno: { color: '#60a5fa', bg: '#1e3a8a33', icon: '❄️' }
};

export interface VisualCalendarViewProps {
  calendar: CalendarConfig;
  chronosState: ChronosState;
  events: ChronosEvent[];
  isGM?: boolean;
  calendarLabel?: string;
  onSelectEvent?: (event: ChronosEvent) => void;
  onAddEventOnDate?: (date: { day: number; month: number; year: number }) => void;
  onSetChronosDate?: (date: { day: number; month: number; year: number }) => void;
  onAdvanceDay?: () => void;
}

export const VisualCalendarView: React.FC<VisualCalendarViewProps> = ({
  calendar,
  chronosState,
  events,
  isGM = true,
  calendarLabel = 'Ano',
  onSelectEvent,
  onAddEventOnDate,
  onSetChronosDate,
  onAdvanceDay
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [viewYear, setViewYear] = useState<number>(chronosState.year);
  const [viewMonth, setViewMonth] = useState<number>(chronosState.month);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const months = calendar.months.length ? calendar.months : [{ name: 'Mês Único', days: 30, season: 'Primavera' as Season }];
  const safeMonthIndex = Math.max(0, Math.min(months.length - 1, viewMonth - 1));
  const currentMonth = months[safeMonthIndex];
  const weekdays = calendar.weekdays.length ? calendar.weekdays : ['Dia 1', 'Dia 2', 'Dia 3', 'Dia 4', 'Dia 5', 'Dia 6', 'Dia 7'];

  const startWeekdayOffset = useMemo(() => {
    const dayNumber = getCalendarDayNumber(1, safeMonthIndex + 1, viewYear, calendar);
    const length = weekdays.length;
    return ((dayNumber % length) + length) % length;
  }, [calendar, safeMonthIndex, viewYear, weekdays.length]);

  const changeMonth = (delta: number) => {
    let nextMonth = viewMonth + delta;
    let nextYear = viewYear;
    if (nextMonth > months.length) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = months.length;
      nextYear -= 1;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
    setSelectedDay(null);
  };

  const changeYear = (delta: number) => {
    setViewYear(y => y + delta);
    setSelectedDay(null);
  };

  const jumpToToday = () => {
    setViewMonth(chronosState.month);
    setViewYear(chronosState.year);
    setSelectedDay(chronosState.day);
  };

  const selectedDayEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return events.filter(event => event.year === viewYear && event.month === viewMonth && event.day === selectedDay);
  }, [events, viewYear, viewMonth, selectedDay]);

  const monthSeasonInfo = SEASON_STYLES[currentMonth.season] || SEASON_STYLES.Primavera;

  return (
    <div className="chronica-visual-calendar" role="region" aria-label="Calendário Visual Fantástico">
      <header className="chronica-cal-controls">
        <div className="chronica-cal-nav-group">
          <button type="button" className="chronica-cal-btn" onClick={() => changeYear(-10)} title="Voltar 10 Anos">
            <ChevronsLeft size={16} /> -10
          </button>
          <button type="button" className="chronica-cal-btn" onClick={() => changeYear(-1)} title="Ano Anterior">
            <ChevronLeft size={16} />
          </button>

          <div className="chronica-cal-heading">
            <div className="chronica-cal-month-title">
              <strong>{currentMonth.name}</strong>
              <span className="chronica-cal-season-badge" style={{ color: monthSeasonInfo.color, background: monthSeasonInfo.bg }}>
                {monthSeasonInfo.icon} {currentMonth.season}
              </span>
            </div>
            <div className="chronica-cal-year-title">
              <span>{viewYear < 0 ? `−${Math.abs(viewYear)}` : viewYear} {calendarLabel}</span>
              <small>({currentMonth.days} dias · {calendar.name})</small>
            </div>
          </div>

          <button type="button" className="chronica-cal-btn" onClick={() => changeYear(1)} title="Próximo Ano">
            <ChevronRight size={16} />
          </button>
          <button type="button" className="chronica-cal-btn" onClick={() => changeYear(10)} title="Avançar 10 Anos">
            +10 <ChevronsRight size={16} />
          </button>
        </div>

        <div className="chronica-cal-month-nav">
          <button type="button" className="chronica-cal-btn" onClick={() => changeMonth(-1)} title="Mês Anterior">
            <ChevronLeft size={16} /> Mês Anterior
          </button>
          <button type="button" className="chronica-cal-btn today-btn" onClick={jumpToToday} title="Saltar para o dia atual em jogo">
            <LocateFixed size={14} /> Ir para Hoje
          </button>
          <button type="button" className="chronica-cal-btn" onClick={() => changeMonth(1)} title="Próximo Mês">
            Próximo Mês <ChevronRight size={16} />
          </button>
        </div>

        <div className="chronica-cal-actions">
          <div className="chronica-cal-view-switch" role="group" aria-label="Visualização">
            <button
              type="button"
              className={viewMode === 'month' ? 'active' : ''}
              onClick={() => setViewMode('month')}
            >
              <CalendarIcon size={14} /> Mês
            </button>
            <button
              type="button"
              className={viewMode === 'year' ? 'active' : ''}
              onClick={() => setViewMode('year')}
            >
              <Compass size={14} /> Visão Anual
            </button>
          </div>

          {isGM && onAdvanceDay && (
            <button type="button" className="chronica-cal-btn advance-btn" onClick={onAdvanceDay} title="Avançar o relógio da campanha em 1 dia">
              <Sun size={14} /> +1 Dia em Jogo
            </button>
          )}
        </div>
      </header>

      {viewMode === 'month' && (
        <div className="chronica-month-container">
          <div className="chronica-cal-grid" style={{ '--weekdays-count': weekdays.length } as React.CSSProperties}>
            {weekdays.map(dayName => (
              <div key={dayName} className="chronica-cal-weekday">
                {dayName}
              </div>
            ))}

            {Array.from({ length: startWeekdayOffset }).map((_, idx) => (
              <div key={`offset-${idx}`} className="chronica-cal-day empty" aria-hidden="true" />
            ))}

            {Array.from({ length: currentMonth.days }).map((_, idx) => {
              const day = idx + 1;
              const isToday = day === chronosState.day && viewMonth === chronosState.month && viewYear === chronosState.year;
              const isSelected = selectedDay === day;
              const dayEvents = events.filter(e => e.year === viewYear && e.month === viewMonth && e.day === day);
              const moon = getMoonPhase(day, viewMonth, viewYear, calendar);

              return (
                <article
                  key={`day-${day}`}
                  className={`chronica-cal-day ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedDay(day)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDay(day); } }}
                  aria-label={`Dia ${day} de ${currentMonth.name}. ${isToday ? 'Dia atual da campanha.' : ''} ${dayEvents.length} acontecimentos.`}
                >
                  <div className="chronica-cal-day-header">
                    <span className="chronica-day-number">{day}</span>
                    <div className="chronica-cal-day-badges">
                      {isToday && <span className="chronica-today-badge">HOJE</span>}
                      <span className="chronica-moon-icon" title={`${moon.name} (${moon.icon})`}>
                        {moon.icon}
                      </span>
                    </div>
                  </div>

                  <div className="chronica-day-events">
                    {dayEvents.slice(0, 3).map(event => {
                      const kind = KINDS[event.kind || 'fundacao'];
                      const KindIcon = kind.icon;
                      const layerColor = LAYER_COLORS[event.layer || 'world'];
                      return (
                        <div
                          key={event.id}
                          className="chronica-day-event-pill"
                          style={{ borderLeftColor: layerColor }}
                          title={`${event.title} (${kind.label})`}
                          onClick={e => {
                            e.stopPropagation();
                            if (onSelectEvent) onSelectEvent(event);
                          }}
                        >
                          <span style={{ color: layerColor }}><KindIcon size={11} /></span>
                          <span className="chronica-event-pill-title">{event.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="chronica-day-more">+{dayEvents.length - 3} mais</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'year' && (
        <div className="chronica-year-overview">
          <div className="chronica-year-grid">
            {months.map((m, mIdx) => {
              const mNum = mIdx + 1;
              const mEvents = events.filter(e => e.year === viewYear && e.month === mNum);
              const isCurrentMonthInGame = viewYear === chronosState.year && mNum === chronosState.month;
              const seasonInfo = SEASON_STYLES[m.season] || SEASON_STYLES.Primavera;

              return (
                <div
                  key={m.name}
                  className={`chronica-year-card ${isCurrentMonthInGame ? 'current-ingame-month' : ''}`}
                  onClick={() => {
                    setViewMonth(mNum);
                    setViewMode('month');
                  }}
                >
                  <header className="chronica-year-card-header">
                    <div>
                      <strong>{m.name}</strong>
                      <small>{m.days} dias</small>
                    </div>
                    <span className="chronica-cal-season-badge compact" style={{ color: seasonInfo.color, background: seasonInfo.bg }}>
                      {seasonInfo.icon} {m.season}
                    </span>
                  </header>

                  <div className="chronica-year-card-stats">
                    <span><Clock size={12} /> {mEvents.length} acontecimentos</span>
                    {isCurrentMonthInGame && <span className="chronica-today-badge">Mês Atual</span>}
                  </div>

                  <div className="chronica-year-mini-days">
                    {Array.from({ length: Math.min(30, m.days) }).map((_, dIdx) => {
                      const dNum = dIdx + 1;
                      const hasEvent = mEvents.some(e => e.day === dNum);
                      const isTodayDay = isCurrentMonthInGame && dNum === chronosState.day;
                      return (
                        <i
                          key={dIdx}
                          className={`${hasEvent ? 'has-event' : ''} ${isTodayDay ? 'is-today' : ''}`}
                          title={`Dia ${dNum}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedDay !== null && (
        <div className="chronica-day-drawer-backdrop" onMouseDown={e => e.target === e.currentTarget && setSelectedDay(null)}>
          <aside className="chronica-day-drawer" role="dialog" aria-label={`Acontecimentos do dia ${selectedDay}`}>
            <header className="chronica-day-drawer-header">
              <div>
                <small>
                  {getMoonPhase(selectedDay, viewMonth, viewYear, calendar).name} · {currentMonth.season}
                </small>
                <h2>Dia {selectedDay} de {currentMonth.name}, {viewYear} {calendarLabel}</h2>
              </div>
              <button type="button" className="chronica-icon-button" onClick={() => setSelectedDay(null)} aria-label="Fechar painel do dia">
                <X size={18} />
              </button>
            </header>

            {isGM && (
              <div className="chronica-day-actions-bar">
                {onSetChronosDate && (
                  <button
                    type="button"
                    className="chronica-button primary compact"
                    onClick={() => {
                      onSetChronosDate({ day: selectedDay, month: viewMonth, year: viewYear });
                    }}
                  >
                    <Clock size={13} /> Sincronizar Relógio Operacional para este dia
                  </button>
                )}
                {onAddEventOnDate && (
                  <button
                    type="button"
                    className="chronica-button ghost compact"
                    onClick={() => {
                      onAddEventOnDate({ day: selectedDay, month: viewMonth, year: viewYear });
                      setSelectedDay(null);
                    }}
                  >
                    <Plus size={13} /> Registrar Acontecimento
                  </button>
                )}
              </div>
            )}

            <div className="chronica-day-events-list">
              <div className="chronica-section-head">
                <strong>Acontecimentos Registrados</strong>
                <span>{selectedDayEvents.length}</span>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="chronica-empty-day">
                  <Info size={28} />
                  <p>Nenhum acontecimento registrado para este dia.</p>
                  {isGM && onAddEventOnDate && (
                    <button
                      type="button"
                      className="chronica-button ghost"
                      onClick={() => {
                        onAddEventOnDate({ day: selectedDay, month: viewMonth, year: viewYear });
                        setSelectedDay(null);
                      }}
                    >
                      <Plus size={14} /> Adicionar primeiro evento
                    </button>
                  )}
                </div>
              ) : (
                selectedDayEvents.map(event => {
                  const kind = KINDS[event.kind || 'fundacao'];
                  const KindIcon = kind.icon;
                  const layerColor = LAYER_COLORS[event.layer || 'world'];
                  return (
                    <article
                      key={event.id}
                      className="chronica-day-event-card"
                      style={{ borderLeftColor: layerColor }}
                      onClick={() => onSelectEvent && onSelectEvent(event)}
                    >
                      <header>
                        <span style={{ color: layerColor }}><KindIcon size={14} /> {kind.label}</span>
                        <small>{event.layer === 'campaign' ? 'Campanha' : event.layer === 'character' ? 'Personagens' : 'Mundo'}</small>
                      </header>
                      <h3>{event.title}</h3>
                      {event.description && <p>{event.description}</p>}
                      {event.tags && event.tags.length > 0 && (
                        <div className="chronica-tags">
                          {event.tags.map(t => <small key={t}>#{t}</small>)}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
