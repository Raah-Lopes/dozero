import React, { useState, useEffect } from 'react';
import { MapPin, Search, Plus, Trash2, Eye, EyeOff, BookOpen, Navigation, X, ShieldAlert } from 'lucide-react';
import { 
  getLorePins, 
  addLorePin, 
  updateLorePin, 
  removeLorePin, 
  LorePinData,
  createLorePinFromWikiEntry 
} from '../../store/lorePins';
import { state } from '../../services/yjs';
import { WikiIndexer, WikiEntry } from '../../services/wiki/WikiIndexer';
import { WIKI_ENTITY_STYLES, getWikiEntityType } from '../../utils/wikiEntities';
import { toast } from '../UI/Toast';

interface LorePinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGM?: boolean;
}

export const LorePinsModal: React.FC<LorePinsModalProps> = ({ isOpen, onClose, isGM = true }) => {
  const [pins, setPins] = useState<LorePinData[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [wikiEntries, setWikiEntries] = useState<WikiEntry[]>([]);
  
  // Formulário de Criação Rápida
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWikiPath, setNewWikiPath] = useState('');
  const [newType, setNewType] = useState('local');
  const [newDescription, setNewDescription] = useState('');
  const [newGmOnly, setNewGmOnly] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const refresh = () => {
      setPins(getLorePins());
    };

    refresh();
    state.lorePins.observe(refresh);

    WikiIndexer.buildIndex()
      .then(entries => setWikiEntries(entries || []))
      .catch(() => {});

    return () => {
      state.lorePins.unobserve(refresh);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredPins = pins.filter(pin => {
    if (pin.gmOnly && !isGM) return false;
    const matchesSearch = (pin.title || '').toLowerCase().includes(search.toLowerCase()) ||
                          (pin.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'all' || pin.entityType === selectedType;
    return matchesSearch && matchesType;
  });

  const handleSelectWikiEntry = (path: string) => {
    setNewWikiPath(path);
    const entry = wikiEntries.find(e => e.path === path);
    if (entry) {
      const type = getWikiEntityType(entry.metadata);
      if (type) setNewType(type);
      const title = String(entry.metadata.nome || entry.metadata.name || entry.metadata.titulo || entry.slug);
      if (title && !newTitle) setNewTitle(title);
      const desc = String(entry.metadata.descricao || entry.metadata.description || entry.metadata.resumo || '');
      if (desc && !newDescription) setNewDescription(desc);
    }
  };

  const handleCreatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.warn('Informe um título para o Pin.');
      return;
    }

    addLorePin({
      x: 0,
      y: 0,
      title: newTitle.trim(),
      wikiPath: newWikiPath || undefined,
      entityType: newType,
      description: newDescription.trim() || undefined,
      gmOnly: newGmOnly
    });

    toast.success(`📍 Pin "${newTitle}" criado no centro do mapa!`);
    setNewTitle('');
    setNewWikiPath('');
    setNewDescription('');
    setNewGmOnly(false);
    setIsCreating(false);
  };

  const handleOpenWiki = (wikiPath?: string) => {
    if (!wikiPath) return;
    window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: wikiPath } }));
    onClose();
  };

  const handleToggleGmOnly = (pin: LorePinData) => {
    updateLorePin(pin.id, { gmOnly: !pin.gmOnly });
    toast.info(pin.gmOnly ? `Pin "${pin.title}" agora é público para os jogadores.` : `Pin "${pin.title}" ocultado dos jogadores.`);
  };

  const handleDelete = (pin: LorePinData) => {
    if (confirm(`Excluir o Pin "${pin.title}"?`)) {
      removeLorePin(pin.id);
      toast.info(`Pin "${pin.title}" excluído.`);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(6px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Pins de Lore no Mapa ({filteredPins.length})
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 0, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Action bar / Search */}
        <div style={{ padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', padding: '6px 10px', borderRadius: '7px', border: '1px solid var(--glass-border)' }}>
            <Search size={14} color="var(--text-secondary)" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar pins de lore..."
              style={{ background: 'transparent', border: 0, color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.82rem' }}
            />
          </div>

          <select 
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '7px', padding: '6px 10px', fontSize: '0.82rem' }}
          >
            <option value="all">Todos os Tipos</option>
            {Object.entries(WIKI_ENTITY_STYLES).map(([key, item]) => (
              <option key={key} value={key}>{item.label}</option>
            ))}
          </select>

          {isGM && (
            <button
              onClick={() => setIsCreating(!isCreating)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '7px',
                border: 0,
                background: isCreating ? 'var(--bg-primary)' : 'var(--accent-primary)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isCreating ? <X size={14} /> : <Plus size={14} />}
              {isCreating ? 'Cancelar' : 'Novo Pin'}
            </button>
          )}
        </div>

        {/* Form de Criação */}
        {isCreating && isGM && (
          <form onSubmit={handleCreatePin} style={{ padding: '14px 18px', background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Título do Ponto de Interesse (ex: Mina Perdida)"
                required
                style={{ flex: 2, padding: '7px 10px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem' }}
              />
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem' }}
              >
                {Object.entries(WIKI_ENTITY_STYLES).map(([key, item]) => (
                  <option key={key} value={key}>{item.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={newWikiPath}
                onChange={e => handleSelectWikiEntry(e.target.value)}
                style={{ flex: 2, padding: '7px 10px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem' }}
              >
                <option value="">Vincular Entidade da Wiki (Opcional)...</option>
                {wikiEntries.map(entry => (
                  <option key={entry.path} value={entry.path}>
                    {String(entry.metadata.nome || entry.metadata.name || entry.metadata.titulo || entry.slug)}
                  </option>
                ))}
              </select>

              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={newGmOnly} 
                  onChange={e => setNewGmOnly(e.target.checked)} 
                />
                Apenas Mestre
              </label>
            </div>

            <input 
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder="Descrição rápida / anotações de lore..."
              style={{ padding: '7px 10px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem' }}
            />

            <button
              type="submit"
              style={{
                padding: '8px 14px',
                background: 'var(--accent-primary)',
                color: '#fff',
                border: 0,
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                alignSelf: 'flex-end'
              }}
            >
              Fixar Pin no Mapa
            </button>
          </form>
        )}

        {/* Lista de Pins */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredPins.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Nenhum Pin de Lore encontrado neste mapa.
            </div>
          ) : (
            filteredPins.map(pin => {
              const typeStyle = pin.entityType && WIKI_ENTITY_STYLES[pin.entityType] ? WIKI_ENTITY_STYLES[pin.entityType] : { label: 'Local', color: pin.color || '#34d399' };
              return (
                <div 
                  key={pin.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: typeStyle.color,
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${typeStyle.color}88`
                    }} />
                    
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {pin.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: `${typeStyle.color}22`, color: typeStyle.color, fontWeight: 600 }}>
                          {typeStyle.label}
                        </span>
                        {pin.gmOnly && (
                          <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: '#f87171', fontWeight: 700 }}>
                            Mestre
                          </span>
                        )}
                      </div>
                      {pin.description && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pin.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {pin.wikiPath && (
                      <button
                        onClick={() => handleOpenWiki(pin.wikiPath)}
                        title="Abrir página na Wiki"
                        style={{ padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                      >
                        <BookOpen size={14} /> Wiki
                      </button>
                    )}

                    {isGM && (
                      <>
                        <button
                          onClick={() => handleToggleGmOnly(pin)}
                          title={pin.gmOnly ? 'Tornar visível para jogadores' : 'Ocultar dos jogadores'}
                          style={{ padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: pin.gmOnly ? 'var(--text-secondary)' : '#34d399', cursor: 'pointer' }}
                        >
                          {pin.gmOnly ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>

                        <button
                          onClick={() => handleDelete(pin)}
                          title="Remover pin"
                          style={{ padding: '6px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
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
