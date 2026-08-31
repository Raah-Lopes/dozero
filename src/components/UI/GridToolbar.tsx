import React, { useEffect, useState, useRef } from 'react';
import { 
  state, localState, setActiveTool, setDrawColor, setDrawWidth, setFogMode,
  getMapConfig, updateMapConfig, addBackground, updateBackgroundProps, removeBackground,
  removeDrawing, clearDrawingSelection, removeMapProp, clearPropSelection, clearBgSelection, clearFogOps, clearMapWalls
} from '../../store';
import type { BackgroundData, MapConfig } from '../../store';
import { 
  MousePointer2, Hand, Pen, Square, Type, ArrowRight, Ruler, 
  Undo2, Redo2, Image as ImageIcon, ZoomIn, ZoomOut, Maximize2, Palette,
  Eye, EyeOff, Grid, Layers, Map as MapIcon, Settings, Plus, Trash2, Lock, Unlock, Search, Eraser, Circle, Triangle, ChevronUp, ChevronDown, CloudFog, Hexagon, Target, Scan, X,
  Wrench, RefreshCcw, Lasso, Paintbrush, CloudUpload, Download, Upload, Combine, MapPin, BrickWall
} from 'lucide-react';
import { convertImageToWebP } from '../../utils/imageUtils';
import { saveImageToCloud } from '../../utils/githubApi';
import { Tooltip } from './Tooltip';
import { TableSceneManager } from './TableSceneManager';
import { exportRoomToFile, importRoomFromFile, saveRoomSnapshotToCloud } from '../../services/roomPersistenceService';
import { toast } from './Toast';

// ============================================================================
// DESIGN TOKENS — single source of truth for the toolbar palette
// ============================================================================
const C = {
  accent:    'var(--accent-primary)',
  accentBg:  'var(--accent-glow)',
  accentBrd: 'var(--glass-border)',
  success:   'var(--success)',
  successBg: 'rgba(16,185,129,0.15)',
  successBrd:'var(--glass-border)',
  danger:    'var(--danger)',
  dangerBg:  'rgba(239,68,68,0.1)',
  dangerBrd: 'var(--glass-border)',
  warn:      'var(--warning)',
  textPri:   'var(--text-primary)',
  textSec:   'var(--text-secondary)',
  textMut:   'var(--text-secondary)',
  textDim:   'var(--text-secondary)',
  textOff:   'var(--text-secondary)',
  surfBg:    'var(--bg-secondary)',
  surfBrd:   'var(--glass-border)',
  surfHov:   'var(--bg-tertiary)',
  surfItem:  'var(--bg-tertiary)',
};

