// src/components/Theater/TheaterAssetVault.tsx
import React, { useState } from 'react';
import { 
  FolderArchive, Search, Plus, Trash2, Edit2, Check, X, 
  Image as ImageIcon, User, Scroll, Swords, Sparkles, Filter
} from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { addTheaterAsset, updateTheaterAsset, removeTheaterAsset, type SceneAsset } from '../../store';
import { convertImageToWebP } from '../../utils/imageUtils';
import { saveImageToCloud } from '../../utils/githubApi';
import { Tooltip } from '../UI/Tooltip';
import { toast } from '../UI/Toast';

type AssetCategory = 'all' | 'npc' | 'location' | 'prop' | 'monster' | 'other';

interface Props {
  onClose?: () => void;
}

export const TheaterAssetVault: React.FC<Props> = ({ onClose }) => {
  const { globalAssets, patchCurrentScene, currentScene } = useSceneState();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<SceneAsset['type']>('npc');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = (globalAssets || []).filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(search.toLowerCase()) || 
                          (asset.description && asset.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = category === 'all' || asset.type === category;
    return matchesSearch && matchesCat;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.info('Carregando imagem no acervo...');
      const { base64 } = await convertImageToWebP(file, 0.9, 1920);
      const cloudUrl = await saveImageToCloud(base64, `vault_${Date.now()}.webp`);
      setNewUrl(cloudUrl || base64);
      if (!newTitle) {
        setNewTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
      toast.success('Imagem pronta!');
    } catch {
      toast.error('Erro ao processar imagem.');
    }
  };

  const handleCreateAsset = () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      toast.warn('Preencha o título e a imagem.');
      return;
    }
    addTheaterAsset({
      title: newTitle.trim(),
      url: newUrl.trim(),
      type: newType,
    });
    toast.success(`"${newTitle}" adicionado ao Acervo!`);
    setNewTitle('');
    setNewUrl('');
    setIsAdding(false);
  };

  const handleStartEdit = (asset: SceneAsset) => {
    setEditingId(asset.id);
    setEditTitle(asset.title);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    updateTheaterAsset(id, { title: editTitle.trim() });
    setEditingId(null);
    toast.success('Nome atualizado!');
  };

  const handleChangeType = (id: string, type: SceneAsset['type']) => {
    updateTheaterAsset(id, { type });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Deseja remover "${title}" do Acervo?`)) return;
    removeTheaterAsset(id);
    toast.info('Recurso removido do acervo.');
  };

  const handleSetAsBackground = (asset: SceneAsset) => {
    patchCurrentScene({ imageUrl: asset.url });
    toast.success(`"${asset.title}" definido como fundo de "${currentScene?.title}"!`);
  };

  const handleProjectNpc = (asset: SceneAsset) => {
    window.dispatchEvent(new CustomEvent('theater-show-npc', {
      detail: { 
        name: asset.title, 
        imageUrl: asset.url, 
        type: asset.type === 'monster' ? 'boss' : 'npc' 
      }
    }));
    toast.info(`"${asset.title}" projetado no centro do palco!`);
  };

  const handleSpotlight = (asset: SceneAsset) => {
    window.dispatchEvent(new CustomEvent('theater-spotlight-image', {
      detail: { title: asset.title, url: asset.url, description: asset.description }
    }));
  };

  return (
    <div className="theater-vault-container">
      {/* Vault Header Controls */}
      <div className="theater-vault-header">
        <div className="theater-vault-search-row">
          <div className="theater-vault-search-box">
            <Search size={14} color="#64748b" />
            <input 
              type="text"
              placeholder="Buscar no acervo da campanha..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="theater-vault-search-input"
            />
            {search && (
              <button onClick={() => setSearch('')} className="theater-vault-clear-search">
                <X size={12} />
              </button>
            )}
          </div>

          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`theater-vault-add-btn ${isAdding ? 'active' : ''}`}
          >
            <Plus size={14} />
            <span>{isAdding ? 'Cancelar' : 'Novo Recurso'}</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="theater-vault-pills">
          <button 
            className={`theater-vault-pill ${category === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
          >
            Todos ({globalAssets?.length || 0})
          </button>
          <button 
            className={`theater-vault-pill ${category === 'npc' ? 'active' : ''}`}
            onClick={() => setCategory('npc')}
          >
            <User size={12} /> Personagens
          </button>
          <button 
            className={`theater-vault-pill ${category === 'location' ? 'active' : ''}`}
            onClick={() => setCategory('location')}
          >
            <ImageIcon size={12} /> Cenários
          </button>
          <button 
            className={`theater-vault-pill ${category === 'prop' ? 'active' : ''}`}
            onClick={() => setCategory('prop')}
          >
            <Scroll size={12} /> Pistas
          </button>
          <button 
            className={`theater-vault-pill ${category === 'monster' ? 'active' : ''}`}
            onClick={() => setCategory('monster')}
          >
            <Swords size={12} /> Monstros
          </button>
        </div>
      </div>

      {/* Add New Asset Form */}
      {isAdding && (
        <div className="theater-vault-form">
          <div className="theater-vault-form-row">
            <input 
              type="text" 
              placeholder="Nome do elemento (ex: Taberneiro Jack, Mapa da Floresta)..." 
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="theater-vault-input flex-1"
            />

            <select 
              value={newType} 
              onChange={e => setNewType(e.target.value as any)}
              className="theater-vault-select"
            >
              <option value="npc">👤 Personagem/NPC</option>
              <option value="location">🖼️ Cenário/Fundo</option>
              <option value="prop">📜 Pista/Item</option>
              <option value="monster">⚔️ Monstro/Ameaça</option>
            </select>
          </div>

          <div className="theater-vault-form-row">
            <input 
              type="text" 
              placeholder="URL da imagem ou faça upload ao lado..." 
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              className="theater-vault-input flex-1"
            />

            <label className="theater-vault-upload-label">
              <ImageIcon size={14} />
              <span>Upload</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <button onClick={handleCreateAsset} className="theater-vault-submit-btn">
            <Sparkles size={14} />
            Salvar no Acervo da Campanha
          </button>
        </div>
      )}

      {/* Grid of Assets */}
      <div className="theater-vault-grid">
        {filtered.length === 0 ? (
          <div className="theater-vault-empty">
            <FolderArchive size={40} opacity={0.3} />
            <p>Nenhum recurso encontrado no acervo.</p>
            <span>Todas as imagens que você soltar no palco ou adicionar aqui ficarão salvas para reutilizar em qualquer cena.</span>
          </div>
        ) : (
          filtered.map(asset => {
            const isEditing = editingId === asset.id;

            return (
              <div key={asset.id} className="theater-vault-card">
                {/* Thumbnail Image */}
                <div className="theater-vault-card-img-wrap">
                  <img src={asset.url} alt={asset.title} className="theater-vault-card-img" />
                  
                  {/* Hover Quick Projector Actions */}
                  <div className="theater-vault-card-actions">
                    <Tooltip label="Definir como Fundo da Cena Atual">
                      <button 
                        onClick={() => handleSetAsBackground(asset)}
                        className="theater-vault-action-btn bg"
                      >
                        <ImageIcon size={13} />
                        <span>Fundo</span>
                      </button>
                    </Tooltip>

                    <Tooltip label="Apresentar no Centro do Palco">
                      <button 
                        onClick={() => handleProjectNpc(asset)}
                        className="theater-vault-action-btn npc"
                      >
                        <User size={13} />
                        <span>Centro</span>
                      </button>
                    </Tooltip>

                    <Tooltip label="Apresentar em Destaque (Spotlight)">
                      <button 
                        onClick={() => handleSpotlight(asset)}
                        className="theater-vault-action-btn spot"
                      >
                        <Scroll size={13} />
                        <span>Pista</span>
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Card Info & Rename */}
                <div className="theater-vault-card-info">
                  {isEditing ? (
                    <div className="theater-vault-inline-edit">
                      <input 
                        type="text" 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(asset.id); }}
                        autoFocus
                      />
                      <button onClick={() => handleSaveEdit(asset.id)}>
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="theater-vault-title-row">
                      <h4 title={asset.title}>{asset.title}</h4>
                      <button 
                        onClick={() => handleStartEdit(asset)}
                        className="theater-vault-rename-btn"
                        title="Renomear este elemento"
                      >
                        <Edit2 size={11} />
                      </button>
                    </div>
                  )}

                  {/* Category Pill & Delete */}
                  <div className="theater-vault-footer-row">
                    <select 
                      value={asset.type || 'other'} 
                      onChange={e => handleChangeType(asset.id, e.target.value as any)}
                      className="theater-vault-type-tag"
                    >
                      <option value="npc">👤 NPC</option>
                      <option value="location">🖼️ Cenário</option>
                      <option value="prop">📜 Pista</option>
                      <option value="monster">⚔️ Monstro</option>
                    </select>

                    <button 
                      onClick={() => handleDelete(asset.id, asset.title)}
                      className="theater-vault-del-btn"
                      title="Excluir do acervo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
