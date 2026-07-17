import React, { useEffect } from 'react';
import { WidgetLayer } from '../HUD/WidgetLayer';
import { connectProvider } from '../../services/yjs';

// Import specific standalones that aren't in WidgetLayer
import { ChatWindow } from '../Chat/ChatWindow';
import { CombatTracker } from '../HUD/CombatTracker';
import { CombatLog } from '../Chat/CombatLog';
import { TargetTerminal } from '../Widgets/PlayerTools/TargetTerminal';

interface PopoutViewerProps {
  widgetId: string;
}

export const PopoutViewer: React.FC<PopoutViewerProps> = ({ widgetId }) => {
  useEffect(() => {
    // Ensure Yjs is connected so data flows perfectly
    connectProvider();
    
    // Set a global class on body for any specific CSS overrides needed in popout mode
    document.body.classList.add('is-popout');
    return () => {
      document.body.classList.remove('is-popout');
    };
  }, []);

  // Handle legacy/specific standalones that are NOT in WidgetLayer yet
  if (widgetId === 'chatWindow') return <PopoutContainer title="Chat P2P"><ChatWindow /></PopoutContainer>;
  if (widgetId === 'combatTracker') return <PopoutContainer title="Iniciativa"><CombatTracker /></PopoutContainer>;
  if (widgetId === 'combatLog') return <PopoutContainer title="Registro de Combate"><CombatLog /></PopoutContainer>;
  
  if (widgetId.startsWith('sheet-')) {
    const sheetKey = widgetId.replace('sheet-', '');
    const isWiki = sheetKey.startsWith('wiki:');
    const wikiPath = isWiki ? sheetKey.slice(5) : undefined;
    const tokenId = isWiki ? undefined : sheetKey;
    return (
      <PopoutContainer title="Ficha">
        <TargetTerminal tokenId={tokenId} wikiPath={wikiPath} isGM={true} />
      </PopoutContainer>
    );
  }

  // Generic fallback: Use WidgetLayer!
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
      {/* 
        Pass standaloneWidget to WidgetLayer. 
        WidgetLayer will override `openWindows` and ONLY render this widget.
        DraggableWindow will detect URL param `?widget=` and disable dragging/resizing,
        snapping to 100% width and height.
      */}
      <WidgetLayer standaloneWidget={widgetId} />
    </div>
  );
};

// Helper container for legacy widgets that don't use DraggableWindow natively
// or need a wrapper title bar.
const PopoutContainer: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => {
  return (
    <div className="standalone-widget-container" style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      <div className="standalone-header" style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h3>
        <span className="sync-badge" style={{ fontSize: '0.7rem', color: '#10b981', border: '1px solid #10b981', padding: '2px 6px', borderRadius: '4px' }}>Sincronizado via Yjs</span>
      </div>
      <div className="standalone-content" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
};
