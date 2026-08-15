// src/components/Theater/SceneCluesModal.tsx
import React, { useState } from 'react';
import { 
  Scroll, Eye, EyeOff, Plus, Trash2, Sparkles, X, 
  Image as ImageIcon, ZoomIn, CheckCircle2
} from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { convertImageToWebP } from '../../utils/imageUtils';
import { saveImageToCloud } from '../../utils/githubApi';
import { Tooltip } from '../UI/Tooltip';
import { toast } from '../UI/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SceneCluesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentScene, patchCurrentScene } = useSceneState();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const clues = currentScene?.clues || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.info('Carregando imagem da pista...');
      const { base64 } = await convertImageToWebP(file, 0.85, 1200);
      const cloudUrl = await saveImageToCloud(base64, `clue_${Date.now()}.webp`);
      setUrl(cloudUrl || base64);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
      toast.success('Imagem carregada!');
    } catch {
      toast.error('Erro ao processar imagem.');
    }
  };

  const handleAddClue = () => {
    if (!title.trim() || !url.trim()) {
      toast.warn('Preencha ao menos o título e a imagem.');
      return;
    }
    const newClue = {
      id: `clue_${Date.now()}`,
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      discovered: true,
    };
    const updated = [...clues, newClue];
    patchCurrentScene({ clues: updated });
    toast.success(`Pista "${title}" adicionada à cena!`);
    setTitle('');
    setUrl('');
    setDescription('');
    setIsAdding(false);
  };

  const handleToggleDiscovered = (id: string) => {
    const updated = clues.map(c => c.id === id ? { ...c, discovered: !c.discovered } : c);
    patchCurrentScene({ clues: updated });
  };

  const handleDeleteClue = (id: string) => {
    const updated = clues.filter(c => c.id !== id);
    patchCurrentScene({ clues: updated });
    toast.info('Pista removida.');
  };

  const handleSpotlight = (clue: typeof clues[0]) => {
    window.dispatchEvent(new CustomEvent('theater-spotlight-image', {
      detail: { title: clue.title, url: clue.url, description: clue.description }
    }));
  };

  return (
    <div className="theater-clues-overlay" onClick={onClose}>
      <div 
        className="theater-clues-modal" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="theater-clues-header">
          <div className="theater-clues-title-group">
            <Scroll size={16} color="#f59e0b" />
            <div>
              <h3>Mural de Pistas & Handouts</h3>
              <span>{clues.length} pista{clues.length === 1 ? '' : 's'} na cena atual</span>
            </div>
          </div>

          <div className="theater-clues-actions">
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className={`theater-clue-btn-add ${isAdding ? 'active' : ''}`}
            >
              <Plus size={14} />
              <span>{isAdding ? 'Cancelar' : 'Nova Pista'}</span>
            </button>
            <button onClick={onClose} className="theater-clues-close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Add Clue Form */}
        {isAdding && (
          <div className="theater-clue-form">
            <input 
              type="text" 
              placeholder="Nome da pista (ex: Carta Rasgada, Mapa da Cripta)..." 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="theater-clue-input"
            />

            <div className="theater-clue-img-row">
              <input 
                type="text" 
                placeholder="URL da Imagem ou envie arquivo ao lado..." 
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="theater-clue-input flex-1"
              />
              <label className="theater-clue-upload-btn">
                <ImageIcon size={14} />
                <span>Upload</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>

            <textarea 
              placeholder="Descrição ou transcrição secreta para os jogadores lerem..." 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="theater-clue-textarea"
              rows={2}
            />

            <button onClick={handleAddClue} className="theater-clue-submit-btn">
              <Sparkles size={14} />
              Salvar Pista no Mural
            </button>
          </div>
        )}

        {/* Clues Grid */}
        <div className="theater-clues-grid">
          {clues.length === 0 ? (
            <div className="theater-clues-empty">
              <Scroll size={36} opacity={0.3} />
              <p>Nenhuma pista anexada a esta cena ainda.</p>
              <span>Adicione documentos, cartas e mapas para apresentar aos jogadores em 1 clique.</span>
            </div>
          ) : (
            clues.map(clue => (
              <div 
                key={clue.id} 
                className={`theater-clue-card ${clue.discovered ? 'discovered' : 'hidden'}`}
              >
                <div 
                  className="theater-clue-thumbnail"
                  onClick={() => handleSpotlight(clue)}
                  title="Clique para Apresentar em Tela Cheia"
                >
                  <img src={clue.url} alt={clue.title} />
                  <div className="theater-clue-hover-overlay">
                    <ZoomIn size={20} />
                    <span>Apresentar</span>
                  </div>
                </div>

                <div className="theater-clue-info">
                  <h4>{clue.title}</h4>
                  {clue.description && <p>{clue.description}</p>}
                </div>

                <div className="theater-clue-card-footer">
                  <button 
                    className={`theater-clue-disc-btn ${clue.discovered ? 'active' : ''}`}
                    onClick={() => handleToggleDiscovered(clue.id)}
                    title={clue.discovered ? 'Marcado como Descoberto' : 'Marcado como Oculto'}
                  >
                    {clue.discovered ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{clue.discovered ? 'Descoberta' : 'Oculta'}</span>
                  </button>

                  <button 
                    className="theater-clue-del-btn"
                    onClick={() => handleDeleteClue(clue.id)}
                    title="Excluir Pista"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
