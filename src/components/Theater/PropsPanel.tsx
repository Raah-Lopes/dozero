import React, { useRef } from 'react';
import { useSceneState } from './hooks/useSceneState';
import { Type, Image as ImageIcon, Trash2, ArrowUp, ArrowDown, Settings } from 'lucide-react';
import { GlassAccordion } from '../UI/GlassAccordion';

export const PropsPanel: React.FC = () => {
  const { currentScene, patchCurrentScene } = useSceneState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentScene) return null;

  const props = currentScene.props || [];

  const handleAddToken = () => {
    const label = prompt('Digite uma letra ou palavra curta para a ficha:');
    if (!label) return;
    
    const newProp = {
      id: `prop_${Date.now()}`,
      type: 'token' as const,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      label,
      x: 200 + Math.random() * 50,
      y: 200 + Math.random() * 50,
      width: 64,
      height: 64,
      zIndex: props.length + 1
    };
    patchCurrentScene({ props: [...props, newProp] });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Calculate initial size preserving aspect ratio (max 200px)
        let w = img.width;
        let h = img.height;
        if (w > 200 || h > 200) {
          const ratio = Math.min(200 / w, 200 / h);
          w = w * ratio;
          h = h * ratio;
        }

        const newProp = {
          id: `prop_${Date.now()}`,
          type: 'image' as const,
          url: dataUrl,
          label: file.name,
          x: 200 + Math.random() * 50,
          y: 200 + Math.random() * 50,
          width: w,
          height: h,
          zIndex: props.length + 1
        };
        patchCurrentScene({ props: [...props, newProp] });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeProp = (id: string) => {
    patchCurrentScene({
      props: props.filter(p => p.id !== id)
    });
  };

  const moveProp = (id: string, dir: 1 | -1) => {
    const p = props.find(x => x.id === id);
    if (!p) return;
    patchCurrentScene({
      props: props.map(item => 
        item.id === id ? { ...item, zIndex: Math.max(0, item.zIndex + dir) } : item
      )
    });
  };

  return (
    <div className="theater-drawer-section">
      <div className="theater-drawer-section-title">Adicionar Item</div>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          onClick={handleAddToken}
          style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Type size={14} />
          Ficha
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <ImageIcon size={14} />
          Imagem
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={handleImageUpload}
        />
      </div>

      <GlassAccordion title={`Itens na Cena (${props.length})`}>
        {props.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontStyle: 'italic', padding: '8px 0' }}>
            Nenhum item adicionado à cena atual.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {props.sort((a,b) => b.zIndex - a.zIndex).map(p => (
              <div 
                key={p.id}
                style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  padding: '8px', 
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {p.type === 'token' ? (
                  <div style={{ width: 24, height: 24, background: p.color, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontSize: '10px', fontWeight: 'bold' }}>
                    {p.label?.charAt(0)}
                  </div>
                ) : (
                  <img src={p.url} style={{ width: 24, height: 24, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} alt="prop" />
                )}
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.label || (p.type === 'token' ? 'Ficha' : 'Imagem')}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                    Z-Index: {p.zIndex}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => moveProp(p.id, 1)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }} title="Mover para frente">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => moveProp(p.id, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }} title="Mover para trás">
                    <ArrowDown size={14} />
                  </button>
                  <button onClick={() => removeProp(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }} title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassAccordion>
    </div>
  );
};
