import React, { useEffect, useState } from 'react';
import { localState, state, updateBackgroundProps } from '../../store';
import { AlignLeft, AlignRight, AlignStartVertical, AlignEndVertical, AlignCenterHorizontal, AlignCenterVertical, Grid3X3, Link, Unlink, BringToFront, SendToBack } from 'lucide-react';

export const MapContextMenu: React.FC = () => {
  const [pos, setPos] = useState<{x: number, y: number} | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;

    const handleMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handleSelectionUpdate = () => {
      const count = localState.selectedBgs.size;
      if (count >= 1) { // Mudado para 1 para mostrar a opacidade se houver 1 selecionado
        const x = Math.min(lastX, window.innerWidth - 300);
        const y = Math.min(lastY + 15, window.innerHeight - 60);
        setPos({ x, y });
      } else {
        setPos(null);
      }
      setSelectedCount(count);
    };

    const handleDragState = () => {
      const dragging = (window as any).__IS_DRAGGING_MAP__ === true;
      setIsDragging(dragging);
      
      // If we just stopped dragging, update the menu's position to the new mouse location!
      if (!dragging) {
        handleSelectionUpdate();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('bg-selection-updated', handleSelectionUpdate);
    window.addEventListener('bg-drag-state', handleDragState);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('bg-selection-updated', handleSelectionUpdate);
      window.removeEventListener('bg-drag-state', handleDragState);
    };
  }, []);

  if (!pos || selectedCount < 1 || isDragging) return null;

  const bgs = Array.from(localState.selectedBgs).map(id => state.backgrounds.get(id)).filter(Boolean) as any[];
  if (bgs.length === 0) return null;

  const alignEdge = (edge: 'left' | 'right' | 'top' | 'bottom') => {
    let targetVal = edge === 'left' || edge === 'top' ? Infinity : -Infinity;
    
    bgs.forEach(bg => {
       const halfW = (bg.width * (bg.scale ?? 1)) / 2 || 400;
       const halfH = (bg.height * (bg.scale ?? 1)) / 2 || 400;
       if (edge === 'left') targetVal = Math.min(targetVal, bg.x - halfW);
       if (edge === 'right') targetVal = Math.max(targetVal, bg.x + halfW);
       if (edge === 'top') targetVal = Math.min(targetVal, bg.y - halfH);
       if (edge === 'bottom') targetVal = Math.max(targetVal, bg.y + halfH);
    });

    bgs.forEach(bg => {
       const halfW = (bg.width * (bg.scale ?? 1)) / 2 || 400;
       const halfH = (bg.height * (bg.scale ?? 1)) / 2 || 400;
       let x = bg.x;
       let y = bg.y;
       
       if (edge === 'left') x = targetVal + halfW;
       if (edge === 'right') x = targetVal - halfW;
       if (edge === 'top') y = targetVal + halfH;
       if (edge === 'bottom') y = targetVal - halfH;
       
       updateBackgroundProps(bg.id, { x, y });
    });
  };

  const alignCenter = (axis: 'horizontal' | 'vertical') => {
    const avg = bgs.reduce((sum, bg) => sum + (axis === 'horizontal' ? bg.x : bg.y), 0) / bgs.length;
    bgs.forEach(bg => {
      if (axis === 'horizontal') updateBackgroundProps(bg.id, { x: avg });
      else updateBackgroundProps(bg.id, { y: avg });
    });
  };

  const autoGrid = () => {
     const cols = Math.ceil(Math.sqrt(bgs.length));
     const pad = 20;
     
     // sort by current position roughly (top to bottom, then left to right)
     bgs.sort((a,b) => (a.y - b.y) * 2 + (a.x - b.x));

     let curX = bgs[0].x;
     let curY = bgs[0].y;
     const startX = curX;

     let maxHeightInRow = 0;
     bgs.forEach((bg, i) => {
        const w = (bg.width * (bg.scale ?? 1)) || 800;
        const h = (bg.height * (bg.scale ?? 1)) || 800;
        
        updateBackgroundProps(bg.id, { x: curX + (w/2), y: curY + (h/2) });
        
        maxHeightInRow = Math.max(maxHeightInRow, h);
        curX += w + pad;
        
        if ((i + 1) % cols === 0) {
           curX = startX;
           curY += maxHeightInRow + pad;
           maxHeightInRow = 0;
        }
     });
  };

  const toggleGroup = () => {
    const firstGroupId = bgs[0]?.groupId;
    const isGrouped = firstGroupId && bgs.every(bg => bg.groupId === firstGroupId);
    
    if (isGrouped) {
      bgs.forEach(bg => updateBackgroundProps(bg.id, { groupId: undefined }));
    } else {
      const newGroupId = 'group_' + Date.now().toString(36);
      bgs.forEach(bg => updateBackgroundProps(bg.id, { groupId: newGroupId }));
    }
  };

  const bringToFront = () => {
    let maxZ = 0;
    Array.from(state.backgrounds.values()).forEach((b: any) => {
      if (b.zIndex && b.zIndex > maxZ) maxZ = b.zIndex;
    });
    bgs.forEach(bg => updateBackgroundProps(bg.id, { zIndex: maxZ + 1 }));
  };

  const sendToBack = () => {
    let minZ = 0;
    Array.from(state.backgrounds.values()).forEach((b: any) => {
      if (b.zIndex && b.zIndex < minZ) minZ = b.zIndex;
    });
    bgs.forEach(bg => updateBackgroundProps(bg.id, { zIndex: minZ - 1 }));
  };

  const firstGroupId = bgs[0]?.groupId;
  const isGrouped = firstGroupId && bgs.every(bg => bg.groupId === firstGroupId);

  return (
    <div style={{
      position: 'fixed', top: pos.y, left: pos.x,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '12px', 
      padding: '0.4rem', 
      display: 'flex', 
      gap: '0.2rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', 
      zIndex: 9999,
      alignItems: 'center'
    }}>
       {selectedCount >= 2 && (
         <>
           <button onClick={() => alignEdge('left')} className="btn-icon" title="Alinhar à Esquerda"><AlignLeft size={16} /></button>
           <button onClick={() => alignCenter('horizontal')} className="btn-icon" title="Centralizar Horizontalmente"><AlignCenterHorizontal size={16} /></button>
           <button onClick={() => alignEdge('right')} className="btn-icon" title="Alinhar à Direita"><AlignRight size={16} /></button>
           
           <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
           
           <button onClick={() => alignEdge('top')} className="btn-icon" title="Alinhar ao Topo"><AlignStartVertical size={16} /></button>
           <button onClick={() => alignCenter('vertical')} className="btn-icon" title="Centralizar Verticalmente"><AlignCenterVertical size={16} /></button>
           <button onClick={() => alignEdge('bottom')} className="btn-icon" title="Alinhar à Base"><AlignEndVertical size={16} /></button>
           
           <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
         </>
       )}
       
       <button onClick={bringToFront} className="btn-icon" title="Trazer para Frente"><BringToFront size={16} /></button>
       <button onClick={sendToBack} className="btn-icon" title="Enviar para Trás"><SendToBack size={16} /></button>

       {selectedCount >= 2 && (
         <>
           <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
           <button onClick={autoGrid} className="btn-icon" title="Organizar em Grade Magica"><Grid3X3 size={16} color="var(--accent-primary)" /></button>
           <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
           <button onClick={toggleGroup} className="btn-icon" title={isGrouped ? "Desagrupar Imagens" : "Agrupar Imagens permanentemente"}>
             {isGrouped ? <Unlink size={16} color="var(--danger)" /> : <Link size={16} color="#10b981" />}
           </button>
         </>
       )}

       {/* Opacity slider inside a container */}
       <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
       <input 
         type="range" 
         min="0" max="1" step="0.05" 
         defaultValue={bgs[0]?.opacity ?? 1}
         onChange={(e) => bgs.forEach(bg => updateBackgroundProps(bg.id, { opacity: parseFloat(e.target.value) }))}
         style={{ width: '60px', accentColor: 'var(--accent-primary)', marginLeft: '4px' }}
         title="Opacidade"
       />
    </div>
  );
};
