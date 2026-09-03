import React, { useEffect, useState, useCallback } from 'react';
import {
  state,
  addBackground,
  removeBackground,
  updateBackgroundProps,
  localState as bgLocalState,
  toggleBgSelection,
  clearBgSelection,
  setActiveTool,
} from '../../store';
import { Config, onConfigChanged, onMapConfigChanged, onFogConfigChanged } from '../../store/modules/configModule';
import type { BackgroundData, MapConfig } from '../../store';
import type { FogConfig } from '../../store/modules/configModule';
import { ImagePlus, Trash2, Eye, EyeOff, RefreshCw, MousePointer2, Type, Search, Eraser, Cloud, Play, Save } from 'lucide-react';
import { convertImageToWebP } from '../../utils/imageUtils';
import { saveImageToCloud } from '../../utils/githubApi';
import { Tooltip } from '../UI/Tooltip';
import { LoadingState } from '../UI/LoadingState';
import { TableSceneManager } from '../UI/TableSceneManager';
import { useIsGM } from '../../store/user';
import {
  saveSceneToCloud,
  getScenesFromCloud,
  getCampaignIdForRoom,
  deleteSceneFromCloud,
  applySceneToTable,
  SceneRecord
} from '../../services/sceneCloudService';
import { toast } from '../UI/Toast';

