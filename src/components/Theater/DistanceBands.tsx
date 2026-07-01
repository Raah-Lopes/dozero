import React, { useState } from 'react';
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

export const DistanceBands: React.FC = () => {
  const { theaterData, enemies } = useSceneState();
  const { members } = useCastData();
  const [draggedEntity, setDraggedEntity] = useState<string | null>(null);

  const bands = theaterData.entityBands || {};

  const getEntitiesInZone = (zone: DistanceZone) => {
    const list: Array<{ id: string; name: string; avatar?: string; isEnemy: boolean }> = [];
    
    // Players and NPCs
    members.forEach(m => {
      const b = bands[m.caminhoArquivo] || 'close'; // Default close
      if (b === zone) {
        list.push({ id: m.caminhoArquivo, name: m.nome, avatar: m.avatar, isEnemy: false });
      }
    });

    // Enemies
    enemies.forEach(e => {
      const b = bands[e.id] || 'far'; // Default far for enemies
      if (b === zone) {
        list.push({ id: e.id, name: e.name, isEnemy: true });
      }
    });

    return list;
  };

  const handleDrop = (e: React.DragEvent, zone: DistanceZone) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedId = e.dataTransfer.getData('text/plain') || draggedEntity;
    console.log('Drop ID:', droppedId, 'Zone:', zone);
    if (droppedId) {
      setEntityBand(droppedId, zone);
      setDraggedEntity(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
      <h3 style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>Zonas de Combate</h3>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px', overflowY: 'auto', paddingRight: '4px' }}>
        {ZONES.map(zone => {
          const entities = getEntitiesInZone(zone.id);
          return (
            <div 
              key={zone.id}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, zone.id)}
              style={{
                minHeight: '100px',
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${zone.color}40`,
                borderLeft: `4px solid ${zone.color}`,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: zone.color }}>{zone.icon}</span>
                {zone.label}
              </div>
              <div style={{ padding: '8px', flex: 1, display: 'flex', flexWrap: 'wrap', gap: '6px', alignContent: 'flex-start' }}>
                {entities.map(ent => (
                  <div
                    key={ent.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggedEntity(ent.id);
                      e.dataTransfer.setData('text/plain', ent.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    style={{
                      width: '42px',
                      height: '56px',
                      borderRadius: '6px',
                      background: ent.isEnemy ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                      border: `1.5px solid ${ent.isEnemy ? '#ef4444' : '#10b981'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      color: 'white',
                      cursor: 'grab',
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                      position: 'relative'
                    }}
                    title={ent.name}
                  >
                    {ent.avatar ? (
                      <img src={ent.avatar} alt={ent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      ent.name.substring(0, 2).toUpperCase()
                    )}
                    {/* Name overlay */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', fontSize: '0.45rem', textAlign: 'center', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ent.name.split(' ')[0]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
