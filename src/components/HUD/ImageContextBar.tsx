import React, { useEffect, useState } from 'react';
import { state } from '../../services/yjs';
import { updateDrawing, removeDrawing } from '../../store/drawings';
import { FlipHorizontal, FlipVertical, RotateCw, Lock, Unlock, Trash2, BoxSelect, Contrast } from 'lucide-react';
import { Tooltip } from '../UI/Tooltip';

export const ImageContextBar: React.FC = () => {
  const [imageId, setImageId] = useState<string | null>(null);
  const [image, setImage] = useState<any>(null);

  useEffect(() => {
    const handleSelect = (e: any) => {
      setImageId(e.detail);
      if (e.detail) {
        setImage(state.drawings.get(e.detail));
      } else {
        setImage(null);
      }
    };

    const observer = () => {
      if ((window as any).__LAST_SELECTED_IMAGE_ID) {
         const updated = state.drawings.get((window as any).__LAST_SELECTED_IMAGE_ID);
         setImage(updated);
      }
    };

    window.addEventListener('image-selected', handleSelect);
    state.drawings.observe(observer);

    return () => {
      window.removeEventListener('image-selected', handleSelect);
      state.drawings.unobserve(observer);
    };
  }, []);

  return (
    <div
      id="image-context-bar"
      className="image-context-bar"
      style={{
        position: 'absolute',
        top: '-1000px',
        left: 0,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        gap: '8px',
        padding: '8px',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(10px)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        pointerEvents: (!imageId || !image) ? 'none' : 'auto',
        opacity: (!imageId || !image) ? 0 : 1,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      {imageId && image && (
        <>
          <Tooltip label="Espelhar Horizontal">
            <button
              onClick={() => updateDrawing(imageId, { flipX: !image.flipX })}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <FlipHorizontal size={18} color={image.flipX ? '#38bdf8' : '#e2e8f0'} />
            </button>
          </Tooltip>

          <Tooltip label="Espelhar Vertical">
            <button
              onClick={() => updateDrawing(imageId, { flipY: !image.flipY })}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <FlipVertical size={18} color={image.flipY ? '#38bdf8' : '#e2e8f0'} />
            </button>
          </Tooltip>

          <Tooltip label="Rotacionar 90º">
            <button
              onClick={() => updateDrawing(imageId, { rotation: (image.rotation || 0) + Math.PI / 2 })}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <RotateCw size={18} color="#e2e8f0" />
            </button>
          </Tooltip>
      
          <Tooltip label="Distorcer (Skew)">
            <button
              onClick={() => {
                 // Simple Skew toggler for now
                 const currentSkew = image.skewX || 0;
                 updateDrawing(imageId, { skewX: currentSkew === 0 ? 0.2 : 0 });
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <BoxSelect size={18} color={image.skewX ? '#38bdf8' : '#e2e8f0'} />
            </button>
          </Tooltip>

          <Tooltip label={`Opacidade (${Math.round((image.opacity !== undefined ? image.opacity : 1) * 100)}%)`}>
            <button
              onClick={() => {
                 const op = image.opacity !== undefined ? image.opacity : 1;
                 let newOp = op - 0.25;
                 if (newOp <= 0) newOp = 1;
                 updateDrawing(imageId, { opacity: newOp });
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <Contrast size={18} color={(image.opacity !== undefined && image.opacity < 1) ? '#38bdf8' : '#e2e8f0'} />
            </button>
          </Tooltip>

          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          <Tooltip label={image.locked ? "Desbloquear" : "Bloquear"}>
            <button
              onClick={() => updateDrawing(imageId, { locked: !image.locked })}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              {image.locked ? <Lock size={18} color="#ef4444" /> : <Unlock size={18} color="#e2e8f0" />}
            </button>
          </Tooltip>

          <Tooltip label="Excluir Imagem">
            <button
              onClick={() => {
                if (confirm('Deseja excluir esta imagem?')) {
                  removeDrawing(imageId);
                  import('../../store').then(s => s.clearDrawingSelection());
                }
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <Trash2 size={18} color="#ef4444" />
            </button>
          </Tooltip>
      </>
      )}
    </div>
  );
};
