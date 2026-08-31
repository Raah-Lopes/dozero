import React, { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowLeftRight, ArrowUp, BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Crown, Download, Edit3, Flame, Globe2, GripVertical, Image as ImageIcon, Landmark, ListTree, Menu, Plus, ScrollText, Search, Shield, Ship, Sparkles, Swords, Trash2, Upload, X, type LucideIcon } from 'lucide-react';
import { confirmDialog, toast } from '../../UI/Toast';
import { advanceDay, duplicateChronicleEra, getChronicleEras, getChronicleMeta, getChronosConfig, getChronosEvents, getChronosState, moveChronicleEra, removeChronicleEra, removeChronosEvent, reorderChronicleEra, replaceChronicle, saveChronicleEra, saveChronicleEvent, saveChronicleMeta, setChronosDate, state, toggleChronicleEra } from '../../../store';
import type { ChronicleEra, ChronicleEventKind, ChronicleMeta, ChronosEvent, ChronosEventLayer } from '../../../store';
import { convertImageToWebP } from '../../../utils/imageUtils';
import { uploadToSupabaseStorage } from '../../../services/storageService';
import { createChronicleArchive, downloadChronicle, parseChronicleArchive, type ChronicleArchive } from '../../../utils/chronicleArchive';
import { VisualCalendarView } from './VisualCalendarView';
import { LoreWorkspaceSwitcher } from '../../Navigation/LoreWorkspaceSwitcher';
import { WorkspaceChrome } from '../../Navigation/WorkspaceChrome';
import { useWindowManager } from '../../../hooks/useWindowManager';
import './ChronicleWidget.css';

const KINDS: Record<ChronicleEventKind, { label: string; icon: LucideIcon }> = {
  fundacao: { label: 'Fundação', icon: Landmark }, reinado: { label: 'Reinado', icon: Crown }, batalha: { label: 'Batalha', icon: Swords },
  descoberta: { label: 'Descoberta', icon: Search }, catastrofe: { label: 'Catástrofe', icon: Flame }, pacto: { label: 'Pacto', icon: ScrollText },
  magia: { label: 'Magia', icon: Sparkles }, jornada: { label: 'Jornada', icon: Ship }, queda: { label: 'Queda', icon: Shield }
};
const KIND_ORDER = Object.keys(KINDS) as ChronicleEventKind[];
const COLORS = ['#8b5cf6', '#d99a2b', '#d1495b', '#2f9e77', '#4a7dc9', '#2a9d8f', '#5fb3c9', '#c25e8a', '#a3702f', '#8a93a6'];

type EraDraft = { id?: string; name: string; startYear: string; endYear: string; color: string; description: string; backgroundUrl: string; collapsed?: boolean };
type EventDraft = { id?: string; eraId: string; title: string; day?: string; month?: string; year: string; datePrecision?: 'day' | 'year'; kind: ChronicleEventKind; layer: ChronosEventLayer; description: string; imageUrl: string; tags: string; wikiPath: string; characterId?: string; characterScope?: 'campaign' | 'vault' };
type TimelineLayout = 'vertical' | 'horizontal';
type WorkspaceMode = 'timeline' | 'calendar';

const fmtYear = (year: number, label: string) => `${year < 0 ? '−' : ''}${Math.abs(year)} ${label}`;
const fmtRange = (start: number, end: number, label: string) => `${start < 0 ? '−' : ''}${Math.abs(start)} – ${end < 0 ? '−' : ''}${Math.abs(end)} ${label}`;
const duration = (era: ChronicleEra) => Math.max(1, era.endYear - era.startYear + 1);
const roman = (index: number) => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][index] || String(index + 1);
const toEraDraft = (era?: ChronicleEra): EraDraft => ({ id: era?.id, name: era?.name || '', startYear: String(era?.startYear ?? 0), endYear: String(era?.endYear ?? 111), color: era?.color || COLORS[0], description: era?.description || '', backgroundUrl: era?.backgroundUrl || '', collapsed: era?.collapsed });
const nextEraDraft = (eras: ChronicleEra[]): EraDraft => { const start = (eras.at(-1)?.endYear ?? -1) + 1; return { name: '', startYear: String(start), endYear: String(start + 111), color: COLORS[eras.length % COLORS.length], description: '', backgroundUrl: '' }; };
const toEventDraft = (eraId: string, event?: ChronosEvent, defaultDate?: { day: number; month: number; year: number }): EventDraft => ({ id: event?.id, eraId: event?.eraId || eraId, title: event?.title || '', day: event?.day !== undefined ? String(event.day) : defaultDate?.day !== undefined ? String(defaultDate.day) : '', month: event?.month !== undefined ? String(event.month) : defaultDate?.month !== undefined ? String(defaultDate.month) : '', year: String(event?.year ?? defaultDate?.year ?? 0), datePrecision: event?.datePrecision ?? (defaultDate ? 'day' : 'year'), kind: event?.kind || 'fundacao', layer: event?.layer || 'world', description: event?.description || '', imageUrl: event?.imageUrl || '', tags: (event?.tags || []).join(', '), wikiPath: event?.wikiPath || '', characterId: event?.characterId, characterScope: event?.characterScope });

