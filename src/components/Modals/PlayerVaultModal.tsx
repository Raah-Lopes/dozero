import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LoadingState } from '../UI/LoadingState';
import {
  X, Plus, Trash2, Download, User, BookOpen, Sword,
  Shield, Search, Edit2, Check, ChevronRight, Play, Sparkles,
  Copy, History, Camera, FileJson, Upload, RotateCcw, Network, Crown,
  CalendarDays, ImageDown, Printer
} from 'lucide-react';
import { state } from '../../services/yjs';
import { useAuthStore } from '../../store/authStore';
import {
  CharacterRecord,
  CharacterVersionRecord,
  getVaultCharacters,
  saveCharacter,
  deleteCharacter,
  importCharacterToCampaign,
  createCharacterSnapshot,
  getCharacterVersions,
  restoreCharacterVersion,
  deleteCharacterVersion,
  cloneCharacter,
  exportCharacterJson,
  importCharacterFromJson
} from '../../services/characterRepository';
import { getCampaigns, CampaignCloudRecord } from '../../services/campaignCloudService';
import {
  exportCharactersJson,
  exportCharactersWebp,
  exportCharacterWebp,
  integrateCharacter,
  printCharacters,
  removeCharacterIntegration,
} from '../../services/characterIntegration';
import { useWindowManager } from '../../hooks/useWindowManager';
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

  // Histórico de Versões
  const [historyChar, setHistoryChar] = useState<CharacterRecord | null>(null);
  const [versionsList, setVersionsList] = useState<CharacterVersionRecord[]>([]);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getVaultCharacters(user?.id);
    setChars(list);
    setLoading(false);
  }, [user?.id]);

  const loadHistory = async (char: CharacterRecord) => {
    setHistoryChar(char);
    const vers = await getCharacterVersions(char.id, user?.id);
    setVersionsList(vers);
  };

  const handleCreateSnapshot = async () => {
    if (!historyChar) return;
    const v = await createCharacterSnapshot(historyChar.id, snapshotLabel.trim() || undefined, user?.id);
    if (v) {
      toast.success(`Snapshot "${v.label}" criado com sucesso!`);
      setSnapshotLabel('');
      loadHistory(historyChar);
    }
  };

  const handleRestoreVersion = async (v: CharacterVersionRecord) => {
    if (!confirm(`Deseja restaurar a versão "${v.label}"? Os dados atuais da ficha serão substituídos por este snapshot.`)) return;
    const restored = await restoreCharacterVersion(v.id, user?.id);
    if (restored) {
      toast.success(`Ficha restaurada para "${v.label}"!`);
      load();
      loadHistory(restored);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    await deleteCharacterVersion(versionId);
    if (historyChar) loadHistory(historyChar);
    toast.info('Snapshot removido.');
  };

  const handleDuplicateChar = async (c: CharacterRecord) => {
    const cloned = await cloneCharacter(c.id, null, `${c.name} (Cópia)`, user?.id);
    if (cloned) {
      toast.success(`"${cloned.name}" duplicado no seu Vault!`);
      load();
    }
  };

  const handleExportJson = (c: CharacterRecord) => {
    exportCharacterJson(c);
    toast.success(`Exportando "${c.name}.json"...`);
  };

  const openCodex = (character: CharacterRecord) => {
    const note = integrateCharacter(character);
    const manager = useWindowManager.getState();
    manager.setWikiInitialFile(note.id);
    manager.setViewMode('wiki');
    onClose();
  };

  const handleIntegrateEverywhere = (character: CharacterRecord) => {
    integrateCharacter(character, { lineage: true, timeline: true });
    toast.success(`"${character.name}" está no Códice, na Linhagem e no Chronos.`);
  };

  const handleOpenLineage = (character: CharacterRecord) => {
    integrateCharacter(character, { lineage: true });
    const manager = useWindowManager.getState();
    manager.setViewMode('canvas');
    manager.openWindow('lineage');
    onClose();
  };

  const handleOpenTimeline = (character: CharacterRecord) => {
    integrateCharacter(character, { timeline: true });
    const manager = useWindowManager.getState();
    manager.setViewMode('canvas');
    manager.openWindow('chronicle');
    onClose();
  };

  const handleExportWebp = async (character: CharacterRecord) => {
    await exportCharacterWebp(character);
    toast.success(`Exportando "${character.name}" como WebP...`);
  };

  const handlePrint = (characters: CharacterRecord[]) => {
    if (printCharacters(characters)) toast.info('A impressão foi aberta. Escolha "Salvar como PDF" no diálogo.');
    else toast.error('O navegador bloqueou a janela de impressão.');
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = await importCharacterFromJson(text, user?.id);
      toast.success(`Ficha "${imported.name}" importada com sucesso para o Vault!`);
      load();
    } catch (err: any) {
      toast.error(`Falha ao importar JSON: ${err.message || 'Arquivo corrompido'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
    if (!confirm(`Excluir "${c.name}" do Vault, Códice, Chronos e Linhagem? O Markdown original na Wiki será preservado.`)) return;
    removeCharacterIntegration(c);
    await deleteCharacter(c.id, user?.id);
    toast.info(`"${c.name}" removido do ecossistema.`);
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
              Seus personagens salvos, snapshots de evolução e portabilidade entre mesas
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleImportJsonFile}
            style={{ display: 'none' }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Importar ficha em arquivo JSON"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid #5a4234', borderRadius: '10px', color: '#d7c9b8', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
          >
            <Upload size={13} /> Importar JSON
          </button>

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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', padding: '10px 24px', borderBottom: '1px solid #3b281d', background: 'rgba(0,0,0,0.16)' }}>
          <button
            type="button"
            onClick={() => {
              chars.forEach((character) => integrateCharacter(character));
              toast.success(`${chars.length} ficha(s) vinculada(s) ao Códice e ao Cérebro.`);
            }}
            disabled={chars.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px', background: 'rgba(192,132,252,0.1)', border: '1px solid #a855f7', borderRadius: '7px', color: '#d8b4fe', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <Network size={12} /> Vincular todas
          </button>
          <button type="button" onClick={() => exportCharactersJson(chars)} disabled={chars.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px', background: 'rgba(56,189,248,0.1)', border: '1px solid #38bdf8', borderRadius: '7px', color: '#7dd3fc', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            <FileJson size={12} /> JSON em lote
          </button>
          <button type="button" onClick={() => void exportCharactersWebp(chars)} disabled={chars.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px', background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', borderRadius: '7px', color: '#fcd34d', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            <ImageDown size={12} /> WebP em lote
          </button>
          <button type="button" onClick={() => handlePrint(chars)} disabled={chars.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid #78716c', borderRadius: '7px', color: '#e7e5e4', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            <Printer size={12} /> PDF em lote
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Histórico de Versões & Snapshots Drawer */}
          {historyChar && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 20, 15, 0.95), rgba(20, 12, 8, 0.98))',
              border: '1px solid #c49a6c',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #5a4234', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={16} color="#fbbf24" />
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fde047' }}>
                    Histórico de Versões & Snapshots — {historyChar.name}
                  </span>
                </div>
                <button
                  onClick={() => setHistoryChar(null)}
                  style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Criar novo snapshot */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  placeholder="Rótulo da versão (ex: Nível 3 - Ladino, Antes da Boss Fight...)"
                  style={{
                    flex: 1,
                    background: '#120b07',
                    border: '1px solid #5a4234',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#fff',
                    fontSize: '0.78rem'
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()}
                />
                <button
                  onClick={handleCreateSnapshot}
                  style={{
                    background: '#a46830',
                    border: '1px solid #c49a6c',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Camera size={13} /> Criar Snapshot
                </button>
              </div>

              {/* Lista de Versões */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {versionsList.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#a1a1aa', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
                    Nenhum snapshot gravado para este personagem. Crie um ponto de restauração acima!
                  </p>
                ) : (
                  versionsList.map((ver) => (
                    <div
                      key={ver.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid #3b281d',
                        borderRadius: '8px',
                        padding: '8px 12px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fdfaf5' }}>{ver.label}</div>
                        <div style={{ fontSize: '0.68rem', color: '#a1a1aa' }}>
                          Salvo em: {new Date(ver.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleRestoreVersion(ver)}
                          title="Restaurar esta versão da ficha"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(34,197,94,0.15)',
                            border: '1px solid #22c55e',
                            color: '#4ade80',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <RotateCcw size={12} /> Restaurar
                        </button>
                        <button
                          onClick={() => handleDeleteVersion(ver.id)}
                          title="Excluir este snapshot"
                          style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid #ef4444',
                            color: '#f87171',
                            borderRadius: '6px',
                            padding: '4px 6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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
            <LoadingState compact label="Carregando Vault…" />
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
                  <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleSpawnTokenToMap(c)}
                      title="Invocar Token no Mapa Ativo"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 8px', background: 'rgba(234,179,8,0.12)', border: '1px solid #eab308', borderRadius: '7px', color: '#facc15', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Play size={11} /> Invocar
                    </button>
                    <button
                      onClick={() => openCodex(c)}
                      title="Abrir a entidade no Códice; ela também aparecerá no Cérebro"
                      style={{ padding: '5px 7px', background: 'rgba(168,85,247,0.1)', border: '1px solid #a855f7', borderRadius: '7px', color: '#d8b4fe', cursor: 'pointer' }}
                    >
                      <BookOpen size={12} />
                    </button>
                    <button
                      onClick={() => handleOpenLineage(c)}
                      title="Adicionar à Linhagem e abrir a árvore genealógica"
                      style={{ padding: '5px 7px', background: 'rgba(234,179,8,0.1)', border: '1px solid #ca8a04', borderRadius: '7px', color: '#fde047', cursor: 'pointer' }}
                    >
                      <Crown size={12} />
                    </button>
                    <button
                      onClick={() => handleOpenTimeline(c)}
                      title="Adicionar à linha do tempo Chronos"
                      style={{ padding: '5px 7px', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '7px', color: '#86efac', cursor: 'pointer' }}
                    >
                      <CalendarDays size={12} />
                    </button>
                    <button
                      onClick={() => handleIntegrateEverywhere(c)}
                      title="Vincular de uma vez ao Códice, Cérebro, Linhagem e Chronos"
                      style={{ padding: '5px 7px', background: 'rgba(251,191,36,0.1)', border: '1px solid #fbbf24', borderRadius: '7px', color: '#fbbf24', cursor: 'pointer' }}
                    >
                      <Network size={12} />
                    </button>
                    <button
                      onClick={() => handleDuplicateChar(c)}
                      title="Duplicar / Clonar Personagem"
                      style={{ padding: '5px 7px', background: 'rgba(255,255,255,0.04)', border: '1px solid #5a4234', borderRadius: '7px', color: '#fbbf24', cursor: 'pointer' }}
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => loadHistory(c)}
                      title="Histórico de Versões & Snapshots"
                      style={{ padding: '5px 7px', background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', borderRadius: '7px', color: '#fbbf24', cursor: 'pointer' }}
                    >
                      <History size={12} />
                    </button>
                    <button
                      onClick={() => handleExportJson(c)}
                      title="Exportar como arquivo .json"
                      style={{ padding: '5px 7px', background: 'rgba(56,189,248,0.1)', border: '1px solid #38bdf8', borderRadius: '7px', color: '#38bdf8', cursor: 'pointer' }}
                    >
                      <FileJson size={12} />
                    </button>
                    <button onClick={() => void handleExportWebp(c)} title="Exportar como carta WebP" style={{ padding: '5px 7px', background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', borderRadius: '7px', color: '#fcd34d', cursor: 'pointer' }}>
                      <ImageDown size={12} />
                    </button>
                    <button onClick={() => handlePrint([c])} title="Imprimir ou salvar como PDF" style={{ padding: '5px 7px', background: 'rgba(255,255,255,0.04)', border: '1px solid #78716c', borderRadius: '7px', color: '#e7e5e4', cursor: 'pointer' }}>
                      <Printer size={12} />
                    </button>
                    <button
                      onClick={() => handleOpenImport(c)}
                      title="Importar para mesa / campanha"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 8px', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '7px', color: '#4ade80', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Download size={11} /> Mesa
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('open-arcanum-sheet', { detail: { id: c.id, scope: 'vault' } }));
                      }}
                      title="Abrir na Forja de Fichas"
                      style={{ padding: '5px 7px', background: 'rgba(255,255,255,0.04)', border: '1px solid #5a4234', borderRadius: '7px', color: '#d7c9b8', cursor: 'pointer' }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      title="Excluir"
                      style={{ padding: '5px 7px', background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', borderRadius: '7px', color: '#f87171', cursor: 'pointer' }}
                    >
                      <Trash2 size={12} />
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
