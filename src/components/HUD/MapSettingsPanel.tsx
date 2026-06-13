import React, { useEffect, useState } from 'react';
import { state, addBackground, removeBackground, updateBackgroundProps } from '../../store';
import type { BackgroundData } from '../../store';
import { Map as MapIcon, ImagePlus, Trash2, AlignCenter, AlignHorizontalSpaceAround, Eye, EyeOff } from 'lucide-react';

export const MapSettingsPanel: React.FC = () => {
  const [backgrounds, setBackgrounds] = useState<BackgroundData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = () => {
      const bgs = Array.from(state.backgrounds.values()) as BackgroundData[];
      setBackgrounds(bgs);
    };

    state.backgrounds.observe(observer);
    observer();

    // Set global flag so GameCanvas knows if Map menu is open
    (window as any).__IS_MAP_MENU_OPEN__ = true;
    window.dispatchEvent(new Event('map-menu-toggle'));

    // Listen to PixiJS selection
    const handleSelect = (e: any) => {
      const id = e.detail.id as string;
      const multi = e.detail.multi as boolean;
      setSelectedIds(prev => {
        const next = new Set(multi ? prev : []);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };
    
    const handleClearSelect = () => setSelectedIds(new Set());

    window.addEventListener('bg-select', handleSelect);
    window.addEventListener('bg-clear-select', handleClearSelect);

    return () => {
      (window as any).__IS_MAP_MENU_OPEN__ = false;
      window.dispatchEvent(new Event('map-menu-toggle'));
      
      state.backgrounds.unobserve(observer);
      window.removeEventListener('bg-select', handleSelect);
      window.removeEventListener('bg-clear-select', handleClearSelect);
    };
  }, []);

  const compressToWebP = (file: File): Promise<{ url: string, width: number, height: number }> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new globalThis.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
        
        // Comprime para WebP
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        URL.revokeObjectURL(url);
        resolve({ url: dataUrl, width: img.width, height: img.height });
      };
      img.src = url;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      for (const file of files) {
        const { url, width, height } = await compressToWebP(file);
        
        const newBg: BackgroundData = {
          id: 'bg_' + Date.now() + Math.random().toString(36).substr(2, 5),
          imageUrl: url,
          x: window.innerWidth / 2 + (Math.random() * 50 - 25), // slight offset to prevent exact overlap
          y: window.innerHeight / 2 + (Math.random() * 50 - 25),
          width,
          height,
          scale: 1,
          opacity: 1,
          locked: false,
          hidden: false
        };
        
        addBackground(newBg);
      }
      e.target.value = ''; // reset input
    }
  };

  const alignCenter = () => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const bgs = Array.from(state.backgrounds.values()) as BackgroundData[];
    bgs.forEach(bg => {
      state.backgrounds.set(bg.id, { ...bg, x: cx, y: cy });
    });
  };

  const alignSideBySide = () => {
    const bgs = Array.from(state.backgrounds.values()) as BackgroundData[];
    if (bgs.length === 0) return;

    let currentX = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    bgs.forEach((bg, index) => {
      // Offset by half width to align from left to right properly if anchor is center
      if (index > 0) {
        currentX += (bgs[index - 1].width / 2) + (bg.width / 2);
      }
      state.backgrounds.set(bg.id, { ...bg, x: currentX, y: cy });
    });
  };

  const alignTop = () => {
    const bgs = backgrounds.filter(bg => selectedIds.has(bg.id));
    if (bgs.length < 2) return;
    const minY = Math.min(...bgs.map(bg => bg.y - bg.height/2));
    bgs.forEach(bg => {
      state.backgrounds.set(bg.id, { ...bg, y: minY + bg.height/2 });
    });
  };

  const alignBottom = () => {
    const bgs = backgrounds.filter(bg => selectedIds.has(bg.id));
    if (bgs.length < 2) return;
    const maxY = Math.max(...bgs.map(bg => bg.y + bg.height/2));
    bgs.forEach(bg => {
      state.backgrounds.set(bg.id, { ...bg, y: maxY - bg.height/2 });
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(backgrounds.map(b => b.id)));
  };

  const toggleLockSelected = () => {
    const isAnyUnlocked = backgrounds.some(bg => selectedIds.has(bg.id) && !bg.locked);
    backgrounds.forEach(bg => {
      if (selectedIds.has(bg.id)) updateBackgroundProps(bg.id, { locked: isAnyUnlocked });
    });
  };

  const toggleHideSelected = () => {
    const isAnyVisible = backgrounds.some(bg => selectedIds.has(bg.id) && !bg.hidden);
    backgrounds.forEach(bg => {
      if (selectedIds.has(bg.id)) updateBackgroundProps(bg.id, { hidden: isAnyVisible });
    });
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    backgrounds.forEach(bg => {
      if (selectedIds.has(bg.id)) updateBackgroundProps(bg.id, { scale: val });
    });
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    backgrounds.forEach(bg => {
      if (selectedIds.has(bg.id)) updateBackgroundProps(bg.id, { opacity: val });
    });
  };

  // Get current values from the first selected item for sliders
  const firstSelected = backgrounds.find(bg => selectedIds.has(bg.id));
  const currentScale = firstSelected?.scale ?? 1;
  const currentOpacity = firstSelected?.opacity ?? 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Upload Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ImagePlus size={16} /> Adicionar Mapas
        </label>
        <input 
          type="file" 
          accept="image/*" 
          multiple
          onChange={handleImageUpload}
          style={{
            padding: '0.5rem',
            background: 'rgba(0,0,0,0.2)',
            border: '1px dashed var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>* Auto-conversão para WebP ativada</span>
      </div>

      <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%' }} />

      {/* Alignment Tools (Only show if multiple selected or use default) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapIcon size={16} /> Ferramentas Magnéticas
        </label>
        
        {selectedIds.size > 0 ? (
          <div style={{ padding: '0.5rem', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
              {selectedIds.size} Mapa(s) Selecionado(s)
            </span>
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              <button onClick={alignTop} className="btn-icon" title="Alinhar pelo Topo" style={{ border: '1px solid var(--glass-border)' }}>↑</button>
              <button onClick={alignBottom} className="btn-icon" title="Alinhar pela Base" style={{ border: '1px solid var(--glass-border)' }}>↓</button>
              <button onClick={alignSideBySide} className="btn-icon" title="Lado a Lado" style={{ border: '1px solid var(--glass-border)' }}>↔</button>
              <button onClick={alignCenter} className="btn-icon" title="Centro Absoluto" style={{ border: '1px solid var(--glass-border)' }}>⌖</button>
              <div style={{ flex: 1 }} />
              <button onClick={toggleHideSelected} className="btn-icon" title="Ocultar/Mostrar" style={{ border: '1px solid var(--glass-border)' }}>
                {backgrounds.some(bg => selectedIds.has(bg.id) && !bg.hidden) ? <Eye size={14} /> : <EyeOff size={14} color="var(--danger)" />}
              </button>
              <button onClick={toggleLockSelected} className="btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                {backgrounds.some(bg => selectedIds.has(bg.id) && !bg.locked) ? 'Travar 🔒' : 'Destravar 🔓'}
              </button>
            </div>
            
            {/* Sliders for Scale and Opacity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tamanho (Zoom)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>{currentScale.toFixed(2)}x</span>
              </div>
              <input type="range" min="0.1" max="5" step="0.1" value={currentScale} onChange={handleScaleChange} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Opacidade</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>{Math.round(currentOpacity * 100)}%</span>
              </div>
              <input type="range" min="0.1" max="1" step="0.1" value={currentOpacity} onChange={handleOpacityChange} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={selectAll} className="btn" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>Selecionar Todos</button>
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%' }} />

      {/* List of Maps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mapas Carregados ({backgrounds.length})</label>
        {backgrounds.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>Nenhum mapa na cena.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '5px' }}>
            {backgrounds.map((bg, idx) => (
              <div 
                key={bg.id} 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('bg-select', { detail: { id: bg.id, multi: true } }));
                }}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  background: selectedIds.has(bg.id) ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)', 
                  padding: '0.5rem', borderRadius: '4px', cursor: 'pointer',
                  border: selectedIds.has(bg.id) ? '1px solid var(--accent-primary)' : '1px solid transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {bg.hidden && <span title="Oculto"><EyeOff size={14} color="var(--text-secondary)" /></span>}
                  {bg.locked && <span title="Travado">🔒</span>}
                  <span style={{ fontSize: '0.8rem', color: bg.hidden ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: bg.hidden ? 'line-through' : 'none' }}>Cenário {idx + 1}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeBackground(bg.id); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
