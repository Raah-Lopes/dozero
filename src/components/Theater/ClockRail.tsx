// src/components/Theater/ClockRail.tsx
import React, { useState } from 'react';
import { Clock, Plus, AlertTriangle } from 'lucide-react';
import { useTheaterClocks } from './hooks/useTheaterClocks';
import { addTensionClock } from '../../store';

export const ClockRail: React.FC = () => {
  const clocks = useTheaterClocks();
  const [now, setNow] = useState(Date.now());

  // Tick every second
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleAddClock = () => {
    const label = prompt('Nome do relógio:');
    if (!label) return;
    const mins = Number(prompt('Duração em minutos:', '5')) || 5;
    const id = `clock_theater_${Date.now()}`;
    addTensionClock({ id, x: 0, y: 0, label, durationMs: mins * 60000, endTime: Date.now() + mins * 60000, isRunning: true, hpMod: '0', mpMod: '0' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {clocks.length === 0 && (
        <div style={{ color: '#475569', fontSize: '0.8rem', textAlign: 'center', padding: '12px', fontStyle: 'italic' }}>
          Nenhum relógio ativo
        </div>
      )}
      {clocks.map(clock => {
        const remaining = clock.isRunning
          ? Math.max(0, clock.endTime - now)
          : (clock.pausedRemainingMs ?? 0);
        const percent = clock.durationMs > 0 ? remaining / clock.durationMs : 0;
        const fillPercent = Math.round((1 - percent) * 100);
        const isUrgent = fillPercent > 75;
        const isCritical = fillPercent > 90;

        const barColor = isCritical
          ? '#ef4444'
          : isUrgent
          ? '#f97316'
          : fillPercent > 50
          ? '#f59e0b'
          : '#10b981';

        const sec = Math.ceil(remaining / 1000);
        const min = Math.floor(sec / 60);
        const remSec = sec % 60;
        const timeStr = `${min.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;

        return (
          <div
            key={clock.id}
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${isCritical ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              transition: 'all 0.3s',
              boxShadow: isCritical ? '0 0 12px rgba(239,68,68,0.2)' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                {isCritical ? <AlertTriangle size={13} color="#ef4444" /> : <Clock size={13} color={barColor} />}
                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {clock.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isUrgent && (
                  <span style={{ fontSize: '0.6rem', background: `${barColor}22`, border: `1px solid ${barColor}44`, color: barColor, borderRadius: '4px', padding: '1px 5px', fontWeight: 700, textTransform: 'uppercase' }}>
                    {isCritical ? '⚠ CRÍTICO' : 'URGENTE'}
                  </span>
                )}
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: isCritical ? '#fca5a5' : '#94a3b8' }}>
                  {timeStr}
                </span>
              </div>
            </div>

            {/* Progress bar — fills left to right as time passes */}
            <div style={{ height: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${fillPercent}%`,
                  height: '100%',
                  background: `linear-gradient(to right, ${barColor}88, ${barColor})`,
                  borderRadius: '3px',
                  transition: 'width 1s linear',
                  boxShadow: isCritical ? `0 0 8px ${barColor}` : 'none',
                  animation: isCritical ? 'clockPulse 0.8s ease-in-out infinite alternate' : 'none',
                }}
              />
            </div>
            <style>{`@keyframes clockPulse { from { opacity: 0.8; } to { opacity: 1; } }`}</style>
          </div>
        );
      })}

      {/* Add clock button */}
      <button
        onClick={handleAddClock}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '8px', borderRadius: '8px',
          border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent',
          color: '#475569', cursor: 'pointer', fontSize: '0.78rem',
          transition: 'all 0.2s',
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'; e.currentTarget.style.color = '#a855f7'; }}
        onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#475569'; }}
      >
        <Plus size={14} /> Novo Relógio
      </button>
    </div>
  );
};
