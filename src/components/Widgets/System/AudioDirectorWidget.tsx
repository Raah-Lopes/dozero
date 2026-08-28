import React from 'react';
import { ArrowLeft, Headphones, Maximize2, X } from 'lucide-react';
import { SoundboardCompact, SoundboardWorkspace } from '../../../../SOUND/src/App';
import './soundboard.css';

interface Props {
  onClose: () => void;
}

export const AudioDirectorWidget: React.FC<Props> = ({ onClose }) => {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <section className="dozero-soundboard-fullscreen" role="dialog" aria-modal="true" aria-label="Soundboard principal">
      <header className="dozero-soundboard-fullscreen-header">
        <div className="dozero-soundboard-fullscreen-title">
          <Headphones size={17} />
          <span>Soundboard principal</span>
          <small>áudio integrado à mesa</small>
        </div>
        <div className="dozero-soundboard-fullscreen-actions">
          <button type="button" className="dozero-soundboard-back" onClick={onClose} aria-label="Voltar para a mesa" title="Voltar para a mesa">
            <ArrowLeft size={15} />
            <span>Voltar para a mesa</span>
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar soundboard" title="Fechar soundboard">
            <X size={18} />
          </button>
        </div>
      </header>
      <div className="dozero-soundboard-fullscreen-body">
        <SoundboardWorkspace />
      </div>
    </section>
  );
};

export const AudioDirectorCompactWidget: React.FC<Props & { onExpand: () => void }> = ({ onClose, onExpand }) => {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <section className="dozero-soundboard-compact" role="dialog" aria-label="Soundboard compacto">
      <div className="dozero-soundboard-compact-actions">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-fog-dim">atalho da mesa</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onExpand} aria-label="Abrir soundboard completo" title="Abrir soundboard completo">
            <Maximize2 size={13} />
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar soundboard compacto" title="Fechar soundboard compacto">
            <X size={14} />
          </button>
        </div>
      </div>
      <SoundboardCompact onExpand={onExpand} />
    </section>
  );
};
