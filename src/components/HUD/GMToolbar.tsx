import React from 'react';
import { MousePointer2, CloudFog, Ruler, Users, Eye, EyeOff, Paintbrush, Hexagon, RefreshCcw, Square, Circle, Triangle, Lasso } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { Config, onFogConfigChanged } from '../../store/modules/configModule';
import { FogOfWar } from '../../store/modules/fogModule';
import { setActiveTool as setGlobalActiveTool, setFogMode as setGlobalFogMode, localState } from '../../store';
import type { FogConfig } from '../../store/modules/configModule';

export function GMToolbar() {
  const { activeTool, setActiveTool, activeModal, setActiveModal, showActors, setShowActors } = useWindowManager();
  const [fogConfig, setFogConfig] = React.useState<FogConfig>(Config.getFogConfig());
  const [fogMode, setFogMode] = React.useState<'reveal' | 'hide'>('reveal');
  const [fogShape, setFogShape] = React.useState<'brush' | 'polygon' | 'rect' | 'circle' | 'triangle' | 'lasso'>('brush');
  
  React.useEffect(() => {
    if (activeTool === 'FOG') {
      const toolMap: Record<string, string> = { brush: 'fog_brush', polygon: 'fog_polygon', rect: 'fog_rect', circle: 'fog_circle', triangle: 'fog_triangle', lasso: 'fog_lasso' };
      setGlobalActiveTool((toolMap[fogShape] || 'fog_brush') as any);
      setGlobalFogMode(fogMode);
    } else if (activeTool === 'RULER') {
      setGlobalActiveTool('ruler');
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

  const toggleNPCPanel = () => {
    setShowActors(!showActors);
  };

  const isFog = activeTool === 'FOG';

  return (
    <>
      <div 
        className="gm-toolbar"
        style={{
        position: 'absolute',
        left: '1rem',
        top: window.innerWidth <= 1257 ? '35%' : '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '0.5rem',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 50,
        maxHeight: '60vh',
        overflowY: 'auto',
      }}>
        <ToolButton 
          icon={<MousePointer2 size={20} />} 
          active={activeTool === 'CURSOR'} 
          onClick={() => setActiveTool('CURSOR')} 
          tooltip="Cursor"
        />
        <ToolButton 
          icon={<Users size={20} />} 
          active={showActors} 
          onClick={toggleNPCPanel} 
          tooltip="Entity Forge (NPCs)"
        />
        <ToolButton 
          icon={<CloudFog size={20} />} 
          active={isFog} 
          onClick={() => setActiveTool('FOG')} 
          tooltip="Fog of War"
        />
        <ToolButton 
          icon={<Ruler size={20} />} 
          active={activeTool === 'RULER'} 
          onClick={() => setActiveTool('RULER')} 
          tooltip="Régua de Medição"
        />
      </div>

      {/* Fog Contextual Bar */}
      {isFog && (
        <div style={{
          position: 'absolute',
          left: '5rem',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(147, 51, 234, 0.3)',
          padding: '0.5rem',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(147, 51, 234, 0.15)',
          zIndex: 49,
          animation: 'slideInLeft 0.2s ease-out'
        }}>
          <div style={{ fontSize: '0.65rem', color: '#c084fc', textAlign: 'center', fontWeight: 'bold', marginBottom: '4px' }}>FOG OPS</div>
          
          <ToolButton 
            icon={<Eye size={18} />} 
            active={fogMode === 'reveal'} 
            onClick={() => setFogMode('reveal')} 
            tooltip="Revelar Área"
            small
          />
          <ToolButton 
            icon={<EyeOff size={18} />} 
            active={fogMode === 'hide'} 
            onClick={() => setFogMode('hide')} 
            tooltip="Esconder Área"
            small
          />
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <ToolButton 
            icon={<Paintbrush size={18} />} 
            active={fogShape === 'brush'} 
            onClick={() => setFogShape('brush')} 
            tooltip="Pincel"
            small
          />
          <ToolButton 
            icon={<Hexagon size={18} />} 
            active={fogShape === 'polygon'} 
            onClick={() => setFogShape('polygon')} 
            tooltip="Polígono"
            small
          />
          <ToolButton 
            icon={<Square size={18} />} 
            active={fogShape === 'rect'} 
            onClick={() => setFogShape('rect')} 
            tooltip="Retângulo"
            small
          />
          <ToolButton 
            icon={<Circle size={18} />} 
            active={fogShape === 'circle'} 
            onClick={() => setFogShape('circle')} 
            tooltip="Círculo"
            small
          />
          <ToolButton 
            icon={<Triangle size={18} />} 
            active={fogShape === 'triangle'} 
            onClick={() => setFogShape('triangle')} 
            tooltip="Triângulo"
            small
          />
          <ToolButton 
            icon={<Lasso size={18} />} 
            active={fogShape === 'lasso'} 
            onClick={() => setFogShape('lasso')} 
            tooltip="Laço (Livre)"
            small
          />
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <ToolButton 
            icon={<RefreshCcw size={18} />} 
            active={false} 
            onClick={() => FogOfWar.clear()} 
            tooltip="Resetar FOG"
            small
          />
          <ToolButton 
            icon={fogConfig.enabled ? <EyeOff size={18} color="#ef4444" /> : <Eye size={18} color="#10b981" />} 
            active={false} 
            onClick={() => Config.updateFog({ enabled: !fogConfig.enabled })} 
            tooltip={fogConfig.enabled ? "Desativar FOG Global" : "Ativar FOG Global"}
            small
          />
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInLeft {
          from { opacity: 0; transform: translate(-10px, -50%); }
          to { opacity: 1; transform: translate(0, -50%); }
        }
      `}} />
    </>
  );
}

function ToolButton({ icon, active, onClick, tooltip, small = false }: { icon: React.ReactNode, active: boolean, onClick: () => void, tooltip: string, small?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
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
  );
}
