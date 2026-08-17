// src/components/Theater/SceneCluesModal.tsx
import React, { useState } from 'react';
import { 
  Scroll, Eye, EyeOff, Plus, Trash2, Sparkles, X, 
  Image as ImageIcon, ZoomIn, Lock, Unlock, CheckCircle2, Edit2, FolderArchive
} from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { useIsGM } from '../../store/user';
import { addTheaterAsset, updateTheaterAsset, type ClueRedactedSection, type TheaterClue } from '../../store';
import { convertImageToWebP } from '../../utils/imageUtils';
import { saveImageToCloud } from '../../utils/githubApi';
import { Tooltip } from '../UI/Tooltip';
import { toast } from '../UI/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SceneCluesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const isGM = useIsGM();
  const { currentScene, patchCurrentScene, globalAssets } = useSceneState();
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingClueId, setEditingClueId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  // Trechos ocultos durante a criação / edição
  const [redactedList, setRedactedList] = useState<ClueRedactedSection[]>([]);
  const [newSecLabel, setNewSecLabel] = useState('');
  const [newSecText, setNewSecText] = useState('');

  if (!isOpen) return null;

  const clues = currentScene?.clues || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      toast.info('Processando e otimizando imagem...');
      const { base64, filename } = await convertImageToWebP(file, 0.85, 1200);
      const cloudUrl = await saveImageToCloud(base64, filename || `clue_${Date.now()}.webp`);
      setUrl(cloudUrl || base64);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      toast.success('Imagem carregada com sucesso!');
    } catch (err: any) {
      console.error('[SceneCluesModal] Erro no upload:', err);
      toast.error('Erro ao processar imagem.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddRedactedSection = () => {
    if (!newSecLabel.trim() || !newSecText.trim()) {
      toast.warn('Preencha o rótulo e o texto do trecho oculto.');
      return;
    }
    const newSec: ClueRedactedSection = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: newSecLabel.trim(),
      text: newSecText.trim(),
      revealed: false,
    };
    setRedactedList([...redactedList, newSec]);
    setNewSecLabel('');
    setNewSecText('');
    toast.info('Trecho oculto adicionado!');
  };

  const handleRemoveRedactedSection = (secId: string) => {
    setRedactedList(redactedList.filter(s => s.id !== secId));
  };

  const handleStartEdit = (clue: TheaterClue) => {
    setEditingClueId(clue.id);
    setTitle(clue.title);
    setUrl(clue.url);
    setDescription(clue.description || '');
    setRedactedList(clue.redactedSections || []);
    setIsAdding(true);
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setEditingClueId(null);
    setTitle('');
    setUrl('');
    setDescription('');
    setRedactedList([]);
    setNewSecLabel('');
    setNewSecText('');
  };

  const handleSaveClue = () => {
    if (!title.trim() || !url.trim()) {
      toast.warn('Preencha ao menos o título e a imagem.');
      return;
    }

    if (editingClueId) {
      // Atualizar pista existente na cena
      const updated = clues.map(c => c.id === editingClueId ? {
        ...c,
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
        redactedSections: redactedList.length > 0 ? redactedList : undefined,
      } : c);
      patchCurrentScene({ clues: updated });

      // Sincronizar com o Acervo Global se existir
      const matchingAsset = (globalAssets || []).find(a => a.url === url.trim() || a.title === title.trim());
      if (matchingAsset) {
        updateTheaterAsset(matchingAsset.id, {
          title: title.trim(),
          url: url.trim(),
          description: description.trim(),
          type: 'prop',
        });
      }

      toast.success(`Pista "${title}" atualizada com sucesso!`);
    } else {
      // Criar nova pista na cena
      const newClue: TheaterClue = {
        id: `clue_${Date.now()}`,
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
        discovered: true,
        redactedSections: redactedList.length > 0 ? redactedList : undefined,
      };
      const updated = [...clues, newClue];
      patchCurrentScene({ clues: updated });

      // Salvar automaticamente no Acervo Global da Campanha
      addTheaterAsset({
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
        type: 'prop',
      });

      toast.success(`Pista "${title}" salva na cena e cadastrada no Acervo!`);
    }

    handleCancelForm();
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

  const handleSpotlight = (clue: TheaterClue) => {
    window.dispatchEvent(new CustomEvent('theater-spotlight-image', {
      detail: { 
        id: clue.id, 
        title: clue.title, 
        url: clue.url, 
        description: clue.description,
        redactedSections: clue.redactedSections,
      }
    }));
  };

  return (
    <div 
      className="theater-clues-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="theater-clues-modal" 
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
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
            {isGM && (
              <button 
                onClick={() => isAdding ? handleCancelForm() : setIsAdding(true)}
                className={`theater-clue-btn-add ${isAdding ? 'active' : ''}`}
              >
                <Plus size={14} />
                <span>{isAdding ? 'Cancelar' : 'Nova Pista'}</span>
              </button>
            )}
            <button onClick={onClose} className="theater-clues-close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Add / Edit Clue Form (GM Only) */}
        {isGM && isAdding && (
          <div className="theater-clue-form">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
                {editingClueId ? '✏️ Editando Pista & Handout' : '➕ Nova Pista da Cena'}
              </strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                💾 Sincronizado automaticamente com o Acervo Global
              </span>
            </div>

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
              <label className={`theater-clue-upload-btn ${isUploading ? 'loading' : ''}`}>
                <ImageIcon size={14} />
                <span>{isUploading ? 'Enviando...' : 'Upload'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  disabled={isUploading}
                  style={{ display: 'none' }} 
                />
              </label>
            </div>

            <textarea 
              placeholder="Descrição ou transcrição pública para os jogadores lerem..." 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="theater-clue-textarea"
              rows={2}
            />

            {/* Trechos Ocultos / Censurados (Progressive Revelation) */}
            <div className="theater-clue-redacted-creator">
              <div className="theater-clue-redacted-title">
                <Lock size={13} color="#f59e0b" />
                <span>Trechos Ocultos (Texto Censurado / Requer Investigação)</span>
              </div>

              {redactedList.length > 0 && (
                <div className="theater-clue-redacted-chips">
                  {redactedList.map(sec => (
                    <div key={sec.id} className="theater-clue-redacted-chip">
                      <Lock size={11} color="#f59e0b" />
                      <span>{sec.label}: {sec.text.substring(0, 24)}...</span>
                      <button type="button" onClick={() => handleRemoveRedactedSection(sec.id)}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="theater-clue-redacted-inputs">
                <input 
                  type="text"
                  placeholder="Rótulo (ex: Assinatura, Código Cifrado)..."
                  value={newSecLabel}
                  onChange={e => setNewSecLabel(e.target.value)}
                  className="theater-clue-input"
                  style={{ width: '200px' }}
                />
                <input 
                  type="text"
                  placeholder="Texto secreto a ser revelado no teste..."
                  value={newSecText}
                  onChange={e => setNewSecText(e.target.value)}
                  className="theater-clue-input flex-1"
                />
                <button 
                  type="button" 
                  onClick={handleAddRedactedSection}
                  className="theater-clue-add-sec-btn"
                >
                  <Plus size={13} />
                  <span>Adicionar Trecho</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSaveClue} className="theater-clue-submit-btn flex-1">
                <Sparkles size={14} />
                {editingClueId ? 'Salvar Alterações da Pista' : 'Salvar Pista no Mural & Acervo'}
              </button>
              {editingClueId && (
                <button 
                  onClick={handleCancelForm}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  Cancelar Edição
                </button>
              )}
            </div>
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
            clues.map(clue => {
              const redactedCount = clue.redactedSections?.length || 0;
              const revealedCount = clue.redactedSections?.filter(s => s.revealed).length || 0;

              return (
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

                    {redactedCount > 0 && (
                      <div className="theater-clue-redacted-badge">
                        <Lock size={11} />
                        <span>{revealedCount}/{redactedCount} trechos revelados</span>
                      </div>
                    )}
                  </div>

                  <div className="theater-clue-card-footer">
                    {isGM && (
                      <>
                        <button 
                          className="theater-clue-disc-btn"
                          onClick={() => handleStartEdit(clue)}
                          title="Editar Pista & Trechos Ocultos"
                        >
                          <Edit2 size={13} />
                          <span>Editar</span>
                        </button>

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
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
