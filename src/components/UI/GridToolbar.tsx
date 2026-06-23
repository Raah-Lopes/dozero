import React, { useEffect, useState } from 'react';
import { localState, setActiveTool } from '../../store';
import { MousePointer2, Type } from 'lucide-react';

export const GridToolbar: React.FC = () => {
  const [activeTool, setActiveToolState] = useState(localState.activeTool);

  useEffect(() => {
    const handler = () => setActiveToolState(localState.activeTool);
    window.addEventListener('tool-changed', handler);
    return () => window.removeEventListener('tool-changed', handler);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      border: '1px solid var(--glass-border)',
      borderRadius: '8px',
      padding: '0.5rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    }}>
      <button
        className={`btn-icon ${activeTool === 'select' ? 'active' : ''}`}
        onClick={() => setActiveTool('select')}
        title="Cursor (Selecionar e Mover)"
        style={{
          background: activeTool === 'select' ? 'var(--accent-primary)' : 'transparent',
          color: activeTool === 'select' ? '#fff' : 'var(--text-secondary)'
        }}
      >
        <MousePointer2 size={20} />
      </button>

      <button
        className={`btn-icon ${activeTool === 'text' ? 'active' : ''}`}
        onClick={() => setActiveTool('text')}
        title="Ferramenta de Texto"
        style={{
          background: activeTool === 'text' ? 'var(--accent-primary)' : 'transparent',
          color: activeTool === 'text' ? '#fff' : 'var(--text-secondary)'
        }}
      >
        <Type size={20} />
      </button>
    </div>
  );
};
