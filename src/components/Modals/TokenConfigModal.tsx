import React, { useState, useEffect, useRef } from 'react';
import { state } from '../../store';
import { Tokens } from '../../store/modules/tokenModule';
import { 
  X, Sun, Flame, 
  Circle, Square, Hexagon, Star, Check, Upload,
  Sliders, User, Palette, Lock, Unlock, Trash2, Shield
} from 'lucide-react';
import { useWiki } from '../../hooks/useWiki';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import { toast } from '../UI/Toast';
import { convertImageToWebP } from '../../utils/imageUtils';
import { saveImageToCloud } from '../../utils/githubApi';
import { saveCharacter } from '../../services/characterRepository';
import { useAuthStore } from '../../store/authStore';

interface TokenConfigModalProps {
  tokenId: string | null;
  onClose: () => void;
}

type TabType = 'vision' | 'appearance' | 'permissions' | 'status';

export const TokenConfigModal: React.FC<TokenConfigModalProps> = ({ tokenId, onClose }) => {
  const [tokenData, setTokenData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('vision');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { index } = useWiki();

  useEffect(() => {
    if (!tokenId) {
      setTokenData(null);
      return;
    }
    const tok = state.tokens.get(tokenId);
    if (tok) {
      setTokenData(tok);
    }
  }, [tokenId]);

  // Observer para manter dados atualizados caso mudem via Yjs
  useEffect(() => {
    if (!tokenId) return;
    const observer = (event: any) => {
      if (event.keysChanged && event.keysChanged.has(tokenId)) {
        const updated = state.tokens.get(tokenId);
        if (updated) setTokenData(updated);
      }
    };
    state.tokens.observe(observer);
    return () => state.tokens.unobserve(observer);
  }, [tokenId]);

  if (!tokenId || !tokenData) return null;

  const handleUpdate = (updates: Record<string, any>) => {
    Tokens.update(tokenId, updates);
    setTokenData((prev: any) => ({ ...prev, ...updates }));

    if (tokenData.wikiPath) {
      Object.entries(updates).forEach(([k, v]) => {
        syncTokenFieldToWiki(tokenData.wikiPath, k, v);
      });
      WikiIndexer.clearCache();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const webpBlob = await convertImageToWebP(file);
      const fileName = `token_${tokenId}_${Date.now()}.webp`;
      const webpFile = new File([webpBlob], fileName, { type: 'image/webp' });
      const publicUrl = await saveImageToCloud(webpFile);
      if (publicUrl) {
        handleUpdate({ imageUrl: publicUrl, avatar: publicUrl, imagem: publicUrl });
        toast.success('Imagem do token atualizada!');
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar avatar: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const { user } = useAuthStore();

  const handleSaveToVault = async () => {
    if (!tokenData || !tokenData.name) {
      toast.warning('Token precisa de um nome para ser salvo no Vault.');
      return;
    }
    try {
      await saveCharacter({
        id: tokenData.characterId || undefined,
        name: tokenData.name,
        type: tokenData.isPlayer || tokenData.type === 'player' ? 'pc' : (tokenData.type === 'enemy' ? 'monster' : 'npc'),
        avatar_url: tokenData.imageUrl || tokenData.avatar || '',
        data: {
          hp: tokenData.hp,
          maxHp: tokenData.maxHp,
          mana: tokenData.mana,
          maxMana: tokenData.maxMana,
          speed: tokenData.speed,
          ac: tokenData.ac || tokenData.ca || 10,
          tokenShape: tokenData.tokenShape,
          borderColor: tokenData.borderColor,
          visionRadius: tokenData.visionRadius,
          torchRadius: tokenData.torchRadius
        },
        notes_markdown: tokenData.notes || '',
        campaign_id: null
      }, user?.id);

      toast.success(`Ficha de "${tokenData.name}" salva com sucesso no seu Vault!`);
    } catch (err) {
      toast.error('Erro ao salvar ficha no Vault.');
    }
  };

  const shapes = [
    { id: 'circle', label: 'Círculo', icon: <Circle size={16} /> },
    { id: 'square', label: 'Quadrado', icon: <Square size={16} /> },
    { id: 'hexagon', label: 'Hexágono', icon: <Hexagon size={16} /> },
    { id: 'figure', label: 'Boneco (Transparente)', icon: <User size={16} /> },
  ];

  const presetColors = [
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', 
    '#ef4444', '#f97316', '#eab308', '#10b981', '#ffffff', '#000000'
  ];

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: '1rem',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="glass-panel animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)',
          background: 'var(--bg-secondary)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img 
              src={tokenData.imageUrl || '/vite.svg'} 
              alt={tokenData.name} 
              style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: tokenData.tokenShape === 'square' ? '6px' : '50%',
                objectFit: 'cover',
                border: `2px solid ${tokenData.borderColor || 'var(--accent-primary)'}`
              }} 
            />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                {tokenData.name || 'Configurar Token'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {tokenData.status || (tokenData.isPlayer ? 'Jogador' : 'NPC')} • ID: {tokenId.slice(0, 10)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSaveToVault}
              title="Salvar esta ficha no seu Player Vault"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                background: 'rgba(164,104,48,0.2)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '8px',
                color: 'var(--accent-primary)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Shield size={14} /> Salvar no Vault
            </button>
            <button 
              onClick={onClose}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--glass-border)',
          background: 'var(--bg-tertiary)',
          padding: '0 0.5rem',
          gap: '0.25rem',
          overflowX: 'auto'
        }}>
          <TabButton 
            active={activeTab === 'vision'} 
            onClick={() => setActiveTab('vision')} 
            icon={<Sun size={15} />} 
            label="Visão & Luz" 
          />
          <TabButton 
            active={activeTab === 'appearance'} 
            onClick={() => setActiveTab('appearance')} 
            icon={<Palette size={15} />} 
            label="Aparência" 
          />
          <TabButton 
            active={activeTab === 'permissions'} 
            onClick={() => setActiveTab('permissions')} 
            icon={<User size={15} />} 
            label="Permissões" 
          />
          <TabButton 
            active={activeTab === 'status'} 
            onClick={() => setActiveTab('status')} 
            icon={<Sliders size={15} />} 
            label="Combate & Status" 
          />
        </div>

        {/* Tab Content Body */}
        <div style={{
          padding: '1.25rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          color: 'var(--text-primary)'
        }}>
          {/* TAB 1: VISÃO & LUZ (NÉVOA) */}
          {activeTab === 'vision' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Toggle Emissão de Luz/Visão */}
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    Emissão de Visão / Iluminação
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Permite que este token dissipe a Névoa de Guerra no tabuleiro.
                  </p>
                </div>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input 
                    type="checkbox"
                    checked={tokenData.hasVision !== false}
                    onChange={(e) => handleUpdate({ 
                      hasVision: e.target.checked,
                      visionRadius: tokenData.visionRadius || 200
                    })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', inset: 0,
                    backgroundColor: (tokenData.hasVision !== false) ? 'var(--success)' : 'var(--bg-tertiary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '26px', transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute', height: '20px', width: '20px', left: (tokenData.hasVision !== false) ? '24px' : '4px',
                      bottom: '2px', backgroundColor: '#ffffff', borderRadius: '50%', transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              {tokenData.hasVision !== false && (
                <>
                  {/* Slider de Raio de Visão */}
                  <div style={{
                    background: 'var(--bg-tertiary)',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Alcance do Raio de Luz:
                      </span>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontFamily: 'monospace', 
                        color: 'var(--accent-primary)',
                        background: 'var(--accent-glow)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--glass-border)'
                      }}>
                        {tokenData.visionRadius || 200} px (~{Math.round((tokenData.visionRadius || 200) / 35)}m)
                      </span>
                    </div>

                    <input 
                      type="range"
                      min="50"
                      max="1000"
                      step="25"
                      value={tokenData.visionRadius || 200}
                      onChange={(e) => handleUpdate({ visionRadius: parseInt(e.target.value) || 200 })}
                      style={{
                        width: '100%',
                        accentColor: 'var(--accent-primary)',
                        height: '6px',
                        cursor: 'pointer'
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      <span>50px (Tocha Curta)</span>
                      <span>200px (Padrão)</span>
                      <span>500px (Lanterna)</span>
                      <span>1000px (Visão Ampla)</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: APARÊNCIA & FORMA */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Avatar Upload */}
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <img 
                  src={tokenData.imageUrl || '/vite.svg'} 
                  alt="Token preview"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: tokenData.tokenShape === 'square' ? '8px' : '50%',
                    objectFit: 'cover',
                    border: `3px solid ${tokenData.borderColor || 'var(--accent-primary)'}`
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Imagem do Token</span>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleAvatarUpload} 
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Upload size={14} /> {isUploading ? 'Enviando...' : 'Trocar Foto'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Formato do Token */}
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Formato da Moldura</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {shapes.map(s => {
                    const active = (tokenData.tokenShape || 'circle') === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleUpdate({ tokenShape: s.id })}
                        style={{
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: active ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                          background: active ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                          color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {s.icon}
                        <span style={{ fontSize: '0.7rem' }}>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cor da Borda */}
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Cor da Borda</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {presetColors.map(c => (
                    <button
                      key={c}
                      onClick={() => handleUpdate({ borderColor: c })}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: (tokenData.borderColor || '#06b6d4') === c ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                      }}
                    >
                      {(tokenData.borderColor || '#06b6d4') === c && <Check size={14} color={c === '#ffffff' ? '#000' : '#fff'} />}
                    </button>
                  ))}
                  <input 
                    type="color"
                    value={tokenData.borderColor || '#06b6d4'}
                    onChange={(e) => handleUpdate({ borderColor: e.target.value })}
                    style={{
                      width: '32px',
                      height: '32px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      marginLeft: '4px'
                    }}
                    title="Cor personalizada"
                  />
                </div>
              </div>

              {/* Escala (Tamanho no Grid) */}
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tamanho no Tabuleiro</label>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {Number(tokenData.sizeScale || 1.0).toFixed(1)}x ({tokenData.sizeScale > 1.8 ? 'Criatura Enorme' : tokenData.sizeScale > 1.2 ? 'Grande' : tokenData.sizeScale < 0.9 ? 'Pequeno' : 'Médio'})
                  </span>
                </div>
                <input 
                  type="range"
                  min="0.5"
                  max="3.5"
                  step="0.1"
                  value={tokenData.sizeScale || 1.0}
                  onChange={(e) => handleUpdate({ sizeScale: parseFloat(e.target.value) || 1.0 })}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', height: '6px', cursor: 'pointer' }}
                />
              </div>

              {/* Visibilidade da Barra de Vida e Nome */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Barra de HP</label>
                  <select
                    value={tokenData.hpBarMode || 'always'}
                    onChange={(e) => handleUpdate({ hpBarMode: e.target.value })}
                    style={selectStyle}
                  >
                    <option value="always">Sempre Visível</option>
                    <option value="hover">Ao Passar Mouse</option>
                    <option value="hidden">Ocultar</option>
                  </select>
                </div>

                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tag de Nome</label>
                  <select
                    value={tokenData.showName ? 'always' : 'hover'}
                    onChange={(e) => handleUpdate({ showName: e.target.value === 'always' })}
                    style={selectStyle}
                  >
                    <option value="always">Sempre Visível</option>
                    <option value="hover">Ao Passar Mouse</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PERMISSÕES & MESTRE */}
          {activeTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Jogador Dono */}
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Jogador Atribuído (Dono da Ficha)
                </label>
                <select
                  value={tokenData.ownerName || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      handleUpdate({ ownerId: undefined, ownerName: undefined });
                    } else {
                      const playerEntry = Array.from(state.players.values() as Iterable<any>).find((p: any) => p.name === val);
                      handleUpdate({ 
                        ownerName: val, 
                        ownerId: playerEntry?.userId || undefined 
                      });
                    }
                  }}
                  style={selectStyle}
                >
                  <option value="">Livre / Acesso Aberto (Mestre & Jogadores)</option>
                  {Array.from(state.players.values() as Iterable<any>).map((p: any, pIdx: number) => (
                    <option key={p.userId || p.name || pIdx} value={p.name}>
                      👤 {p.name} {p.userId ? '(Autenticado)' : ''}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Apenas o jogador atribuído e o Mestre poderão mover ou alterar este token.
                </span>
              </div>

              {/* Travar Posição (Lock) */}
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {tokenData.locked ? <Lock size={16} color="var(--warning)" /> : <Unlock size={16} color="var(--text-secondary)" />}
                    Travar Posição no Tabuleiro
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Impede movimentação ou cliques acidentais.
                  </p>
                </div>
                <button
                  onClick={() => handleUpdate({ locked: !tokenData.locked })}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: tokenData.locked ? '1px solid var(--warning)' : '1px solid var(--glass-border)',
                    background: tokenData.locked ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-secondary)',
                    color: tokenData.locked ? 'var(--warning)' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {tokenData.locked ? 'TRAVADO' : 'DESTRAVADO'}
                </button>
              </div>

              {/* Ação Destrutiva: Excluir */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'var(--danger)' }}>
                    Excluir Token do Tabuleiro
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--danger)' }}>
                    Remove este token permanentemente da cena atual.
                  </p>
                </div>
                <button
                  onClick={() => {
                    Tokens.delete(tokenId);
                    toast.info('Token excluído.');
                    onClose();
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--danger)',
                    background: 'var(--danger)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={15} /> Excluir
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: STATUS & COMBATE */}
          {activeTab === 'status' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Pontos de Vida (HP) e Mana (MP) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700 }}>HP Atual / Máximo</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input 
                      type="number"
                      value={tokenData.hp ?? 10}
                      onChange={(e) => handleUpdate({ hp: parseInt(e.target.value) || 0 })}
                      style={inputNumberStyle}
                    />
                    <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>/</span>
                    <input 
                      type="number"
                      value={tokenData.maxHp ?? 10}
                      onChange={(e) => handleUpdate({ maxHp: parseInt(e.target.value) || 1 })}
                      style={inputNumberStyle}
                    />
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--mana)', fontWeight: 700 }}>MP Atual / Máximo</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input 
                      type="number"
                      value={tokenData.mana ?? 0}
                      onChange={(e) => handleUpdate({ mana: parseInt(e.target.value) || 0 })}
                      style={inputNumberStyle}
                    />
                    <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>/</span>
                    <input 
                      type="number"
                      value={tokenData.maxMana ?? 0}
                      onChange={(e) => handleUpdate({ maxMana: parseInt(e.target.value) || 0 })}
                      style={inputNumberStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Defesa e Iniciativa */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 700 }}>Classe de Armadura / Defesa</label>
                  <input 
                    type="number"
                    value={tokenData.defesa ?? 10}
                    onChange={(e) => handleUpdate({ defesa: parseInt(e.target.value) || 0 })}
                    style={inputNumberStyle}
                  />
                </div>

                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Iniciativa</label>
                  <input 
                    type="number"
                    value={tokenData.iniciativa ?? 0}
                    onChange={(e) => handleUpdate({ iniciativa: parseInt(e.target.value) || 0 })}
                    style={inputNumberStyle}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--bg-tertiary)'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              background: 'var(--accent-primary)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px var(--accent-glow)'
            }}
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.75rem 1rem',
        background: active ? 'var(--accent-glow)' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--glass-border)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  padding: '6px 8px',
  fontSize: '0.8rem',
  outline: 'none',
  width: '100%'
};

const inputNumberStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--glass-border)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  padding: '6px 8px',
  fontSize: '0.85rem',
  fontWeight: 700,
  fontFamily: 'monospace',
  outline: 'none',
  width: '100%'
};
