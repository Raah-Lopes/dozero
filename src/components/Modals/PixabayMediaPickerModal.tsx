// src/components/Modals/PixabayMediaPickerModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, Sparkles, Film, Image as ImageIcon, User, 
  ExternalLink, Key, RefreshCw, Check, Download, Play, 
  Pause, ChevronLeft, ChevronRight, Layers, Flame, CloudRain, 
  Castle, Trees, Compass, Swords, Shield, Skull
} from 'lucide-react';
import { 
  searchPixabayImages, searchPixabayVideos, getPixabayApiKey, 
  setPixabayApiKey, hasCustomPixabayKey, type PixabayImageItem, 
  type PixabayVideoItem 
} from '../../services/pixabayService';
import { addTheaterAsset } from '../../store';
import { useSceneState } from '../Theater/hooks/useSceneState';
import { Tooltip } from '../UI/Tooltip';
import { toast } from '../UI/Toast';

export interface PixabayMediaSelection {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string;
  title: string;
  tags: string[];
  user: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialTab?: 'image' | 'video' | 'portrait';
  onSelect?: (media: PixabayMediaSelection, action: 'background' | 'vault' | 'npc' | 'spotlight') => void;
}

const RPG_PRESET_TAGS: { label: string; query: string; icon: string }[] = [
  { label: 'Taverna', query: 'fantasy tavern', icon: '🍺' },
  { label: 'Masmorra', query: 'dark dungeon fantasy', icon: '🗝️' },
  { label: 'Castelo', query: 'epic castle fantasy', icon: '🏰' },
  { label: 'Floresta Sombria', query: 'dark misty forest fantasy', icon: '🌲' },
  { label: 'Fogueira', query: 'campfire fire night', icon: '🔥' },
  { label: 'Chuva & Névoa', query: 'rain fog dark aesthetic', icon: '🌧️' },
  { label: 'Portal Mágico', query: 'magic portal fantasy glowing', icon: '🔮' },
  { label: 'Cripta & Caveira', query: 'crypt skull dark fantasy', icon: '💀' },
  { label: 'Cidade Medieval', query: 'medieval town street fantasy', icon: '🏘️' },
  { label: 'Montanhas', query: 'epic mountain landscape fantasy', icon: '🏔️' },
  { label: 'Guerreiro & Mago', query: 'fantasy warrior character', icon: '⚔️' },
  { label: 'Monstro / Dragão', query: 'dragon monster fantasy creature', icon: '🐉' },
];

