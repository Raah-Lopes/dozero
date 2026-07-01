import React from 'react';
import { useSceneState } from './hooks/useSceneState';
import { useCastData } from './hooks/useCastData';
import { setEntityBand, type DistanceZone } from '../../store';
import { Shield, Target, Crosshair, Navigation, Map as MapIcon } from 'lucide-react';

const ZONES: { id: DistanceZone; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'melee', label: 'Melee', icon: <Shield size={14} />, color: '#ef4444' },
  { id: 'close', label: 'Perto', icon: <Target size={14} />, color: '#f59e0b' },
  { id: 'medium', label: 'Médio', icon: <Crosshair size={14} />, color: '#3b82f6' },
  { id: 'far', label: 'Longe', icon: <Navigation size={14} />, color: '#8b5cf6' },
  { id: 'extreme', label: 'Extremo', icon: <MapIcon size={14} />, color: '#64748b' }
];

export const TacticalRadar: React.FC = () => {
  const { theaterData, enemies } = useSceneState();
  const { members } = useCastData();

  const bands = theaterData.entityBands || {};

  const allEntities = [
    ...members.map(m => ({ id: m.caminhoArquivo, name: m.nome, avatar: m.avatar, isEnemy: false })),
    ...enemies.map(e => ({ id: e.id, name: e.name, isEnemy: true }))
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
      <h3 style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>Radar Tático</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', paddingRight: '4px', flex: 1 }}>
        {allEntities.map(ent => {
          const currentZone = bands[ent.id] || (ent.isEnemy ? 'far' : 'close');
          
          return (
            <div 
              key={ent.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${ent.isEnemy ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                borderLeft: `3px solid ${ent.isEnemy ? '#ef4444' : '#10b981'}`,
                borderRadius: '8px',
                padding: '8px',
                gap: '8px'
              }}
            >
              {/* Info Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '4px', overflow: 'hidden',
                  background: ent.isEnemy ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white', fontWeight: 'bold'
                }}>
                  {ent.avatar ? <img src={ent.avatar} alt={ent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ent.name.substring(0, 2).toUpperCase()}
                </div>
                <span style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ent.name}
                </span>
              </div>
              
              {/* Radar Controls */}
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '4px' }}>
                {ZONES.map(z => {
                  const isActive = currentZone === z.id;
                  return (
                    <button
                      key={z.id}
                      onClick={() => setEntityBand(ent.id, z.id)}
                      title={z.label}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isActive ? `${z.color}30` : 'transparent',
                        border: `1px solid ${isActive ? z.color : 'transparent'}`,
                        color: isActive ? z.color : '#64748b',
                        padding: '4px 0',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {z.icon}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {allEntities.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
            Nenhum combatente em cena.
          </div>
        )}
      </div>
    </div>
  );
};
