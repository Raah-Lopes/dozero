import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Trash2, Download, User, BookOpen, Sword,
  Shield, Search, Edit2, Check, ChevronRight, Play, Sparkles
} from 'lucide-react';
import { state } from '../../services/yjs';
import { useAuthStore } from '../../store/authStore';
import {
  CharacterRecord,
  getVaultCharacters,
  saveCharacter,
  deleteCharacter,
  importCharacterToCampaign
} from '../../services/characterRepository';
import { getCampaigns, CampaignCloudRecord } from '../../services/campaignCloudService';
import { toast } from '../UI/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Se fornecido, habilita botão "Importar para esta Mesa" */
  activeCampaignId?: string | null;
}

const TYPE_LABELS: Record<string, string> = { pc: 'Personagem', npc: 'NPC', monster: 'Criatura' };
const TYPE_ICONS: Record<string, React.ReactNode> = {
  pc: <User size={13} />,
  npc: <BookOpen size={13} />,
  monster: <Sword size={13} />
};

const EMPTY_FORM: Partial<CharacterRecord> = {
  name: '', type: 'pc', avatar_url: '', data: {}, notes_markdown: '', campaign_id: null
};

export const PlayerVaultModal: React.FC<Props> = ({ isOpen, onClose, activeCampaignId }) => {
  const { user } = useAuthStore();
  const [chars, setChars] = useState<CharacterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mapTokens, setMapTokens] = useState<any[]>([]);

  // Formulário
  const [editing, setEditing] = useState<Partial<CharacterRecord> | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Importar: picker de campanha
  const [importTarget, setImportTarget] = useState<CharacterRecord | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignCloudRecord[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getVaultCharacters(user?.id);
    setChars(list);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { 
    if (isOpen) {
      load();
      const list: any[] = [];
      state.tokens.forEach((v: any, k: string) => {
        list.push({ ...v, id: k });
      });
      setMapTokens(list);
    } 
  }, [isOpen, load]);

  const handleSaveActiveTokenToVault = async (tokenItem: any) => {
    if (!tokenItem || !tokenItem.name) return;
    try {
      await saveCharacter({
        name: tokenItem.name,
        type: tokenItem.isPlayer || tokenItem.type === 'player' ? 'pc' : (tokenItem.type === 'enemy' ? 'monster' : 'npc'),
        avatar_url: tokenItem.imageUrl || tokenItem.avatar || '',
        data: {
          hp: tokenItem.hp,
          maxHp: tokenItem.maxHp,
          mana: tokenItem.mana,
          maxMana: tokenItem.maxMana,
          speed: tokenItem.speed,
          ac: tokenItem.ac || tokenItem.ca || 10,
          attributes: tokenItem.attributes || {}
        },
        notes_markdown: tokenItem.notes || '',
        campaign_id: null
      }, user?.id);

      toast.success(`Ficha de "${tokenItem.name}" salva no seu Vault!`);
      load();
    } catch (err) {
      toast.error('Erro ao exportar token para o Vault.');
    }
  };

  const filtered = chars.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // ----------------------------------------------------------------
  // Form handlers
  // ----------------------------------------------------------------
  const handleOpenNew = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('open-arcanum-sheet', { detail: { scope: 'vault' } }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.warning('Nome obrigatório.'); return; }
    setSaving(true);
    try {
      const saved = await saveCharacter(
        { ...editing, ...form, campaign_id: null },
        user?.id
      );
      toast.success(`Personagem "${saved.name}" salvo no Vault!`);
      setEditing(null);
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (c: CharacterRecord) => {
    if (!confirm(`Excluir "${c.name}" do Vault? Esta ação não pode ser desfeita.`)) return;
    await deleteCharacter(c.id, user?.id);
    toast.info(`"${c.name}" removido do Vault.`);
    load();
  };

  // ----------------------------------------------------------------
  // Import handlers
  // ----------------------------------------------------------------
  const handleOpenImport = async (c: CharacterRecord) => {
    if (activeCampaignId) {
      // Mesa ativa conhecida: importa direto
      await importCharacterToCampaign(c.id, activeCampaignId, user?.id);
      toast.success(`"${c.name}" importado para a mesa!`);
      return;
    }
    // Senão: mostra picker de campanhas
    const list = await getCampaigns(user?.id);
    setCampaigns(list.filter(camp => !camp.is_closed));
    setImportTarget(c);
  };

  const handleSpawnTokenToMap = (c: CharacterRecord) => {
    const vitals = (c.data?.vitals || c.data?.atributos || {}) as any;
    const hp = Number(vitals.hp || vitals.pv || c.data?.hp || 100);
    const maxHp = Number(vitals.maxHp || vitals.pv_max || c.data?.maxHp || hp);
    const mana = Number(vitals.mana || vitals.pm || c.data?.mana || 50);
    const maxMana = Number(vitals.maxMana || vitals.pm_max || c.data?.maxMana || mana);

    const tokenData = {
      name: c.name,
      type: c.type === 'pc' ? 'player' : (c.type === 'monster' ? 'enemy' : 'npc'),
      characterId: c.id,
      imageUrl: c.avatar_url || '/vite.svg',
      hp,
      maxHp,
      mana,
      maxMana,
      showName: true,
      hpBarMode: 'always' as const,
      ownerId: user?.id,
      ownerName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Jogador'
    };

    // Centraliza ou coloca no grid
    const id = `token_vault_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const x = 500 + Math.floor(Math.random() * 100);
    const y = 500 + Math.floor(Math.random() * 100);

    state.tokens.set(id, { id, x, y, ...tokenData });
    state.chat.push([{ 
      text: `🛡️ <b>${c.name}</b> foi invocado(a) no mapa a partir do Player Vault!`, 
      timestamp: Date.now(), 
      isCritical: true, 
      isFailure: false 
    }]);

    toast.success(`Token de "${c.name}" evocado no mapa!`);
    onClose();
  };

  const handleImportToCampaign = async (camp: CampaignCloudRecord) => {
    if (!importTarget) return;
    await importCharacterToCampaign(importTarget.id, camp.id, user?.id);
    toast.success(`"${importTarget.name}" importado para "${camp.name}"!`);
    setImportTarget(null);
  };

  if (!isOpen) return null;

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a0f0a 0%, #120b07 100%)',
        border: '1px solid #5a4234', borderRadius: '20px',
        width: '100%', maxWidth: '780px', maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 24px', borderBottom: '1px solid #3b281d' }}>
          <Shield size={20} style={{ color: '#c49a6c' }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fdfaf5' }}>
              Meu Vault de Personagens
            </h2>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#a1a1aa' }}>
              Seus personagens salvos — disponíveis em qualquer mesa
            </p>
          </div>
          <button
            onClick={handleOpenNew}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#a46830', border: '1px solid #c49a6c', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
          >
            <Plus size={14} /> Abrir Forja
          </button>
          <button onClick={onClose} style={{ padding: '6px', background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Formulário de edição */}
          {editing !== null && (
            <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #5a4234', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#c49a6c', fontWeight: 700 }}>
                {editing.id ? `Editar: ${editing.name}` : 'Novo Personagem'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#d7c9b8', marginBottom: '4px', fontWeight: 600 }}>Nome *</label>
                  <input
                    autoFocus
                    value={form.name || ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nome do personagem"
                    style={{ width: '100%', padding: '8px 12px', background: '#120b07', border: '1px solid #5a4234', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#d7c9b8', marginBottom: '4px', fontWeight: 600 }}>Tipo</label>
                  <select
                    value={form.type || 'pc'}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as CharacterRecord['type'] }))}
                    style={{ width: '100%', padding: '8px 12px', background: '#120b07', border: '1px solid #5a4234', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="pc">Personagem (PC)</option>
                    <option value="npc">NPC</option>
                    <option value="monster">Criatura</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#d7c9b8', marginBottom: '4px', fontWeight: 600 }}>URL do Avatar</label>
                <input
                  value={form.avatar_url || ''}
                  onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                  placeholder="https://... ou deixe vazio"
                  style={{ width: '100%', padding: '8px 12px', background: '#120b07', border: '1px solid #5a4234', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#d7c9b8', marginBottom: '4px', fontWeight: 600 }}>Notas / Grimório (Markdown)</label>
                <textarea
                  value={form.notes_markdown || ''}
                  onChange={e => setForm(f => ({ ...f, notes_markdown: e.target.value }))}
                  placeholder="História, anotações, habilidades especiais..."
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', background: '#120b07', border: '1px solid #5a4234', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setEditing(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #5a4234', borderRadius: '8px', color: '#d7c9b8', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: '#a46830', border: '1px solid #c49a6c', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  <Check size={14} /> {saving ? 'Salvando...' : 'Salvar no Vault'}
                </button>
              </div>
            </form>
          )}

          {/* Picker de campanha para importação */}
          {importTarget && (
            <div style={{ background: 'rgba(164,104,48,0.1)', border: '1px solid #c49a6c', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#fde047', fontWeight: 700 }}>
                Importar "{importTarget.name}" para qual mesa?
              </p>
              {campaigns.map(camp => (
                <button key={camp.id} onClick={() => handleImportToCampaign(camp)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid #5a4234', borderRadius: '8px', color: '#fdfaf5', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}>
                  <ChevronRight size={14} style={{ color: '#c49a6c' }} />
                  <span style={{ fontWeight: 700 }}>{camp.name}</span>
                  <span style={{ color: '#a1a1aa', fontSize: '0.7rem' }}>{camp.system}</span>
                </button>
              ))}
              <button onClick={() => setImportTarget(null)} style={{ alignSelf: 'flex-end', padding: '6px 12px', background: 'transparent', border: '1px solid #5a4234', borderRadius: '8px', color: '#a1a1aa', fontSize: '0.75rem', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          )}

          {/* Tokens na mesa ativa para salvar no Vault */}
          {activeCampaignId && mapTokens.length > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(164,104,48,0.08)', border: '1px solid #5a4234', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fde047', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="#fde047" /> Tokens nesta Mesa ({mapTokens.length}) — Salvar Ficha no Vault:
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {mapTokens.map(tok => (
                  <button
                    key={tok.id}
                    onClick={() => handleSaveActiveTokenToVault(tok)}
                    title={`Salvar ficha de "${tok.name || 'Token'}" no seu Vault`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 10px', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid #c49a6c', borderRadius: '8px',
                      color: '#fdfaf5', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    <img src={tok.imageUrl || '/vite.svg'} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontWeight: 600 }}>{tok.name || 'Token'}</span>
                    <Plus size={12} style={{ color: '#4ade80' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Busca */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar personagem..."
              style={{ width: '100%', padding: '8px 12px 8px 34px', background: 'rgba(255,255,255,0.04)', border: '1px solid #3b281d', borderRadius: '10px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Lista */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#a1a1aa', fontSize: '0.85rem' }}>
              Carregando Vault...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '2px dashed #5a4234', borderRadius: '16px', color: '#a1a1aa', fontSize: '0.85rem' }}>
              {search ? 'Nenhum personagem encontrado.' : 'Seu Vault está vazio. Crie seu primeiro personagem!'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid #3b281d', borderRadius: '12px', padding: '10px 14px' }}>
                  {/* Avatar */}
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#3b281d', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.avatar_url
                      ? <img src={c.avatar_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <User size={20} style={{ color: '#c49a6c' }} />
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fdfaf5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.68rem', color: '#a1a1aa', marginTop: '2px' }}>
                      {TYPE_ICONS[c.type]} {TYPE_LABELS[c.type]}
                      {c.notes_markdown && <span style={{ color: '#5a4234' }}>·</span>}
                      {c.notes_markdown && <BookOpen size={10} />}
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleSpawnTokenToMap(c)}
                      title="Invocar Token no Mapa Ativo"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'rgba(234,179,8,0.12)', border: '1px solid #eab308', borderRadius: '7px', color: '#facc15', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Play size={12} /> Invocar
                    </button>
                    <button
                      onClick={() => handleOpenImport(c)}
                      title="Importar para mesa"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '7px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Download size={12} /> Importar
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('open-arcanum-sheet', { detail: { id: c.id, scope: 'vault' } }));
                      }}
                      title="Abrir na Forja de Fichas"
                      style={{ padding: '5px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid #5a4234', borderRadius: '7px', color: '#d7c9b8', cursor: 'pointer' }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      title="Excluir"
                      style={{ padding: '5px 8px', background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', borderRadius: '7px', color: '#f87171', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
