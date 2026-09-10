import React from 'react';
import { MapPin, FileText, Download } from 'lucide-react';

interface CodexToolbarProps {
  onAddLocation: () => void;
  onAddAnnotation: () => void;
  onExport: () => void;
}

export default function CodexToolbar({
  onAddLocation,
  onAddAnnotation,
  onExport,
}: CodexToolbarProps) {
  return (
    <div className="flex gap-2 p-2 border-b" style={{ borderColor: 'var(--dz-stone)' }}>
      <button
        onClick={onAddLocation}
        className="dz-button flex items-center gap-1"
        aria-label="Adicionar local"
        title="Adicionar local"
      >
        <MapPin size={14} />
        <span>Local</span>
      </button>
      <button
        onClick={onAddAnnotation}
        className="dz-button flex items-center gap-1"
        aria-label="Adicionar anotação"
        title="Adicionar anotação"
      >
        <FileText size={14} />
        <span>Anotação</span>
      </button>
      <button
        onClick={onExport}
        className="dz-button flex items-center gap-1"
        aria-label="Exportar projeto"
        title="Exportar projeto"
      >
        <Download size={14} />
        <span>Exportar</span>
      </button>
    </div>
  );
}