export const PixabayMediaPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialQuery = 'dark fantasy scenery',
  initialTab = 'image',
  onSelect,
}) => {
  const { patchCurrentScene, currentScene } = useSceneState();
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'portrait'>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [images, setImages] = useState<PixabayImageItem[]>([]);
  const [videos, setVideos] = useState<PixabayVideoItem[]>([]);
  const [totalHits, setTotalHits] = useState(0);

  // Key configuration toggle
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getPixabayApiKey());
  const [hasCustomKey, setHasCustomKey] = useState(hasCustomPixabayKey());

  // Video hover playback ref
  const [hoveredVideoId, setHoveredVideoId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(getPixabayApiKey());
      setHasCustomKey(hasCustomPixabayKey());
      performSearch(query, activeTab, 1);
    }
  }, [isOpen, activeTab]);

  const performSearch = async (searchQuery: string, tab: 'image' | 'video' | 'portrait', targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'video') {
        const res = await searchPixabayVideos(searchQuery, { page: targetPage, perPage: 18 });
        setVideos(res.hits);
        setTotalHits(res.totalHits);
      } else {
        const orientation = tab === 'portrait' ? 'vertical' : 'horizontal';
        const imageType = tab === 'portrait' ? 'all' : 'illustration';
        const adjustedQuery = tab === 'portrait' ? `${searchQuery} portrait face` : searchQuery;
        
        const res = await searchPixabayImages(adjustedQuery, { 
          orientation, 
          imageType, 
          page: targetPage, 
          perPage: 20 
        });
        setImages(res.hits);
        setTotalHits(res.totalHits);
      }
      setPage(targetPage);
    } catch (err: any) {
      console.error('[PixabayPicker] Erro:', err);
      setError(err.message || 'Falha ao carregar mídias do Pixabay.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setQuery(searchInput.trim());
    performSearch(searchInput.trim(), activeTab, 1);
  };

  const handleTagClick = (presetQuery: string) => {
    setSearchInput(presetQuery);
    setQuery(presetQuery);
    performSearch(presetQuery, activeTab, 1);
  };

  const handleSaveKey = () => {
    setPixabayApiKey(apiKeyInput);
    setHasCustomKey(hasCustomPixabayKey());
    setShowKeyConfig(false);
    toast.success('Chave de API salva!');
    performSearch(query, activeTab, 1);
  };

  const handleApplyBackground = (url: string, title: string) => {
    if (onSelect) {
      onSelect({
        type: activeTab === 'video' ? 'video' : 'image',
        url,
        thumbnailUrl: url,
        title,
        tags: [],
        user: 'Pixabay'
      }, 'background');
    } else {
      patchCurrentScene({ imageUrl: url });
      addTheaterAsset({
        title: title || 'Cenário Pixabay',
        url,
        type: 'location'
      });
      toast.success(`Fundo de "${currentScene?.title || 'Cena'}" atualizado com sucesso!`);
    }
    onClose();
  };

  const handleSaveToVault = (url: string, title: string, type: 'location' | 'npc' | 'prop' = 'location') => {
    addTheaterAsset({
      title: title || 'Mídia Pixabay',
      url,
      type
    });
    toast.success(`"${title}" salvo no Acervo da Campanha!`);
  };

  const handleProjectNpc = (url: string, title: string) => {
    window.dispatchEvent(new CustomEvent('theater-show-npc', {
      detail: { name: title, imageUrl: url, type: 'npc' }
    }));
    handleSaveToVault(url, title, 'npc');
    toast.info(`Retrato de "${title}" projetado no palco!`);
    onClose();
  };

  const handleSpotlight = (url: string, title: string) => {
    window.dispatchEvent(new CustomEvent('theater-spotlight-image', {
      detail: { title, url }
    }));
    handleSaveToVault(url, title, 'prop');
    toast.success(`Pista "${title}" apresentada em destaque!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="pixabay-modal-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="pixabay-modal" 
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pixabay-modal-header">
          <div className="pixabay-modal-title-wrap">
            <div className="pixabay-logo-badge">
              <Sparkles size={16} color="#38bdf8" />
              <span>Pixabay Library</span>
            </div>
            <div>
              <h2>Acervo Infinito de Cenários & Mídias</h2>
              <span className="pixabay-modal-sub">
                Milhões de ilustrações, cenários em HD e vídeos em loop gratuitos
              </span>
            </div>
          </div>

          <div className="pixabay-header-actions">
            <button 
              className={`pixabay-key-btn ${hasCustomKey ? 'has-key' : ''}`}
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              title="Configurar Chave da API do Pixabay"
            >
              <Key size={13} />
              <span>{hasCustomKey ? 'Chave Ativa' : 'Configurar Chave'}</span>
            </button>

            <button onClick={onClose} className="pixabay-close-btn" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* API Key Configuration Dropdown */}
        {showKeyConfig && (
          <div className="pixabay-key-config-box">
            <div className="pixabay-key-config-header">
              <Key size={15} color="#c084fc" />
              <h4>Chave de API do Pixabay (100% Gratuita)</h4>
            </div>
            <p>
              Por padrão, o DOZERO já inclui uma chave pública de demonstração. Caso queira sua própria cota ilimitada de requisições, você pode criar uma conta gratuita e copiar sua chave no site do Pixabay.
            </p>
            <div className="pixabay-key-input-row">
              <input
                type="text"
                placeholder="Cole sua API Key do Pixabay..."
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                className="pixabay-key-input"
              />
              <button onClick={handleSaveKey} className="pixabay-key-save-btn">
                <Check size={14} /> Salvar Chave
              </button>
              <a 
                href="https://pixabay.com/api/docs/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="pixabay-key-link-btn"
              >
                <ExternalLink size={13} /> Gerar Chave no Pixabay
              </a>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="pixabay-tabs-bar">
          <button 
            className={`pixabay-tab ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            <ImageIcon size={14} />
            <span>Cenários & Ilustrações</span>
          </button>
          <button 
            className={`pixabay-tab ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            <Film size={14} />
            <span>Fundos Animados (Vídeos)</span>
          </button>
          <button 
            className={`pixabay-tab ${activeTab === 'portrait' ? 'active' : ''}`}
            onClick={() => setActiveTab('portrait')}
          >
            <User size={14} />
            <span>Retratos / NPCs</span>
          </button>
        </div>

        {/* Search Bar & Tag Pills */}
        <div className="pixabay-search-section">
          <form onSubmit={handleSearchSubmit} className="pixabay-search-form">
            <div className="pixabay-search-input-wrap">
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder={
                  activeTab === 'video' 
                    ? "Buscar vídeos em loop (ex: campfire, rain, dark fog, magic portal)..." 
                    : activeTab === 'portrait'
                    ? "Buscar retratos de personagens (ex: elven wizard, knight armor, rogue)..."
                    : "Buscar cenários de RPG (ex: fantasy castle, dark dungeon, tavern)..."
                }
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pixabay-search-input"
              />
              {searchInput && (
                <button type="button" onClick={() => setSearchInput('')} className="pixabay-clear-btn">
                  <X size={14} />
                </button>
              )}
            </div>
            <button type="submit" className="pixabay-search-btn" disabled={loading}>
              {loading ? <RefreshCw size={14} className="spin-icon" /> : <Search size={14} />}
              <span>Buscar</span>
            </button>
          </form>

          {/* Quick Filter Tag Pills */}
          <div className="pixabay-tags-scroll">
            {RPG_PRESET_TAGS.map(t => (
              <button
                key={t.label}
                type="button"
                className={`pixabay-preset-tag ${query === t.query ? 'active' : ''}`}
                onClick={() => handleTagClick(t.query)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Body */}
        <div className="pixabay-results-body">
          {loading && (
            <div className="pixabay-loading-state">
              <RefreshCw size={32} className="spin-icon" color="#38bdf8" />
              <p>Buscando mídias em alta resolução no Pixabay...</p>
            </div>
          )}

          {!loading && error && (
            <div className="pixabay-error-state">
              <p>⚠️ {error}</p>
              <button onClick={() => performSearch(query, activeTab, page)} className="pixabay-retry-btn">
                Tentar Novamente
              </button>
            </div>
          )}

          {!loading && !error && (activeTab === 'video' ? videos.length === 0 : images.length === 0) && (
            <div className="pixabay-empty-state">
              <Compass size={40} opacity={0.3} />
              <p>Nenhuma mídia encontrada para "{query}".</p>
              <span>Experimente termos em inglês ou clique em uma das etiquetas de RPG acima.</span>
            </div>
          )}

          {/* Image & Portrait Grid */}
          {!loading && !error && activeTab !== 'video' && images.length > 0 && (
            <div className={`pixabay-grid ${activeTab === 'portrait' ? 'portrait-mode' : ''}`}>
              {images.map(img => {
                const title = img.tags.split(',')[0]?.trim() || 'Cenário Fantasia';
                const directUrl = img.largeImageURL || img.webformatURL;

                return (
                  <div key={img.id} className="pixabay-card">
                    <div className="pixabay-card-media-wrap">
                      <img loading="lazy" src={img.webformatURL} alt={img.tags} className="pixabay-card-img" />
                      <div className="pixabay-card-user-badge">
                        <span>👤 {img.user}</span>
                      </div>

                      {/* Quick Action Overlay */}
                      <div className="pixabay-card-actions-overlay">
                        <Tooltip label="Definir como Cenário do Palco">
                          <button 
                            onClick={() => handleApplyBackground(directUrl, title)}
                            className="pixabay-act-btn bg"
                          >
                            <ImageIcon size={13} />
                            <span>Definir Fundo</span>
                          </button>
                        </Tooltip>

                        {activeTab === 'portrait' ? (
                          <Tooltip label="Projetar Retrato no Centro do Palco">
                            <button 
                              onClick={() => handleProjectNpc(directUrl, title)}
                              className="pixabay-act-btn npc"
                            >
                              <User size={13} />
                              <span>Projetar NPC</span>
                            </button>
                          </Tooltip>
                        ) : (
                          <Tooltip label="Apresentar como Pista (Spotlight)">
                            <button 
                              onClick={() => handleSpotlight(directUrl, title)}
                              className="pixabay-act-btn spot"
                            >
                              <Layers size={13} />
                              <span>Apresentar Pista</span>
                            </button>
                          </Tooltip>
                        )}

                        <Tooltip label="Salvar no Acervo da Campanha">
                          <button 
                            onClick={() => handleSaveToVault(directUrl, title, activeTab === 'portrait' ? 'npc' : 'location')}
                            className="pixabay-act-btn vault"
                          >
                            <Download size={13} />
                            <span>Salvar no Acervo</span>
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="pixabay-card-footer">
                      <span className="pixabay-card-title" title={img.tags}>
                        {img.tags}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Video / Loop Backgrounds Grid */}
          {!loading && !error && activeTab === 'video' && videos.length > 0 && (
            <div className="pixabay-grid video-mode">
              {videos.map(vid => {
                const title = vid.tags.split(',')[0]?.trim() || 'Fundo Animado';
                const videoUrl = vid.videos.medium?.url || vid.videos.large?.url || vid.videos.small?.url;
                const isHovered = hoveredVideoId === vid.id;

                return (
                  <div 
                    key={vid.id} 
                    className="pixabay-card video-card"
                    onMouseEnter={() => setHoveredVideoId(vid.id)}
                    onMouseLeave={() => setHoveredVideoId(null)}
                  >
                    <div className="pixabay-card-media-wrap">
                      {isHovered ? (
                        <video
                          src={videoUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="pixabay-card-video-preview"
                        />
                      ) : (
                        <img 
                          loading="lazy" 
                          src={`https://i.vimeocdn.com/video/${vid.picture_id}_640x360.jpg`} 
                          alt={vid.tags} 
                          className="pixabay-card-img" 
                          onError={(e) => {
                            // Fallback if picture_id fails
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}

                      <div className="pixabay-video-duration-badge">
                        <Play size={10} fill="white" />
                        <span>{vid.duration}s</span>
                      </div>

                      <div className="pixabay-card-user-badge">
                        <span>👤 {vid.user}</span>
                      </div>

                      {/* Quick Video Actions */}
                      <div className="pixabay-card-actions-overlay">
                        <Tooltip label="Definir como Fundo Animado do Palco">
                          <button 
                            onClick={() => handleApplyBackground(videoUrl, title)}
                            className="pixabay-act-btn bg"
                          >
                            <Film size={13} />
                            <span>Aplicar Vídeo no Fundo</span>
                          </button>
                        </Tooltip>

                        <Tooltip label="Salvar no Acervo da Campanha">
                          <button 
                            onClick={() => handleSaveToVault(videoUrl, title, 'location')}
                            className="pixabay-act-btn vault"
                          >
                            <Download size={13} />
                            <span>Salvar no Acervo</span>
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="pixabay-card-footer">
                      <span className="pixabay-card-title" title={vid.tags}>
                        🎬 {vid.tags}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Pagination & Result Count */}
        <div className="pixabay-modal-footer">
          <span className="pixabay-results-count">
            {totalHits > 0 ? `${totalHits.toLocaleString()} resultados encontrados` : ''}
          </span>

          <div className="pixabay-pagination">
            <button
              onClick={() => performSearch(query, activeTab, Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="pixabay-page-btn"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span className="pixabay-page-indicator">Página {page}</span>
            <button
              onClick={() => performSearch(query, activeTab, page + 1)}
              disabled={loading || (activeTab === 'video' ? videos.length < 18 : images.length < 20)}
              className="pixabay-page-btn"
            >
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
