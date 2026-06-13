import React, { useEffect, useState } from 'react';

interface TelemetryData {
  lastEvent: string;
  targetTag: string;
  targetClass: string;
  clientX: number;
  clientY: number;
  pixiHovered: boolean;
  pixiDragging: boolean;
  pixiTokenX: number;
  pixiTokenY: number;
}

export const DiagnosticOverlay: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    lastEvent: 'None',
    targetTag: 'None',
    targetClass: 'None',
    clientX: 0,
    clientY: 0,
    pixiHovered: false,
    pixiDragging: false,
    pixiTokenX: 0,
    pixiTokenY: 0,
  });

  useEffect(() => {
    // Inject global object to receive data from PixiJS
    if (!(window as any).__PIXI_DIAGNOSTICS__) {
      (window as any).__PIXI_DIAGNOSTICS__ = {
        hovered: false,
        dragging: false,
        tokenX: 0,
        tokenY: 0,
      };
    }

    const handlePointerEvent = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const pixiData = (window as any).__PIXI_DIAGNOSTICS__;
      
      setTelemetry({
        lastEvent: e.type,
        targetTag: target.tagName,
        targetClass: target.getAttribute('class') || 'None',
        clientX: Math.round(e.clientX),
        clientY: Math.round(e.clientY),
        pixiHovered: pixiData.hovered,
        pixiDragging: pixiData.dragging,
        pixiTokenX: Math.round(pixiData.tokenX),
        pixiTokenY: Math.round(pixiData.tokenY),
      });
    };

    // Fast interval to poll Pixi data even if DOM events don't fire
    const interval = setInterval(() => {
      const pixiData = (window as any).__PIXI_DIAGNOSTICS__;
      setTelemetry(prev => ({
        ...prev,
        pixiHovered: pixiData.hovered,
        pixiDragging: pixiData.dragging,
        pixiTokenX: Math.round(pixiData.tokenX),
        pixiTokenY: Math.round(pixiData.tokenY),
      }));
    }, 100);

    window.addEventListener('pointerdown', handlePointerEvent, { capture: true });
    window.addEventListener('pointermove', handlePointerEvent, { capture: true });
    window.addEventListener('pointerup', handlePointerEvent, { capture: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('pointerdown', handlePointerEvent, { capture: true });
      window.removeEventListener('pointermove', handlePointerEvent, { capture: true });
      window.removeEventListener('pointerup', handlePointerEvent, { capture: true });
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 999999,
      background: 'rgba(0, 255, 0, 0.1)',
      border: '1px solid #00ff00',
      color: '#00ff00',
      padding: '10px 20px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      backdropFilter: 'blur(4px)',
      pointerEvents: 'none',
      textShadow: '0 0 5px #00ff00',
      display: 'flex',
      gap: '20px'
    }}>
      <div>
        <b>DOM EVENT</b><br/>
        Type: {telemetry.lastEvent}<br/>
        Target: &lt;{telemetry.targetTag}&gt; .{telemetry.targetClass}<br/>
        Mouse: {telemetry.clientX}, {telemetry.clientY}
      </div>
      <div style={{ borderLeft: '1px solid #00ff00', paddingLeft: '20px' }}>
        <b>PIXIJS SYSTEM</b><br/>
        Hitbox Hover: {telemetry.pixiHovered ? 'YES' : 'NO'}<br/>
        Dragging: {telemetry.pixiDragging ? 'YES' : 'NO'}<br/>
        Token Pos: {telemetry.pixiTokenX}, {telemetry.pixiTokenY}
      </div>
    </div>
  );
};
