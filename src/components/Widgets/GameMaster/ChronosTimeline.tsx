import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, GripVertical, LocateFixed, ZoomIn } from 'lucide-react';
import type { ChronosEvent, ChronosEventLayer, ChronosState } from '../../../store';
import type { CalendarConfig } from '../../../utils/fantasyCalendar';
import { buildTimelineBuckets, moveTimelineDate, placeTimelineDate, timelineBucketKey, type TimelineZoom } from '../../../utils/chronosTimeline';

const LAYERS: { id: ChronosEventLayer; label: string; color: string }[] = [
  { id: 'world', label: 'Mundo', color: '#38bdf8' },
  { id: 'campaign', label: 'Campanha', color: '#fbbf24' },
  { id: 'character', label: 'Personagens', color: '#c084fc' }
];

const ZOOMS: { id: TimelineZoom; label: string }[] = [
  { id: 'day', label: 'Dias' },
  { id: 'month', label: 'Meses' },
  { id: 'year', label: 'Anos' }
];

interface ChronosTimelineProps {
  calendar: CalendarConfig;
  current: ChronosState;
  events: ChronosEvent[];
  isGM: boolean;
  onMove: (id: string, patch: Partial<ChronosEvent>) => void;
  onRemove: (id: string) => void;
}

export const ChronosTimeline: React.FC<ChronosTimelineProps> = ({ calendar, current, events, isGM, onMove, onRemove }) => {
  const [zoom, setZoom] = useState<TimelineZoom>('month');
  const [offset, setOffset] = useState(0);
  const buckets = useMemo(() => buildTimelineBuckets(current, zoom, offset, calendar), [calendar, current, offset, zoom]);
  const currentKey = timelineBucketKey(current, zoom);
  const pageSize = zoom === 'day' ? 7 : zoom === 'month' ? 6 : 4;

  const dropEvent = (eventId: string, layer: ChronosEventLayer, targetDate: ChronosState) => {
    const source = events.find(event => event.id === eventId);
    if (!source || !isGM) return;
    onMove(source.id, { ...placeTimelineDate(source, targetDate, zoom, calendar), layer });
  };

  const moveEvent = (event: ChronosEvent, amount: number) => {
    onMove(event.id, moveTimelineDate(event, zoom, amount, calendar));
  };

  return (
    <section className="interactive-area" aria-label="Linha do tempo da campanha" style={{ display: 'grid', gap: '10px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
          <ZoomIn size={14} /> Escala
          {ZOOMS.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={zoom === option.id}
              onClick={() => { setZoom(option.id); setOffset(0); }}
              style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${zoom === option.id ? 'var(--accent-primary)' : 'var(--glass-border)'}`, background: zoom === option.id ? 'rgba(16,185,129,.16)' : 'var(--bg-secondary)', color: zoom === option.id ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button type="button" aria-label="Período anterior" onClick={() => setOffset(value => value - pageSize)} style={navButtonStyle}><ChevronLeft size={15} /></button>
          <button type="button" onClick={() => setOffset(0)} style={{ ...navButtonStyle, width: 'auto', paddingInline: '8px', gap: '4px' }}><LocateFixed size={13} /> Hoje</button>
          <button type="button" aria-label="Próximo período" onClick={() => setOffset(value => value + pageSize)} style={navButtonStyle}><ChevronRight size={15} /></button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--glass-border)', borderRadius: '10px', background: 'rgba(2,6,23,.38)' }}>
        <div style={{ minWidth: `${112 + buckets.length * 104}px` }}>
          <div style={{ display: 'grid', gridTemplateColumns: `112px repeat(${buckets.length}, minmax(104px, 1fr))`, borderBottom: '1px solid var(--glass-border)' }}>
            <div style={{ padding: '9px', color: 'var(--text-secondary)', fontSize: '.65rem', fontWeight: 800, textTransform: 'uppercase' }}>Camada</div>
            {buckets.map(bucket => (
              <div key={bucket.key} style={{ padding: '9px 6px', textAlign: 'center', color: bucket.key === currentKey ? 'var(--accent-primary)' : 'var(--text-secondary)', background: bucket.key === currentKey ? 'rgba(16,185,129,.09)' : 'transparent', borderLeft: '1px solid var(--glass-border)', fontSize: '.68rem', fontWeight: bucket.key === currentKey ? 800 : 600 }}>
                {bucket.label}
              </div>
            ))}
          </div>

          {LAYERS.map(layer => (
            <div key={layer.id} style={{ display: 'grid', gridTemplateColumns: `112px repeat(${buckets.length}, minmax(104px, 1fr))`, minHeight: '88px', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ padding: '10px', borderLeft: `3px solid ${layer.color}`, display: 'flex', alignItems: 'flex-start', color: layer.color, fontSize: '.72rem', fontWeight: 800 }}>
                {layer.label}
              </div>
              {buckets.map(bucket => {
                const cellEvents = events.filter(item => (item.layer || 'world') === layer.id && timelineBucketKey(item, zoom) === bucket.key);
                return (
                  <div
                    key={bucket.key}
                    onDragOver={event => { if (isGM) event.preventDefault(); }}
                    onDrop={event => { event.preventDefault(); dropEvent(event.dataTransfer.getData('text/chronos-event'), layer.id, { ...current, ...bucket.date }); }}
                    style={{ padding: '6px', display: 'grid', alignContent: 'start', gap: '5px', borderLeft: '1px solid var(--glass-border)', background: bucket.key === currentKey ? 'rgba(16,185,129,.045)' : 'transparent' }}
                  >
                    {cellEvents.map(item => (
                      <article
                        key={item.id}
                        style={{ padding: '6px', borderRadius: '7px', border: `1px solid ${layer.color}55`, borderLeft: `3px solid ${layer.color}`, background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxShadow: '0 4px 12px rgba(0,0,0,.16)' }}
                      >
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                          {isGM ? (
                            <span draggable onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/chronos-event', item.id); }} title={`Arrastar ${item.title}`} style={{ display: 'inline-flex', marginTop: '2px', flexShrink: 0, color: 'var(--text-secondary)', cursor: 'grab' }}>
                              <GripVertical size={12} aria-hidden />
                            </span>
                          ) : null}
                          <span style={{ flex: 1, minWidth: 0, fontSize: '.69rem', lineHeight: 1.25, overflowWrap: 'anywhere' }}>{item.title}</span>
                          {item.wikiPath ? (
                            <button type="button" aria-label={`Abrir ${item.title} na wiki`} title="Abrir entidade na wiki" onClick={() => window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: item.wikiPath } }))} style={cardButtonStyle}><BookOpen size={11} /></button>
                          ) : null}
                        </div>
                        {isGM ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '5px' }}>
                            <button type="button" aria-label={`Mover ${item.title} para trás`} onClick={() => moveEvent(item, -1)} style={cardButtonStyle}><ChevronLeft size={11} /></button>
                            <select aria-label={`Camada de ${item.title}`} value={item.layer || 'world'} onChange={event => onMove(item.id, { layer: event.target.value as ChronosEventLayer })} style={{ minWidth: 0, flex: 1, padding: '2px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '.6rem' }}>
                              {LAYERS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                            </select>
                            <button type="button" aria-label={`Mover ${item.title} para frente`} onClick={() => moveEvent(item, 1)} style={cardButtonStyle}><ChevronRight size={11} /></button>
                            <button type="button" aria-label={`Remover ${item.title}`} onClick={() => onRemove(item.id)} style={{ ...cardButtonStyle, color: 'var(--danger)' }}>×</button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '.66rem' }}>
        {isGM ? 'Arraste um evento entre períodos ou camadas. Os botões laterais oferecem o mesmo controle por teclado.' : 'A linha do tempo acompanha as alterações feitas pelo mestre em tempo real.'}
      </p>
    </section>
  );
};

const navButtonStyle: React.CSSProperties = { width: '30px', height: '28px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer' };
const cardButtonStyle: React.CSSProperties = { width: '20px', height: '20px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 0, borderRadius: '4px', background: 'rgba(255,255,255,.05)', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 };
