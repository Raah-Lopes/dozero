import React, { useEffect, useState, useRef } from 'react';
import { 
  state, localState, setActiveTool, setDrawColor, setDrawWidth, 
  getMapConfig, updateMapConfig, addBackground, updateBackgroundProps, removeBackground,
  removeDrawing, clearDrawingSelection, removeMapProp, clearPropSelection, clearBgSelection
} from '../../store';
import type { BackgroundData, MapConfig } from '../../store';
import { 
  MousePointer2, Hand, Pen, Square, Type, ArrowRight, Ruler, 
  Undo2, Redo2, Image as ImageIcon, ZoomIn, ZoomOut, Maximize2, Palette,
  Eye, EyeOff, Grid, Layers, Map as MapIcon, Settings, Plus, Trash2, Lock, Unlock, Search, Eraser, Circle, Triangle
} from 'lucide-react';
import { convertImageToWebP } from '../../utils/imageUtils';

const COLOR_PRESETS = [
  '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f8fafc'
];

export const GridToolbar: React.FC = () => {
  const [activeTool, setActiveToolState] = useState(localState.activeTool);
  const [drawColor, setDrawColorState] = useState(localState.drawColor);
  const [drawWidth, setDrawWidthState] = useState(localState.drawWidth);
  const [showStyleInspector, setShowStyleInspector] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<'mapas' | 'grid' | 'objetos'>('mapas');
  
  const [mapConfig, setMapConfig] = useState<MapConfig>(getMapConfig());
  const [backgrounds, setBackgrounds] = useState<BackgroundData[]>([]);
  const [drawingLayers, setDrawingLayers] = useState<any[]>([]);
  const [activeLayerId, setActiveLayerId] = useState(localState.activeDrawingLayerId || 'default');
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);

    const handleTool = () => {
      setActiveToolState(localState.activeTool);
      if (['pen', 'shape', 'arrow', 'text'].includes(localState.activeTool)) {
        setShowStyleInspector(true);
      }
    };
    const handleStyle = () => {
      setDrawColorState(localState.drawColor);
      setDrawWidthState(localState.drawWidth);
    };

    const handleMapConfig = () => {
      setMapConfig(getMapConfig());
    };

    const handleBgs = () => {
      setBackgrounds(Array.from(state.backgrounds.values()) as BackgroundData[]);
    };
    
    const handleDrawingLayers = () => {
      setDrawingLayers(Array.from(state.drawingLayers.values()));
    };

    const handleLocalState = () => {
       setActiveLayerId(localState.activeDrawingLayerId || 'default');
    };
    window.addEventListener('active-layer-changed', handleLocalState);

    // Global keyboard shortcuts (Delete/Backspace to delete selected, V, P, R, A, E, T tool hotkeys)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (localState.selectedDrawings && localState.selectedDrawings.size > 0) {
          Array.from(localState.selectedDrawings).forEach(id => removeDrawing(id));
          clearDrawingSelection();
        }
        if (localState.selectedProps && localState.selectedProps.size > 0) {
          Array.from(localState.selectedProps).forEach(id => removeMapProp(id));
          clearPropSelection();
        }
        if ((window as any).__IS_MAP_MENU_OPEN__ && localState.selectedBgs && localState.selectedBgs.size > 0) {
          Array.from(localState.selectedBgs).forEach(id => removeBackground(id));
          clearBgSelection();
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'v' || key === '1') { setActiveTool('select'); }
      else if (key === 'p' || key === '2') { setActiveTool('pen'); }
      else if (key === 'r' || key === '3') { setActiveTool('shape'); }
      else if (key === 'a' || key === '4') { setActiveTool('arrow'); }
      else if (key === 'e' || key === '5') { setActiveTool('eraser'); }
      else if (key === 't' || key === '6') { setActiveTool('text'); }
      else if ((e.ctrlKey && e.key === '\\') || key === 'h') {
        setIsVisible(v => !v);
      }
    };

    state.mapConfig.observe(handleMapConfig);
    state.backgrounds.observe(handleBgs);
    state.drawingLayers.observe(handleDrawingLayers);
    window.addEventListener('tool-changed', handleTool);
    window.addEventListener('draw-style-changed', handleStyle);
    window.addEventListener('keydown', handleKeyDown);

    handleMapConfig();
    handleBgs();
    handleDrawingLayers();
    handleLocalState();

    return () => {
      window.removeEventListener('resize', handleResize);
      state.mapConfig.unobserve(handleMapConfig);
      state.backgrounds.unobserve(handleBgs);
      state.drawingLayers.unobserve(handleDrawingLayers);
      window.removeEventListener('tool-changed', handleTool);
      window.removeEventListener('draw-style-changed', handleStyle);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('active-layer-changed', handleLocalState);
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64 } = await convertImageToWebP(file, 0.8, 1024);
      const img = new Image();
      img.onload = () => {
        addBackground({
          id: 'bg_' + Date.now() + Math.random().toString(36).substr(2, 5),
          name: file.name.split('.')[0],
          imageUrl: base64,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          width: img.naturalWidth || 400,
          height: img.naturalHeight || 300,
          scale: 1,
          opacity: 1,
          locked: false,
          hidden: false
        });
      };
      img.src = base64;
    } catch (err) {
      console.error("Erro ao carregar imagem para o canvas:", err);
    }
    e.target.value = '';
  };

  const tools = [
    { id: 'select', label: 'Selecionar / Mover (1)', icon: MousePointer2 },
    { id: 'pan', label: 'Mão (Navegar / Espaço) (2)', icon: Hand },
    { id: 'pen', label: 'Desenho Livre (Caneta) (3)', icon: Pen },
    { id: 'shape', label: 'Forma Geométrica (4)', icon: Square },
    { id: 'arrow', label: 'Seta Tática / Alvo (5)', icon: ArrowRight },
    { id: 'text', label: 'Inserir Texto (6)', icon: Type },
    { id: 'ruler', label: 'Régua de Medição (7)', icon: Ruler },
    { id: 'eraser', label: 'Borracha Mágica (8)', icon: Eraser },
  ] as const;

  // Render minimized trigger when hidden
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        title="Mostrar Ferramentas de Desenho (Atalho: H ou Ctrl+\\)"
        style={{
          position: 'fixed',
          top: isMobile ? 'auto' : '16px',
          bottom: isMobile ? '16px' : 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100000,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(14, 165, 233, 0.4)',
          color: '#0ea5e9',
          borderRadius: '20px',
          padding: '6px 16px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          pointerEvents: 'auto'
        }}
      >
        <Pen size={14} /> <span>Ferramentas de Desenho</span> <Eye size={14} />
      </button>
    );
  }

  return (
    <>
      {/* TOP CENTRALIZED TOOLBAR DOCK (Style Excalidraw / tldraw - Integrated Ecosystem) */}
      <div style={{
        position: 'fixed',
        top: isMobile ? 'auto' : '16px',
        bottom: isMobile ? '70px' : 'auto',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '2px' : '6px',
        padding: isMobile ? '4px 8px' : '6px 12px',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: isMobile ? '16px' : '20px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)',
        pointerEvents: 'auto',
        maxWidth: '96vw',
        overflowX: 'auto'
      }}>
        {/* Menu Integrado de Configurações de Cenário & Grid */}
        <button
          className={`tldraw-tool-btn ${showConfigMenu ? 'active' : ''}`}
          onClick={() => { setShowConfigMenu(v => !v); setShowStyleInspector(false); }}
          title="Configurações de Cenário, Grid & Objetos"
          style={{ background: showConfigMenu ? 'rgba(14,165,233,0.2)' : 'transparent' }}
        >
          <Settings size={18} color={showConfigMenu ? '#0ea5e9' : '#94a3b8'} />
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />

        {/* Undo / Redo */}
        <button
          className="tldraw-tool-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('canvas-undo'))}
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 size={16} color="#94a3b8" />
        </button>
        <button
          className="tldraw-tool-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('canvas-redo'))}
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 size={16} color="#94a3b8" />
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />

        {/* Tools list */}
        {tools.map(tool => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id as any)}
              title={tool.label}
              style={{
                background: isActive ? 'var(--accent-primary, #0ea5e9)' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '10px',
                width: isMobile ? '32px' : '36px',
                height: isMobile ? '32px' : '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 0 16px rgba(14, 165, 233, 0.4)' : 'none',
                flexShrink: 0
              }}
            >
              <Icon size={isMobile ? 16 : 18} />
            </button>
          );
        })}

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />

        {/* Inserir Imagem Solta */}
        <button
          className="tldraw-tool-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Adicionar Novo Mapa ou Imagem na Tela"
        >
          <ImageIcon size={18} color="#06b6d4" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />

        {/* Toggle Style Inspector */}
        <button
          className={`tldraw-tool-btn ${showStyleInspector ? 'active' : ''}`}
          onClick={() => { setShowStyleInspector(v => !v); setShowConfigMenu(false); }}
          title="Estilo da Linha & Cor"
        >
          <Palette size={18} color={drawColor} />
        </button>

        {/* Ocultar Barra Button */}
        <button
          className="tldraw-tool-btn"
          onClick={() => setIsVisible(false)}
          title="Ocultar Ferramentas (Atalho: H)"
        >
          <EyeOff size={16} color="#64748b" />
        </button>
      </div>

      {/* FLOATING INTEGRATED CONFIG MENU (Mapas, Grid & FOW, Objetos) */}
      {showConfigMenu && (
        <div style={{
          position: 'fixed',
          top: isMobile ? 'auto' : '72px',
          bottom: isMobile ? '120px' : 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '16px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
          pointerEvents: 'auto',
          minWidth: '320px',
          maxWidth: '92vw',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
            {[
              { id: 'mapas', label: 'Cenários & Mapas', icon: MapIcon },
              { id: 'grid', label: 'Grid & FOW', icon: Grid },
              { id: 'objetos', label: 'Objetos da Cena', icon: Layers }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeConfigTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveConfigTab(tab.id as any)}
                  style={{
                    flex: 1,
                    background: isActive ? 'rgba(14,165,233,0.15)' : 'transparent',
                    color: isActive ? '#0ea5e9' : '#94a3b8',
                    border: isActive ? '1px solid rgba(14,165,233,0.3)' : '1px solid transparent',
                    borderRadius: '8px',
                    padding: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB: MAPAS */}
          {activeConfigTab === 'mapas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: '#10b981',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} /> Adicionar Novo Mapa de Fundo
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>CENÁRIOS E MAPAS ({backgrounds.length})</span>
              </div>
              {backgrounds.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '10px' }}>Nenhum mapa na cena.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {backgrounds.map(bg => (
                    <div key={bg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bg.name || 'Mapa sem nome'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <button
                          onClick={() => updateBackgroundProps(bg.id, { zIndex: (bg.zIndex || 0) + 1 })}
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', fontSize: '10px' }}
                          title="Trazer para a Frente (Z-Index +)"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => updateBackgroundProps(bg.id, { zIndex: (bg.zIndex || 0) - 1 })}
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', fontSize: '10px' }}
                          title="Mandar para Trás (Z-Index -)"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => updateBackgroundProps(bg.id, { locked: !bg.locked })}
                          style={{ background: 'none', border: 'none', color: bg.locked ? '#f59e0b' : '#64748b', cursor: 'pointer', padding: '4px' }}
                        >
                          {bg.locked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                        <button
                          onClick={() => updateBackgroundProps(bg.id, { hidden: !bg.hidden })}
                          style={{ background: 'none', border: 'none', color: bg.hidden ? '#ef4444' : '#64748b', cursor: 'pointer', padding: '4px' }}
                        >
                          {bg.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => removeBackground(bg.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>CAMADAS DE DESENHO ({drawingLayers.length})</span>
                <button
                  onClick={() => {
                    const name = prompt("Nome da nova camada:");
                    if (name) {
                       import('../../store/drawingLayers').then(s => s.addDrawingLayer({
                          id: 'layer_' + Date.now(),
                          name,
                          zIndex: 100
                       }));
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '0px' }}
                  title="Nova Camada de Desenho"
                >
                  <Plus size={14} />
                </button>
              </div>
              
              {drawingLayers.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '10px' }}>Nenhuma camada de desenho.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {drawingLayers.map(layer => (
                    <div key={layer.id} 
                         style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                            background: activeLayerId === layer.id ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)', 
                            border: activeLayerId === layer.id ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                            padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' 
                         }}
                         onClick={() => {
                            import('../../store').then(s => s.setActiveDrawingLayerId(layer.id));
                         }}
                    >
                      <span style={{ fontSize: '12px', color: activeLayerId === layer.id ? '#10b981' : '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {layer.name} {activeLayerId === layer.id && "(Ativa)"}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                             import('../../store/drawingLayers').then(s => s.updateDrawingLayer(layer.id, { hidden: !layer.hidden }));
                          }}
                          style={{ background: 'none', border: 'none', color: layer.hidden ? '#ef4444' : '#64748b', cursor: 'pointer', padding: '4px' }}
                        >
                          {layer.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => {
                             if (layer.id === 'default') {
                                alert("Não é possível excluir a camada padrão.");
                                return;
                             }
                             if (confirm(`Excluir a camada '${layer.name}' apagará todos os desenhos nela. Continuar?`)) {
                                import('../../store/drawingLayers').then(s => s.removeDrawingLayer(layer.id));
                                if (activeLayerId === layer.id) {
                                   import('../../store').then(s => s.setActiveDrawingLayerId('default'));
                                }
                             }
                          }}
                          style={{ background: 'none', border: 'none', color: layer.id === 'default' ? '#475569' : '#ef4444', cursor: layer.id === 'default' ? 'not-allowed' : 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: GRID & FOW */}
          {activeConfigTab === 'grid' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Tipo do Grid</span>
                <select
                  value={mapConfig.gridType}
                  onChange={e => updateMapConfig({ gridType: e.target.value as any })}
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', padding: '6px', borderRadius: '6px', fontSize: '12px' }}
                >
                  <option value="square">Quadrados</option>
                  <option value="hex_v">Hexágonos (Verticais)</option>
                  <option value="hex_h">Hexágonos (Horizontais)</option>
                  <option value="dots_square">Pontos (Quadrado)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Tamanho do Grid ({mapConfig.gridSize}px)</span>
                <input
                  type="range" min="20" max="200" step="10" value={mapConfig.gridSize}
                  onChange={e => updateMapConfig({ gridSize: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ fontSize: '12px', color: '#e2e8f0' }}>Névoa de Guerra (FOW)</span>
                <button
                  onClick={() => updateMapConfig({ enableFog: !mapConfig.enableFog })}
                  style={{
                    background: mapConfig.enableFog ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.05)',
                    border: mapConfig.enableFog ? '1px solid #0ea5e9' : '1px solid transparent',
                    color: mapConfig.enableFog ? '#0ea5e9' : '#94a3b8',
                    borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {mapConfig.enableFog ? 'Ativada' : 'Desativada'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: OBJETOS */}
          {activeConfigTab === 'objetos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => window.dispatchEvent(new Event('locate-texts'))}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0',
                  borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Search size={14} /> Localizar Todos os Textos
              </button>
              <button
                onClick={() => {
                  if (confirm("Deseja apagar TODOS os textos do mapa?")) {
                    state.mapTexts.clear();
                  }
                }}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
                  borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Eraser size={14} /> Limpar Todos os Textos
              </button>
              <button
                onClick={() => {
                  if (confirm("Deseja apagar TODOS os desenhos (linhas e formas) do mapa?")) {
                    import('../../store/drawings').then(s => s.clearAllDrawings());
                  }
                }}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
                  borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  marginTop: '4px'
                }}
              >
                <Trash2 size={14} /> Limpar Todos os Desenhos
              </button>
            </div>
          )}
        </div>
      )}

      {/* FLOATING STYLE INSPECTOR PANEL */}
      {showStyleInspector && (
        <div style={{
          position: 'fixed',
          top: isMobile ? 'auto' : '72px',
          bottom: isMobile ? '120px' : 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          pointerEvents: 'auto',
          maxWidth: '92vw',
          overflowX: 'auto'
        }}>
          {/* Color presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>COR:</span>
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => setDrawColor(c)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: c,
                  border: drawColor === c ? '2px solid #ffffff' : 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  transition: 'transform 0.1s',
                  flexShrink: 0
                }}
              />
            ))}
            <input
              type="color"
              value={drawColor}
              onChange={e => setDrawColor(e.target.value)}
              style={{ width: '24px', height: '24px', border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
            />
          </div>

          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
          
          {/* Shape Types (Only when shape tool is active) */}
          {activeTool === 'shape' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>FORMA:</span>
                <button
                   onClick={() => import('../../store').then(s => s.setActiveShapeType('rectangle'))}
                   style={{ background: localState.activeShapeType === 'rectangle' ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.05)', border: localState.activeShapeType === 'rectangle' ? '1px solid #0ea5e9' : '1px solid transparent', color: localState.activeShapeType === 'rectangle' ? '#0ea5e9' : '#94a3b8', borderRadius: '6px', padding: '4px', cursor: 'pointer', flexShrink: 0 }}
                ><Square size={14} /></button>
                <button
                   onClick={() => import('../../store').then(s => s.setActiveShapeType('circle'))}
                   style={{ background: localState.activeShapeType === 'circle' ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.05)', border: localState.activeShapeType === 'circle' ? '1px solid #0ea5e9' : '1px solid transparent', color: localState.activeShapeType === 'circle' ? '#0ea5e9' : '#94a3b8', borderRadius: '6px', padding: '4px', cursor: 'pointer', flexShrink: 0 }}
                ><Circle size={14} /></button>
                <button
                   onClick={() => import('../../store').then(s => s.setActiveShapeType('triangle'))}
                   style={{ background: localState.activeShapeType === 'triangle' ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.05)', border: localState.activeShapeType === 'triangle' ? '1px solid #0ea5e9' : '1px solid transparent', color: localState.activeShapeType === 'triangle' ? '#0ea5e9' : '#94a3b8', borderRadius: '6px', padding: '4px', cursor: 'pointer', flexShrink: 0 }}
                ><Triangle size={14} /></button>
              </div>
              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
            </>
          )}

          {/* Stroke Width */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>TRAÇO:</span>
            {[2, 4, 8, 12].map(w => (
              <button
                key={w}
                onClick={() => setDrawWidth(w)}
                style={{
                  background: drawWidth === w ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.05)',
                  border: drawWidth === w ? '1px solid #0ea5e9' : '1px solid transparent',
                  color: drawWidth === w ? '#0ea5e9' : '#94a3b8',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM RIGHT ZOOM & NAVIGATION CONTROLS */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        pointerEvents: 'auto'
      }}>
        <button
          className="tldraw-tool-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('canvas-zoom', { detail: -0.15 }))}
          title="Diminuir Zoom"
        >
          <ZoomOut size={16} color="#94a3b8" />
        </button>
        <button
          className="tldraw-tool-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('canvas-reset-view'))}
          title="Resetar Câmera / Enquadrar"
        >
          <Maximize2 size={16} color="#94a3b8" />
        </button>
        <button
          className="tldraw-tool-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('canvas-zoom', { detail: 0.15 }))}
          title="Aumentar Zoom"
        >
          <ZoomIn size={16} color="#94a3b8" />
        </button>
      </div>

      <style>{`
        .tldraw-tool-btn {
          background: transparent;
          border: none;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .tldraw-tool-btn:hover {
          background: rgba(255,255,255,0.1);
        }
        .tldraw-tool-btn.active {
          background: rgba(14,165,233,0.2);
        }
      `}</style>
    </>
  );
};