export const MapSettingsPanel: React.FC = () => {
  const isGM = useIsGM();
  const [backgrounds, setBackgrounds] = useState<BackgroundData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(bgLocalState.selectedBgs));
  
  // ✅ NEW: Use Config module instead of direct getMapConfig
  const [mapConfig, setMapConfig] = useState<MapConfig>(Config.getMapConfig());
  const [fogConfig, setFogConfig] = useState<FogConfig>(Config.getFogConfig());
  
  const [activeTool, setActiveToolState] = useState(bgLocalState.activeTool);
  const [activeTab, setActiveTab] = useState<'mapas' | 'grid' | 'ferramentas' | 'props' | 'cenarios'>('mapas');
  const [libraryUpdateKey, setLibraryUpdateKey] = useState(0);

  // Cloud Scenes State
  const [scenesList, setScenesList] = useState<SceneRecord[]>([]);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [savingScene, setSavingScene] = useState(false);

  const loadScenes = useCallback(async () => {
    const currentRoom = typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2')
      : 'dozero-mesa-principal-v2';
    setLoadingScenes(true);
    const campaignId = await getCampaignIdForRoom(currentRoom);
    const list = await getScenesFromCloud(campaignId || undefined, currentRoom);
    setScenesList(list);
    setLoadingScenes(false);
  }, []);

  useEffect(() => {
    if (isGM && activeTab === 'cenarios') {
      loadScenes();
    }
  }, [activeTab, isGM, loadScenes]);

  useEffect(() => {
    // Background observer (unchanged)
    const observer = () => {
      const bgs = Array.from(state.backgrounds.values()) as BackgroundData[];
      setBackgrounds(bgs);
    };

    const selObserver = () => {
      setSelectedIds(new Set(bgLocalState.selectedBgs));
    };

    // ✅ NEW: Subscribe to Config changes via module
    const handleMapConfigChange = () => {
      setMapConfig(Config.getMapConfig());
    };
    
    const handleFogConfigChange = () => {
      setFogConfig(Config.getFogConfig());
    };

    const toolObserver = () => {
      setActiveToolState(bgLocalState.activeTool);
    };

    state.backgrounds.observe(observer);
    
    // ✅ REFACTORED: Use Config module subscription
    const unsubscribeConfig = onMapConfigChanged(() => handleMapConfigChange());
    const unsubscribeFogConfig = onFogConfigChanged(() => handleFogConfigChange());
    
    window.addEventListener('bg-selection-updated', selObserver);
    window.addEventListener('tool-changed', toolObserver);
    
    observer();
    handleMapConfigChange();
    handleFogConfigChange();
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
      unsubscribeConfig(); // ✅ NEW: Clean up Config subscription
      unsubscribeFogConfig();
      
      window.removeEventListener('bg-selection-updated', selObserver);
      window.removeEventListener('tool-changed', toolObserver);
      window.removeEventListener('bg-select', handleSelect);
      window.removeEventListener('bg-clear-select', handleClearSelect);

      // Reset tool when closing panel
      setActiveTool('select');
    };
  }, []);

  // ponytail: helper wraps central utility and returns {url, width, height} needed by background store
  const toWebPWithSize = async (file: File): Promise<{ url: string; width: number; height: number } | null> => {
    const { base64 } = await convertImageToWebP(file, 0.7, 1024);
    const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = base64;
    });
    const url = await saveImageToCloud(base64, `background_${Date.now()}.webp`);
    if (!url) {
      toast.error('Não foi possível enviar a imagem para o Storage.');
      return null;
    }
    return { url, ...dimensions };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const image = await toWebPWithSize(file);
      if (!image) continue;
      const { url, width, height } = image;
      addBackground({
        id: 'bg_' + Date.now() + Math.random().toString(36).substr(2, 5),
        name: file.name.split('.')[0],
        imageUrl: url, x: window.innerWidth / 2, y: window.innerHeight / 2,
        width, height, scale: 1, opacity: 1, locked: false, hidden: false,
      });
    }
    e.target.value = '';
  };

  const handleReplaceImage = async (bgId: string) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const image = await toWebPWithSize(file);
        if (image) updateBackgroundProps(bgId, { imageUrl: image.url });
      }
    };
    input.click();
  };

  const selectAll = () => {
    backgrounds.forEach(b => {
      if (!bgLocalState.selectedBgs.has(b.id)) toggleBgSelection(b.id, true);
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

  const handleSaveCurrentScene = async () => {
    if (!isGM) return;
    const name = newSceneName.trim() || `Cena ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const currentRoom = typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2')
      : 'dozero-mesa-principal-v2';

    setSavingScene(true);
    const bgs = Array.from(state.backgrounds.values()) as BackgroundData[];
    const mapCfg = Config.getMapConfig();
    const fogCfg = Config.getFogConfig();
    const fogOps = Array.from(state.fogOps.values());
    const drawings = Array.from(state.drawings.values());
    const currentMusic = state.audio.get('music') as any;
    const currentAmbience = state.audio.get('ambience') as any;

    const campaignId = await getCampaignIdForRoom(currentRoom);
    if (!campaignId) {
      toast.error('Campanha não encontrada. Entre por uma mesa salva antes de enviar cenas para a nuvem.');
      setSavingScene(false);
      return;
    }

    const saved = await saveSceneToCloud({
      campaign_id: campaignId,
      name,
      backgrounds: bgs,
      grid_config: mapCfg,
      fog_config: fogCfg,
      fog_ops: fogOps,
      drawings: drawings,
      audio_config: {
        musicUrl: currentMusic?.url || undefined,
        ambienceUrl: currentAmbience?.url || undefined
      },
      thumbnail_url: bgs[0]?.url || null
    });

    if (saved) {
      setNewSceneName('');
      loadScenes();
    }
    setSavingScene(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      
      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'mapas', label: 'Mapas' },
          { id: 'grid', label: 'Grid & FOW' },
          { id: 'cenarios', label: 'Cenários (Nuvem)' },
          { id: 'ferramentas', label: 'Ferramentas' },
          { id: 'props', label: 'Objetos' }
        ].map(tab => (
          <Tooltip key={tab.id} label={tab.label}>
            <button 
              onClick={() => setActiveTab(tab.id as any)}
              style={{ 
                background: 'none', border: 'none', padding: '0.4rem 0.6rem', color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal', borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                cursor: 'pointer', fontSize: '0.8rem'
              }}
            >
              {tab.label}
            </button>
          </Tooltip>
        ))}
      </div>

      {activeTab === 'ferramentas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MousePointer2 size={16} /> Ferramentas do Mouse
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Tooltip label="Selecionar e Mover">
                <button
                  className={`btn ${activeTool === 'select' ? 'active' : ''}`}
                  onClick={() => setActiveTool('select')}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    background: activeTool === 'select' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: activeTool === 'select' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--glass-border)', padding: '0.5rem'
                  }}
                >
                  <MousePointer2 size={16} /> Cursor Livre
                </button>
              </Tooltip>
              <Tooltip label="Criar Texto (Clique no grid)">
                <button
                  className={`btn ${activeTool === 'text' ? 'active' : ''}`}
                  onClick={() => setActiveTool('text')}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    background: activeTool === 'text' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: activeTool === 'text' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--glass-border)', padding: '0.5rem'
                  }}
                >
                  <Type size={16} /> Anotações
                </button>
              </Tooltip>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Tooltip label="Localizar todos os textos ativos">
                <button
                  className="btn" onClick={locateAllTexts}
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <Search size={14} /> Localizar Textos
                </button>
              </Tooltip>
              <Tooltip label="Apagar TODOS os textos">
                <button
                  className="btn" onClick={clearAllTexts}
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px solid var(--danger)', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}
                >
                  <Eraser size={14} /> Limpar Todos
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'grid' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          
          {/* 1. GEOMETRIA DO GRID */}
          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.8rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              📐 Geometria do Grid
            </span>
            <select 
              value={mapConfig.gridType} 
              onChange={e => Config.updateMap({ gridType: e.target.value as MapConfig['gridType'] })}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', width:'100%' }}
            >
              <option value="square">Quadrados (Padrão D&D / Pathfinder)</option>
              <option value="hex_v">Hexágonos (Verticais)</option>
              <option value="hex_h">Hexágonos (Horizontais)</option>
              <option value="dots_square">Pontos (Grade de Pontos)</option>
              <option value="dots_hex">Pontos (Grade Hexagonal)</option>
            </select>
          </div>

          {/* 2. TAMANHO E PRESETS RÁPIDOS */}
          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📏 Dimensões da Célula
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{mapConfig.gridSize}px</span>
            </div>
            
            <input 
              type="range" min="20" max="200" step="5" value={mapConfig.gridSize} 
              onChange={e => Config.setGridSize(parseInt(e.target.value))}
              style={{ width: '100%', marginBottom: '8px' }}
            />

            {/* Presets Rápidos */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { label: '50px', size: 50 },
                { label: '70px (VTT)', size: 70 },
                { label: '100px', size: 100 },
                { label: '140px', size: 140 },
              ].map(preset => (
                <button
                  key={preset.size}
                  type="button"
                  onClick={() => Config.setGridSize(preset.size)}
                  style={{
                    flex: 1, padding: '4px 6px', fontSize: '0.7rem', borderRadius: '4px',
                    border: mapConfig.gridSize === preset.size ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    background: mapConfig.gridSize === preset.size ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                    color: mapConfig.gridSize === preset.size ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. ESTILIZAÇÃO VISUAL & CORES */}
          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.8rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              🎨 Estilização Visual
            </span>

            {/* Cores pré-definidas */}
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Cores Rápidas de Linha</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {['#ffffff', '#06b6d4', '#f59e0b', '#ef4444', '#1e293b', '#64748b'].map(c => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => Config.setGridColor(c)}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%', background: c,
                      border: mapConfig.gridColor.toLowerCase() === c.toLowerCase() ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                      cursor: 'pointer',
                      boxShadow: mapConfig.gridColor.toLowerCase() === c.toLowerCase() ? '0 0 8px var(--accent-glow)' : 'none'
                    }}
                  />
                ))}
                <input 
                  type="color" value={mapConfig.gridColor} 
                  onChange={e => Config.setGridColor(e.target.value)}
                  title="Cor personalizada de linha"
                  style={{ width: '28px', height: '28px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px', marginLeft: 'auto' }}
                />
              </div>
            </div>

            {/* Cor de fundo e Opacidade */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Fundo da Mesa</span>
                <input 
                  type="color" value={mapConfig.mapBackgroundColor || '#000000'} 
                  onChange={e => Config.setMapBackground(e.target.value)}
                  style={{ width: '100%', height: '28px', padding: '0', border: '1px solid var(--glass-border)', background: 'transparent', cursor: 'pointer', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Opacidade</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{Math.round(mapConfig.gridAlpha * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05" value={mapConfig.gridAlpha} 
                  onChange={e => Config.setGridAlpha(parseFloat(e.target.value))}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
            </div>
          </div>

          {/* 4. NÉVOA DE GUERRA (FOW) */}
          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🌫️ Névoa de Guerra
              </span>
              <button
                type="button"
                onClick={() => Config.setFogEnabled(!fogConfig.enabled)}
                style={{
                  padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  background: fogConfig.enabled ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  border: fogConfig.enabled ? '1px solid #10b981' : '1px solid #ef4444',
                  color: fogConfig.enabled ? 'var(--success)' : 'var(--danger)'
                }}
              >
                {fogConfig.enabled ? 'Ativada 👁' : 'Desativada 🚫'}
              </button>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'mapas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ImagePlus size={16} /> Adicionar Mapas
            </label>
            <input 
              type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.svg" multiple onChange={handleImageUpload}
              style={{
                padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px dashed var(--glass-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedIds.size > 0 ? (
              <div style={{ padding: '0.5rem', background: 'var(--accent-glow)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, width: '100%' }}>
                  {selectedIds.size} Mapa(s) Selecionado(s)
                </span>
                <Tooltip label="Ocultar/Mostrar">
                  <button onClick={toggleHideSelected} className="btn-icon" style={{ border: '1px solid var(--glass-border)', padding: '0.5rem' }}>
                    {backgrounds.some(bg => selectedIds.has(bg.id) && !bg.hidden) ? <Eye size={14} /> : <EyeOff size={14} color="var(--danger)" />}
                  </button>
                </Tooltip>
                <Tooltip label={backgrounds.some(bg => selectedIds.has(bg.id) && !bg.locked) ? "Travar Selecionados" : "Destravar Selecionados"}>
                  <button onClick={toggleLockSelected} className="btn" style={{ fontSize: '0.75rem', padding: '0.5rem' }}>
                    {backgrounds.some(bg => selectedIds.has(bg.id) && !bg.locked) ? 'Travar 🔒' : 'Destravar 🔓'}
                  </button>
                </Tooltip>
                <Tooltip label="Limpar Seleção">
                  <button onClick={clearBgSelection} className="btn-icon" style={{ border: '1px solid var(--glass-border)', marginLeft: 'auto' }}>
                    X
                  </button>
                </Tooltip>
              </div>
            ) : (
              <Tooltip label="Selecionar Todos">
                <button onClick={selectAll} className="btn" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>Selecionar Todos na Cena</button>
              </Tooltip>
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
                      background: selectedIds.has(bg.id) ? 'var(--accent-glow)' : 'var(--bg-tertiary)', 
                      padding: '0.5rem', borderRadius: '4px',
                      border: selectedIds.has(bg.id) ? '1px solid var(--accent-primary)' : '1px solid transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
                      {bg.locked && <Tooltip label="Travado"><span>🔒</span></Tooltip>}
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
                      <Tooltip label={bg.hidden ? "Mostrar" : "Ocultar"}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateBackgroundProps(bg.id, { hidden: !bg.hidden }); }}
                          className="btn-icon"
                          style={{ padding: '0.3rem', border: '1px solid transparent', background: bg.hidden ? 'var(--bg-secondary)' : 'var(--bg-tertiary)' }}
                        >
                          {bg.hidden ? <EyeOff size={14} color="var(--text-secondary)" /> : <Eye size={14} color="var(--text-primary)" />}
                        </button>
                      </Tooltip>
                      <Tooltip label="Trocar Imagem">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleReplaceImage(bg.id); }}
                          className="btn-icon"
                          style={{ padding: '0.3rem', border: '1px solid transparent', background: 'rgba(59,130,246,0.1)', color: 'var(--mana)' }}
                        >
                          <RefreshCw size={14} />
                        </button>
                      </Tooltip>
                      <Tooltip label="Excluir">
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeBackground(bg.id); }}
                          className="btn-icon"
                          style={{ padding: '0.3rem', border: '1px solid transparent', background: 'transparent', color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cenarios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TableSceneManager />

          {isGM && <>
          {/* Card Salvar Cena Atual */}
          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cloud size={14} /> Salvar Cenário Atual na Nuvem
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={newSceneName}
                onChange={e => setNewSceneName(e.target.value)}
                placeholder="Ex: Masmorra do Dragão (Nível 1)"
                style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
              />
              <button
                onClick={handleSaveCurrentScene}
                disabled={savingScene}
                style={{ padding: '8px 14px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}
              >
                {savingScene ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                Salvar
              </button>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              Salva todos os mapas visíveis, grid, escala e iluminação/nevoeiro da cena atual.
            </span>
          </div>

          {/* Lista de Cenas Salvas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Cenários Salvos ({scenesList.length})
              </span>
              <button
                onClick={loadScenes}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}
              >
                <RefreshCw size={11} /> Atualizar
              </button>
            </div>

            {loadingScenes ? (
              <LoadingState compact label="Carregando cenários…" />
            ) : scenesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px dashed var(--glass-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Nenhum cenário salvo ainda. Digite um nome acima e clique em "Salvar".
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                {scenesList.map(scene => (
                  <div
                    key={scene.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ width: '48px', height: '36px', borderRadius: '4px', background: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {scene.thumbnail_url ? (
                        <img src={scene.thumbnail_url} alt={scene.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Cloud size={16} color="var(--text-secondary)" />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.82rem', color: '#fdfaf5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {scene.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                        {scene.backgrounds?.length || 0} mapa(s) • Grid: {scene.grid_config?.gridType || 'square'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        onClick={() => applySceneToTable(scene)}
                        title="Ativar este cenário na mesa"
                        style={{ padding: '6px 10px', background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: '6px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Play size={12} /> Ativar
                      </button>
                      <button
                        onClick={async () => {
                          if (scene.id && confirm(`Excluir cenário "${scene.name}" da nuvem?`)) {
                            await deleteSceneFromCloud(scene.id);
                            loadScenes();
                          }
                        }}
                        title="Excluir"
                        style={{ padding: '6px 8px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>}
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
              type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.svg" multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                for (const file of files) {
                  const { url } = await toWebPWithSize(file);
                  const name = file.name.split('.')[0];
                  const m = await import('../../store/props');
                  m.localPropLibrary.push({ url, name });
                }
                e.target.value = '';
                setLibraryUpdateKey(k => k + 1);
              }}
              style={{
                padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px dashed var(--glass-border)',
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
        <Tooltip key={idx} label={item.name}>
          <div 
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({ type: 'prop', url: item.url, name: item.name }));
            }}
            style={{
              aspectRatio: '1', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
              borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'grab', padding: '0.2rem', position: 'relative'
            }}
          >
            <img loading="lazy" decoding="async" src={item.url} alt={item.name} draggable={false} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
          </div>
        </Tooltip>
      ))}
    </div>
  );
};
