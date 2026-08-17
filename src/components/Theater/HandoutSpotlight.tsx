// src/components/Theater/HandoutSpotlight.tsx
import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Image as ImageIcon, Sparkles, Lock, Unlock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { useIsGM } from '../../store/user';
import type { ClueRedactedSection } from '../../store';
import { Tooltip } from '../UI/Tooltip';
import { toast } from '../UI/Toast';

export interface SpotlightData {
  id?: string;
  title: string;
  url: string;
  description?: string;
  redactedSections?: ClueRedactedSection[];
}

export const HandoutSpotlight: React.FC = () => {
  const isGM = useIsGM();
  const [data, setData] = useState<SpotlightData | null>(null);
  const [zoom, setZoom] = useState(1);
  const { currentScene, patchCurrentScene } = useSceneState();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SpotlightData | null>).detail;
      setData(detail);
      setZoom(1);
    };
    window.addEventListener('theater-spotlight-image', handler);
    return () => window.removeEventListener('theater-spotlight-image', handler);
  }, []);

  // Sincronizar dados com atualizações de cena em tempo real via Yjs
  useEffect(() => {
    if (data?.id && currentScene?.clues) {
      const clue = currentScene.clues.find(c => c.id === data.id);
      if (clue) {
        setData(prev => prev ? {
          ...prev,
          title: clue.title,
          url: clue.url,
          description: clue.description,
          redactedSections: clue.redactedSections,
        } : null);
      }
    }
  }, [currentScene?.clues, data?.id]);

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

  const handleToggleSection = (sectionId: string) => {
    if (!currentScene || !data.id) return;
    const clues = currentScene.clues || [];
    const updatedClues = clues.map(c => {
      if (c.id !== data.id) return c;
      const sections = (c.redactedSections || []).map(s => 
        s.id === sectionId ? { ...s, revealed: !s.revealed } : s
      );
      return { ...c, redactedSections: sections };
    });

    patchCurrentScene({ clues: updatedClues });
    const targetSection = (data.redactedSections || []).find(s => s.id === sectionId);
    if (targetSection) {
      const isNowRevealed = !targetSection.revealed;
      toast[isNowRevealed ? 'success' : 'info'](
        isNowRevealed 
          ? `Trecho "${targetSection.label}" revelado aos jogadores!` 
          : `Trecho "${targetSection.label}" ocultado.`
      );
    }
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
            {isGM && (
              <>
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
              </>
            )}

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

        {/* Footer with Description & Progressive Revelation Sections */}
        {(data.description || (data.redactedSections && data.redactedSections.length > 0)) && (
          <div className="theater-spotlight-footer">
            {data.description && <p className="theater-spotlight-desc-text">{data.description}</p>}

            {/* Progressive Revelation (Text Fog-of-War) */}
            {data.redactedSections && data.redactedSections.length > 0 && (
              <div className="theater-spotlight-redacted-container">
                <div className="theater-spotlight-redacted-title">
                  <Lock size={13} color="#f59e0b" />
                  <span>Trechos de Investigação & Análise</span>
                </div>
                <div className="theater-spotlight-redacted-list">
                  {data.redactedSections.map(sec => (
                    <div 
                      key={sec.id} 
                      className={`theater-spotlight-redacted-card ${sec.revealed ? 'revealed' : 'censored'}`}
                    >
                      <div className="theater-spotlight-redacted-card-header">
                        <div className="theater-spotlight-redacted-label">
                          {sec.revealed ? (
                            <CheckCircle2 size={13} color="#10b981" />
                          ) : (
                            <Lock size={13} color="#f59e0b" />
                          )}
                          <strong>{sec.label}</strong>
                          <span className={`theater-spotlight-status-tag ${sec.revealed ? 'revealed' : 'locked'}`}>
                            {sec.revealed ? 'Revelado' : 'Oculto'}
                          </span>
                        </div>

                        {isGM && data.id && (
                          <button 
                            className="theater-spotlight-toggle-btn"
                            onClick={() => handleToggleSection(sec.id)}
                            title={sec.revealed ? 'Ocultar dos jogadores' : 'Revelar para todos os jogadores'}
                          >
                            {sec.revealed ? <EyeOff size={13} /> : <Eye size={13} />}
                            <span>{sec.revealed ? 'Ocultar' : 'Revelar'}</span>
                          </button>
                        )}
                      </div>

                      <div className="theater-spotlight-redacted-card-body">
                        {sec.revealed ? (
                          <p className="theater-spotlight-revealed-text">{sec.text}</p>
                        ) : isGM ? (
                          <p className="theater-spotlight-gm-preview">
                            <span className="theater-spoiler-tag">[Visão do Mestre]:</span> {sec.text}
                          </p>
                        ) : (
                          <p className="theater-spotlight-censored-text">
                            ██████████████████████████████████ (Trecho oculto — requer teste de investigação)
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
