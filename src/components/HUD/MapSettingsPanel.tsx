import React, { useEffect, useState } from 'react';
import { state, addBackground, removeBackground, updateBackgroundProps, localState, toggleBgSelection, clearBgSelection, getMapConfig, updateMapConfig, setActiveTool } from '../../store';
import type { BackgroundData, MapConfig } from '../../store';
import { ImagePlus, Trash2, Eye, EyeOff, Grid, RefreshCw, MousePointer2, Type, Search, Eraser } from 'lucide-react';

export const MapSettingsPanel: React.FC = () => {
  const [backgrounds, setBackgrounds] = useState<BackgroundData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(localState.selectedBgs));
  const [mapConfig, setMapConfig] = useState<MapConfig>(getMapConfig());
  const [activeTool, setActiveToolState] = useState(localState.activeTool);
  const [activeTab, setActiveTab] = useState<'mapas' | 'grid' | 'ferramentas' | 'props'>('mapas');
  const [libraryUpdateKey, setLibraryUpdateKey] = useState(0);

  useEffect(() => {
    const observer = () => {
      const bgs = Array.from(state.backgrounds.values()) as BackgroundData[];
      setBackgrounds(bgs);
    };

    const selObserver = () => {
      setSelectedIds(new Set(localState.selectedBgs));
    };

    const mapConfigObserver = () => {
      setMapConfig(getMapConfig());
    };

    const toolObserver = () => {
      setActiveToolState(localState.activeTool);
    };

    state.backgrounds.observe(observer);
    state.mapConfig.observe(mapConfigObserver);
    window.addEventListener('bg-selection-updated', selObserver);
    window.addEventListener('tool-changed', toolObserver);
    
    observer();
    mapConfigObserver();
    selObserver();
    toolObserver();

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
      window.removeEventListener('tool-changed', toolObserver);
      window.removeEventListener('bg-select', handleSelect);
      window.removeEventListener('bg-clear-select', handleClearSelect);

      // Reset tool when closing panel
      setActiveTool('select');
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
          name: file.name.split('.')[0],
          imageUrl: url,
          x: window.innerWidth / 2 + (Math.random() * 50 - 25),
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
      e.target.value = '';
    }
  };

  const handleReplaceImage = async (bgId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const { url } = await compressToWebP(file);
        updateBackgroundProps(bgId, { imageUrl: url });
      }
    };
    input.click();
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

  const locateAllTexts = () => {
    window.dispatchEvent(new Event('locate-texts'));
  };

  const clearAllTexts = () => {
    if (confirm("Tem certeza que deseja apagar TODOS os textos do mapa?")) {
      state.mapTexts.clear();
      import('../../store').then(s => s.setEditingTextId(null));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      
      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'mapas', label: 'Mapas' },
          { id: 'grid', label: 'Grid & FOW' },
          { id: 'ferramentas', label: 'Ferramentas' },
          { id: 'props', label: 'Objetos' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{ 
              background: 'none', border: 'none', padding: '0.4rem 0.6rem', color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal', borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer', fontSize: '0.8rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ferramentas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MousePointer2 size={16} /> Ferramentas do Mouse
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn ${activeTool === 'select' ? 'active' : ''}`}
                onClick={() => setActiveTool('select')}
                title="Selecionar e Mover"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: activeTool === 'select' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                  color: activeTool === 'select' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--glass-border)', padding: '0.5rem'
                }}
              >
                <MousePointer2 size={16} /> Cursor Livre
              </button>
              <button
                className={`btn ${activeTool === 'text' ? 'active' : ''}`}
                onClick={() => setActiveTool('text')}
                title="Criar Texto (Clique no grid)"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: activeTool === 'text' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                  color: activeTool === 'text' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--glass-border)', padding: '0.5rem'
                }}
              >
                <Type size={16} /> Anotações
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                className="btn" onClick={locateAllTexts} title="Localizar todos os textos ativos"
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}
              >
                <Search size={14} /> Localizar Textos
              </button>
              <button
                className="btn" onClick={clearAllTexts} title="Apagar TODOS os textos"
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}
              >
                <Eraser size={14} /> Limpar Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'grid' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          
          <details className="glass-accordion" open>
            <summary><div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Grid size={16} /> Configurações do Grid</div></summary>
            <div className="accordion-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tipo Geométrico</span>
                <select 
                  value={mapConfig.gridType} 
                  onChange={e => updateMapConfig({ gridType: e.target.value as MapConfig['gridType'] })}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.4rem', borderRadius: '4px', fontSize: '0.8rem', width: '100%' }}
                >
                  <option value="square">Quadrados</option>
                  <option value="hex_v">Hexágonos (Verticais)</option>
                  <option value="hex_h">Hexágonos (Horizontais)</option>
                  <option value="dots_square">Pontos (Quadrado)</option>
                  <option value="dots_hex">Pontos (Hexagonal)</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tamanho ({mapConfig.gridSize}px)</span>
                <input 
                  type="range" min="20" max="200" step="10" value={mapConfig.gridSize} 
                  onChange={e => updateMapConfig({ gridSize: parseInt(e.target.value) })} style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cor das Linhas</span>
                  <input 
                    type="color" value={mapConfig.gridColor} 
                    onChange={e => updateMapConfig({ gridColor: e.target.value })}
                    style={{ width: '100%', height: '30px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Opacidade ({Math.round(mapConfig.gridAlpha * 100)}%)</span>
                  <input 
                    type="range" min="0" max="1" step="0.1" value={mapConfig.gridAlpha} 
                    onChange={e => updateMapConfig({ gridAlpha: parseFloat(e.target.value) })} style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </details>

          <details className="glass-accordion">
            <summary><div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><EyeOff size={16} /> Névoa de Guerra (FOW)</div></summary>
            <div className="accordion-content">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'white' }}>
                <input 
                  type="checkbox" checked={mapConfig.fogOfWar || false}
                  onChange={e => updateMapConfig({ fogOfWar: e.target.checked })}
                />
                <strong>Ativar Fog of War</strong>
              </label>
              
              {mapConfig.fogOfWar && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Formato da Visão</span>
                    <select 
                      value={mapConfig.fowShape || 'circle'} 
                      onChange={e => updateMapConfig({ fowShape: e.target.value as any })}
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.4rem', borderRadius: '4px', fontSize: '0.8rem', width: '100%' }}
                    >
                      <option value="circle">Círculo</option>
                      <option value="square">Quadrado</option>
                      <option value="hexagon">Hexágono</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Raio de Visão (Quadrados: {mapConfig.fowRadius || 6})</span>
                    <input 
                      type="range" value={mapConfig.fowRadius || 6} min="1" max="50" step="1"
                      onChange={e => updateMapConfig({ fowRadius: Number(e.target.value) })} style={{ width: '100%' }}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    <input 
                      type="checkbox" checked={mapConfig.fowHideTokens || false}
                      onChange={e => updateMapConfig({ fowHideTokens: e.target.checked })}
                    />
                    Ocultar tokens fora da visão
                  </label>
                </div>
              )}
            </div>
          </details>

        </div>
      )}

      {activeTab === 'mapas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ImagePlus size={16} /> Adicionar Mapas
            </label>
            <input 
              type="file" accept="image/*" multiple onChange={handleImageUpload}
              style={{
                padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--glass-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedIds.size > 0 ? (
              <div style={{ padding: '0.5rem', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, width: '100%' }}>
                  {selectedIds.size} Mapa(s) Selecionado(s)
                </span>
                <button onClick={toggleHideSelected} className="btn-icon" title="Ocultar/Mostrar" style={{ border: '1px solid var(--glass-border)', padding: '0.5rem' }}>
                  {backgrounds.some(bg => selectedIds.has(bg.id) && !bg.hidden) ? <Eye size={14} /> : <EyeOff size={14} color="var(--danger)" />}
                </button>
                <button onClick={toggleLockSelected} className="btn" style={{ fontSize: '0.75rem', padding: '0.5rem' }}>
                  {backgrounds.some(bg => selectedIds.has(bg.id) && !bg.locked) ? 'Travar 🔒' : 'Destravar 🔓'}
                </button>
                <button onClick={clearBgSelection} className="btn-icon" title="Limpar Seleção" style={{ border: '1px solid var(--glass-border)', marginLeft: 'auto' }}>
                  X
                </button>
              </div>
            ) : (
              <button onClick={selectAll} className="btn" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>Selecionar Todos na Cena</button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cenários Carregados ({backgrounds.length})</label>
            {backgrounds.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>Nenhum mapa na cena.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
                      {bg.locked && <span title="Travado">🔒</span>}
                      <input
                        type="text" value={bg.name || `Cenário ${idx + 1}`}
                        onChange={(e) => updateBackgroundProps(bg.id, { name: e.target.value })}
                        style={{
                          background: 'transparent', border: 'none', borderBottom: '1px solid transparent',
                          color: bg.hidden ? 'var(--text-secondary)' : 'var(--text-primary)',
                          textDecoration: bg.hidden ? 'line-through' : 'none',
                          fontSize: '0.8rem', outline: 'none', width: '100%', cursor: 'text'
                        }}
                        onFocus={(e) => e.target.style.borderBottom = '1px solid var(--accent-primary)'}
                        onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); updateBackgroundProps(bg.id, { hidden: !bg.hidden }); }}
                        className="btn-icon" title={bg.hidden ? "Mostrar" : "Ocultar"}
                        style={{ padding: '0.3rem', border: '1px solid transparent', background: bg.hidden ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.1)' }}
                      >
                        {bg.hidden ? <EyeOff size={14} color="var(--text-secondary)" /> : <Eye size={14} color="var(--text-primary)" />}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleReplaceImage(bg.id); }}
                        className="btn-icon" title="Trocar Imagem"
                        style={{ padding: '0.3rem', border: '1px solid transparent', background: 'rgba(59,130,246,0.1)', color: '#93c5fd' }}
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeBackground(bg.id); }}
                        className="btn-icon" title="Excluir"
                        style={{ padding: '0.3rem', border: '1px solid transparent', background: 'transparent', color: 'var(--danger)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'props' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Faça upload de ícones de baús, guardas ou móveis aqui. Você poderá arrastar para o mapa para posicioná-los.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ImagePlus size={16} /> Adicionar Props à Biblioteca
            </label>
            <input 
              type="file" accept="image/*" multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                for (const file of files) {
                  const { url } = await compressToWebP(file);
                  const name = file.name.split('.')[0];
                  const m = await import('../../store/props');
                  m.localPropLibrary.push({ url, name });
                }
                e.target.value = '';
                setLibraryUpdateKey(k => k + 1);
              }}
              style={{
                padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--glass-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer'
              }}
            />
          </div>
          <PropLibraryGallery key={libraryUpdateKey} />
        </div>
      )}
    </div>
  );
};

// Sub-componente para lidar com o import assíncrono da biblioteca local
const PropLibraryGallery = () => {
  const [library, setLibrary] = useState<{url: string, name: string}[]>([]);
  
  useEffect(() => {
    import('../../store/props').then(m => setLibrary(m.localPropLibrary));
  }, []);

  if (library.length === 0) return <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nenhum prop na biblioteca local ainda.</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
      {library.map((item, idx) => (
        <div 
          key={idx}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'prop', url: item.url, name: item.name }));
          }}
          style={{
            aspectRatio: '1', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)',
            borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'grab', padding: '0.2rem', position: 'relative'
          }}
          title={item.name}
        >
          <img src={item.url} alt={item.name} draggable={false} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
        </div>
      ))}
    </div>
  );
};
