import React from 'react';
import { CanvasEditor } from './CanvasEditor';

/**
 * EditorPanel – contêiner que exibe o CanvasEditor.
 * Pode ser posicionado como painel flutuante ao lado da lista de locais/anotações.
 */
export function EditorPanel() {
  return (
    <div className="absolute top-0 right-0 w-[400px] h-full bg-ink-900 border-l border-ink-700/70 z-20 overflow-hidden">
      <CanvasEditor />
    </div>
  );
}
