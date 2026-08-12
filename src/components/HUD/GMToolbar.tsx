import React from 'react';
import { MousePointer2, CloudFog, Ruler, Users, Eye, EyeOff, Paintbrush, Hexagon, RefreshCcw, Square, Circle, Triangle, Lasso, Eraser, Hand, Pen, ArrowRight, Type, ImageIcon, Undo2, Redo2, ChevronLeft, Settings, Layers, LayoutGrid, BookOpen, Film, MessageSquare, LogOut, Pin } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { Config, onFogConfigChanged } from '../../store/modules/configModule';
import { FogOfWar } from '../../store/modules/fogModule';
import { setActiveTool as setGlobalActiveTool, setFogMode as setGlobalFogMode, localState } from '../../store';
import { Tooltip } from '../UI/Tooltip';
import type { FogConfig } from '../../store/modules/configModule';

export function GMToolbar() {
  const { activeTool, setActiveTool, activeModal, setActiveModal, showActors, setShowActors, openWindows, toggleWindow, viewMode, setViewMode } = useWindowManager();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  React.useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const [fogConfig, setFogConfig] = React.useState<FogConfig>(Config.getFogConfig());
  const [activeFolder, setActiveFolder] = React.useState<'root'|'draw'|'fog'>('root');
  const [fogMode, setLocalFogMode] = React.useState<'reveal' | 'hide'>('reveal');
  const [fogShape, setFogShape] = React.useState<'brush' | 'polygon' | 'rect' | 'circle' | 'triangle' | 'lasso' | 'eraser'>('brush');
  const [activeSubmenu, setActiveSubmenu] = React.useState<string | null>(null);
  const [isPinned, setIsPinned] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.gm-flyout-container')) {
        setActiveSubmenu(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSetTool = (tool: any, shape?: string) => {
    setActiveTool(tool);
    if (tool === 'FOG') {
      setGlobalActiveTool(`fog_${shape || fogShape}` as any);
    } else {
      setGlobalActiveTool(tool);
    }
    window.dispatchEvent(new Event('tool-changed'));
  };

  const handleSetFogMode = (mode: 'reveal' | 'hide') => {
    setLocalFogMode(mode);
    setGlobalFogMode(mode);
    window.dispatchEvent(new Event('tool-changed'));
  };
  
  React.useEffect(() => {
    if (activeTool === 'FOG') {
      const toolMap: Record<string, string> = { brush: 'fog_brush', polygon: 'fog_polygon', rect: 'fog_rect', circle: 'fog_circle', triangle: 'fog_triangle', lasso: 'fog_lasso', eraser: 'fog_erase' };
      setGlobalActiveTool((toolMap[fogShape] || 'fog_brush') as any);
      setGlobalFogMode(fogMode);
    } else if (activeTool === 'RULER') {
      setGlobalActiveTool('ruler');
    } else if (['pan', 'pen', 'shape', 'arrow', 'text', 'eraser'].includes(activeTool as string)) {
      setGlobalActiveTool(activeTool as any);
    } else {
      setGlobalActiveTool('select');
    }
  }, [activeTool, fogShape, fogMode]);

  React.useEffect(() => {
    const handleFogChange = () => setFogConfig(Config.getFogConfig());
    const unsub = onFogConfigChanged(handleFogChange);
    return () => unsub();
  }, []);

  // Update window variables for GameCanvas to read if needed (fallback)
  React.useEffect(() => {
    (window as any).__ACTIVE_TOOL__ = activeTool;
    (window as any).__FOG_MODE__ = fogMode;
    (window as any).__FOG_SHAPE__ = fogShape;
  }, [activeTool, fogMode, fogShape]);

  const FlyoutGroup = ({ id, activeIcon, children, title, isGroupActive, align = 'center' }: { id: string, activeIcon: React.ReactNode, children: React.ReactNode, title: string, isGroupActive: boolean, align?: 'top' | 'center' | 'bottom' }) => {
    const isOpen = activeSubmenu === id;
    
    const flyoutStyle: React.CSSProperties = {
      position: 'absolute',
      left: 'calc(100% + 12px)',
      ...(align === 'top' ? { top: '0' } : align === 'bottom' ? { bottom: '0' } : { top: '50%', transform: 'translateY(-50%)' }),
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '4px',
      background: 'rgba(20, 20, 25, 0.95)',
      backdropFilter: 'blur(24px)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
      transformOrigin: 'left center',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 100
    };

    return (
      <div style={{ position: 'relative' }} className="gm-flyout-container">
        <div onClick={(e) => { e.stopPropagation(); setActiveSubmenu(isOpen ? null : id); }}>
           <ToolButton 
             icon={activeIcon} 
             active={isOpen || isGroupActive} 
             onClick={() => {}} 
             tooltip={title}
           />
           <div style={{
             position: 'absolute',
             bottom: '6px',
             right: '6px',
             width: 0,
             height: 0,
             borderLeft: '4px solid transparent',
             borderBottom: '4px solid rgba(255,255,255,0.7)'
           }} />
        </div>
        
        <div style={flyoutStyle} onClick={(e) => { e.stopPropagation(); setActiveSubmenu(null); }}>
          {children}
        </div>
      </div>
    );
  };

  const groupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '4px',
    background: 'rgba(0,0,0,0.15)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.03)'
  };

  const toggleNPCPanel = () => {
    setShowActors(!showActors);
  };

  const isFog = activeTool === 'FOG';

  const isExpanded = isPinned || isHovered || isMobile;

  return (
    <div 
      className={`hud-sidebar-container ${isExpanded ? '' : 'collapsed'}`}
      onMouseEnter={() => !isPinned && setIsHovered(true)}
      onMouseLeave={() => !isPinned && setIsHovered(false)}
    >
      <div className="hud-glass" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.5rem',
        borderTopRightRadius: '16px',
        borderBottomRightRadius: '16px',
        borderLeft: 'none',
        overflowX: 'visible',
        overflowY: 'visible',
        pointerEvents: 'auto',
      }}>
        {/* Pin Button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ToolButton 
            icon={<Pin size={16} />} 
            active={isPinned} 
            onClick={() => setIsPinned(!isPinned)} 
            tooltip={isPinned ? "Desafixar Menu" : "Fixar Menu"} 
          />
        </div>
        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

        {activeFolder === 'root' && (
          <>
            {/* Hub & Nav Tools */}
            <ToolButton 
              icon={<LayoutGrid size={20} />} 
              active={activeModal === 'widgets'} 
              onClick={() => setActiveModal(activeModal === 'widgets' ? 'none' : 'widgets')} 
              tooltip="Menu Geral (Hub)"
            />
            <ToolButton 
              icon={<BookOpen size={20} />} 
              active={viewMode === 'wiki'} 
              onClick={() => setViewMode(viewMode === 'wiki' ? 'canvas' : 'wiki')} 
              tooltip="Wiki da Campanha"
            />
            <ToolButton 
              icon={<Film size={20} />} 
              active={viewMode === 'theater'} 
              onClick={() => setViewMode(viewMode === 'theater' ? 'canvas' : 'theater')} 
              tooltip="Teatro da Mente"
            />
            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <FlyoutGroup 
            id="map_tools" 
            title="Ferramentas do Mapa" 
            align="top"
            isGroupActive={['CURSOR', 'pan', 'RULER'].includes(activeTool as string) || isFog || ['pen','shape','arrow','text','eraser'].includes(activeTool as string)}
            activeIcon={
              activeTool === 'pan' ? <Hand size={20} /> :
              activeTool === 'RULER' ? <Ruler size={20} /> :
              isFog ? <CloudFog size={20} /> :
              ['pen','shape','arrow','text','eraser'].includes(activeTool as string) ? <Pen size={20} /> :
              <MousePointer2 size={20} />
            }
          >
            <ToolButton 
              icon={<MousePointer2 size={20} />} 
              active={activeTool === 'CURSOR'} 
              onClick={() => { setActiveTool('CURSOR'); setActiveSubmenu(null); }} 
              tooltip="Cursor"
            />
            <ToolButton 
              icon={<Hand size={20} />} 
              active={activeTool === 'pan'} 
              onClick={() => { setActiveTool('pan'); setActiveSubmenu(null); }} 
              tooltip="Mover"
            />
            <ToolButton 
              icon={<Pen size={20} />} 
              active={false} 
              onClick={() => { setActiveFolder('draw'); setActiveSubmenu(null); }} 
              tooltip="Desenhar"
            />
            <ToolButton 
              icon={<CloudFog size={20} />} 
              active={isFog} 
              onClick={() => { setActiveFolder('fog'); setActiveSubmenu(null); }} 
              tooltip="Névoa"
            />
            <ToolButton 
              icon={<Ruler size={20} />} 
              active={activeTool === 'RULER'} 
              onClick={() => { setActiveTool('RULER'); setActiveSubmenu(null); }} 
              tooltip="Régua de Medição"
            />
          </FlyoutGroup>
            <ToolButton 
              icon={<Users size={20} />} 
              active={showActors} 
              onClick={toggleNPCPanel} 
              tooltip="Entidades (NPCs)"
            />
            
            <FlyoutGroup 
              id="social" 
              title="Social & Jogadores" 
              align="top"
              isGroupActive={activeModal === 'players' || openWindows.chatWindow || openWindows.combatLog}
              activeIcon={<MessageSquare size={20} />}
            >
              <ToolButton 
                icon={<Users size={20} />} 
                active={activeModal === 'players'} 
                onClick={() => setActiveModal('players')} 
                tooltip="Convidar Jogadores"
              />
              <ToolButton 
                icon={<MessageSquare size={20} />} 
                active={openWindows.chatWindow} 
                onClick={() => toggleWindow('chatWindow')} 
                tooltip="Chat P2P"
              />
              <ToolButton 
                icon={<MessageSquare size={20} />} 
                active={openWindows.combatLog} 
                onClick={() => toggleWindow('combatLog')} 
                tooltip="Registro de Rolagens"
              />
            </FlyoutGroup>

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

            <FlyoutGroup 
              id="system" 
              title="Sistema" 
              align="bottom"
              isGroupActive={activeModal === 'settings'}
              activeIcon={<Settings size={20} />}
            >
              <ToolButton 
                icon={<Settings size={20} />} 
                active={activeModal === 'settings'} 
                onClick={() => setActiveModal('settings')} 
                tooltip="Configurações Globais"
              />
              <ToolButton 
                icon={<Settings size={20} />} 
                active={false} 
                onClick={() => window.dispatchEvent(new Event('toggle-config-menu'))} 
                tooltip="Configurações do Mapa"
              />
              <ToolButton 
                icon={<Layers size={20} />} 
                active={false} 
                onClick={() => window.dispatchEvent(new Event('toggle-layers-menu'))} 
                tooltip="Camadas (Layers)"
              />
              <ToolButton 
                icon={<LogOut size={20} />} 
                active={false} 
                onClick={() => window.location.href = '/'} 
                tooltip="Sair"
              />
            </FlyoutGroup>
          </>
        )}

      {activeFolder === 'draw' && (
        <>
          <ToolButton 
            icon={<ChevronLeft size={20} />} 
            active={false} 
            onClick={() => { setActiveFolder('root'); setActiveTool('CURSOR'); }} 
            tooltip="Voltar"
          />
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <ToolButton 
            icon={<Pen size={20} />} 
            active={activeTool === 'pen'} 
            onClick={() => handleSetTool('pen')} 
            tooltip="Caneta"
          />
          <ToolButton 
            icon={<Square size={20} />} 
            active={activeTool === 'shape'} 
            onClick={() => handleSetTool('shape')} 
            tooltip="Forma Geométrica"
          />
          <ToolButton 
            icon={<ArrowRight size={20} />} 
            active={activeTool === 'arrow'} 
            onClick={() => handleSetTool('arrow')} 
            tooltip="Seta"
          />
          <ToolButton 
            icon={<Type size={20} />} 
            active={activeTool === 'text'} 
            onClick={() => handleSetTool('text')} 
            tooltip="Texto"
          />
          <ToolButton 
            icon={<Eraser size={20} />} 
            active={activeTool === 'eraser'} 
            onClick={() => handleSetTool('eraser')} 
            tooltip="Borracha"
          />
          <ToolButton 
            icon={<ImageIcon size={20} />} 
            active={false} 
            onClick={() => window.dispatchEvent(new Event('trigger-image-upload'))} 
            tooltip="Adicionar Imagem"
          />
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <ToolButton 
            icon={<Undo2 size={20} />} 
            active={false} 
            onClick={() => window.dispatchEvent(new Event('canvas-undo'))} 
            tooltip="Desfazer"
          />
          <ToolButton 
            icon={<Redo2 size={20} />} 
            active={false} 
            onClick={() => window.dispatchEvent(new Event('canvas-redo'))} 
            tooltip="Refazer"
          />
        </>
      )}

      {activeFolder === 'fog' && (
        <>
          <ToolButton 
            icon={<ChevronLeft size={20} />} 
            active={false} 
            onClick={() => { setActiveFolder('root'); setActiveTool('CURSOR'); }} 
            tooltip="Voltar"
          />
          <div style={{ width: isMobile ? '1px' : '100%', height: isMobile ? '100%' : '1px', background: 'rgba(255,255,255,0.1)', margin: isMobile ? '0 4px' : '4px 0' }} />
          
          <FlyoutGroup 
            id="shapes" 
            title="Formas de Névoa" 
            isGroupActive={isFog}
            activeIcon={
              fogShape === 'brush' ? <Paintbrush size={20} /> :
              fogShape === 'polygon' ? <Hexagon size={20} /> :
              fogShape === 'rect' ? <Square size={20} /> :
              fogShape === 'circle' ? <Circle size={20} /> :
              fogShape === 'triangle' ? <Triangle size={20} /> :
              fogShape === 'lasso' ? <Lasso size={20} /> :
              <Eraser size={20} />
            }
          >
            <ToolButton icon={<Paintbrush size={20} />} active={isFog && fogShape === 'brush'} onClick={() => { setFogShape('brush'); handleSetTool('FOG', 'brush'); }} tooltip="Pincel" />
            <ToolButton icon={<Hexagon size={20} />} active={isFog && fogShape === 'polygon'} onClick={() => { setFogShape('polygon'); handleSetTool('FOG', 'polygon'); }} tooltip="Polígono" />
            <ToolButton icon={<Square size={20} />} active={isFog && fogShape === 'rect'} onClick={() => { setFogShape('rect'); handleSetTool('FOG', 'rect'); }} tooltip="Retângulo" />
            <ToolButton icon={<Circle size={20} />} active={isFog && fogShape === 'circle'} onClick={() => { setFogShape('circle'); handleSetTool('FOG', 'circle'); }} tooltip="Círculo" />
            <ToolButton icon={<Triangle size={20} />} active={isFog && fogShape === 'triangle'} onClick={() => { setFogShape('triangle'); handleSetTool('FOG', 'triangle'); }} tooltip="Triângulo" />
            <ToolButton icon={<Lasso size={20} />} active={isFog && fogShape === 'lasso'} onClick={() => { setFogShape('lasso'); handleSetTool('FOG', 'lasso'); }} tooltip="Laço" />
            <ToolButton icon={<Eraser size={20} />} active={isFog && fogShape === 'eraser'} onClick={() => { setFogShape('eraser'); handleSetTool('FOG', 'erase'); }} tooltip="Borracha (FOG)" />
          </FlyoutGroup>

          <div style={{ width: isMobile ? '1px' : '100%', height: isMobile ? '100%' : '1px', background: 'rgba(255,255,255,0.1)', margin: isMobile ? '0 4px' : '4px 0' }} />
          
          <FlyoutGroup 
            id="modes" 
            title="Modo de Visão" 
            isGroupActive={true}
            activeIcon={fogMode === 'reveal' ? <Eye size={20} /> : <EyeOff size={20} />}
          >
            <ToolButton icon={<Eye size={20} />} active={fogMode === 'reveal'} onClick={() => handleSetFogMode('reveal')} tooltip="Revelar" />
            <ToolButton icon={<EyeOff size={20} />} active={fogMode === 'hide'} onClick={() => handleSetFogMode('hide')} tooltip="Esconder" />
          </FlyoutGroup>

          <div style={{ width: isMobile ? '1px' : '100%', height: isMobile ? '100%' : '1px', background: 'rgba(255,255,255,0.1)', margin: isMobile ? '0 4px' : '4px 0' }} />
          
          <FlyoutGroup 
            id="history" 
            title="Histórico" 
            isGroupActive={false}
            activeIcon={<Undo2 size={20} />}
          >
            <ToolButton icon={<Undo2 size={20} />} active={false} onClick={() => window.dispatchEvent(new Event('canvas-undo'))} tooltip="Desfazer Névoa" />
            <ToolButton icon={<Redo2 size={20} />} active={false} onClick={() => window.dispatchEvent(new Event('canvas-redo'))} tooltip="Refazer Névoa" />
          </FlyoutGroup>

          <div style={{ width: isMobile ? '1px' : '100%', height: isMobile ? '100%' : '1px', background: 'rgba(255,255,255,0.1)', margin: isMobile ? '0 4px' : '4px 0' }} />
          
          <FlyoutGroup 
            id="global" 
            title="Controles Globais" 
            isGroupActive={false}
            activeIcon={<RefreshCcw size={20} />}
          >
            <ToolButton icon={<RefreshCcw size={20} />} active={false} onClick={() => FogOfWar.clear()} tooltip="Resetar FOG" />
            <ToolButton icon={fogConfig.enabled ? <EyeOff size={20} color="#ef4444" /> : <Eye size={20} color="#10b981" />} active={false} onClick={() => Config.updateFog({ enabled: !fogConfig.enabled })} tooltip={fogConfig.enabled ? "Desativar FOG Global" : "Ativar FOG Global"} />
          </FlyoutGroup>
        </>
      )}
      </div>
      <div className="hud-sidebar-trigger" />
    </div>
  );
}

function ToolButton({ icon, active, onClick, tooltip, small = false }: { icon: React.ReactNode, active: boolean, onClick: () => void, tooltip: string, small?: boolean }) {
  const shortcutMatch = tooltip.match(/\(([^)]+)\)$/);
  const shortcut = shortcutMatch ? shortcutMatch[1] : undefined;
  const label = shortcutMatch ? tooltip.replace(/\s*\([^)]+\)$/, '') : tooltip;

  return (
    <Tooltip label={label} shortcut={shortcut} position="right">
      <button
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: small ? '32px' : '40px',
          height: small ? '32px' : '40px',
          borderRadius: '10px',
          background: active ? 'rgba(147, 51, 234, 0.2)' : 'transparent',
          border: `1px solid ${active ? 'rgba(147, 51, 234, 0.5)' : 'transparent'}`,
          color: active ? '#c084fc' : 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.color = '#fff';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
        }
      }}
    >
      {icon}
    </button>
    </Tooltip>
  );
}
