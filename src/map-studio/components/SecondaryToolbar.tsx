import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Layers, Download } from 'lucide-react';

interface SecondaryToolbarProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleLayers?: () => void;
  onExport?: () => void;
}

export default function SecondaryToolbar({
  onZoomIn,
  onZoomOut,
  onToggleLayers,
  onExport,
}: SecondaryToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 border-b border-stone-700 ${collapsed ? 'hidden' : ''}`}
      style={{ background: 'var(--dz-graphite-2)' }}
    >
      <button
        aria-label="Aumentar Zoom"
        title="Aumentar Zoom (+)"
        onClick={onZoomIn}
        className="p-1 rounded text-stone-400 hover:text-amber-200 hover:bg-stone-800 transition-colors focus-visible:ring"
      >
        <ZoomIn size={16} />
      </button>
      <button
        aria-label="Diminuir Zoom"
        title="Diminuir Zoom (-)"
        onClick={onZoomOut}
        className="p-1 rounded text-stone-400 hover:text-amber-200 hover:bg-stone-800 transition-colors focus-visible:ring"
      >
        <ZoomOut size={16} />
      </button>
      <button
        aria-label="Camadas"
        title="Camadas"
        onClick={onToggleLayers}
        className="p-1 rounded text-stone-400 hover:text-amber-200 hover:bg-stone-800 transition-colors focus-visible:ring"
      >
        <Layers size={16} />
      </button>
      <button
        aria-label="Exportar Mapa"
        title="Exportar Mapa"
        onClick={onExport}
        className="p-1 rounded text-stone-400 hover:text-amber-200 hover:bg-stone-800 transition-colors focus-visible:ring"
      >
        <Download size={16} />
      </button>
      {/* Botão de colapso */}
      <button
        aria-label={collapsed ? 'Expandir barra secundária' : 'Colapsar barra secundária'}
        onClick={() => setCollapsed(!collapsed)}
        className="ml-auto p-1 text-stone-400 hover:text-amber-200 focus-visible:ring"
      >
        {collapsed ? '+' : '-'}
      </button>
    </div>
  );
}
