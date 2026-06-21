import React, { useState, useEffect } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { state } from '../../store';
import { Globe, Swords, Building, Coins, AlertTriangle } from 'lucide-react';

export const WorldEngineWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [factions, setFactions] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);

  useEffect(() => {
    const observer = () => {
      setFactions(state.world.get('factions') as any[] || []);
      setSettlements(state.world.get('settlements') as any[] || []);
    };
    state.world.observe(observer);
    observer();
    return () => state.world.unobserve(observer);
  }, []);

  return (
    <DraggableWindow id="world-engine" title="Motor de Mundo Vivo" initialX={window.innerWidth / 2 - 400} initialY={100} width={450} height={400} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.2rem', color: 'var(--text-primary)', height: '100%', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          <Globe size={24} color="var(--accent-primary)" />
          <h3 style={{ margin: 0, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Geopolítica Global</h3>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
          A cada semana de jogo (7 dias) o ecossistema simula conflitos invisíveis. Facções disputam Poder e afetam a economia e a segurança das regiões.
        </p>

        {/* Facções */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h4 style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Swords size={16} /> Facções em Guerra Fria
          </h4>
          
          {factions.map(f => (
            <div key={f.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{f.name}</span>
                <span style={{ fontSize: '0.8rem', color: f.power > 50 ? 'var(--danger)' : 'var(--text-secondary)' }}>Poder: {f.power}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${f.power}%`, height: '100%', background: f.power > 50 ? 'var(--danger)' : 'var(--accent-primary)', transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Assentamentos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          <h4 style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={16} /> Assentamentos (Cidades)
          </h4>
          
          {settlements.map(s => (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.75rem' }}>
              <div style={{ gridColumn: '1 / -1', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{s.name}</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} color="var(--danger)" /> Corrupção</span>
                  <span>{s.corruption}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                  <div style={{ width: `${s.corruption}%`, height: '100%', background: 'var(--danger)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Coins size={12} color="var(--success)" /> Economia</span>
                  <span>{s.economy}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                  <div style={{ width: `${s.economy}%`, height: '100%', background: 'var(--success)' }} />
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </DraggableWindow>
  );
};