// ============================================================================
// TOOL DESCRIPTIONS — used for rich tooltips
// ============================================================================
const TOOL_META: Record<string, { label: string; desc: string; shortcut?: string }> = {
  select:       { label: 'Selecionar',            desc: 'Selecione e mova tokens e objetos', shortcut: 'V ou 1' },
  pan:          { label: 'Mão',                   desc: 'Arraste para navegar pelo mapa',     shortcut: 'Espaço ou 2' },
  pen:          { label: 'Caneta',                desc: 'Desenhe linhas livres no mapa',      shortcut: 'P ou 3' },
  shape:        { label: 'Formas',                desc: 'Crie retângulos, círculos e triângulos', shortcut: 'R ou 4' },
  arrow:        { label: 'Seta Tática',           desc: 'Desenhe setas para indicar direções', shortcut: 'A ou 5' },
  text:         { label: 'Texto',                 desc: 'Insira textos e anotações no mapa',  shortcut: 'T ou 6' },
  lore_pins:    { label: 'Pins de Lore',          desc: 'Gerenciar pontos de interesse e notas da wiki no mapa', shortcut: 'L' },
  ruler:        { label: 'Régua',                 desc: 'Meça distâncias entre dois pontos',  shortcut: '7' },
  eraser:       { label: 'Borracha',              desc: 'Apague desenhos clicando neles',     shortcut: '8' },
  wall:         { label: 'Paredes',               desc: 'Desenhe paredes que bloqueiam a luz; clique direito para remover', shortcut: '9' },
  fog_brush:    { label: 'Névoa (Pincel)',        desc: 'Desenhe à mão livre para revelar ou esconder névoa' },
  fog_rect:     { label: 'Névoa (Retângulo)',     desc: 'Revele ou esconda salas retangulares' },
  fog_circle:   { label: 'Névoa (Círculo)',       desc: 'Revele ou esconda áreas circulares' },
  fog_triangle: { label: 'Névoa (Cone)',          desc: 'Revele ou esconda cones de visão ou iluminação' },
  fog_polygon:  { label: 'Névoa (Polígono)',      desc: 'Crie áreas poligonais ponto a ponto' },
  fog_lasso:    { label: 'Névoa (Laço Livre)',    desc: 'Contorne grandes áreas de névoa livremente' },
  fog_erase:    { label: 'Névoa (Borracha)',      desc: 'Apague formas individuais desenhadas na névoa' },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const LayerRenameInput = ({ layer, isActive, onRename }: { layer: any, isActive: boolean, onRename: (id: string, name: string) => void }) => {
  const [name, setName] = useState(layer.name);
  useEffect(() => { setName(layer.name); }, [layer.name]);
  return (
    <input
      type="text"
      value={name}
      onClick={(e) => { e.stopPropagation(); import('../../store').then(s => s.setActiveDrawingLayerId(layer.id)); }}
      onChange={(e) => setName(e.target.value)}
      onBlur={() => { if (name !== layer.name) onRename(layer.id, name); }}
      onKeyDown={(e) => { 
        e.stopPropagation(); 
        if (e.key === 'Enter') e.currentTarget.blur(); 
      }}
      style={{ 
        fontSize: '12px', 
        fontWeight: isActive ? 600 : 400, 
        color: isActive ? C.accent : C.textSec, 
        flex: 1, 
        background: 'transparent', 
        border: 'none', 
        outline: 'none',
        width: '100%',
        marginRight: '8px'
      }}
      title="Clique para renomear"
    />
  );
};

const DrawingRenameInput = ({ drawing, typeName, onRename }: { drawing: any, typeName: string, onRename: (id: string, name: string) => void }) => {
  const [name, setName] = useState(drawing.name || typeName);
  useEffect(() => { setName(drawing.name || typeName); }, [drawing.name, typeName]);
  return (
    <input
      type="text"
      value={name}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setName(e.target.value)}
      onBlur={() => { if (name !== (drawing.name || typeName)) onRename(drawing.id, name); }}
      onKeyDown={(e) => { 
        e.stopPropagation(); 
        if (e.key === 'Enter') e.currentTarget.blur(); 
      }}
      style={{ 
        background: 'transparent', 
        border: 'none', 
        color: drawing.hidden ? C.textDim : C.textSec, 
        fontSize: '12px', 
        textDecoration: drawing.hidden ? 'line-through' : 'none', 
        outline: 'none', 
        width: '100%' 
      }}
    />
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const GridToolbar: React.FC = () => {
  const [activeTool, setActiveToolState] = useState(localState.activeTool);
  const [fogMode, setFogModeState] = useState(localState.fogMode);
  const [drawColor, setDrawColorState] = useState(localState.drawColor);
  const [drawWidth, setDrawWidthState] = useState(localState.drawWidth);
  const [showStyleInspector, setShowStyleInspector] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [isLayersMinimized, setIsLayersMinimized] = useState(true);
  const [activeConfigTab, setActiveConfigTab] = useState<'cenas' | 'mapas' | 'grid' | 'objetos'>('mapas');
  
  const [mapConfig, setMapConfig] = useState<MapConfig>(getMapConfig());
  const [backgrounds, setBackgrounds] = useState<BackgroundData[]>([]);
  const [drawingLayers, setDrawingLayers] = useState<any[]>([]);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [walls, setWalls] = useState<any[]>([]);
  const [activeLayerId, setActiveLayerId] = useState(localState.activeDrawingLayerId || 'default');
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1257);
  const [showMapToolsMenu, setShowMapToolsMenu] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1257);
    window.addEventListener('resize', handleResize);

    const handleTool = () => {
      setActiveToolState(localState.activeTool);
      setFogModeState(localState.fogMode);
      if (['pen', 'shape', 'arrow', 'text', 'eraser', 'wall', 'fog_brush', 'fog_polygon', 'fog_rect', 'fog_circle', 'fog_triangle', 'fog_lasso', 'fog_erase'].includes(localState.activeTool)) {
        setShowStyleInspector(true);
        setShowMapToolsMenu(false);
        setShowConfigMenu(false);
        setShowLayersMenu(false);
      } else {
        setShowStyleInspector(false);
        setShowLayersMenu(false);
      }
    };
    const handleToggleConfig = () => { setShowConfigMenu(v => !v); setShowStyleInspector(false); setShowLayersMenu(false); };
    const handleToggleLayers = () => { setShowLayersMenu(v => { if (!v) setIsLayersMinimized(false); return !v; }); setShowConfigMenu(false); setShowStyleInspector(false); };
    const handleImageUploadTrigger = () => fileInputRef.current?.click();

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
      if (state.drawingLayers) {
        setDrawingLayers(Array.from(state.drawingLayers.values()));
      } else {
        setDrawingLayers([]);
      }
    };
    const handleDrawings = () => {
      setDrawings(Array.from(state.drawings.values()));
    };
    const handleWalls = () => {
      setWalls(Array.from(state.walls.values()));
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
      else if (key === 't' || key === '6') { setActiveTool('text'); }
      else if (e.ctrlKey && key === 'z') { window.dispatchEvent(new CustomEvent('canvas-undo')); }
      else if (e.ctrlKey && key === 'y') { window.dispatchEvent(new CustomEvent('canvas-redo')); }
      else if ((e.ctrlKey && e.key === '\\') || key === 'h') {
        setIsVisible(v => !v);
      }
    };

    state.mapConfig.observe(handleMapConfig);
    state.backgrounds.observe(handleBgs);
    if (state.drawingLayers) {
      state.drawingLayers.observe(handleDrawingLayers);
    }
    state.drawings.observe(handleDrawings);
    state.walls.observe(handleWalls);
    window.addEventListener('tool-changed', handleTool);
    window.addEventListener('draw-style-changed', handleStyle);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('toggle-config-menu', handleToggleConfig);
    window.addEventListener('toggle-layers-menu', handleToggleLayers);
    window.addEventListener('trigger-image-upload', handleImageUploadTrigger);
    window.addEventListener('config-changed', handleMapConfig);

    handleMapConfig();
    handleBgs();
    handleDrawingLayers();
    handleWalls();
    handleLocalState();

    return () => {
      window.removeEventListener('resize', handleResize);
      state.mapConfig.unobserve(handleMapConfig);
      state.backgrounds.unobserve(handleBgs);
      state.drawings.unobserve(handleDrawings);
      if (state.drawingLayers) {
        state.drawingLayers.unobserve(handleDrawingLayers);
      }
      state.walls.unobserve(handleWalls);
      window.removeEventListener('tool-changed', handleTool);
      window.removeEventListener('draw-style-changed', handleStyle);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('active-layer-changed', handleLocalState);
      window.removeEventListener('toggle-config-menu', handleToggleConfig);
      window.removeEventListener('toggle-layers-menu', handleToggleLayers);
      window.removeEventListener('trigger-image-upload', handleImageUploadTrigger);
      window.removeEventListener('config-changed', handleMapConfig);
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64 } = await convertImageToWebP(file, 0.8, 1024);
      const imageUrl = await saveImageToCloud(base64, `drawing_${Date.now()}.webp`);
      if (!imageUrl) {
        toast.error('Não foi possível enviar a imagem para o Storage.');
        return;
      }
      const img = new Image();
      img.onload = () => {
        import('../../store/drawings').then(s => {
          s.addDrawing({
            id: 'drawing_' + Date.now() + Math.random().toString(36).substr(2, 5),
            name: file.name.split('.')[0],
            type: 'image',
            imageUrl,
            points: [{ x: window.innerWidth / 2, y: window.innerHeight / 2 }],
            imageWidth: img.naturalWidth || 400,
            imageHeight: img.naturalHeight || 300,
            color: '#ffffff',
            width: 1,
            zIndex: 100,
            layerId: activeLayerId,
            locked: false,
            hidden: false
          });
        });
      };
      img.onerror = () => {
        toast.error('A imagem foi enviada, mas o Storage não a disponibilizou para a mesa. Tente novamente.');
      };
      img.src = imageUrl;
    } catch (err) {
      console.error("Erro ao carregar imagem para o canvas:", err);
    }
    e.target.value = '';
  };

  const handleBackupUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importRoomFromFile(file);
    e.target.value = '';
  };

  const handleCloudSave = async () => {
    setIsSavingCloud(true);
    const ok = await saveRoomSnapshotToCloud();
    setIsSavingCloud(false);
    if (ok) {
      toast.success('Mesa salva na nuvem com sucesso! Sincronizada para o Vercel.');
    } else {
      toast.error('Falha ao salvar na nuvem.');
    }
  };

  // Build tools array
  let tools = [
    { id: 'select', icon: MousePointer2 },
    { id: 'pan',    icon: Hand },
    { id: 'pen',    icon: Pen },
    { id: 'shape',  icon: Square },
    { id: 'arrow',  icon: ArrowRight },
    { id: 'text',   icon: Type },
    { id: 'ruler',  icon: Ruler },
    { id: 'eraser', icon: Eraser },
    { id: 'wall', icon: BrickWall },
  ] as { id: string; icon: any }[];

  if (mapConfig.fogOfWar) {
    tools.push({ id: 'fog_brush',   icon: CloudFog });
    tools.push({ id: 'fog_polygon', icon: Hexagon });
  }

  // Render minimized trigger when hidden
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        title="Mostrar Ferramentas de Desenho (Atalho: H ou Ctrl+\\)"
        style={{
          position: 'fixed',
          top: isMobile ? 'auto' : '16px',
          bottom: isMobile ? '80px' : 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100000,
          background: C.surfBg,
          backdropFilter: 'var(--glass-blur)',
          border: `1px solid ${C.accentBrd}`,
          color: C.accent,
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
      <input
        type="file"
        ref={fileInputRef}
        accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
      <input
        type="file"
        ref={backupFileInputRef}
        accept=".json,.vtt"
        style={{ display: 'none' }}
        onChange={handleBackupUpload}
      />

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
          background: C.surfBg,
          backdropFilter: 'var(--glass-blur)',
          border: `1px solid rgba(255,255,255,0.15)`,
          borderRadius: '16px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
          pointerEvents: 'auto',
          minWidth: '320px',
          maxWidth: '92vw',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {/* Tabs and Close Button */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
            {[
              { id: 'cenas', label: 'Cenas', icon: MapIcon },
              { id: 'mapas', label: isMobile ? 'Mapas' : 'Cenários & Mapas', icon: MapIcon },
              { id: 'grid', label: isMobile ? 'Grid' : 'Grid & FOW', icon: Grid },
              { id: 'objetos', label: isMobile ? 'Objetos' : 'Objetos da Cena', icon: Layers }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeConfigTab === tab.id;
              return (
                <Tooltip key={tab.id} label={tab.label} position="bottom">
                  <button
                    onClick={() => setActiveConfigTab(tab.id as any)}
                    style={{
                      flex: 1,
                      background: isActive ? C.accentBg : 'transparent',
                      color: isActive ? C.accent : C.textMut,
                      border: isActive ? `1px solid ${C.accentBrd}` : '1px solid transparent',
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
                </Tooltip>
              );
            })}
            </div>
            <Tooltip label="Fechar Menu" position="bottom">
              <button
                onClick={() => setShowConfigMenu(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: C.textMut,
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}
              >
                <X size={16} />
              </button>
            </Tooltip>
          </div>

          {activeConfigTab === 'cenas' && <TableSceneManager />}

          {/* TAB: MAPAS */}
          {activeConfigTab === 'mapas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Tooltip label="Adicionar Mapa" description="Envie uma imagem como mapa de fundo" position="bottom">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: C.successBg,
                    border: `1px solid ${C.successBrd}`,
                    color: C.success,
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%'
                  }}
                >
                  <Plus size={14} /> Adicionar Novo Mapa de Fundo
                </button>
              </Tooltip>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: C.textMut, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CENÁRIOS E MAPAS ({backgrounds.length})</span>
              </div>
              {backgrounds.length === 0 ? (
                <span style={{ fontSize: '12px', color: C.textDim, textAlign: 'center', padding: '10px' }}>Nenhum mapa na cena.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {backgrounds.map(bg => (
                    <div key={bg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surfItem, padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '12px', color: C.textSec, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bg.name || 'Mapa sem nome'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Tooltip label="Trazer para Frente" description="Z-Index +1">
                          <button
                            onClick={() => updateBackgroundProps(bg.id, { zIndex: (bg.zIndex || 0) + 1 })}
                            style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: '4px' }}
                          >
                            <ChevronUp size={14} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Mandar para Trás" description="Z-Index -1">
                          <button
                            onClick={() => updateBackgroundProps(bg.id, { zIndex: (bg.zIndex || 0) - 1 })}
                            style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: '4px' }}
                          >
                            <ChevronDown size={14} />
                          </button>
                        </Tooltip>
                        <Tooltip label={bg.locked ? "Destravar" : "Travar"}>
                          <button
                            onClick={() => updateBackgroundProps(bg.id, { locked: !bg.locked })}
                            style={{ background: 'none', border: 'none', color: bg.locked ? C.warn : C.textDim, cursor: 'pointer', padding: '4px' }}
                          >
                            {bg.locked ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                        </Tooltip>
                        <Tooltip label={bg.hidden ? "Mostrar" : "Ocultar"}>
                          <button
                            onClick={() => updateBackgroundProps(bg.id, { hidden: !bg.hidden })}
                            style={{ background: 'none', border: 'none', color: bg.hidden ? C.danger : C.textDim, cursor: 'pointer', padding: '4px' }}
                          >
                            {bg.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </Tooltip>
                        <Tooltip label="Excluir Mapa">
                          <button
                            onClick={() => removeBackground(bg.id)}
                            style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SEÇÃO: PERSISTÊNCIA & BACKUP DA MESA */}
              <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: `1px solid rgba(255,255,255,0.1)`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ☁️ Persistência & Backup da Mesa
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Tooltip label="Salvar Mesa na Nuvem" description="Sincroniza tokens, mapas e desenhos com o Supabase/Vercel">
                    <button
                      type="button"
                      disabled={isSavingCloud}
                      onClick={handleCloudSave}
                      style={{
                        flex: 1,
                        background: isSavingCloud ? 'rgba(14,165,233,0.3)' : C.accentBg,
                        border: `1px solid ${C.accentBrd}`,
                        color: C.accent,
                        borderRadius: '8px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: isSavingCloud ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <CloudUpload size={14} /> {isSavingCloud ? 'Salvando...' : 'Salvar Nuvem'}
                    </button>
                  </Tooltip>
                  <Tooltip label="Exportar Backup (.vtt)" description="Baixe o arquivo completo com todos os dados da sala">
                    <button
                      type="button"
                      onClick={() => exportRoomToFile()}
                      style={{
                        background: C.surfItem,
                        border: `1px solid ${C.surfBrd}`,
                        color: C.textSec,
                        borderRadius: '8px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Download size={13} /> Exportar
                    </button>
                  </Tooltip>
                  <Tooltip label="Restaurar Backup (.vtt)" description="Carregue um arquivo .vtt.json para esta mesa">
                    <button
                      type="button"
                      onClick={() => backupFileInputRef.current?.click()}
                      style={{
                        background: C.surfItem,
                        border: `1px solid ${C.surfBrd}`,
                        color: C.textSec,
                        borderRadius: '8px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Upload size={13} /> Restaurar
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GRID & FOW */}
          {activeConfigTab === 'grid' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 1. Geometria */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📐 Geometria do Grid
                </span>
                <select
                  value={mapConfig.gridType}
                  onChange={e => updateMapConfig({ gridType: e.target.value as any })}
                  style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${C.surfBrd}`, color: C.textPri, padding: '6px', borderRadius: '6px', fontSize: '12px' }}
                >
                  <option value="square">Quadrados (D&D / PF2e)</option>
                  <option value="hex_v">Hexágonos (Verticais)</option>
                  <option value="hex_h">Hexágonos (Horizontais)</option>
                  <option value="dots_square">Pontos (Quadrado)</option>
                  <option value="dots_hex">Pontos (Hexagonal)</option>
                </select>
              </div>

              {/* 2. Tamanho e Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📏 Tamanho da Célula
                  </span>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>{mapConfig.gridSize}px</span>
                </div>
                <input
                  type="range" min="20" max="200" step="5" value={mapConfig.gridSize}
                  onChange={e => updateMapConfig({ gridSize: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                  {[50, 70, 100, 140].map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateMapConfig({ gridSize: sz })}
                      style={{
                        flex: 1, padding: '3px 0', fontSize: '10px', borderRadius: '4px',
                        border: mapConfig.gridSize === sz ? `1px solid ${C.accent}` : `1px solid ${C.surfBrd}`,
                        background: mapConfig.gridSize === sz ? C.accentBg : C.surfHov,
                        color: mapConfig.gridSize === sz ? C.accent : C.textSec,
                        cursor: 'pointer'
                      }}
                    >
                      {sz === 70 ? '70 (VTT)' : `${sz}px`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Estilização de Cores e Opacidade */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🎨 Estilo & Opacidade
                </span>
                
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {['#ffffff', '#06b6d4', '#f59e0b', '#ef4444', '#1e293b', '#64748b'].map(c => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      onClick={() => updateMapConfig({ gridColor: c })}
                      style={{
                        width: '20px', height: '20px', borderRadius: '50%', background: c,
                        border: (mapConfig.gridColor || '#1e293b').toLowerCase() === c.toLowerCase() ? `2px solid ${C.accent}` : '1px solid rgba(255,255,255,0.3)',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={mapConfig.gridColor || '#1e293b'}
                    onChange={e => updateMapConfig({ gridColor: e.target.value })}
                    title="Cor personalizada de linha"
                    style={{ width: '22px', height: '22px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', marginLeft: 'auto' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: C.textMut }}>Opacidade do Grid</span>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>{Math.round((mapConfig.gridAlpha ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05" value={mapConfig.gridAlpha ?? 1}
                  onChange={e => updateMapConfig({ gridAlpha: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* 4. Névoa de Guerra */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: `1px solid ${C.surfBrd}` }}>
                <span style={{ fontSize: '12px', color: C.textPri, fontWeight: 600 }}>Névoa de Guerra (FOW)</span>
                <button
                  onClick={() => updateMapConfig({ fogOfWar: !mapConfig.fogOfWar })}
                  style={{
                    background: mapConfig.fogOfWar ? 'rgba(14,165,233,0.3)' : C.surfHov,
                    border: mapConfig.fogOfWar ? `1px solid ${C.accent}` : '1px solid transparent',
                    color: mapConfig.fogOfWar ? C.accent : C.textMut,
                    borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {mapConfig.fogOfWar ? 'Ativada 👁' : 'Desativada 🚫'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: OBJETOS */}
          {activeConfigTab === 'objetos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px', borderRadius: '8px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <BrickWall size={15} color="#fb923c" />
                  <span style={{ fontSize: '12px', color: C.textSec, fontWeight: 600 }}>Paredes táticas ({walls.length})</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => { setShowConfigMenu(false); setActiveTool('wall'); }}
                    style={{ background: 'rgba(249,115,22,0.18)', border: '1px solid rgba(249,115,22,0.4)', color: '#fdba74', borderRadius: '6px', padding: '4px 7px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                  >Desenhar</button>
                  <button
                    type="button"
                    disabled={walls.length === 0}
                    onClick={() => {
                      if (walls.length > 0 && confirm('Deseja remover todas as paredes táticas desta cena?')) clearMapWalls();
                    }}
                    style={{ background: walls.length > 0 ? C.dangerBg : 'transparent', border: `1px solid ${walls.length > 0 ? C.dangerBrd : 'rgba(255,255,255,0.06)'}`, color: walls.length > 0 ? C.danger : C.textDim, borderRadius: '6px', padding: '4px 7px', fontSize: '10px', fontWeight: 700, cursor: walls.length > 0 ? 'pointer' : 'not-allowed' }}
                  >Limpar</button>
                </div>
              </div>
              <Tooltip label="Pins de Lore no Mapa" description="Gerenciar pontos de interesse e notas vinculadas no mapa" position="bottom">
                <button
                  onClick={() => {
                    setShowConfigMenu(false);
                    window.dispatchEvent(new CustomEvent('open-lore-pins'));
                  }}
                  style={{
                    background: 'rgba(16,185,129,0.15)', border: `1px solid ${C.accentBrd}`, color: C.accent,
                    borderRadius: '6px', padding: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%'
                  }}
                >
                  <MapPin size={14} /> Pins de Lore no Mapa
                </button>
              </Tooltip>
              <Tooltip label="Localizar Textos" description="Destaca todos os textos no mapa" position="bottom">
                <button
                  onClick={() => window.dispatchEvent(new Event('locate-texts'))}
                  style={{
                    background: C.surfHov, border: `1px solid ${C.surfBrd}`, color: C.textSec,
                    borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%'
                  }}
                >
                  <Search size={14} /> Localizar Todos os Textos
                </button>
              </Tooltip>
              <Tooltip label="Limpar Textos" description="Remove todos os textos do mapa" position="bottom">
                <button
                  onClick={() => {
                    if (confirm("Deseja apagar TODOS os textos do mapa?")) {
                      state.mapTexts.clear();
                    }
                  }}
                  style={{
                    background: C.dangerBg, border: `1px solid ${C.dangerBrd}`, color: C.danger,
                    borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%'
                  }}
                >
                  <Eraser size={14} /> Limpar Todos os Textos
                </button>
              </Tooltip>
              <Tooltip label="Limpar Desenhos" description="Remove todas as linhas e formas" position="bottom">
                <button
                  onClick={() => {
                    if (confirm("Deseja apagar TODOS os desenhos (linhas e formas) do mapa?")) {
                      import('../../store/drawings').then(s => s.clearAllDrawings());
                    }
                  }}
                  style={{
                    background: C.dangerBg, border: `1px solid ${C.dangerBrd}`, color: C.danger,
                    borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    marginTop: '4px', width: '100%'
                  }}
                >
                  <Trash2 size={14} /> Limpar Todos os Desenhos
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      {/* NOVO PAINEL FLUTUANTE DE CAMADAS (DOCKED) */}
      {showLayersMenu && (
        <div style={{
          position: 'fixed',
          top: isMobile ? '70px' : '80px',
          bottom: 'auto',
          right: '16px',
          zIndex: 99999,
          width: isMobile ? '280px' : '250px',
          background: C.surfBg,
          backdropFilter: 'var(--glass-blur)',
          border: `1px solid ${C.accentBrd}`,
          borderRadius: '12px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
          pointerEvents: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: isMobile && !isLayersMinimized ? '400px' : (!isLayersMinimized ? '70vh' : 'none')
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', color: C.accent, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} /> Camadas de Desenho
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {selectedBatch.size > 0 && (
                   <Tooltip label="Excluir Selecionados" description={`${selectedBatch.size} itens selecionados`}>
                     <button
                       onClick={() => {
                          if (confirm(`Excluir ${selectedBatch.size} objetos selecionados?`)) {
                             import('../../store/drawings').then(s => {
                                selectedBatch.forEach(id => s.removeDrawing(id));
                                setSelectedBatch(new Set());
                             });
                          }
                       }}
                       style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: C.danger, borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                     >
                       <Trash2 size={14} /> ({selectedBatch.size})
                     </button>
                   </Tooltip>
                )}
                <Tooltip label={isLayersMinimized ? "Expandir" : "Minimizar"}>
                  <button
                    onClick={() => setIsLayersMinimized(!isLayersMinimized)}
                    style={{ background: C.surfHov, border: 'none', color: C.textMut, borderRadius: '6px', padding: '4px', cursor: 'pointer' }}
                  >
                    {isLayersMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </Tooltip>
                {!isLayersMinimized && (
                  <Tooltip label="Nova Camada" description="Cria uma nova camada de desenho">
                    <button
                      onClick={() => {
                         import('../../store/drawingLayers').then(s => s.addDrawingLayer({
                            id: 'layer_' + Date.now(),
                            name: 'Nova Camada',
                            zIndex: 100
                         }));
                      }}
                      style={{ background: C.successBg, border: 'none', color: C.success, borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Plus size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}/> Nova
                    </button>
                  </Tooltip>
                )}
                <Tooltip label="Fechar">
                  <button
                    onClick={() => setShowLayersMenu(false)}
                    style={{ background: 'transparent', border: 'none', color: C.textMut, borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={16} />
                  </button>
                </Tooltip>
              </div>
            </div>
            
            {!isLayersMinimized && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
                {drawingLayers.map(layer => {
                  const layerDrawings = drawings.filter(d => (d.layerId || 'default') === layer.id);
                  return (
                  <div key={layer.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div 
                         onClick={() => import('../../store').then(s => s.setActiveDrawingLayerId(layer.id))}
                         style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                            background: activeLayerId === layer.id ? C.accentBg : C.surfItem, 
                            border: activeLayerId === layer.id ? `1px solid ${C.accentBrd}` : '1px solid transparent',
                            padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                            transition: 'all 0.2s'
                         }}
                         title={activeLayerId === layer.id ? "Camada Ativa" : "Clique para tornar ativa"}
                    >
                      <LayerRenameInput 
                        layer={layer} 
                        isActive={activeLayerId === layer.id}
                        onRename={(id, newName) => import('../../store/drawingLayers').then(s => s.updateDrawingLayer(id, { name: newName }))}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                        <input
                           type="checkbox"
                           checked={layerDrawings.length > 0 && layerDrawings.every((d: any) => selectedBatch.has(d.id))}
                           onChange={(e) => {
                              const newSet = new Set(selectedBatch);
                              if (e.target.checked) {
                                 layerDrawings.forEach((d: any) => newSet.add(d.id));
                              } else {
                                 layerDrawings.forEach((d: any) => newSet.delete(d.id));
                              }
                              setSelectedBatch(newSet);
                           }}
                           title="Selecionar tudo nesta camada"
                           style={{ cursor: 'pointer', margin: 0, marginRight: '4px' }}
                        />
                        <Tooltip label={layer.hidden ? "Mostrar Camada" : "Ocultar Camada"}>
                          <button
                            onClick={() => {
                               import('../../store/drawingLayers').then(s => s.updateDrawingLayer(layer.id, { hidden: !layer.hidden }));
                            }}
                            style={{ background: C.surfHov, borderRadius: '6px', border: 'none', color: layer.hidden ? C.danger : C.textMut, cursor: 'pointer', padding: '6px', transition: 'all 0.1s' }}
                          >
                            {layer.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </Tooltip>
                        <Tooltip label="Limpar Camada" description="Remove todos os desenhos desta camada">
                          <button
                            onClick={() => {
                               if (layerDrawings.length === 0) return;
                               if (confirm(`Limpar todos os ${layerDrawings.length} desenhos da camada '${layer.name}'?`)) {
                                  import('../../store/drawings').then(s => {
                                     layerDrawings.forEach((d: any) => s.removeDrawing(d.id));
                                  });
                               }
                            }}
                            style={{ background: C.surfHov, borderRadius: '6px', border: 'none', color: layerDrawings.length === 0 ? C.textOff : C.warn, cursor: layerDrawings.length === 0 ? 'not-allowed' : 'pointer', padding: '6px', transition: 'all 0.1s' }}
                          >
                            <Eraser size={14} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Excluir Camada">
                          <button
                            onClick={() => {
                               if (layer.id === 'default') {
                                  alert('A camada principal não pode ser excluída.');
                                  return;
                               }
                               if (confirm(`Excluir a camada '${layer.name}' apagará todos os desenhos nela. Continuar?`)) {
                                  import('../../store/drawingLayers').then(s => s.removeDrawingLayer(layer.id));
                                  if (activeLayerId === layer.id) {
                                     import('../../store').then(s => s.setActiveDrawingLayerId('default'));
                                  }
                               }
                            }}
                            style={{ background: C.surfHov, borderRadius: '6px', border: 'none', color: layer.id === 'default' ? C.textOff : C.danger, cursor: layer.id === 'default' ? 'not-allowed' : 'pointer', padding: '6px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    
                    {/* Layer Drawings (Expanded list) */}
                    {layerDrawings.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', borderLeft: `1px solid ${C.surfBrd}`, marginLeft: '8px' }}>
                        {layerDrawings.map((d: any) => {
                          let Icon = Pen;
                          let typeName = "Linha";
                          if (d.type === 'shape') {
                            if (d.shapeType === 'rectangle') { Icon = Square; typeName = "Retângulo"; }
                            else if (d.shapeType === 'circle') { Icon = Circle; typeName = "Círculo"; }
                            else if (d.shapeType === 'triangle') { Icon = Triangle; typeName = "Triângulo"; }
                          } else if (d.type === 'arrow') {
                            Icon = ArrowRight; typeName = "Seta";
                          } else if (d.type === 'image') {
                            Icon = ImageIcon as any; typeName = "Imagem";
                          }
                          
                          return (
                            <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedBatch.has(d.id)} 
                                  onChange={(e) => {
                                     const newSet = new Set(selectedBatch);
                                     if (e.target.checked) newSet.add(d.id);
                                     else newSet.delete(d.id);
                                     setSelectedBatch(newSet);
                                  }}
                                  style={{ cursor: 'pointer', margin: 0, padding: 0 }}
                                />
                                <Icon size={12} color={d.color || C.textMut} />
                                <DrawingRenameInput 
                                  drawing={d} 
                                  typeName={typeName} 
                                  onRename={(id, newName) => import('../../store/drawings').then(s => s.updateDrawingProps(id, { name: newName }))} 
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              {d.type === 'shape' && (
                                <button
                                  type="button"
                                  onClick={() => import('../../store/drawings').then(s => s.updateDrawingProps(d.id, { initiativeArea: d.initiativeArea === false }))}
                                  aria-label={d.initiativeArea === false ? 'Incluir na iniciativa por área' : 'Excluir da iniciativa por área'}
                                  aria-pressed={d.initiativeArea !== false}
                                  title={d.initiativeArea === false ? 'Usar como área de iniciativa' : 'Área de iniciativa ativa'}
                                  style={{ background: d.initiativeArea !== false ? C.accentBg : 'transparent', border: 'none', borderRadius: '4px', color: d.initiativeArea !== false ? C.accent : C.textDim, cursor: 'pointer', padding: '4px' }}
                                >
                                  <Target size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => import('../../store/drawings').then(s => s.updateDrawingProps(d.id, { hidden: !d.hidden }))}
                                style={{ background: 'transparent', border: 'none', color: d.hidden ? C.danger : C.textMut, cursor: 'pointer', padding: '4px' }}
                                title={d.hidden ? "Mostrar" : "Ocultar"}
                              >
                                {d.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                              <button
                                onClick={() => import('../../store/drawings').then(s => s.updateDrawingProps(d.id, { locked: !d.locked }))}
                                style={{ background: 'transparent', border: 'none', color: d.locked ? C.warn : C.textDim, cursor: 'pointer', padding: '4px' }}
                                title={d.locked ? "Destravar" : "Travar"}
                              >
                                {d.locked ? <Lock size={12} /> : <Unlock size={12} />}
                              </button>
                              <button
                                onClick={() => { if (confirm("Apagar desenho?")) import('../../store/drawings').then(s => s.removeDrawing(d.id)); }}
                                style={{ background: 'transparent', border: 'none', color: C.danger, cursor: 'pointer', padding: '4px' }}
                                title="Excluir"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );})}
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
          background: C.surfBg,
          backdropFilter: 'var(--glass-blur)',
          border: `1px solid rgba(255,255,255,0.15)`,
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          pointerEvents: 'auto',
          maxWidth: '92vw',
          overflowX: 'auto'
        }}>
          {/* Se estiver em ferramenta de Névoa de Guerra */}
          {activeTool.startsWith('fog_') ? (
            <>
              {/* Modo da Névoa (Revelar ou Esconder) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: C.textMut, fontWeight: 700, textTransform: 'uppercase' }}>NÉVOA:</span>
                <button
                  type="button"
                  onClick={() => setFogMode('reveal')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: fogMode === 'reveal' ? C.successBg : 'transparent',
                    border: fogMode === 'reveal' ? `1px solid ${C.success}` : '1px solid rgba(255,255,255,0.1)',
                    color: fogMode === 'reveal' ? C.success : C.textDim
                  }}
                >
                  <Eye size={13} /> Revelar
                </button>
                <button
                  type="button"
                  onClick={() => setFogMode('hide')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: fogMode === 'hide' ? C.dangerBg : 'transparent',
                    border: fogMode === 'hide' ? `1px solid ${C.danger}` : '1px solid rgba(255,255,255,0.1)',
                    color: fogMode === 'hide' ? C.danger : C.textDim
                  }}
                >
                  <EyeOff size={13} /> Esconder
                </button>
              </div>

              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

              {/* Formas de Névoa */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: C.textMut, fontWeight: 700, textTransform: 'uppercase' }}>FORMATO:</span>
                {[
                  { id: 'fog_brush', icon: Paintbrush, label: 'Pincel' },
                  { id: 'fog_rect', icon: Square, label: 'Retângulo' },
                  { id: 'fog_circle', icon: Circle, label: 'Círculo' },
                  { id: 'fog_triangle', icon: Triangle, label: 'Triângulo' },
                  { id: 'fog_polygon', icon: Hexagon, label: 'Polígono' },
                  { id: 'fog_lasso', icon: Lasso, label: 'Laço' },
                  { id: 'fog_erase', icon: Eraser, label: 'Borracha' },
                ].map(tool => {
                  const Icon = tool.icon;
                  const isActive = activeTool === tool.id;
                  return (
                    <Tooltip key={tool.id} label={tool.label} position="top">
                      <button
                        type="button"
                        onClick={() => setActiveTool(tool.id as any)}
                        style={{
                          background: isActive ? 'rgba(14,165,233,0.3)' : C.surfHov,
                          border: isActive ? `1px solid ${C.accent}` : '1px solid transparent',
                          color: isActive ? C.accent : C.textMut,
                          borderRadius: '6px',
                          padding: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Icon size={14} />
                      </button>
                    </Tooltip>
                  );
                })}
              </div>

              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

              {/* Status de Fusão Automática */}
              <span style={{ fontSize: '11px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                <Combine size={13} /> Fusão Contínua Ativa
              </span>
            </>
          ) : (
            <>
              {/* Color presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: C.textMut, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>COR:</span>
                <Tooltip label="Cor do Traço" description="Escolha a cor do desenho">
                  <input
                    type="color"
                    value={drawColor}
                    onChange={e => setDrawColor(e.target.value)}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
                  />
                </Tooltip>
              </div>

              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
              
              {/* Shape Types & Fusion (Only when shape tool is active) */}
              {activeTool === 'shape' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: C.textMut, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FORMA:</span>
                    <Tooltip label="Retângulo">
                      <button
                         onClick={() => import('../../store').then(s => s.setActiveShapeType('rectangle'))}
                         style={{ background: localState.activeShapeType === 'rectangle' ? 'rgba(14,165,233,0.3)' : C.surfHov, border: localState.activeShapeType === 'rectangle' ? `1px solid ${C.accent}` : '1px solid transparent', color: localState.activeShapeType === 'rectangle' ? C.accent : C.textMut, borderRadius: '6px', padding: '4px', cursor: 'pointer', flexShrink: 0 }}
                      ><Square size={14} /></button>
                    </Tooltip>
                    <Tooltip label="Círculo">
                      <button
                         onClick={() => import('../../store').then(s => s.setActiveShapeType('circle'))}
                         style={{ background: localState.activeShapeType === 'circle' ? 'rgba(14,165,233,0.3)' : C.surfHov, border: localState.activeShapeType === 'circle' ? `1px solid ${C.accent}` : '1px solid transparent', color: localState.activeShapeType === 'circle' ? C.accent : C.textMut, borderRadius: '6px', padding: '4px', cursor: 'pointer', flexShrink: 0 }}
                      ><Circle size={14} /></button>
                    </Tooltip>
                    <Tooltip label="Triângulo">
                      <button
                         onClick={() => import('../../store').then(s => s.setActiveShapeType('triangle'))}
                         style={{ background: localState.activeShapeType === 'triangle' ? 'rgba(14,165,233,0.3)' : C.surfHov, border: localState.activeShapeType === 'triangle' ? `1px solid ${C.accent}` : '1px solid transparent', color: localState.activeShapeType === 'triangle' ? C.accent : C.textMut, borderRadius: '6px', padding: '4px', cursor: 'pointer', flexShrink: 0 }}
                      ><Triangle size={14} /></button>
                    </Tooltip>
                  </div>

                  <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

                  {/* Fusão de Formas */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tooltip label={(localState as any).autoFuseShapes ? "Auto-Fundir Formas: ATIVADO (Formas sobrepostas são unificadas automaticamente ao desenhar)" : "Auto-Fundir Formas: DESATIVADO (Clique para ativar união de formas sobrepostas)"}>
                      <button
                        onClick={() => {
                          const next = !(localState as any).autoFuseShapes;
                          import('../../store').then(s => {
                            s.setAutoFuseShapes(next);
                            if (next) toast.success("Auto-Fusão Ativada: Novas formas sobrepostas serão unificadas!");
                            else toast.info("Auto-Fusão Desativada.");
                          });
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: (localState as any).autoFuseShapes ? 'rgba(168, 85, 247, 0.25)' : C.surfHov,
                          border: (localState as any).autoFuseShapes ? '1px solid #a855f7' : '1px solid transparent',
                          color: (localState as any).autoFuseShapes ? '#c084fc' : C.textMut,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Combine size={13} />
                        <span>Auto-Fundir</span>
                      </button>
                    </Tooltip>

                    <Tooltip label="Fundir todas as formas sobrepostas da camada ativa agora">
                      <button
                        onClick={() => {
                          import('../../store').then(s => {
                            const count = s.fuseOverlappingShapes(localState.activeDrawingLayerId);
                            if (count > 0) {
                              toast.success(`✨ ${count} forma(s) sobreposta(s) foram fundidas!`);
                            } else {
                              toast.info("Nenhuma forma sobreposta encontrada na camada ativa.");
                            }
                          });
                        }}
                        style={{
                          background: C.surfHov,
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: C.textSec,
                          borderRadius: '6px',
                          padding: '4px 6px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>Fundir Sobrepostas</span>
                      </button>
                    </Tooltip>
                  </div>
                  <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
                </>
              )}
            </>
          )}

          {/* Stroke Width / Raio do Pincel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: C.textMut, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeTool === 'wall' ? 'ESPESSURA:' : activeTool === 'eraser' || activeTool.startsWith('fog_') ? 'TAMANHO:' : 'TRAÇO:'}</span>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <input type="range" min="1" max="50" value={drawWidth} onChange={(e) => setDrawWidth(Number(e.target.value))} />
              <span style={{color: C.textMut, fontSize: '12px', minWidth: '30px'}}>{drawWidth}px</span>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* UNIFIED TOOLBAR: Drawing Tools + Zoom/Navigation Controls       */}
      {/* ================================================================ */}
      <div 
        className="zoom-controls-container"
        style={{
        position: 'fixed',
        bottom: isMobile ? '140px' : '76px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '4px 8px',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        border: `1px solid ${C.surfBrd}`,
        borderRadius: '16px',
        boxShadow: 'var(--glass-shadow)',
        pointerEvents: 'auto'
      }}>
        {/* Ferramentas do Mapa & Desenho */}
        <div style={{ position: 'relative' }}>
          <Tooltip 
            label={showMapToolsMenu ? 'Fechar Ferramentas' : 'Ferramentas do Mapa'} 
            description="Desenho, Névoa de Guerra (FOW), Camadas e Ações" 
            position="top"
          >
            <button
              className={`tldraw-tool-btn${showMapToolsMenu || !['select','pan'].includes(activeTool) ? ' active' : ''}`}
              onClick={() => setShowMapToolsMenu(v => {
                const next = !v;
                if (next) {
                  setShowStyleInspector(false);
                  setShowLayersMenu(false);
                  setShowConfigMenu(false);
                }
                return next;
              })}
              aria-label={showMapToolsMenu ? 'Fechar ferramentas do mapa' : 'Abrir ferramentas do mapa'}
            >
              <Wrench size={18} color={showMapToolsMenu || !['select','pan'].includes(activeTool) ? C.accent : C.textSec} />
            </button>
          </Tooltip>

          {/* Menu Flutuante de Ferramentas do Mapa */}
          {showMapToolsMenu && (
            <div 
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 12px)',
                left: isMobile ? '-20px' : '50%',
                transform: isMobile ? 'none' : 'translateX(-50%)',
                width: isMobile ? '280px' : '310px',
                background: C.surfBg,
                backdropFilter: 'var(--glass-blur)',
                border: `1px solid rgba(255,255,255,0.15)`,
                borderRadius: '16px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.75)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 1000,
                pointerEvents: 'auto'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header do Menu */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: C.textPri, display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.03em' }}>
                  <Wrench size={14} color={C.accent} /> Ferramentas do Mapa
                </span>
                <button
                  onClick={() => setShowMapToolsMenu(false)}
                  style={{ background: 'transparent', border: 'none', color: C.textMut, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                  title="Fechar"
                >
                  <X size={14} />
                </button>
              </div>

              {/* 1. SEÇÃO DE NÉVOA DE GUERRA (FOG OF WAR) */}
              <div style={{ 
                background: C.surfItem, 
                border: `1px solid ${mapConfig.fogOfWar ? C.accentBrd : C.surfBrd}`, 
                borderRadius: '10px', 
                padding: '8px 10px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                transition: 'border-color 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CloudFog size={16} color={mapConfig.fogOfWar ? C.accent : C.textMut} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: mapConfig.fogOfWar ? C.textPri : C.textSec }}>
                      Névoa de Guerra
                    </span>
                  </div>
                  
                  {/* Toggle switch para FOW */}
                  <button
                    onClick={() => {
                      const nextState = !mapConfig.fogOfWar;
                      updateMapConfig({ fogOfWar: nextState });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 9px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: mapConfig.fogOfWar ? C.accentBg : 'rgba(255,255,255,0.05)',
                      border: mapConfig.fogOfWar ? `1px solid ${C.accent}` : '1px solid rgba(255,255,255,0.1)',
                      color: mapConfig.fogOfWar ? C.accent : C.textDim,
                    }}
                    title={mapConfig.fogOfWar ? 'Clique para desativar a névoa' : 'Clique para ativar a névoa'}
                  >
                    {mapConfig.fogOfWar ? (
                      <>
                        <Eye size={12} /> Ativada
                      </>
                    ) : (
                      <>
                        <EyeOff size={12} /> Desativada
                      </>
                    )}
                  </button>
                </div>

                {/* Se a névoa estiver ativa, mostra as ferramentas e opções da névoa */}
                {mapConfig.fogOfWar && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Modo Revelar/Esconder + Ações */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                        <button
                          type="button"
                          onClick={() => setFogMode('reveal')}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '3px 6px',
                            height: '26px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: fogMode === 'reveal' ? C.successBg : 'transparent',
                            border: fogMode === 'reveal' ? `1px solid ${C.successBrd}` : '1px solid rgba(255,255,255,0.08)',
                            color: fogMode === 'reveal' ? C.success : C.textDim
                          }}
                        >
                          <Eye size={12} /> Revelar
                        </button>
                        <button
                          type="button"
                          onClick={() => setFogMode('hide')}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '3px 6px',
                            height: '26px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: fogMode === 'hide' ? C.dangerBg : 'transparent',
                            border: fogMode === 'hide' ? `1px solid ${C.dangerBrd}` : '1px solid rgba(255,255,255,0.08)',
                            color: fogMode === 'hide' ? C.danger : C.textDim
                          }}
                        >
                          <EyeOff size={12} /> Esconder
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Tooltip label="Desfazer Névoa" description="Desfaz a última alteração na névoa" position="bottom">
                          <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('canvas-undo'))}
                            style={{ background: 'transparent', border: 'none', color: C.textMut, cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                          >
                            <Undo2 size={13} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Refazer Névoa" description="Refaz a alteração desfeita" position="bottom">
                          <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('canvas-redo'))}
                            style={{ background: 'transparent', border: 'none', color: C.textMut, cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                          >
                            <Redo2 size={13} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Resetar Névoa" description="Preenche o mapa com névoa novamente" position="bottom">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Deseja resetar toda a névoa do mapa (preencher com escuridão)?')) {
                                clearFogOps();
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: C.warn, cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                          >
                            <RefreshCcw size={13} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Ferramentas de Desenho na Névoa (Formas & Pincel) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                      {[
                        { id: 'fog_brush', icon: Paintbrush, label: 'Pincel de Névoa' },
                        { id: 'fog_rect', icon: Square, label: 'Retângulo' },
                        { id: 'fog_circle', icon: Circle, label: 'Círculo' },
                        { id: 'fog_triangle', icon: Triangle, label: 'Cone / Triângulo' },
                        { id: 'fog_polygon', icon: Hexagon, label: 'Polígono' },
                        { id: 'fog_lasso', icon: Lasso, label: 'Laço Livre' },
                        { id: 'fog_erase', icon: Eraser, label: 'Borracha FOG' },
                      ].map(tool => {
                        const Icon = tool.icon;
                        const meta = TOOL_META[tool.id] || { label: tool.label, desc: '' };
                        const isActive = activeTool === tool.id;
                        return (
                          <Tooltip key={tool.id} label={meta.label} description={meta.desc} position="bottom">
                            <button
                              type="button"
                              className={`tldraw-tool-btn${isActive ? ' active' : ''}`}
                              style={{ width: '100%', height: '28px', borderRadius: '6px' }}
                              onClick={() => setActiveTool(tool.id as any)}
                            >
                              <Icon size={14} color={isActive ? C.accent : C.textSec} />
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. SEÇÃO DE FERRAMENTAS DE DESENHO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ferramentas de Desenho
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                  {[
                    { id: 'pen', icon: Pen, label: 'Caneta', shortcut: 'P' },
                    { id: 'shape', icon: Square, label: 'Formas', shortcut: 'R' },
                    { id: 'arrow', icon: ArrowRight, label: 'Seta Tática', shortcut: 'A' },
                    { id: 'text', icon: Type, label: 'Texto', shortcut: 'T' },
                    { id: 'lore_pins', icon: MapPin, label: 'Pins de Lore', shortcut: 'L', isAction: true },
                    { id: 'ruler', icon: Ruler, label: 'Régua', shortcut: '7' },
                    { id: 'eraser', icon: Eraser, label: 'Borracha', shortcut: '8' },
                    { id: 'wall', icon: BrickWall, label: 'Paredes', shortcut: '9' },
                  ].map(tool => {
                    const Icon = tool.icon;
                    const meta = TOOL_META[tool.id] || { label: tool.label, desc: '' };
                    const isActive = activeTool === tool.id;
                    return (
                      <Tooltip key={tool.id} label={meta.label} description={meta.desc} shortcut={meta.shortcut || tool.shortcut} position="top">
                        <button
                          className={`tldraw-tool-btn${isActive ? ' active' : ''}`}
                          style={{ width: '100%', height: '34px' }}
                          onClick={() => {
                            if ((tool as any).isAction) {
                              window.dispatchEvent(new CustomEvent('open-lore-pins'));
                            } else {
                              setActiveTool(tool.id as any);
                            }
                          }}
                        >
                          <Icon size={16} color={isActive ? C.accent : C.textSec} />
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Seletor Rápido de Formas & Fusão de Formas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: C.surfItem, padding: '4px 6px', borderRadius: '8px', border: `1px solid ${C.surfBrd}` }}>
                  <span style={{ fontSize: '10px', color: C.textMut, fontWeight: 700, textTransform: 'uppercase' }}>Formas:</span>
                  <button
                    type="button"
                    onClick={() => { setActiveTool('shape'); import('../../store').then(s => s.setActiveShapeType('rectangle')); }}
                    style={{ padding: '3px 5px', borderRadius: '4px', border: 'none', background: activeTool === 'shape' && localState.activeShapeType === 'rectangle' ? C.accentBg : 'transparent', color: activeTool === 'shape' && localState.activeShapeType === 'rectangle' ? C.accent : C.textSec, cursor: 'pointer' }}
                    title="Retângulo"
                  ><Square size={13} /></button>
                  <button
                    type="button"
                    onClick={() => { setActiveTool('shape'); import('../../store').then(s => s.setActiveShapeType('circle')); }}
                    style={{ padding: '3px 5px', borderRadius: '4px', border: 'none', background: activeTool === 'shape' && localState.activeShapeType === 'circle' ? C.accentBg : 'transparent', color: activeTool === 'shape' && localState.activeShapeType === 'circle' ? C.accent : C.textSec, cursor: 'pointer' }}
                    title="Círculo"
                  ><Circle size={13} /></button>
                  <button
                    type="button"
                    onClick={() => { setActiveTool('shape'); import('../../store').then(s => s.setActiveShapeType('triangle')); }}
                    style={{ padding: '3px 5px', borderRadius: '4px', border: 'none', background: activeTool === 'shape' && localState.activeShapeType === 'triangle' ? C.accentBg : 'transparent', color: activeTool === 'shape' && localState.activeShapeType === 'triangle' ? C.accent : C.textSec, cursor: 'pointer' }}
                    title="Triângulo"
                  ><Triangle size={13} /></button>

                  <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />

                  <button
                    type="button"
                    onClick={() => {
                      const next = !(localState as any).autoFuseShapes;
                      import('../../store').then(s => {
                        s.setAutoFuseShapes(next);
                        if (next) toast.success("Auto-Fusão Ativada: Formas sobrepostas serão unificadas ao desenhar!");
                        else toast.info("Auto-Fusão Desativada.");
                      });
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      background: (localState as any).autoFuseShapes ? 'rgba(168,85,247,0.3)' : 'transparent',
                      border: (localState as any).autoFuseShapes ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                      color: (localState as any).autoFuseShapes ? '#c084fc' : C.textSec,
                      cursor: 'pointer'
                    }}
                    title="Auto-Fundir ao desenhar formas sobrepostas"
                  >
                    <Combine size={12} /> Auto-Fundir
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      import('../../store').then(s => {
                        const count = s.fuseOverlappingShapes(localState.activeDrawingLayerId);
                        if (count > 0) toast.success(`✨ ${count} forma(s) fundida(s)!`);
                        else toast.info("Nenhuma forma sobreposta encontrada.");
                      });
                    }}
                    style={{
                      padding: '3px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: C.textPri,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    title="Fundir todas as formas sobrepostas da camada"
                  >
                    Fundir
                  </button>
                </div>
              </div>

              {/* 3. ATALHOS / UTILIDADES (Camadas, Imagem, Configuração) */}
              <div style={{ display: 'flex', gap: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Tooltip label="Camadas de Desenho" description="Gerenciar camadas, visibilidade e travas" position="top">
                  <button
                    onClick={() => {
                      setShowLayersMenu(v => {
                        if (!v) setIsLayersMinimized(false);
                        return !v;
                      });
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: showLayersMenu ? C.accentBg : C.surfItem,
                      border: showLayersMenu ? `1px solid ${C.accentBrd}` : `1px solid ${C.surfBrd}`,
                      color: showLayersMenu ? C.accent : C.textSec,
                      cursor: 'pointer'
                    }}
                  >
                    <Layers size={13} /> Camadas
                  </button>
                </Tooltip>

                <Tooltip label="Adicionar Imagem" description="Inserir imagem no canvas como desenho" position="top">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: C.surfItem,
                      border: `1px solid ${C.surfBrd}`,
                      color: C.textSec,
                      cursor: 'pointer'
                    }}
                  >
                    <ImageIcon size={13} /> Imagem
                  </button>
                </Tooltip>

                <Tooltip label="Salvar Mesa na Nuvem" description="Sincroniza para o Vercel e outros navegadores" position="top">
                  <button
                    disabled={isSavingCloud}
                    onClick={handleCloudSave}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      background: isSavingCloud ? 'rgba(14,165,233,0.3)' : C.accentBg,
                      border: `1px solid ${C.accentBrd}`,
                      color: C.accent,
                      cursor: isSavingCloud ? 'wait' : 'pointer',
                      fontSize: '11px',
                      fontWeight: 600
                    }}
                  >
                    <CloudUpload size={13} /> {isSavingCloud ? '...' : 'Salvar'}
                  </button>
                </Tooltip>

                <Tooltip label="Configurações do Mapa" description="Grade, mapas de fundo e objetos" position="top">
                  <button
                    onClick={() => {
                      setShowConfigMenu(v => !v);
                      setShowMapToolsMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      background: showConfigMenu ? C.accentBg : C.surfItem,
                      border: showConfigMenu ? `1px solid ${C.accentBrd}` : `1px solid ${C.surfBrd}`,
                      color: showConfigMenu ? C.accent : C.textSec,
                      cursor: 'pointer'
                    }}
                  >
                    <Settings size={13} />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        {/* Select & Pan (always visible) */}
        {tools.filter(t => t.id === 'select' || t.id === 'pan').map(tool => {
          const Icon = tool.icon;
          const meta = TOOL_META[tool.id] || { label: tool.id, desc: '' };
          const isActive = activeTool === tool.id;
          return (
            <Tooltip key={tool.id} label={meta.label} description={meta.desc} shortcut={meta.shortcut} position="top">
              <button
                className={`tldraw-tool-btn${isActive ? ' active' : ''}`}
                onClick={() => setActiveTool(tool.id as any)}
              >
                <Icon size={18} color={isActive ? C.accent : C.textSec} />
              </button>
            </Tooltip>
          );
        })}

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        {/* Navigation/Zoom Controls */}
        <Tooltip label="Diminuir Zoom" description="Afasta a visão do mapa" shortcut="Scroll ↓" position="top">
          <button
            className="tldraw-tool-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('canvas-zoom', { detail: -0.15 }))}
          >
            <ZoomOut size={18} color={C.textSec} />
          </button>
        </Tooltip>
        <Tooltip label="Centralizar Mapa" description="Enquadra o mapa base na tela" position="top">
          <button
            className="tldraw-tool-btn"
            onClick={() => window.dispatchEvent(new Event('canvas-center-map'))}
          >
            <MapIcon size={18} color={C.textSec} />
          </button>
        </Tooltip>
        <Tooltip label="Focar Seleção" description="Aproxima nos tokens selecionados" position="top">
          <button
            className="tldraw-tool-btn"
            onClick={() => window.dispatchEvent(new Event('canvas-focus-selected'))}
          >
            <Target size={18} color={C.textSec} />
          </button>
        </Tooltip>
        <Tooltip label="Enquadrar Tudo" description="Mostra todos os itens visíveis" position="top">
          <button
            className="tldraw-tool-btn"
            onClick={() => window.dispatchEvent(new Event('canvas-fit-all'))}
          >
            <Scan size={18} color={C.textSec} />
          </button>
        </Tooltip>
        <Tooltip label="Resetar Câmera" description="Volta a câmera para a posição inicial" position="top">
          <button
            className="tldraw-tool-btn"
            onClick={() => window.dispatchEvent(new Event('canvas-reset-view'))}
          >
            <Maximize2 size={18} color={C.textSec} />
          </button>
        </Tooltip>
        <Tooltip label="Aumentar Zoom" description="Aproxima a visão do mapa" shortcut="Scroll ↑" position="top">
          <button
            className="tldraw-tool-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('canvas-zoom', { detail: 0.15 }))}
          >
            <ZoomIn size={18} color={C.textSec} />
          </button>
        </Tooltip>
      </div>

      <style>{`
        .tldraw-tool-btn {
          background: transparent;
          border: none;
          border-radius: 8px;
          width: 34px;
          height: 34px;
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
