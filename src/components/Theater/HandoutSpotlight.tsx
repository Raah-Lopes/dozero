// src/components/Theater/HandoutSpotlight.tsx
import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Image as ImageIcon, Sparkles, Download, Maximize2 } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { Tooltip } from '../UI/Tooltip';
import { toast } from '../UI/Toast';

export interface SpotlightData {
  title: string;
  url: string;
  description?: string;
}

export const HandoutSpotlight: React.FC = () => {
  const [data, setData] = useState<SpotlightData | null>(null);
  const [zoom, setZoom] = useState(1);
  const { patchCurrentScene } = useSceneState();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SpotlightData | null>).detail;
      setData(detail);
      setZoom(1);
    };
    window.addEventListener('theater-spotlight-image', handler);
    return () => window.removeEventListener('theater-spotlight-image', handler);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && data) {
        setData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data]);

  if (!data) return null;

  const handleSetAsBackground = () => {
    patchCurrentScene({ imageUrl: data.url });
    toast.success('Imagem definida como fundo da cena!');
    setData(null);
  };

  const handleProjectAsNpc = () => {
    window.dispatchEvent(new CustomEvent('theater-show-npc', { detail: { name: data.title, imageUrl: data.url } }));
    toast.info(`Retrato de "${data.title}" projetado no palco!`);
    setData(null);
  };

  return (
    <div className="theater-spotlight-overlay" onClick={() => setData(null)}>
      <div 
        className="theater-spotlight-modal" 
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar controls */}
        <div className="theater-spotlight-header">
          <div className="theater-spotlight-title-group">
            <Sparkles size={16} color="#f59e0b" />
            <h3 className="theater-spotlight-title">{data.title}</h3>
          </div>

          <div className="theater-spotlight-actions">
            <Tooltip label="Definir como Fundo da Cena">
              <button 
                className="theater-spotlight-action-btn"
                onClick={handleSetAsBackground}
              >
                <ImageIcon size={14} />
                <span>Virar Fundo</span>
              </button>
            </Tooltip>

            <Tooltip label="Projetar Retrato no Palco">
              <button 
                className="theater-spotlight-action-btn"
                onClick={handleProjectAsNpc}
              >
                <span>👤 Virar Retrato</span>
              </button>
            </Tooltip>

            <div className="theater-spotlight-divider" />

            <Tooltip label="Aumentar Zoom">
              <button 
                className="theater-spotlight-icon-btn"
                onClick={() => setZoom(z => Math.min(2.5, z + 0.25))}
              >
                <ZoomIn size={15} />
              </button>
            </Tooltip>

            <Tooltip label="Diminuir Zoom">
              <button 
                className="theater-spotlight-icon-btn"
                onClick={() => setZoom(z => Math.max(0.6, z - 0.25))}
              >
                <ZoomOut size={15} />
              </button>
            </Tooltip>

            <Tooltip label="Fechar (ESC)">
              <button 
                className="theater-spotlight-icon-btn close"
                onClick={() => setData(null)}
              >
                <X size={18} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Theatrical Spotlight Image Display */}
        <div className="theater-spotlight-image-container">
          <img 
            src={data.url} 
            alt={data.title} 
            className="theater-spotlight-image"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>

        {/* Footer with Description if available */}
        {data.description && (
          <div className="theater-spotlight-footer">
            <p>{data.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};
