import React, { useState, useRef, useEffect } from 'react';
import { type StageProp } from '../../store';
import { useSceneState } from './hooks/useSceneState';
import { Trash2, ArrowUp, ArrowDown, Edit2 } from 'lucide-react';

interface StagePropsLayerProps {
  propsList: StageProp[];
}

export const StagePropsLayer: React.FC<StagePropsLayerProps> = ({ propsList }) => {
  const { patchCurrentScene } = useSceneState();
  const [activePropId, setActivePropId] = useState<string | null>(null);
  
  // Dragging state
  const [dragInfo, setDragInfo] = useState<{ id: string; startX: number; startY: number; initPropX: number; initPropY: number } | null>(null);
  const [resizeInfo, setResizeInfo] = useState<{ id: string; startX: number; startY: number; initWidth: number; initHeight: number; initX: number; initY: number; corner: string } | null>(null);
  
  // Snap guidelines
  const [snapGuides, setSnapGuides] = useState<{ vertical: number | null; horizontal: number | null }>({ vertical: null, horizontal: null });

  const containerRef = useRef<HTMLDivElement>(null);

  const SNAP_THRESHOLD = 12;

  // Handle pointer down on a prop (for dragging)
  const handlePropPointerDown = (e: React.PointerEvent, p: StageProp) => {
    e.stopPropagation();
    setActivePropId(p.id);
    
    // Bring to front
    const maxZ = Math.max(0, ...propsList.map(pr => pr.zIndex));
    if (p.zIndex < maxZ) {
      updateProp(p.id, { zIndex: maxZ + 1 });
    }

    setDragInfo({
      id: p.id,
      startX: e.clientX,
      startY: e.clientY,
      initPropX: p.x,
      initPropY: p.y,
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Handle pointer down on a resize handle
  const handleResizePointerDown = (e: React.PointerEvent, p: StageProp, corner: string) => {
    e.stopPropagation();
    setActivePropId(p.id);
    setResizeInfo({
      id: p.id,
      startX: e.clientX,
      startY: e.clientY,
      initWidth: p.width,
      initHeight: p.height,
      initX: p.x,
      initY: p.y,
      corner,
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragInfo) {
      const dx = e.clientX - dragInfo.startX;
      const dy = e.clientY - dragInfo.startY;
      let newX = dragInfo.initPropX + dx;
      let newY = dragInfo.initPropY + dy;

      // Magnetic snap calculation
      let snapV: number | null = null;
      let snapH: number | null = null;
      
      const pId = dragInfo.id;
      const prop = propsList.find(p => p.id === pId);
      if (!prop) return;

      const myCenterX = newX + prop.width / 2;
      const myCenterY = newY + prop.height / 2;

      propsList.forEach(other => {
        if (other.id === pId) return;
        const otherCenterX = other.x + other.width / 2;
        const otherCenterY = other.y + other.height / 2;

        // Snap X (left to left, center to center, right to right)
        if (Math.abs(newX - other.x) < SNAP_THRESHOLD) { newX = other.x; snapV = other.x; }
        else if (Math.abs(myCenterX - otherCenterX) < SNAP_THRESHOLD) { newX = otherCenterX - prop.width / 2; snapV = otherCenterX; }
        else if (Math.abs((newX + prop.width) - (other.x + other.width)) < SNAP_THRESHOLD) { newX = other.x + other.width - prop.width; snapV = other.x + other.width; }

        // Snap Y (top to top, center to center, bottom to bottom)
        if (Math.abs(newY - other.y) < SNAP_THRESHOLD) { newY = other.y; snapH = other.y; }
        else if (Math.abs(myCenterY - otherCenterY) < SNAP_THRESHOLD) { newY = otherCenterY - prop.height / 2; snapH = otherCenterY; }
        else if (Math.abs((newY + prop.height) - (other.y + other.height)) < SNAP_THRESHOLD) { newY = other.y + other.height - prop.height; snapH = other.y + other.height; }
      });

      setSnapGuides({ vertical: snapV, horizontal: snapH });
      updatePropLocal(pId, { x: newX, y: newY });
    } else if (resizeInfo) {
      const dx = e.clientX - resizeInfo.startX;
      const dy = e.clientY - resizeInfo.startY;
      const { initWidth, initHeight, initX, initY, corner } = resizeInfo;
      
      let newW = initWidth;
      let newH = initHeight;
      let newX = initX;
      let newY = initY;

      if (corner.includes('e')) newW = Math.max(50, initWidth + dx);
      if (corner.includes('s')) newH = Math.max(50, initHeight + dy);
      if (corner.includes('w')) {
        newW = Math.max(50, initWidth - dx);
        if (newW > 50) newX = initX + dx;
      }
      if (corner.includes('n')) {
        newH = Math.max(50, initHeight - dy);
        if (newH > 50) newY = initY + dy;
      }

      updatePropLocal(resizeInfo.id, { width: newW, height: newH, x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragInfo || resizeInfo) {
      // Commit changes to state
      patchCurrentScene({ props: [...propsList] });
      setDragInfo(null);
      setResizeInfo(null);
      setSnapGuides({ vertical: null, horizontal: null });
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const updatePropLocal = (id: string, updates: Partial<StageProp>) => {
    const idx = propsList.findIndex(p => p.id === id);
    if (idx >= 0) {
      propsList[idx] = { ...propsList[idx], ...updates };
    }
  };

  const updateProp = (id: string, updates: Partial<StageProp>) => {
    patchCurrentScene({
      props: propsList.map(p => p.id === id ? { ...p, ...updates } : p)
    });
  };

  const removeProp = (id: string) => {
    patchCurrentScene({
      props: propsList.filter(p => p.id !== id)
    });
    setActivePropId(null);
  };

  const moveProp = (id: string, dir: 1 | -1) => {
    const p = propsList.find(x => x.id === id);
    if (!p) return;
    updateProp(id, { zIndex: Math.max(0, p.zIndex + dir) });
  };

  const handleEditProp = (p: StageProp) => {
    const newName = prompt('Editar nome da ficha:', p.label || '');
    if (newName !== null) {
      let hpUpdates = {};
      if (confirm('Deseja configurar Pontos de Vida (HP) para este item?')) {
        const hpStr = prompt('Digite o HP máximo (ex: 20):', p.maxHp?.toString() || '');
        if (hpStr && !isNaN(Number(hpStr))) {
          const hpVal = Number(hpStr);
          hpUpdates = { hp: hpVal, maxHp: hpVal };
        } else {
          hpUpdates = { hp: undefined, maxHp: undefined };
        }
      }
      updateProp(p.id, { label: newName, ...hpUpdates });
    }
  };

  return (
    <div 
      className="stage-props-layer" 
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setActivePropId(null);
      }}
      onDragOver={(e) => e.preventDefault()} // Allows dropping
      onDrop={(e) => {
        e.preventDefault();
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          if (data && data.type === 'prop') {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = e.clientX - rect.left - 40; // Center offset approx
            const y = e.clientY - rect.top - 40;
            
            const newProp: StageProp = {
              id: `prop_${Date.now()}`,
              type: data.url ? 'image' : 'token',
              url: data.url,
              label: data.title,
              color: data.url ? undefined : `hsl(${Math.random() * 360}, 70%, 50%)`,
              x,
              y,
              width: 80,
              height: 80,
              zIndex: propsList.length + 1,
              hp: data.hp,
              maxHp: data.hp
            };
            patchCurrentScene({ props: [...propsList, newProp] });
          }
        } catch (err) {
          // Ignore invalid drops
        }
      }}
    >
      {/* Snap Guides */}
      {snapGuides.vertical !== null && (
        <div className="snap-guide vertical" style={{ left: snapGuides.vertical }} />
      )}
      {snapGuides.horizontal !== null && (
        <div className="snap-guide horizontal" style={{ top: snapGuides.horizontal }} />
      )}

      {propsList.map(p => {
        const isSelected = activePropId === p.id;
        return (
          <div
            key={p.id}
            className={`stage-prop ${isSelected ? 'selected' : ''}`}
            style={{
              transform: `translate(${p.x}px, ${p.y}px)`,
              width: p.width,
              height: p.height,
              zIndex: p.zIndex,
            }}
            onPointerDown={(e) => handlePropPointerDown(e, p)}
          >
            {p.type === 'image' && p.url && (
              <img loading="lazy" decoding="async" src={p.url} className="stage-prop-img" alt="prop" draggable={false} />
            )}
            {p.type === 'token' && (
              <div className="stage-prop-token" style={{ backgroundColor: p.color }}>
                {p.label?.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Nameplate & HP Bar */}
            {(p.label || p.hp !== undefined) && (
              <div style={{
                position: 'absolute', bottom: '-24px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px',
                color: 'var(--text-primary)', fontSize: '10px', whiteSpace: 'nowrap', display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: '2px',
                border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none'
              }}>
                {p.label && <span>{p.label}</span>}
                {p.hp !== undefined && p.maxHp !== undefined && p.maxHp > 0 && (
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(0, (p.hp / p.maxHp) * 100)}%`, height: '100%', background: p.hp <= p.maxHp * 0.3 ? '#ef4444' : '#10b981', transition: 'width 0.3s' }} />
                  </div>
                )}
              </div>
            )}

            {isSelected && (
              <>
                {/* Context HUD */}
                <div 
                  className="stage-prop-hud"
                  style={{
                    position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '4px', display: 'flex', gap: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 1000
                  }}
                  onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking HUD
                >
                  <button onClick={() => moveProp(p.id, -1)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px', borderRadius: '4px' }} title="Fundo"><ArrowDown size={14} /></button>
                  <button onClick={() => moveProp(p.id, 1)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px', borderRadius: '4px' }} title="Frente"><ArrowUp size={14} /></button>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
                  <button onClick={() => handleEditProp(p)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px', borderRadius: '4px' }} title="Editar Nome/HP"><Edit2 size={14} /></button>
                  {p.hp !== undefined && p.hp > 0 && (
                    <button onClick={() => updateProp(p.id, { hp: Math.max(0, p.hp! - 1) })} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }} title="Dano">-1 HP</button>
                  )}
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
                  <button onClick={() => removeProp(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px' }} title="Excluir"><Trash2 size={14} /></button>
                </div>

                <div className="resize-handle nw" onPointerDown={(e) => handleResizePointerDown(e, p, 'nw')} />
                <div className="resize-handle ne" onPointerDown={(e) => handleResizePointerDown(e, p, 'ne')} />
                <div className="resize-handle sw" onPointerDown={(e) => handleResizePointerDown(e, p, 'sw')} />
                <div className="resize-handle se" onPointerDown={(e) => handleResizePointerDown(e, p, 'se')} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
