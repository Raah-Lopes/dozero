import React, { useEffect, useState } from 'react';
import { state, addBackground, removeBackground, updateBackgroundProps, localState, toggleBgSelection, clearBgSelection, getMapConfig, updateMapConfig } from '../../store';
import type { BackgroundData, MapConfig } from '../../store';
import { Map as MapIcon, ImagePlus, Trash2,   Eye, EyeOff, Grid } from 'lucide-react';

export const MapSettingsPanel: React.FC = () => {
  const [backgrounds, setBackgrounds] = useState<BackgroundData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(localState.selectedBgs));
  const [mapConfig, setMapConfig] = useState<MapConfig>(getMapConfig());

  useEffect(() => {
    const observer = () => {
      const bgs = Array.from(state.backgrounds.values()) as BackgroundData[];
      setBackgrounds(bgs);
    };

    const mapConfigObserver = () => {
      setMapConfig(getMapConfig());
    };

    const selObserver = () => {
      setSelectedIds(new Set(localState.selectedBgs));
    };

    state.backgrounds.observe(observer);
    state.mapConfig.observe(mapConfigObserver);
    window.addEventListener('bg-selection-updated', selObserver);
    
    observer();
    mapConfigObserver();
    selObserver();

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
      state.mapConfig.unobserve(mapConfigObserver);
      window.removeEventListener('bg-selection-updated', selObserver);
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

  const selectAll = () => {
    backgrounds.forEach(b => {
      if (!localState.selectedBgs.has(b.id)) toggleBgSelection(b.id, true);
    });
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Grid Configuration Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Grid size={16} /> Configurações do Grid
        </label>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {/* Tipo de Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tipo Geométrico</span>
            <select 
              value={mapConfig.gridType} 
              onChange={e => updateMapConfig({ gridType: e.target.value as MapConfig['gridType'] })}
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.25rem', borderRadius: '4px', fontSize: '0.75rem' }}
            >
              <option value="square">Quadrados</option>
              <option value="hex_v">Hexágonos (Verticais)</option>
              <option value="hex_h">Hexágonos (Horizontais)</option>
              <option value="dots_square">Pontos (Quadrado)</option>
              <option value="dots_hex">Pontos (Hexagonal)</option>
            </select>
          </div>
          
          {/* Tamanho */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tamanho ({mapConfig.gridSize}px)</span>
            <input 
              type="range" 
              min="20" max="200" step="10"
              value={mapConfig.gridSize} 
              onChange={e => updateMapConfig({ gridSize: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
          
          {/* Cor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cor das Linhas</span>
            <input 
              type="color" 
              value={mapConfig.gridColor} 
              onChange={e => updateMapConfig({ gridColor: e.target.value })}
              style={{ width: '100%', height: '24px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }}
            />
          </div>
          
          {/* Opacidade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Opacidade ({Math.round(mapConfig.gridAlpha * 100)}%)</span>
            <input 
              type="range" 
              min="0" max="1" step="0.1"
              value={mapConfig.gridAlpha} 
              onChange={e => updateMapConfig({ gridAlpha: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', gridColumn: '1 / -1', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={mapConfig.fogOfWar || false}
                onChange={e => updateMapConfig({ fogOfWar: e.target.checked })}
              />
              <strong style={{color: 'white'}}>Ativar Fog of War (Névoa de Guerra)</strong>
            </label>
            
            {mapConfig.fogOfWar && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Raio de Visão (Em quadrados)
                  <input 
                    type="number" 
                    value={mapConfig.fowRadius || 6}
                    min="1"
                    onChange={e => updateMapConfig({ fowRadius: Number(e.target.value) })}
                    style={{ width: '50px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.2rem', borderRadius: '4px' }}
                  />
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Formato da Visão</span>
                  <select 
                    value={mapConfig.fowShape || 'circle'} 
                    onChange={e => updateMapConfig({ fowShape: e.target.value as any })}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.25rem', borderRadius: '4px', fontSize: '0.75rem' }}
                  >
                    <option value="circle">Círculo</option>
                    <option value="square">Quadrado</option>
                    <option value="hexagon">Hexágono</option>
                  </select>
                </div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  <input 
                    type="checkbox" 
                    checked={mapConfig.fowHideTokens || false}
                    onChange={e => updateMapConfig({ fowHideTokens: e.target.checked })}
                  />
                  Ocultar tokens que estiverem fora do alcance de visão
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%' }} />

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

      {/* Action Buttons for Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapIcon size={16} /> Ações
        </label>
        
        {selectedIds.size > 0 ? (
          <div style={{ padding: '0.5rem', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, width: '100%' }}>
              {selectedIds.size} Mapa(s) Selecionado(s)
            </span>
            <button onClick={toggleHideSelected} className="btn-icon" title="Ocultar/Mostrar" style={{ border: '1px solid var(--glass-border)', padding: '0.5rem' }}>
              {backgrounds.some(bg => selectedIds.has(bg.id) && !bg.hidden) ? <Eye size={14} /> : <EyeOff size={14} color="var(--danger)" />}
            </button>
            <button onClick={toggleLockSelected} className="btn" style={{ fontSize: '0.75rem', padding: '0.5rem' }}>
              {backgrounds.some(bg => selectedIds.has(bg.id) && !bg.locked) ? 'Travar Tudo 🔒' : 'Destravar Tudo 🔓'}
            </button>
            <button onClick={clearBgSelection} className="btn-icon" title="Limpar Seleção" style={{ border: '1px solid var(--glass-border)', marginLeft: 'auto' }}>
              X
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={selectAll} className="btn" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>Selecionar Todos na Cena</button>
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
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  background: selectedIds.has(bg.id) ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)', 
                  padding: '0.5rem', borderRadius: '4px',
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
