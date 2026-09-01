import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bot, CalendarDays, Clock3, FilePenLine, GitFork, Grid3X3, Map, ScrollText, Sparkles, UsersRound } from 'lucide-react';
import { getTableSceneState, activateTableScene, onTableScenesChanged, type TableSceneState } from '../../../../store/tableScenes';
import { getChronicleEras, getChronosEvents, state } from '../../../../store';
import { normalizeCodex } from '../../../Wiki/Codex/codexModel';
import { useWindowManager } from '../../../../hooks/useWindowManager';
import type { CampaignData } from '../../../../store';

const CODEX_KEY = '__codex_v1__';

interface CampaignCockpitTabProps {
  campaign: CampaignData;
  onCreateDiaryEntry: () => void;
}

type StatCardProps = { icon: React.ElementType; label: string; value: number; detail: string; color: string };

const StatCard = ({ icon: Icon, label, value, detail, color }: StatCardProps) => (
  <article style={{ minWidth: 130, flex: '1 1 130px', padding: '12px', borderRadius: 10, border: `1px solid ${color}33`, background: `${color}12` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}><Icon size={14} />{label}</div>
    <strong style={{ display: 'block', marginTop: 7, color: 'var(--text-primary)', fontSize: '1.35rem' }}>{value}</strong>
    <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{detail}</span>
  </article>
);

const Action = ({ icon: Icon, title, description, onClick }: { icon: React.ElementType; title: string; description: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} style={{ textAlign: 'left', padding: 12, border: '1px solid var(--glass-border)', borderRadius: 9, background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
    <Icon size={17} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }} />
    <span><strong style={{ display: 'block', fontSize: '0.8rem' }}>{title}</strong><small style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', lineHeight: 1.35 }}>{description}</small></span>
  </button>
);

export const CampaignCockpitTab: React.FC<CampaignCockpitTabProps> = ({ campaign, onCreateDiaryEntry }) => {
  const [sceneState, setSceneState] = useState<TableSceneState>(() => getTableSceneState());
  const [revision, setRevision] = useState(0);
  const openWindow = useWindowManager(store => store.openWindow);
  const setViewMode = useWindowManager(store => store.setViewMode);
  const setActiveModal = useWindowManager(store => store.setActiveModal);
  const setShowActors = useWindowManager(store => store.setShowActors);

  useEffect(() => onTableScenesChanged(() => setSceneState(getTableSceneState())), []);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    state.wiki.observe(refresh);
    state.chronos.observe(refresh);
    state.lineage.observe(refresh);
    return () => { state.wiki.unobserve(refresh); state.chronos.unobserve(refresh); state.lineage.unobserve(refresh); };
  }, []);

  const dashboard = useMemo(() => {
    const codex = normalizeCodex(state.wiki.get(CODEX_KEY));
    const events = getChronosEvents();
    const lineage = state.lineage.get('atlas');
    const lineageCount = typeof lineage === 'string' ? (() => { try { return JSON.parse(lineage).people?.length || 0; } catch { return 0; } })() : 0;
    return { codex, events, lineageCount, eras: getChronicleEras().length };
  }, [revision]);

  const activeScene = sceneState.scenes.find(scene => scene.id === sceneState.activeId);
  const completedSessions = (campaign.sessions || []).filter(session => session.status === 'completed').length;
  const nextSession = [...(campaign.sessions || [])].filter(session => session.status === 'upcoming').sort((a, b) => a.date.localeCompare(b.date))[0];

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.25s ease-out' }}>
    <section style={{ padding: 15, borderRadius: 12, background: 'linear-gradient(135deg, rgba(168,85,247,.18), rgba(15,23,42,.72))', border: '1px solid rgba(168,85,247,.35)' }}>
      <span style={{ color: '#c084fc', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '.08em' }}>Central operacional</span>
      <h2 style={{ margin: '5px 0', fontSize: '1.08rem', color: 'var(--text-primary)' }}>{campaign.name}</h2>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.45 }}>Acompanhe o que está preparado para a mesa e abra cada espaço de criação sem perder o contexto da campanha.</p>
    </section>

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <StatCard icon={Grid3X3} label="Cenas" value={sceneState.scenes.length} detail={activeScene ? `Ativa: ${activeScene.name}` : 'Nenhuma cena ativa'} color="#38bdf8" />
      <StatCard icon={BookOpen} label="Códice" value={dashboard.codex.notes.length} detail={`${dashboard.codex.relations.length} relações`} color="#a78bfa" />
      <StatCard icon={CalendarDays} label="Chronica" value={dashboard.events.length} detail={`${dashboard.eras} eras registradas`} color="#e3b64f" />
      <StatCard icon={GitFork} label="Linhagem" value={dashboard.lineageCount} detail="pessoas no atlas" color="#fb923c" />
      <StatCard icon={FilePenLine} label="Diário" value={completedSessions} detail={`${campaign.sessions?.length || 0} sessões planejadas`} color="#4ade80" />
    </div>

    <section style={{ border: '1px solid var(--glass-border)', borderRadius: 10, padding: 13, background: 'var(--bg-tertiary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div><strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>Mesa e grid</strong><p style={{ margin: '3px 0 0', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{activeScene ? `Cena em jogo: ${activeScene.name}` : 'Crie a primeira cena para esta mesa.'}</p></div>
        <button type="button" className="cm-action-btn" onClick={() => setActiveModal('settings-cenario')}><Map size={13} /> Gerir cenas</button>
      </div>
      {sceneState.scenes.length > 0 && <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingTop: 11 }}>
        {sceneState.scenes.slice(0, 6).map(scene => <button key={scene.id} type="button" onClick={() => activateTableScene(scene.id)} disabled={scene.id === sceneState.activeId} style={{ whiteSpace: 'nowrap', padding: '6px 9px', borderRadius: 6, border: `1px solid ${scene.id === sceneState.activeId ? 'var(--accent-primary)' : 'var(--glass-border)'}`, background: scene.id === sceneState.activeId ? 'var(--accent-glow)' : 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: scene.id === sceneState.activeId ? 'default' : 'pointer', fontSize: '0.7rem', opacity: scene.id === sceneState.activeId ? 1 : .82 }}>{scene.id === sceneState.activeId ? 'Em jogo · ' : ''}{scene.name}</button>)}
      </div>}
    </section>

    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}><strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>Próximo passo</strong>{nextSession && <span style={{ color: 'var(--warning)', fontSize: '0.7rem' }}><Clock3 size={12} style={{ verticalAlign: -2 }} /> {new Date(`${nextSession.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))', gap: 8 }}>
        <Action icon={Bot} title="Desenvolver com IA" description="Abra o construtor que transforma seu briefing em lore, fichas, arcos e sessões revisáveis." onClick={() => openWindow('aiStudio')} />
        <Action icon={BookOpen} title="Abrir Códice" description="Consulte e conecte personagens, monstros, locais, facções e pistas." onClick={() => setViewMode('wiki')} />
        <Action icon={CalendarDays} title="Organizar a história" description="Registre acontecimentos e eras na Chronica; use o Chronos durante a sessão." onClick={() => openWindow('chronicle')} />
        <Action icon={GitFork} title="Ver famílias e casas" description="Abra o Atlas de Linhagem para relações dinásticas e sociais." onClick={() => openWindow('lineage')} />
        <Action icon={UsersRound} title="Fichas e atores" description="Acesse fichas da mesa e a biblioteca de NPCs, monstros e personagens." onClick={() => { setShowActors(true); setViewMode('sheets'); }} />
        <Action icon={ScrollText} title="Registrar diário" description="Crie a próxima entrada do diário de produção e da sessão." onClick={onCreateDiaryEntry} />
      </div>
    </section>
  </div>;
};