export const ChronicleWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [, rerender] = useState(0);
  const [query, setQuery] = useState('');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => window.localStorage.getItem('dozero:chronica-view-mode') === 'calendar' ? 'calendar' : 'timeline');
  const [eraEditor, setEraEditor] = useState<EraDraft | null>(null);
  const [eventEditor, setEventEditor] = useState<EventDraft | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ChronosEvent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragArmed, setDragArmed] = useState(false);
  const [overId, setOverId] = useState<string | null>(null);
  const [timelineLayout, setTimelineLayout] = useState<TimelineLayout>(() => window.localStorage.getItem('dozero:chronica-layout') === 'horizontal' ? 'horizontal' : 'vertical');
  const [activeEraId, setActiveEraId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollSyncRef = useRef<number | null>(null);

  useEffect(() => {
    const observer = () => rerender(value => value + 1);
    state.chronos.observe(observer);
    return () => {
      state.chronos.unobserve(observer);
      if (scrollSyncRef.current) window.clearTimeout(scrollSyncRef.current);
    };
  }, []);

  const eras = getChronicleEras();
  const allEvents = getChronosEvents();
  const meta = getChronicleMeta();
  const calendarConfig = getChronosConfig();
  const chronosState = getChronosState();

  const historicalEvents = allEvents.filter(event => event.datePrecision === 'year');
  const exactEvents = allEvents.filter(event => event.datePrecision !== 'year');
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const visibleEvents = useMemo(() => historicalEvents.filter(event => !normalizedQuery || [event.title, event.description, ...(event.tags || []), event.kind ? KINDS[event.kind].label : '', event.wikiPath].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(normalizedQuery))), [historicalEvents, normalizedQuery]);
  const eraIds = new Set(eras.map(era => era.id));
  const unassignedEvents = visibleEvents.filter(event => !event.eraId || !eraIds.has(event.eraId));
  const minYear = eras.length ? Math.min(...eras.map(era => era.startYear)) : null;
  const maxYear = eras.length ? Math.max(...eras.map(era => era.endYear)) : null;
  const activeEraIndex = Math.max(0, eras.findIndex(era => era.id === activeEraId));

  const changeWorkspaceMode = (mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    window.localStorage.setItem('dozero:chronica-view-mode', mode);
  };

  const navigateToEra = (eraId: string, layout = timelineLayout) => {
    setActiveEraId(eraId);
    requestAnimationFrame(() => document.getElementById(`chronica-era-${eraId}`)?.scrollIntoView({ behavior: 'smooth', block: layout === 'horizontal' ? 'nearest' : 'start', inline: layout === 'horizontal' ? 'center' : 'nearest' }));
  };
  const navigateBy = (direction: -1 | 1) => {
    const target = eras[activeEraIndex + direction];
    if (target) navigateToEra(target.id);
  };
  const changeTimelineLayout = (layout: TimelineLayout) => {
    setTimelineLayout(layout);
    window.localStorage.setItem('dozero:chronica-layout', layout);
    const eraId = eras[activeEraIndex]?.id;
    if (eraId) requestAnimationFrame(() => navigateToEra(eraId, layout));
  };
  const syncHorizontalEra = (container: HTMLDivElement) => {
    if (scrollSyncRef.current) window.clearTimeout(scrollSyncRef.current);
    scrollSyncRef.current = window.setTimeout(() => {
      const eraElements = [...container.querySelectorAll<HTMLElement>('.chronica-era')];
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft <= 2 || container.scrollLeft >= maxScroll - 2) {
        const edgeEra = container.scrollLeft <= 2 ? eraElements[0] : eraElements.at(-1);
        if (edgeEra?.dataset.eraId) setActiveEraId(edgeEra.dataset.eraId);
        return;
      }
      const center = container.scrollLeft + container.clientWidth / 2;
      const nearest = eraElements.reduce<HTMLElement | null>((best, era) => !best || Math.abs(era.offsetLeft + era.offsetWidth / 2 - center) < Math.abs(best.offsetLeft + best.offsetWidth / 2 - center) ? era : best, null);
      if (nearest?.dataset.eraId) setActiveEraId(nearest.dataset.eraId);
    }, 100);
  };

  const saveEra = (draft: EraDraft) => {
    const saved = saveChronicleEra({ id: draft.id, name: draft.name, startYear: Number(draft.startYear), endYear: Number(draft.endYear), color: draft.color, description: draft.description, backgroundUrl: draft.backgroundUrl || undefined, collapsed: draft.collapsed });
    if (!saved) return false;
    setEraEditor(null); toast.success(draft.id ? 'Era atualizada.' : `Era “${saved.name}” criada.`); return true;
  };
  const saveEvent = (draft: EventDraft) => {
    const saved = saveChronicleEvent({
      id: draft.id,
      eraId: draft.eraId || undefined,
      title: draft.title,
      day: draft.day ? Number(draft.day) : undefined,
      month: draft.month ? Number(draft.month) : undefined,
      year: Number(draft.year),
      datePrecision: draft.datePrecision || (draft.day && draft.month ? 'day' : 'year'),
      kind: draft.kind,
      layer: draft.layer,
      description: draft.description,
      imageUrl: draft.imageUrl,
      tags: draft.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      wikiPath: draft.wikiPath || undefined,
      characterId: draft.characterId,
      characterScope: draft.characterScope
    });
    if (!saved) return false;
    setEventEditor(null); toast.success(draft.id ? 'Registro atualizado.' : `“${saved.title}” registrado.`); return true;
  };
  const deleteEra = async (era: ChronicleEra) => { if (!await confirmDialog(`Remover a era “${era.name}”? Os eventos serão preservados em “Sem era”.`)) return; removeChronicleEra(era.id); toast.info('Era removida; registros preservados.'); };
  const deleteEvent = async (event: ChronosEvent) => { if (!await confirmDialog(`Remover “${event.title}” da cronologia?`)) return; removeChronosEvent(event.id); setSelectedEvent(null); toast.info('Registro removido.'); };
  const exportWorld = () => { downloadChronicle(createChronicleArchive(meta, eras, historicalEvents)); toast.success('Cronologia exportada em JSON.'); };
  const importWorld = async (file?: File) => { if (!file) return; try { const parsed = parseChronicleArchive(JSON.parse(await file.text()) as unknown); if (!parsed) throw new Error('invalid'); if (!await confirmDialog(`Importar “${parsed.meta.worldName}” substituirá as eras históricas atuais. Eventos do Chronos serão preservados.`)) return; replaceChronicle(parsed.eras, parsed.events, parsed.meta); toast.success(`Cronologia “${parsed.meta.worldName}” importada.`); } catch { toast.error('Arquivo inválido. Use um JSON exportado pelo Chronica.'); } finally { if (importRef.current) importRef.current.value = ''; } };
  const clearHistory = async () => { if (!await confirmDialog(`Apagar ${eras.length} eras e ${historicalEvents.length} registros históricos? Eventos do Chronos serão preservados.`)) return; replaceChronicle([], [], meta); setSettingsOpen(false); toast.info('Cronologia histórica apagada.'); };
  const loadExample = async () => { if (historicalEvents.length && !await confirmDialog('Carregar o exemplo substituirá a cronologia histórica atual. Continuar?')) return; const parsed = parseChronicleArchive(EXAMPLE_ARCHIVE); if (parsed) replaceChronicle(parsed.eras, parsed.events, parsed.meta); toast.success('Mundo de exemplo “Aethermoor” carregado.'); };
  const dropEra = (targetId: string) => { if (dragId && dragId !== targetId) { reorderChronicleEra(dragId, targetId); toast.info('Cronologia reordenada.'); } setDragId(null); setOverId(null); setDragArmed(false); };

  return (
    <div className="chronica" role="application" aria-label="Chronica — linha do tempo e calendário histórico">
      <ChronicaBackdrop eras={eras} />
      <WorkspaceChrome
        className="chronica-topbar"
        title="Chronica"
        subtitle="Linha do tempo & calendários"
        icon={<CalendarDays size={21} />}
        navigation={(
          <>
            <LoreWorkspaceSwitcher current="chronicle" />
            <button className="chronica-world-button" onClick={() => setSettingsOpen(true)} title="Configurações do mundo">
              <Globe2 size={15} /><span>{meta.worldName}</span><Edit3 size={12} />
            </button>
            <div className="chronica-workspace-switch" role="group" aria-label="Modo de Visualização">
              <button type="button" className={workspaceMode === 'timeline' ? 'active' : ''} onClick={() => changeWorkspaceMode('timeline')}>
                <ListTree size={14} /> Linha do Tempo
              </button>
              <button type="button" className={workspaceMode === 'calendar' ? 'active' : ''} onClick={() => changeWorkspaceMode('calendar')}>
                <CalendarDays size={14} /> Calendário Visual
              </button>
            </div>
          </>
        )}
        actions={(
          <>
            <button className="chronica-back workspace-chrome-button" onClick={onClose}><ArrowLeft size={17} /> Voltar à mesa</button>
            <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={event => void importWorld(event.target.files?.[0])} />
            <button className="chronica-button ghost workspace-chrome-button" aria-label="Importar cronologia" title="Importar cronologia" onClick={() => importRef.current?.click()}>
              <Upload size={15} /><span>Importar</span>
            </button>
            <button className="chronica-button ghost workspace-chrome-button" aria-label="Exportar cronologia" title="Exportar cronologia" onClick={exportWorld}>
              <Download size={15} /><span>Exportar</span>
            </button>
            <button className="chronica-button primary workspace-chrome-button workspace-chrome-button--primary" onClick={() => setEraEditor(nextEraDraft(eras))}>
              <Plus size={16} /> Nova era
            </button>
            <button className="chronica-icon-button mobile-close workspace-chrome-icon-button" onClick={onClose} aria-label="Fechar Chronica"><X size={18} /></button>
          </>
        )}
      />

      <main className="chronica-main">
        {workspaceMode === 'calendar' ? (
          <VisualCalendarView
            calendar={calendarConfig}
            chronosState={chronosState}
            events={allEvents}
            calendarLabel={meta.calendarLabel}
            isGM={true}
            onSelectEvent={setSelectedEvent}
            onAddEventOnDate={date => setEventEditor(toEventDraft('', undefined, date))}
            onSetChronosDate={date => {
              setChronosDate(date.day, date.month, date.year);
              toast.success(`Data operacional da campanha definida para ${date.day}/${date.month}/${date.year}.`);
            }}
            onAdvanceDay={() => {
              advanceDay();
              toast.success('Relógio da campanha avançou 1 dia.');
            }}
          />
        ) : (
          <>
            <section className="chronica-hero">
              <div>
                <span className="chronica-eyebrow">Crônica de</span>
                <h1>{meta.worldName}</h1>
                <p>Eras, eventos e imagens organizados numa linha do tempo viva — do mito de criação ao gancho da próxima sessão.</p>
                <button className="chronica-calendar-chip" onClick={() => setSettingsOpen(true)}>
                  <CalendarDays size={14} /> Calendário: <strong>{meta.calendarLabel}</strong>
                </button>
              </div>
              <div className="chronica-stats">
                <Stat value={eras.length} label="Eras" />
                <Stat value={historicalEvents.length} label="Eventos" />
                <Stat value={minYear === null ? '—' : `${fmtYear(minYear, meta.calendarLabel)} — ${fmtYear(maxYear!, meta.calendarLabel)}`} label="Extensão" wide />
              </div>
            </section>

            {eras.length ? <EraMap eras={eras} calendar={meta.calendarLabel} onNavigate={navigateToEra} /> : null}

            {!eras.length ? (
              <EmptyState onNew={() => setEraEditor(nextEraDraft(eras))} onExample={() => void loadExample()} />
            ) : (
              <>
                <section className="chronica-toolbar">
                  <label className="chronica-search">
                    <Search size={16} />
                    <input aria-label="Buscar na crônica" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar eventos, descrições, tipos ou tags…" />
                    {query ? <button onClick={() => setQuery('')} aria-label="Limpar busca"><X size={14} /></button> : null}
                  </label>
                  {normalizedQuery ? <strong>{visibleEvents.length} {visibleEvents.length === 1 ? 'registro encontrado' : 'registros encontrados'}</strong> : null}
                  <span className="chronica-drag-hint"><GripVertical size={15} /> Arraste uma era pelo punho para reordenar</span>
                </section>

                <nav className="chronica-navigation" aria-label="Navegação da linha do tempo">
                  <div className="chronica-layout-switch" role="group" aria-label="Orientação da linha do tempo">
                    <button className={timelineLayout === 'vertical' ? 'active' : ''} aria-pressed={timelineLayout === 'vertical'} onClick={() => changeTimelineLayout('vertical')} title="Visualização vertical">
                      <ListTree size={16} /> Vertical
                    </button>
                    <button className={timelineLayout === 'horizontal' ? 'active' : ''} aria-pressed={timelineLayout === 'horizontal'} onClick={() => changeTimelineLayout('horizontal')} title="Visualização horizontal">
                      <ArrowLeftRight size={16} /> Horizontal
                    </button>
                  </div>
                  <div className="chronica-era-jump">
                    <button onClick={() => navigateBy(-1)} disabled={activeEraIndex === 0} aria-label="Era anterior"><ChevronLeft size={18} /></button>
                    <label>
                      <span>Ir para</span>
                      <select value={eras[activeEraIndex]?.id || ''} onChange={event => navigateToEra(event.target.value)} aria-label="Ir para uma era">
                        {eras.map((era, index) => <option key={era.id} value={era.id}>{roman(index)} · {era.name}</option>)}
                      </select>
                    </label>
                    <button onClick={() => navigateBy(1)} disabled={activeEraIndex === eras.length - 1} aria-label="Próxima era"><ChevronRight size={18} /></button>
                  </div>
                  <small>{timelineLayout === 'horizontal' ? 'Use a roda, o trackpad ou Shift + roda para percorrer' : 'Use o mapa ou o seletor para saltar entre eras'}</small>
                </nav>

                <div ref={timelineRef} className={`chronica-timeline ${timelineLayout}`} tabIndex={0} aria-label={`Linha do tempo em orientação ${timelineLayout === 'horizontal' ? 'horizontal' : 'vertical'}`} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); navigateBy(-1); } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); navigateBy(1); } }} onScroll={event => { if (timelineLayout === 'horizontal') syncHorizontalEra(event.currentTarget); }} onWheel={event => { if (timelineLayout !== 'horizontal' || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return; event.currentTarget.scrollLeft += event.deltaY; event.preventDefault(); }}>
                  {eras.map((era, index) => (
                    <EraSection
                      key={era.id}
                      era={era}
                      index={index}
                      isLast={index === eras.length - 1}
                      calendar={meta.calendarLabel}
                      events={visibleEvents.filter(event => event.eraId === era.id).sort((a, b) => a.year - b.year || a.title.localeCompare(b.title))}
                      querying={Boolean(normalizedQuery)}
                      dragging={dragId === era.id}
                      over={overId === era.id && dragId !== era.id}
                      dragArmed={dragArmed}
                      onArm={() => setDragArmed(true)}
                      onDisarm={() => setDragArmed(false)}
                      onDragStart={event => { if (!dragArmed) { event.preventDefault(); return; } event.dataTransfer.effectAllowed = 'move'; setDragId(era.id); }}
                      onDragEnd={() => { setDragId(null); setOverId(null); setDragArmed(false); }}
                      onDragOver={event => { event.preventDefault(); if (dragId && dragId !== era.id) setOverId(era.id); }}
                      onDrop={event => { event.preventDefault(); dropEra(era.id); }}
                      onAdd={() => setEventEditor(toEventDraft(era.id))}
                      onEdit={() => setEraEditor(toEraDraft(era))}
                      onDuplicate={() => { duplicateChronicleEra(era.id); toast.success('Era e registros duplicados.'); }}
                      onDelete={() => void deleteEra(era)}
                      onMove={direction => moveChronicleEra(era.id, direction)}
                      onToggle={() => toggleChronicleEra(era.id)}
                      onOpenEvent={setSelectedEvent}
                      onEditEvent={event => setEventEditor(toEventDraft(era.id, event))}
                      onDeleteEvent={event => void deleteEvent(event)}
                    />
                  ))}
                </div>

                {unassignedEvents.length ? (
                  <section className="chronica-unassigned">
                    <header>
                      <div>
                        <h2>Registros sem era</h2>
                        <p>Eventos preservados após remoções ou importações podem ser reorganizados sem perda.</p>
                      </div>
                      <button className="chronica-button ghost" onClick={() => setEventEditor(toEventDraft(''))}>
                        <Plus size={15} /> Novo registro
                      </button>
                    </header>
                    <div className="chronica-event-grid">
                      {unassignedEvents.map((event, index) => (
                        <EventCard key={event.id} event={event} calendar={meta.calendarLabel} color="#8a93a6" delay={index} onOpen={() => setSelectedEvent(event)} onEdit={() => setEventEditor(toEventDraft('', event))} onDelete={() => void deleteEvent(event)} />
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            )}

            {exactEvents.length ? (
              <section className="chronica-operational">
                <div>
                  <CalendarDays size={18} />
                  <span>
                    <h2>Chronos operacional</h2>
                    <p>{exactEvents.length} eventos com dia e mês continuam sincronizados com o Calendário Visual e com o Chronos.</p>
                  </span>
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>

      <footer className="chronica-footer">
        <span><CalendarDays size={14} /><strong>CHRONICA</strong> — forje a história e o tempo do seu mundo</span>
        <span>Sincronizado com a mesa DOZERO</span>
      </footer>

      {eraEditor ? <EraModal draft={eraEditor} onClose={() => setEraEditor(null)} onSave={saveEra} /> : null}
      {eventEditor ? <EventModal draft={eventEditor} eras={eras} calendarConfig={calendarConfig} calendar={meta.calendarLabel} onClose={() => setEventEditor(null)} onSave={saveEvent} /> : null}
      {selectedEvent ? <EventDetail event={selectedEvent} era={eras.find(era => era.id === selectedEvent.eraId)} calendar={meta.calendarLabel} onClose={() => setSelectedEvent(null)} onEdit={() => { setEventEditor(toEventDraft(selectedEvent.eraId || '', selectedEvent)); setSelectedEvent(null); }} onDelete={() => void deleteEvent(selectedEvent)} /> : null}
      {settingsOpen ? <WorldSettings meta={meta} onClose={() => setSettingsOpen(false)} onSave={patch => { saveChronicleMeta(patch); setSettingsOpen(false); toast.success('Configurações salvas.'); }} onClear={() => void clearHistory()} /> : null}
    </div>
  );
};

const ChronicaBackdrop = ({ eras }: { eras: ChronicleEra[] }) => <div className="chronica-backdrop" aria-hidden="true">{[0, 1, 2, 3].map(index => <i key={index} style={{ '--glow': eras[index]?.color || COLORS[index] } as CSSProperties} />)}</div>;
const Stat = ({ value, label, wide }: { value: React.ReactNode; label: string; wide?: boolean }) => <div className={wide ? 'wide' : ''}><strong>{value}</strong><span>{label}</span></div>;
const EraMap = ({ eras, calendar, onNavigate }: { eras: ChronicleEra[]; calendar: string; onNavigate: (eraId: string) => void }) => <section className="chronica-era-map"><header><h2>Mapa da cronologia</h2><span>largura proporcional à duração · clique para navegar</span></header><div className="chronica-era-segments">{eras.map(era => <button key={era.id} style={{ '--era': era.color, flexGrow: duration(era) } as CSSProperties} onClick={() => onNavigate(era.id)}><strong>{era.name}</strong><span>{fmtRange(era.startYear, era.endYear, calendar)}</span><em>{duration(era)} anos · {era.name}</em></button>)}</div><footer><span>Início · <strong>{fmtYear(Math.min(...eras.map(era => era.startYear)), calendar)}</strong></span><span>{eras.length} eras</span><span>Fim · <strong>{fmtYear(Math.max(...eras.map(era => era.endYear)), calendar)}</strong></span></footer></section>;

type EraSectionProps = { era: ChronicleEra; index: number; isLast: boolean; calendar: string; events: ChronosEvent[]; querying: boolean; dragging: boolean; over: boolean; dragArmed: boolean; onArm: () => void; onDisarm: () => void; onDragStart: (event: DragEvent<HTMLElement>) => void; onDragEnd: () => void; onDragOver: (event: DragEvent<HTMLElement>) => void; onDrop: (event: DragEvent<HTMLElement>) => void; onAdd: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; onMove: (direction: -1 | 1) => void; onToggle: () => void; onOpenEvent: (event: ChronosEvent) => void; onEditEvent: (event: ChronosEvent) => void; onDeleteEvent: (event: ChronosEvent) => void };
const EraSection = (props: EraSectionProps) => { const { era, index, isLast, calendar, events, querying, dragging, over } = props; const [menuOpen, setMenuOpen] = useState(false); const allEraEvents = getChronosEvents().filter(event => event.eraId === era.id).length; return <section id={`chronica-era-${era.id}`} data-era-id={era.id} className={`chronica-era ${dragging ? 'dragging' : ''} ${over ? 'over' : ''}`} style={{ '--era': era.color } as CSSProperties} draggable={props.dragArmed} onDragStart={props.onDragStart} onDragEnd={props.onDragEnd} onDragOver={props.onDragOver} onDrop={props.onDrop}><div className="chronica-era-node">{era.name.trim().charAt(0).toUpperCase() || 'E'}</div><div className="chronica-era-panel">{era.backgroundUrl ? <><img className="chronica-era-bg" src={era.backgroundUrl} alt="" /><span className="chronica-era-shade" /></> : null}<header className="chronica-era-header"><button className="chronica-grip" onMouseDown={props.onArm} onMouseUp={props.onDisarm} onMouseLeave={props.onDisarm} aria-label={`Arrastar ${era.name}`}><GripVertical size={21} /></button><div className="chronica-era-copy"><div><span>Era {roman(index)}</span><em>{fmtRange(era.startYear, era.endYear, calendar)}</em><small>{allEraEvents} eventos</small></div><h2>{era.name}</h2>{era.description ? <p>{era.description}</p> : null}</div><div className="chronica-era-actions"><button className="chronica-button compact" onClick={props.onAdd}><Plus size={14} /> Evento</button><button className="chronica-icon-button" onClick={props.onToggle} aria-label={era.collapsed ? `Expandir ${era.name}` : `Recolher ${era.name}`}><ChevronDown className={era.collapsed ? '' : 'rotated'} size={19} /></button><button className="chronica-icon-button" onClick={() => setMenuOpen(value => !value)} aria-label={`Ações de ${era.name}`}><Menu size={18} /></button>{menuOpen ? <><button className="chronica-menu-shield" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" /><div className="chronica-era-menu"><MenuAction icon={Plus} label="Adicionar evento" onClick={props.onAdd} close={() => setMenuOpen(false)} /><MenuAction icon={Edit3} label="Editar era" onClick={props.onEdit} close={() => setMenuOpen(false)} /><MenuAction icon={Copy} label="Duplicar era" onClick={props.onDuplicate} close={() => setMenuOpen(false)} /><MenuAction icon={ArrowUp} label="Mover para cima" disabled={index === 0} onClick={() => props.onMove(-1)} close={() => setMenuOpen(false)} /><MenuAction icon={ArrowDown} label="Mover para baixo" disabled={isLast} onClick={() => props.onMove(1)} close={() => setMenuOpen(false)} /><MenuAction icon={Trash2} label="Excluir era" danger onClick={props.onDelete} close={() => setMenuOpen(false)} /></div></> : null}</div></header>{!era.collapsed ? <div className="chronica-event-grid">{events.length ? events.map((event, eventIndex) => <EventCard key={event.id} event={event} calendar={calendar} color={era.color} delay={eventIndex} onOpen={() => props.onOpenEvent(event)} onEdit={() => props.onEditEvent(event)} onDelete={() => props.onDeleteEvent(event)} />) : <div className="chronica-no-events"><CalendarDays size={24} /><p>{querying ? 'Nenhum registro corresponde à busca.' : 'Nenhum evento registrado nesta era ainda.'}</p>{!querying ? <button onClick={props.onAdd}><Plus size={15} /> Registrar o primeiro evento</button> : null}</div>}</div> : <div className="chronica-collapsed">{allEraEvents} eventos ocultos — expanda a era para visualizar</div>}</div></section>; };
const MenuAction = ({ icon: Icon, label, onClick, close, danger, disabled }: { icon: LucideIcon; label: string; onClick: () => void; close: () => void; danger?: boolean; disabled?: boolean }) => <button disabled={disabled} className={danger ? 'danger' : ''} onClick={() => { close(); onClick(); }}><Icon size={15} />{label}</button>;
const EventCard = ({ event, calendar, color, delay, onOpen, onEdit, onDelete }: { event: ChronosEvent; calendar: string; color: string; delay: number; onOpen: () => void; onEdit: () => void; onDelete: () => void }) => {
  const kind = KINDS[event.kind || 'fundacao'];
  const KindIcon = kind.icon;
  const dateFormatted = event.day && event.month ? `${event.day}/${event.month}/${event.year} ${calendar}` : fmtYear(event.year, calendar);
  return (
    <article className="chronica-event-card" style={{ '--era': color, '--delay': `${Math.min(delay * 60, 360)}ms` } as CSSProperties} onClick={onOpen}>
      {event.imageUrl ? <div className="chronica-event-image"><img src={event.imageUrl} alt="" loading="lazy" /></div> : null}
      <div className="chronica-event-body">
        <header>
          <span>{dateFormatted}</span>
          <em><KindIcon size={13} />{kind.label}</em>
        </header>
        <h3>{event.title}</h3>
        {event.description ? <p>{event.description}</p> : null}
        {event.tags?.length ? <div className="chronica-tags">{event.tags.map(tag => <small key={tag}>#{tag}</small>)}</div> : null}
      </div>
      <div className="chronica-card-actions">
        <button onClick={click => { click.stopPropagation(); onEdit(); }} aria-label={`Editar ${event.title}`}><Edit3 size={14} /></button>
        <button onClick={click => { click.stopPropagation(); onDelete(); }} aria-label={`Excluir ${event.title}`}><Trash2 size={14} /></button>
      </div>
    </article>
  );
};
const EmptyState = ({ onNew, onExample }: { onNew: () => void; onExample: () => void }) => <section className="chronica-empty"><CalendarDays size={42} /><h2>A cronologia aguarda</h2><p>Crie a primeira era para registrar os acontecimentos do seu mundo — ou carregue o exemplo para explorar o Chronica dentro da mesa.</p><div><button className="chronica-button primary" onClick={onNew}><Plus size={16} /> Criar primeira era</button><button className="chronica-button ghost" onClick={onExample}><BookOpen size={16} /> Carregar mundo de exemplo</button></div><ul><li><GripVertical size={16} /> Eras coloridas, reordenáveis e recolhíveis.</li><li><ImageIcon size={16} /> Imagens de fundo e imagens próprias em cada registro.</li><li><Download size={16} /> Importação e exportação compatíveis com o Chronica original.</li></ul></section>;

const Modal = ({ title, subtitle, onClose, children, footer, wide }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) => { useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]); return <div className="chronica-modal" role="dialog" aria-modal="true" aria-label={title}><button className="chronica-modal-backdrop" onClick={onClose} aria-label="Fechar ao clicar fora" /><div className={wide ? 'chronica-modal-card wide' : 'chronica-modal-card'}><header><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div><button className="chronica-icon-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button></header><div className="chronica-modal-body">{children}</div>{footer ? <footer>{footer}</footer> : null}</div></div>; };
const EraModal = ({ draft, onClose, onSave }: { draft: EraDraft; onClose: () => void; onSave: (draft: EraDraft) => boolean }) => { const [value, setValue] = useState(draft); const [error, setError] = useState(''); return <Modal title={draft.id ? 'Editar era' : 'Nova era'} subtitle="Eras agrupam os acontecimentos de um período do seu mundo." onClose={onClose} footer={<><button className="chronica-button ghost" onClick={onClose}>Cancelar</button><button className="chronica-button primary" onClick={() => { if (!value.name.trim() || !Number.isFinite(Number(value.startYear)) || !Number.isFinite(Number(value.endYear)) || Number(value.endYear) < Number(value.startYear)) { setError('Informe um nome e um intervalo válido.'); return; } onSave(value); }}><Check size={15} />{draft.id ? 'Salvar' : 'Criar era'}</button></>}><div className="chronica-form"><label><span>Nome da era *</span><input autoFocus value={value.name} onChange={event => setValue({ ...value, name: event.target.value })} placeholder="Ex: Era das Cinzas" /></label><div className="chronica-columns"><label><span>Início</span><input type="number" value={value.startYear} onChange={event => setValue({ ...value, startYear: event.target.value })} /></label><label><span>Fim</span><input type="number" value={value.endYear} onChange={event => setValue({ ...value, endYear: event.target.value })} /></label></div><label><span>Cor</span><div className="chronica-colors">{COLORS.map(color => <button key={color} type="button" style={{ background: color }} aria-label={`Usar cor ${color}`} aria-pressed={value.color === color} className={value.color === color ? 'selected' : ''} onClick={() => setValue({ ...value, color })} />)}</div></label><label><span>Descrição</span><textarea rows={4} value={value.description} onChange={event => setValue({ ...value, description: event.target.value })} placeholder="O que define este período?" /></label><ImageField label="Imagem de fundo" value={value.backgroundUrl} onChange={backgroundUrl => setValue({ ...value, backgroundUrl })} />{error ? <p className="chronica-error">{error}</p> : null}</div></Modal>; };
const EventModal = ({ draft, eras, calendarConfig, calendar, onClose, onSave }: { draft: EventDraft; eras: ChronicleEra[]; calendarConfig: ReturnType<typeof getChronosConfig>; calendar: string; onClose: () => void; onSave: (draft: EventDraft) => boolean }) => {
  const [value, setValue] = useState(draft);
  const [error, setError] = useState('');
  const era = eras.find(item => item.id === value.eraId);
  return (
    <Modal title={draft.id ? 'Editar evento' : 'Novo evento'} subtitle={era ? `Registrando em ${era.name} · ${fmtRange(era.startYear, era.endYear, calendar)}` : 'Registro histórico / operacional'} onClose={onClose} footer={<><button className="chronica-button ghost" onClick={onClose}>Cancelar</button><button className="chronica-button primary" onClick={() => { if (!value.title.trim() || !Number.isFinite(Number(value.year))) { setError('Informe um título e um ano válido.'); return; } onSave(value); }}><Check size={15} />{draft.id ? 'Salvar' : 'Criar evento'}</button></>}>
      <div className="chronica-form">
        <label>
          <span>Título *</span>
          <input autoFocus value={value.title} onChange={event => setValue({ ...value, title: event.target.value })} placeholder="Ex: A Queda de Vhal" />
        </label>
        <div className="chronica-columns">
          <label>
            <span>Ano *</span>
            <input type="number" value={value.year} onChange={event => setValue({ ...value, year: event.target.value })} />
          </label>
          <label>
            <span>Mês (opcional)</span>
            <select value={value.month || ''} onChange={event => setValue({ ...value, month: event.target.value, datePrecision: event.target.value ? 'day' : 'year' })}>
              <option value="">— Sem mês fixo —</option>
              {calendarConfig.months.map((m, idx) => (
                <option key={m.name} value={idx + 1}>{idx + 1}. {m.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Dia (opcional)</span>
            <input type="number" min="1" max="999" value={value.day || ''} onChange={event => setValue({ ...value, day: event.target.value, datePrecision: event.target.value ? 'day' : 'year' })} placeholder="1" />
          </label>
        </div>
        <label>
          <span>Era</span>
          <select value={value.eraId} onChange={event => setValue({ ...value, eraId: event.target.value })}>
            <option value="">Sem era</option>
            {eras.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <fieldset>
          <legend>Tipo de acontecimento</legend>
          <div className="chronica-kind-grid">
            {KIND_ORDER.map(kindId => {
              const kind = KINDS[kindId];
              const KindIcon = kind.icon;
              return <button type="button" key={kindId} className={value.kind === kindId ? 'selected' : ''} onClick={() => setValue({ ...value, kind: kindId })}><KindIcon size={15} />{kind.label}</button>;
            })}
          </div>
        </fieldset>
        <div className="chronica-columns">
          <label>
            <span>Camada</span>
            <select value={value.layer} onChange={event => setValue({ ...value, layer: event.target.value as ChronosEventLayer })}>
              <option value="world">Mundo</option>
              <option value="campaign">Campanha</option>
              <option value="character">Personagens</option>
            </select>
          </label>
          <label>
            <span>Entidade da Wiki</span>
            <input value={value.wikiPath} onChange={event => setValue({ ...value, wikiPath: event.target.value })} placeholder="Locais/Vhal.md" />
          </label>
        </div>
        <label>
          <span>Descrição</span>
          <textarea rows={5} value={value.description} onChange={event => setValue({ ...value, description: event.target.value })} placeholder="O que aconteceu? Quem esteve envolvido? Quais ganchos ficaram?" />
        </label>
        <ImageField label="Imagem do evento" value={value.imageUrl} onChange={imageUrl => setValue({ ...value, imageUrl })} />
        <label>
          <span>Tags</span>
          <input value={value.tags} onChange={event => setValue({ ...value, tags: event.target.value })} placeholder="dragões, profecia, Vhal" />
        </label>
        {error ? <p className="chronica-error">{error}</p> : null}
      </div>
    </Modal>
  );
};
const ImageField = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => { const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const upload = async (file?: File) => { if (!file) return; setBusy(true); try { const converted = await convertImageToWebP(file, .84, 1400); const cloudUrl = await uploadToSupabaseStorage(converted.base64, `chronica_${converted.filename}`); if (!cloudUrl) { toast.error('Não foi possível enviar a imagem para o Storage.'); return; } onChange(cloudUrl); } catch { toast.error('Não foi possível processar a imagem.'); } finally { setBusy(false); if (input.current) input.current.value = ''; } }; return <div><span className="chronica-label">{label}</span><input ref={input} hidden type="file" accept="image/*" onChange={event => void upload(event.target.files?.[0])} />{value ? <div className="chronica-image-preview"><img src={value} alt="Prévia" /><button type="button" onClick={() => onChange('')}><Trash2 size={14} /> Remover</button></div> : <button type="button" className="chronica-upload" disabled={busy} onClick={() => input.current?.click()}><Upload size={16} />{busy ? 'Processando e enviando…' : 'Enviar imagem'}</button>}</div>; };
const EventDetail = ({ event, era, calendar, onClose, onEdit, onDelete }: { event: ChronosEvent; era?: ChronicleEra; calendar: string; onClose: () => void; onEdit: () => void; onDelete: () => void }) => {
  const kind = KINDS[event.kind || 'fundacao'];
  const KindIcon = kind.icon;
  const dateFormatted = event.day && event.month ? `${event.day}/${event.month}/${event.year} ${calendar}` : fmtYear(event.year, calendar);
  return (
    <Modal wide title="Registro histórico / operacional" subtitle={`${era?.name || 'Sem era'} · ${dateFormatted}`} onClose={onClose} footer={<><button className="chronica-button danger" onClick={onDelete}><Trash2 size={15} /> Excluir</button><button className="chronica-button primary" onClick={onEdit}><Edit3 size={15} /> Editar</button></>}>
      <article className="chronica-detail" style={{ '--era': era?.color || '#8b5cf6' } as CSSProperties}>
        {event.imageUrl ? <img src={event.imageUrl} alt="" /> : null}
        <div className="chronica-detail-chips">
          <span>{dateFormatted}</span>
          <span>{era?.name || 'Sem era'}</span>
          <span><KindIcon size={14} />{kind.label}</span>
          <span>{event.layer === 'campaign' ? 'Campanha' : event.layer === 'character' ? 'Personagens' : 'Mundo'}</span>
        </div>
        <h2>{event.title}</h2>
        <p>{event.description || 'Sem descrição registrada.'}</p>
        {event.tags?.length ? <div className="chronica-tags">{event.tags.map(tag => <small key={tag}>#{tag}</small>)}</div> : null}
        {event.characterId ? <button className="chronica-button ghost" onClick={() => { const manager = useWindowManager.getState(); manager.setActiveCharacterId(event.characterId || null); manager.setSheetScope(event.characterScope || 'campaign'); manager.setViewMode('sheets'); }}><ScrollText size={15} /> Abrir ficha na Forja</button> : null}
        {event.wikiPath ? <button className="chronica-button ghost" onClick={() => window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: event.wikiPath } }))}><BookOpen size={15} /> Abrir entidade na Wiki</button> : null}
      </article>
    </Modal>
  );
};
const WorldSettings = ({ meta, onClose, onSave, onClear }: { meta: ChronicleMeta; onClose: () => void; onSave: (meta: ChronicleMeta) => void; onClear: () => void }) => { const [worldName, setWorldName] = useState(meta.worldName); const [calendarLabel, setCalendarLabel] = useState(meta.calendarLabel); return <Modal title="Mundo & calendário" onClose={onClose} footer={<><button className="chronica-button ghost" onClick={onClose}>Cancelar</button><button className="chronica-button primary" onClick={() => onSave({ worldName, calendarLabel })}><Check size={15} /> Salvar</button></>}><div className="chronica-form"><label><span>Nome do mundo</span><input autoFocus value={worldName} onChange={event => setWorldName(event.target.value)} /></label><label><span>Sufixo do calendário</span><input value={calendarLabel} onChange={event => setCalendarLabel(event.target.value)} placeholder="A.M., Ano, Era…" /></label><button className="chronica-clear" onClick={onClear}><Trash2 size={15} /> Apagar toda a cronologia histórica</button></div></Modal>; };

const EXAMPLE_ARCHIVE: ChronicleArchive = { version: 1, name: 'Aethermoor', calendar: 'A.M.', eras: [
  { id: 'era-alvorada', name: 'Alvorada dos Reinos', start: 0, end: 212, color: '#d99a2b', description: 'Após o Pacto do Marco, os povos livres ergueram cidades-estado ao longo do Rio Lumem.', background: null, collapsed: false, notes: [{ id: 'pacto-marco', title: 'O Pacto do Marco', year: 0, kind: 'pacto', description: 'As nove casas encerram a Guerra dos Estandartes e fundam o Concílio de Vhal.', image: null, tags: ['tratados', 'concílio'], layer: 'world', wikiPath: null }, { id: 'coroacao', title: 'Coroação da Rainha Ilyana', year: 44, kind: 'reinado', description: 'Ilyana é coroada sob o Arco de Aurum, unindo as casas do norte.', image: null, tags: ['Vhal', 'monarquia'], layer: 'world', wikiPath: null }] },
  { id: 'era-cinzas', name: 'Era das Cinzas', start: 213, end: 340, color: '#d1495b', description: 'O despertar de Pyraxis e a queda de Vhal mergulharam o continente em guerras e exílio.', background: null, collapsed: false, notes: [{ id: 'pyraxis', title: 'O Despertar de Pyraxis', year: 213, kind: 'catastrofe', description: 'O dragão ancestral emerge do Monte Cinza e três cidades viram vidro.', image: null, tags: ['dragões', 'profecia'], layer: 'world', wikiPath: null }, { id: 'queda-vhal', title: 'A Queda de Vhal', year: 247, kind: 'queda', description: 'A capital arde por quarenta dias e o trono permanece vazio.', image: null, tags: ['Vhal'], layer: 'campaign', wikiPath: null }] },
  { id: 'era-veu', name: 'Era do Véu', start: 341, end: 742, color: '#2a9d8f', description: 'O Véu entre os mundos afina. Espíritos caminham entre os vivos e cada escolha ecoa em duas realidades.', background: null, collapsed: false, notes: [{ id: 'fenda', title: 'A Primeira Fenda', year: 581, kind: 'magia', description: 'Sobre a Floresta de Nhem, o céu se abre como seda rasgada.', image: null, tags: ['véu', 'magia'], layer: 'world', wikiPath: null }, { id: 'chamado', title: 'O Chamado dos Heróis', year: 742, kind: 'jornada', description: 'Estrelas cadentes riscam o céu em direção às ruínas de Vhal.', image: null, tags: ['gancho', 'campanha'], layer: 'campaign', wikiPath: null }] }
] };
