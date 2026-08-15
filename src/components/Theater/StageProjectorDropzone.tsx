// src/components/Theater/StageProjectorDropzone.tsx
import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, User, Scroll, X, Upload, Check } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { addTheaterAsset } from '../../store';
import { convertImageToWebP } from '../../utils/imageUtils';
import { saveImageToCloud } from '../../utils/githubApi';
import { toast } from '../UI/Toast';

interface PendingDrop {
  title: string;
  url: string;
  type: 'npc' | 'location' | 'prop' | 'monster' | 'other';
}

export const StageProjectorDropzone: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [editableTitle, setEditableTitle] = useState('');
  const { patchCurrentScene, currentScene } = useSceneState();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if left the root container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // 1. Check if files were dropped
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        try {
          toast.info('Processando imagem...');
          const { base64 } = await convertImageToWebP(file, 0.9, 1920);
          const cloudUrl = await saveImageToCloud(base64, `projector_${Date.now()}.webp`);
          const finalUrl = cloudUrl || base64;
          const fileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setPendingDrop({ title: fileName, url: finalUrl, type: 'npc' });
          setEditableTitle(fileName);
        } catch (err: any) {
          toast.error('Erro ao carregar imagem solta.');
        }
        return;
      }
    }

    // 2. Check text/json payload
    try {
      const textData = e.dataTransfer.getData('text/plain');
      if (textData) {
        // Try parsing JSON payload (e.g. from NPC card or prop)
        if (textData.startsWith('{')) {
          const parsed = JSON.parse(textData);
          if (parsed.url) {
            const parsedTitle = parsed.title || 'Elemento';
            setPendingDrop({ title: parsedTitle, url: parsed.url, type: parsed.type || 'npc' });
            setEditableTitle(parsedTitle);
            return;
          }
        }
        // Direct image URL
        if (textData.startsWith('http://') || textData.startsWith('https://') || textData.startsWith('data:image')) {
          setPendingDrop({ title: 'Novo Recurso', url: textData, type: 'location' });
          setEditableTitle('Novo Recurso');
          return;
        }
      }
    } catch {
      // Ignored
    }
  };

  const saveToVault = (finalType: 'npc' | 'location' | 'prop' | 'monster' | 'other') => {
    if (!pendingDrop) return;
    const finalTitle = editableTitle.trim() || pendingDrop.title;
    addTheaterAsset({
      title: finalTitle,
      url: pendingDrop.url,
      type: finalType,
    });
  };

  const setAsBackground = () => {
    if (!pendingDrop) return;
    saveToVault('location');
    patchCurrentScene({ imageUrl: pendingDrop.url });
    toast.success('Fundo atualizado e salvo no Acervo!');
    setPendingDrop(null);
  };

  const setAsNpcPortrait = () => {
    if (!pendingDrop) return;
    const finalTitle = editableTitle.trim() || pendingDrop.title;
    saveToVault('npc');
    window.dispatchEvent(new CustomEvent('theater-show-npc', { 
      detail: { name: finalTitle, imageUrl: pendingDrop.url, type: 'npc' } 
    }));
    toast.info(`Retrato de "${finalTitle}" projetado e salvo no Acervo!`);
    setPendingDrop(null);
  };

  const setAsSpotlight = () => {
    if (!pendingDrop) return;
    const finalTitle = editableTitle.trim() || pendingDrop.title;
    saveToVault('prop');
    window.dispatchEvent(new CustomEvent('theater-spotlight-image', { 
      detail: { title: finalTitle, url: pendingDrop.url } 
    }));
    toast.success(`Pista salva no Acervo e apresentada!`);
    setPendingDrop(null);
  };

  return (
    <div 
      className="theater-dropzone-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag Visual Indicator */}
      {isDragging && (
        <div className="theater-drag-overlay">
          <div className="theater-drag-box">
            <Upload size={40} className="theater-drag-icon" />
            <h3>Solte para Projetar no Palco</h3>
            <p>Fundo da Cena • Retrato de NPC • Pista em Destaque</p>
          </div>
        </div>
      )}

      {/* Action Popover when dropped */}
      {pendingDrop && (
        <div className="theater-drop-modal-overlay" onClick={() => setPendingDrop(null)}>
          <div className="theater-drop-modal" onClick={e => e.stopPropagation()}>
            <div className="theater-drop-modal-header">
              <h3>🎯 Como deseja projetar esta imagem?</h3>
              <button onClick={() => setPendingDrop(null)} className="theater-drop-modal-close">
                <X size={16} />
              </button>
            </div>

            <div className="theater-drop-preview">
              <img src={pendingDrop.url} alt={pendingDrop.title} />
              <div style={{ flex: 1 }}>
                <input 
                  type="text" 
                  value={editableTitle}
                  onChange={e => setEditableTitle(e.target.value)}
                  placeholder="Nome do elemento (ex: Lorde Valerius)..."
                  className="theater-drop-name-input"
                />
                <span className="theater-drop-vault-hint">💾 Será salvo no seu Acervo da Campanha</span>
              </div>
            </div>

            <div className="theater-drop-options">
              <button className="theater-drop-opt-btn bg" onClick={setAsBackground}>
                <ImageIcon size={18} />
                <div>
                  <strong>Definir como Fundo da Cena</strong>
                  <small>Aplica como cenário principal do palco</small>
                </div>
              </button>

              <button className="theater-drop-opt-btn npc" onClick={setAsNpcPortrait}>
                <User size={18} />
                <div>
                  <strong>Projetar no Centro do Palco</strong>
                  <small>Exibe o avatar do Personagem/NPC</small>
                </div>
              </button>

              <button className="theater-drop-opt-btn spotlight" onClick={setAsSpotlight}>
                <Scroll size={18} />
                <div>
                  <strong>Apresentar como Pista (Spotlight)</strong>
                  <small>Foco cinematográfico em tela cheia</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
