// src/components/Theater/StageClockOverlay.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Play, Pause, Plus, Trash2, RotateCcw, AlertTriangle, 
  ChevronUp, ChevronDown, X, Zap, BellRing
} from 'lucide-react';
import { useTheaterClocks } from './hooks/useTheaterClocks';
import { useIsGM } from '../../store/user';
import { 
  addTensionClock, 
  removeTensionClock, 
  pauseTensionClock, 
  resumeTensionClock, 
  addMinutesToClock, 
  resetTensionClock, 
  triggerClockConsequence,
  addTheaterDiaryEntry 
} from '../../store';
import { Tooltip } from '../UI/Tooltip';
import { toast } from '../UI/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const StageClockOverlay: React.FC<Props> = ({ isOpen, onClose }) => {
  const isGM = useIsGM();
  const clocks = useTheaterClocks();
  const [now, setNow] = useState(Date.now());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newMinutes, setNewMinutes] = useState(5);
  const [expiredAlarm, setExpiredAlarm] = useState<string | null>(null);
  const handledExpirations = useRef<Set<string>>(new Set());

  // Tick every second to drive the countdown only when clocks are running
  useEffect(() => {
    const hasRunningClocks = clocks.some(c => c.isRunning);
    if (!hasRunningClocks && !isCreating) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [clocks, isCreating]);

  // Check for expired clocks once without infinite loop
  useEffect(() => {
    clocks.forEach(clock => {
      if (clock.isRunning && clock.endTime <= now) {
        if (!handledExpirations.current.has(clock.id)) {
          handledExpirations.current.add(clock.id);
          triggerClockConsequence(clock.id);
          setExpiredAlarm(clock.label);
          setTimeout(() => setExpiredAlarm(null), 6000);

          toast.error(`⏰ O Relógio "${clock.label}" zerou!`);
          addTheaterDiaryEntry({
            timestamp: Date.now(),
            type: 'clock',
            text: `💥 O Relógio "${clock.label}" zerou! Consequência disparada no chat da mesa.`
          });
        }
      }
    });
  }, [now, clocks]);

  const handleCreate = (mins?: number) => {
    const duration = mins || newMinutes || 5;
    const label = newLabel.trim() || `Tensão (${duration} min)`;
    const id = `clock_${Date.now()}`;

    addTensionClock({
      id,
      x: 0,
      y: 0,
      label,
      durationMs: duration * 60000,
      endTime: Date.now() + duration * 60000,
      isRunning: true,
      hpMod: '0',
      mpMod: '0'
    });

    addTheaterDiaryEntry({
      timestamp: Date.now(),
      type: 'clock',
      text: `⏱️ Novo Relógio de Tensão: "${label}" (${duration} min)`
    });

    toast.success(`Relógio "${label}" ativado!`);
    setNewLabel('');
    setIsCreating(false);
  };

  // If closed, don't render overlay UI
  if (!isOpen) return null;

  return (
    <div className="theater-stage-clock-overlay" onClick={e => e.stopPropagation()}>
      {/* Expired Alarm Stage Banner */}
      {expiredAlarm && (
        <div className="theater-clock-alarm-banner">
          <BellRing size={16} className="theater-alarm-shake" />
          <span>TEMPO ESGOTADO: {expiredAlarm}!</span>
        </div>
      )}

      {/* Header */}
      <div className="theater-clock-overlay-header">
        <div className="theater-clock-overlay-title">
          <Clock size={16} className="theater-clock-pulse-icon" />
          <span>Relógios de Tensão ({clocks.length})</span>
        </div>

        <div className="theater-clock-overlay-tools">
          {isGM && (
            <Tooltip label={isCreating ? "Ver Relógios" : "Novo Relógio"}>
              <button 
                onClick={() => setIsCreating(!isCreating)}
                className={`theater-clock-tool-btn ${isCreating ? 'active' : ''}`}
              >
                <Plus size={14} />
                <span>{isCreating ? 'Lista' : 'Novo'}</span>
              </button>
            </Tooltip>
          )}

          <Tooltip label={isCollapsed ? "Expandir" : "Minimizar"}>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="theater-clock-tool-btn"
            >
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </Tooltip>

          <Tooltip label="Fechar da Tela (ESC)">
            <button 
              onClick={onClose}
              className="theater-clock-tool-btn close"
            >
              <X size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Creation Box (GM Only) */}
      {isGM && (isCreating || clocks.length === 0) && (
        <div className="theater-clock-create-box">
          <label className="theater-clock-field-label">Título do Evento / Perigo</label>
          <input 
            type="text" 
            placeholder="Ex: Fuga da Caverna, Reforços Inimigos, Armadilha de Água..."
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="theater-clock-input"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
          />

          <label className="theater-clock-field-label" style={{ marginTop: '4px' }}>Duração Rápida</label>
          <div className="theater-clock-presets">
            {[1, 3, 5, 10, 15].map(m => (
              <button 
                key={m}
                type="button"
                onClick={() => { setNewMinutes(m); handleCreate(m); }}
                className={`theater-clock-preset-btn ${newMinutes === m ? 'selected' : ''}`}
              >
                {m} Min
              </button>
            ))}
          </div>

          <div className="theater-clock-create-actions">
            {clocks.length > 0 && (
              <button type="button" onClick={() => setIsCreating(false)} className="theater-clock-cancel-btn">
                Cancelar
              </button>
            )}
            <button type="button" onClick={() => handleCreate()} className="theater-clock-confirm-btn">
              <Zap size={14} /> Iniciar Cronômetro
            </button>
          </div>
        </div>
      )}

      {/* Clocks List (when not collapsed) */}
      {!isCollapsed && clocks.length > 0 && (
        <div className="theater-clock-list">
          {clocks.map(clock => {
            const remaining = clock.isRunning
              ? Math.max(0, clock.endTime - now)
              : (clock.pausedRemainingMs ?? 0);

            const percent = clock.durationMs > 0 ? remaining / clock.durationMs : 0;
            const fillPercent = Math.min(100, Math.max(0, Math.round((1 - percent) * 100)));
            const isUrgent = fillPercent > 75;
            const isCritical = fillPercent > 90 || remaining === 0;

            const sec = Math.ceil(remaining / 1000);
            const min = Math.floor(sec / 60);
            const remSec = sec % 60;
            const timeStr = `${min.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;

            return (
              <div 
                key={clock.id} 
                className={`theater-clock-card ${isCritical ? 'critical' : isUrgent ? 'urgent' : ''}`}
              >
                <div className="theater-clock-card-top">
                  <div className="theater-clock-label-group">
                    {isCritical ? (
                      <AlertTriangle size={15} className="text-red-400 animate-pulse" />
                    ) : (
                      <Clock size={15} className="text-amber-400" />
                    )}
                    <strong title={clock.label}>{clock.label}</strong>
                  </div>

                  <div className="theater-clock-time-badge">
                    {!clock.isRunning && <span className="theater-clock-paused-tag">PAUSADO</span>}
                    <span className="theater-clock-digits">{timeStr}</span>
                  </div>
                </div>

                {/* Large Progress Bar */}
                <div className="theater-clock-bar-track">
                  <div 
                    className="theater-clock-bar-fill"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>

                {/* Clear, Big Controls (GM Only) */}
                {isGM && (
                  <div className="theater-clock-card-controls">
                    <button 
                      onClick={() => clock.isRunning ? pauseTensionClock(clock.id) : resumeTensionClock(clock.id)}
                      className={`theater-clock-btn-action ${clock.isRunning ? 'pause' : 'play'}`}
                      title={clock.isRunning ? "Pausar relógio" : "Continuar relógio"}
                    >
                      {clock.isRunning ? <Pause size={13} /> : <Play size={13} />}
                      <span>{clock.isRunning ? 'Pausar' : 'Retomar'}</span>
                    </button>

                    <div className="theater-clock-time-adjusts">
                      <button 
                        onClick={() => addMinutesToClock(clock.id, -1)}
                        className="theater-clock-btn-pill"
                        title="Avançar 1 minuto (reduzir tempo restante)"
                      >
                        -1m
                      </button>

                      <button 
                        onClick={() => addMinutesToClock(clock.id, 1)}
                        className="theater-clock-btn-pill"
                        title="Adicionar 1 minuto extra"
                      >
                        +1m
                      </button>
                    </div>

                    <button 
                      onClick={() => resetTensionClock(clock.id)}
                      className="theater-clock-btn-icon"
                      title="Reiniciar relógio"
                    >
                      <RotateCcw size={13} />
                    </button>

                    <button 
                      onClick={() => removeTensionClock(clock.id)}
                      className="theater-clock-btn-icon delete"
                      title="Concluir / Remover relógio"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
