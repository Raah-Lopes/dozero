import React, { useEffect, useState } from 'react';
import { state } from '../../services/yjs';
import { updateMapProp, removeMapProp } from '../../store/props';
import { X, Lock, Unlock, Eye, EyeOff, Trash2 } from 'lucide-react';
import { pushChatMessage } from '../../store/chat';

export const PropInteractionPanel: React.FC = () => {
  const [propId, setPropId] = useState<string | null>(null);
  const [prop, setProp] = useState<any>(null);
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 200 });

  useEffect(() => {
    const handleOpen = (e: any) => {
      setPropId(e.detail);
      setProp(state.props.get(e.detail));
    };

    const handleClose = () => {
      setPropId(null);
      setProp(null);
    };

    const observer = () => {
      if (propId) {
        const updated = state.props.get(propId);
        if (!updated) handleClose();
        else setProp(updated);
      }
    };

    window.addEventListener('open-prop-interaction', handleOpen);
    state.props.observe(observer);

    return () => {
      window.removeEventListener('open-prop-interaction', handleOpen);
      state.props.unobserve(observer);
    };
  }, [propId]);

  if (!propId || !prop) return null;

  const handleDragStart = (e: React.MouseEvent) => {
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      setPosition({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div style={{
      position: 'absolute',
      top: `${position.y}px`,
      left: `${position.x}px`,
      width: '400px',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10000,
      color: '#fff',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Header */}
      <div 
        onMouseDown={handleDragStart}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', cursor: 'move' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src={prop.imageUrl} alt="Prop" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{prop.name}</h3>
        </div>
        <button onClick={() => setPropId(null)} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
          <X size={18} />
        </button>
      </div>

      {/* Body - GM Edit Mode */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Nome do Objeto
          <input 
            type="text" 
            value={prop.name} 
            onChange={e => updateMapProp(propId, { name: e.target.value })}
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem', borderRadius: '4px' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Descrição / Conteúdo Oculto
          <textarea 
            value={prop.description || ''} 
            onChange={e => updateMapProp(propId, { description: e.target.value })}
            rows={4}
            placeholder="Ex: Dentro do baú há 50 moedas de ouro..."
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem', borderRadius: '4px', resize: 'vertical' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Tamanho do Objeto (Escala)
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="range" 
              min="0.1" max="5" step="0.1" 
              value={prop.scale || 1} 
              onChange={e => updateMapProp(propId, { scale: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: '3ch' }}>{prop.scale || 1}x</span>
          </div>
        </label>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button 
            className="btn"
            onClick={() => updateMapProp(propId, { isHidden: !prop.isHidden })}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: prop.isHidden ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)' }}
          >
            {prop.isHidden ? <><EyeOff size={16} /> Oculto (GM)</> : <><Eye size={16} /> Visível</>}
          </button>
          
          <button 
            className="btn"
            onClick={() => updateMapProp(propId, { isLocked: !prop.isLocked })}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: prop.isLocked ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)' }}
          >
            {prop.isLocked ? <><Lock size={16} /> Trancado</> : <><Unlock size={16} /> Destrancado</>}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
          <button 
            onClick={() => {
               pushChatMessage(`🕵️ O Mestre revelou as informações de <b>${prop.name}</b>:<br/><br/><i>${prop.description || 'Não há nada notável.'}</i>`, false, true);
               setPropId(null);
            }}
            className="btn active"
            style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--accent-primary)', color: '#fff' }}
          >
            Compartilhar Descrição no Chat
          </button>

          <button 
            onClick={() => {
              if (confirm("Deletar este objeto do cenário?")) {
                removeMapProp(propId);
                setPropId(null);
              }
            }}
            className="btn"
            style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}
          >
            <Trash2 size={16} /> Excluir Prop
          </button>
        </div>
      </div>
    </div>
  );
};
