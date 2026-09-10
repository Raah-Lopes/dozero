import React, { useEffect, useState } from 'react';
import { Timer, Flag, Route, Target, TriangleAlert, Play, Pause, Check, CheckCheck, FastForward, Plus, RotateCcw, Trash2, ChevronDown, ShieldCheck } from 'lucide-react';
import type { TensionClock } from '../../../store/clocks';
import { actOnMission, deleteMission, remainingTime } from '../../../store/missionClocks';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { confirmDialog } from '../../UI/Toast';
import './MissionClock.css';

export function MissionClockWidget({ clock, isGM }: { clock: TensionClock; isGM: boolean }) {
  const [now, setNow] = useState(Date.now);
  const [view, setView] = useState<'remaining' | 'journey'>('remaining');
  useEffect(() => {
    if (!clock.isRunning) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [clock.isRunning]);
  const mission = clock.mission!;
  const step = mission.steps[mission.current];
  const remaining = remainingTime(clock, Math.max(now, Date.now()));
  const seconds = Math.ceil(remaining / 1000);
  const fraction = step && clock.durationMs > 0 ? Math.min(1, remaining / clock.durationMs) : 0;
  const journey = (mission.current + (step ? 1 - fraction : 0)) / mission.steps.length;
  const value = Math.round((view === 'remaining' ? fraction : journey) * 100);
  const lastIndex = mission.current - 1;
  const urgent = Boolean(step && fraction <= .2);
  const successes = mission.outcomes.filter(o => o === 'saved').length;
  return <DraggableWindow id={clock.id} title={clock.label} initialX={40} initialY={80} width={440} dragAnywhere={false}>
    <section className={`mission-clock mission-dashboard${urgent ? ' is-urgent' : ''}`} aria-label={`Missão: ${clock.label}`}>
      <header className="mission-heading">
        <span className="mission-eyebrow"><Flag size={13} aria-hidden="true" /> Missão contra o tempo</span>
        <span className={`mission-status${clock.isRunning ? ' is-running' : ''}`}>{clock.isRunning ? 'Em curso' : step ? 'Pausada' : 'Encerrada'}</span>
      </header>
      <div className="mission-hero">
        <span className="mission-step-label">{step ? `Etapa ${mission.current + 1} de ${mission.steps.length}` : 'Missão encerrada'}</span>
        <h3>{step ? step.title : 'O destino foi escrito'}</h3>
        {step ? <div className="mission-countdown"><Timer size={22} aria-hidden="true" /><strong>{`${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`}</strong><span>para agir</span></div> : <div className="mission-completion"><ShieldCheck size={28} aria-hidden="true" /><strong>{successes}/{mission.steps.length} objetivos cumpridos</strong></div>}
      </div>
      <div className="mission-meter">
        <div className="mission-meter-heading"><label><span className="mission-sr-only">Barra de tensão</span><select aria-label="Barra de tensão" value={view} onChange={e => setView(e.target.value as typeof view)}><option value="remaining">Tempo restante da etapa</option><option value="journey">Caminho até o destino</option></select></label><span>{value}%</span></div>
        <div className="mission-track">
          <progress aria-label={view === 'remaining' ? 'Tempo restante da etapa' : 'Caminho até o destino'} max={100} value={value} />
          <div className="mission-track-ticks" aria-hidden="true">{Array.from({ length: view === 'journey' ? Math.min(mission.steps.length - 1, 29) : 3 }, (_, i) => <i key={i} style={{ left: `${(i + 1) / (view === 'journey' ? mission.steps.length : 4) * 100}%` }} />)}</div>
        </div>
        <div className="mission-meter-caption"><span>{view === 'journey' ? 'Partida' : clock.isRunning ? 'Tempo correndo' : 'Aguardando o mestre'}</span><span>{view === 'journey' ? <><Flag size={11} aria-hidden="true" /> Destino</> : urgent ? 'Prazo no limite' : 'Cada escolha conta'}</span></div>
      </div>
      {step && <div className="mission-briefing">
        <div className="mission-brief"><Target size={18} aria-hidden="true" /><div><h4>Objetivo dos heróis</h4><p>{step.objective}</p></div></div>
        {isGM && <div className="mission-brief mission-risk"><TriangleAlert size={18} aria-hidden="true" /><div><h4>Se o prazo acabar</h4><p>{step.consequence}</p></div></div>}
      </div>}
      <div aria-live="polite">{lastIndex >= 0 && <div className={`mission-result ${mission.outcomes[lastIndex] === 'expired' ? 'is-expired' : 'is-saved'}`}>
        {mission.outcomes[lastIndex] === 'expired' ? <TriangleAlert size={16} aria-hidden="true" /> : <CheckCheck size={16} aria-hidden="true" />}<p>{mission.outcomes[lastIndex] === 'expired' ? `Aconteceu: ${mission.steps[lastIndex].consequence}` : `Objetivo cumprido: ${mission.steps[lastIndex].title}. Consequência evitada.`}</p>
      </div>}</div>
      {isGM && step && <div className="mission-controls mission-actions">
        <button className="mission-primary" onClick={() => actOnMission(clock.id, clock.isRunning ? 'pause' : 'start')}>{clock.isRunning ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}{clock.isRunning ? 'Pausar' : 'Iniciar / retomar etapa'}</button>
        <button className="mission-success" onClick={() => actOnMission(clock.id, 'complete')}><Check size={16} aria-hidden="true" />Objetivo cumprido</button>
        <button onClick={() => actOnMission(clock.id, 'advance')}><FastForward size={14} aria-hidden="true" />Avançar 1 min</button>
        <button onClick={() => actOnMission(clock.id, 'extend')}><Plus size={14} aria-hidden="true" />Dar +1 min</button>
      </div>}
      <details className="mission-history"><summary><Route size={16} aria-hidden="true" /><span>Etapas e resultados</span><span className="mission-history-count">{mission.current}/{mission.steps.length}</span><ChevronDown className="mission-chevron" size={15} aria-hidden="true" /></summary>
        <ol>{mission.steps.map((s, index) => <li key={s.id} className={mission.outcomes[index] === 'saved' ? 'is-saved' : mission.outcomes[index] === 'expired' ? 'is-expired' : index === mission.current ? 'is-current' : ''}>
          <span className="mission-node" aria-hidden="true">{mission.outcomes[index] === 'saved' ? <Check size={13} /> : mission.outcomes[index] === 'expired' ? <TriangleAlert size={12} /> : index + 1}</span>
          <div className="mission-history-content"><strong>{s.title}</strong><small>{s.durationMs / 60000} min · {mission.outcomes[index] === 'saved' ? 'Cumprida' : mission.outcomes[index] === 'expired' ? 'Prazo esgotado' : index === mission.current ? 'Atual' : 'A seguir'}</small>{(isGM || index <= mission.current) && <p>{s.objective}</p>}{(isGM || mission.outcomes[index] === 'expired') && <p className="mission-danger">{s.consequence}</p>}</div>
        </li>)}</ol>
      </details>
      {isGM && <footer className="mission-footer mission-actions">
        <button onClick={async () => { if (await confirmDialog('Reiniciar esta missão e apagar seus resultados?')) actOnMission(clock.id, 'reset'); }}><RotateCcw size={13} aria-hidden="true" />Reiniciar missão</button>
        <button className="mission-delete" onClick={async () => { if (await confirmDialog(`Excluir a missão “${clock.label}”?`)) deleteMission(clock.id); }}><Trash2 size={13} aria-hidden="true" />Excluir missão</button>
      </footer>}
    </section>
  </DraggableWindow>;
}
