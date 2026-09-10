import React, { useState } from 'react';
import { Flag, Crown, Plus, ArrowUp, ArrowDown, Trash2, Info, Check } from 'lucide-react';
import { saveMission, type MissionStep } from '../../../store/missionClocks';
import './MissionClock.css';

const blankStep = (): MissionStep => ({ id: crypto.randomUUID(), title: '', objective: '', consequence: '', durationMs: 300000 });
const example = () => [
  ['O aviso', 'Descobrir quem planeja o golpe.', 'Os conspiradores cortam as comunicações.'],
  ['A passagem', 'Encontrar uma entrada para o palácio.', 'Os portões do palácio são fechados.'],
  ['Salvar a rainha', 'Chegar aos aposentos e entregar o antídoto.', 'A rainha morre envenenada.'],
  ['Defender o castelo', 'Alertar a guarda e bloquear os acessos.', 'Os usurpadores invadem o castelo.'],
  ['O destino do reino', 'Reunir os aliados e proteger o herdeiro.', 'O herdeiro é capturado e o golpe se consolida.'],
].map(([title, objective, consequence]) => ({ ...blankStep(), title, objective, consequence }));

export function MissionClockEditor({ onClose }: { onClose: () => void }) {
  const [label, setLabel] = useState('');
  const [steps, setSteps] = useState<MissionStep[]>(() => [blankStep()]);
  const [error, setError] = useState('');
  const update = (id: string, patch: Partial<MissionStep>) => setSteps(previous => previous.map(s => s.id === id ? { ...s, ...patch } : s));
  const move = (index: number, direction: number) => setSteps(previous => {
    const copy = [...previous];
    [copy[index], copy[index + direction]] = [copy[index + direction], copy[index]];
    return copy;
  });
  return <form className="mission-clock mission-editor" onSubmit={e => {
    e.preventDefault();
    if (saveMission(label, steps)) onClose();
    else setError('Preencha os campos e use durações entre 1 segundo e 24 horas. Apenas o mestre pode criar missões.');
  }}>
    <div className="mission-editor-intro"><span className="mission-editor-emblem"><Flag size={22} aria-hidden="true" /></span><div><h3>Missão contra o tempo</h3><p>Dê peso a cada escolha. Defina o objetivo, o prazo e o que está em jogo em cada etapa.</p></div></div>
    <button className="mission-template" type="button" onClick={() => { setLabel('A queda da coroa'); setSteps(example()); }}><Crown size={18} aria-hidden="true" />Usar exemplo: salvar a rainha (5 etapas)</button>
    <label>Nome da missão<input required placeholder="Ex.: A queda da coroa" maxLength={120} value={label} onChange={e => setLabel(e.target.value)} /></label>
    <div className="mission-heading"><span className="mission-eyebrow">Roteiro da missão</span><span className="mission-status">{steps.length} / 30 etapas</span></div>
    {steps.map((step, index) => <fieldset key={step.id}>
      <legend>Etapa {index + 1}</legend>
      <div className="mission-editor-fields"><label>Título<input required placeholder="O próximo desafio" maxLength={120} value={step.title} onChange={e => update(step.id, { title: e.target.value })} /></label>
      <label>Prazo (min)<input aria-label={`Tempo para agir na etapa ${index + 1} (minutos)`} type="number" required min={1 / 60} max={1440} step="any" value={step.durationMs / 60000 || ''} onChange={e => update(step.id, { durationMs: Number(e.target.value) * 60000 })} /></label></div>
      <label>O que os heróis precisam fazer<textarea required maxLength={1000} value={step.objective} onChange={e => update(step.id, { objective: e.target.value })} /></label>
      <label>O que acontece se o tempo acabar<textarea required maxLength={1000} value={step.consequence} onChange={e => update(step.id, { consequence: e.target.value })} /></label>
      <div className="mission-actions mission-step-tools">
        <button type="button" disabled={index === 0} aria-label={`Mover etapa ${index + 1} para cima`} onClick={() => move(index, -1)}><ArrowUp size={14} aria-hidden="true" /></button>
        <button type="button" disabled={index === steps.length - 1} aria-label={`Mover etapa ${index + 1} para baixo`} onClick={() => move(index, 1)}><ArrowDown size={14} aria-hidden="true" /></button>
        <button type="button" disabled={steps.length === 1} onClick={() => setSteps(previous => previous.filter(s => s.id !== step.id))}><Trash2 size={13} aria-hidden="true" />Remover etapa {index + 1}</button>
      </div>
    </fieldset>)}
    <button className="mission-add-step" type="button" disabled={steps.length >= 30} onClick={() => setSteps(previous => [...previous, blankStep()])}><Plus size={16} aria-hidden="true" />Adicionar etapa</button>
    <p className="mission-editor-note"><Info size={14} aria-hidden="true" />Cada etapa começa pausada. Objetivos e resultados são compartilhados com a mesa; não inclua segredos que exijam confidencialidade.</p>
    {error && <p role="alert">{error}</p>}
    <div className="mission-actions mission-editor-submit"><button type="button" onClick={onClose}>Cancelar</button><button className="mission-primary" type="submit"><Check size={16} aria-hidden="true" />Criar missão pausada</button></div>
  </form>;
}
