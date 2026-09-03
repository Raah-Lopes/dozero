import React, { useState, useEffect, useCallback } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { useWiki } from '../../../hooks/useWiki';
import { loadMarkdownFile } from '../../../utils/githubApi';
import { state, pushChatMessage } from '../../../store';
import { Tokens } from '../../../store/modules';
import { Anvil, Search, FileText, Cloud, Plus, Play, Trash2, Skull, Shield, Swords, Sparkles, RefreshCw } from 'lucide-react';
import * as yaml from 'js-yaml';
import { toast } from '../../UI/Toast';
import { useAuthStore } from '../../../store/authStore';
import {
  getVaultCharacters,
  getCampaignCharacters,
  saveCharacter,
  deleteCharacter,
  CharacterRecord
} from '../../../services/characterRepository';
import { createWikiTokenData } from '../../../services/wiki/wikiTokenAdapter';
import { LoadingState } from '../../UI/LoadingState';

export const EntityForgeWidget: React.FC<{ onClose?: () => void; embedded?: boolean }> = ({ onClose, embedded }) => {
  const { user } = useAuthStore();
  const currentRoom = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2')
    : 'dozero-mesa-principal-v2';

  const [activeTab, setActiveTab] = useState<'cloud' | 'wiki' | 'create'>('cloud');
  const { index, isLoading: isWikiLoading } = useWiki();
  const [searchTerm, setSearchTerm] = useState('');

  // Cloud Bestiary State
  const [cloudEntities, setCloudEntities] = useState<CharacterRecord[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

  // Form State para Criar Criatura
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'monster' | 'npc'>('monster');
  const [newHp, setNewHp] = useState(25);
  const [newDefense, setNewDefense] = useState(13);
  const [newAttack, setNewAttack] = useState(4);
  const [newAvatar, setNewAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadCloudEntities = useCallback(async () => {
    setLoadingCloud(true);
    const vault = await getVaultCharacters(user?.id);
    const campaign = await getCampaignCharacters(currentRoom, user?.id);
    const combined = [...vault, ...campaign];
    // Apenas monstros e NPCs
    const nonPlayers = combined.filter(c => c.type === 'npc' || c.type === 'monster');
    // Remove duplicados por ID
    const unique = Array.from(new Map(nonPlayers.map(item => [item.id, item])).values());
    setCloudEntities(unique);
    setLoadingCloud(false);
  }, [user?.id, currentRoom]);

  useEffect(() => {
    if (activeTab === 'cloud') {
      loadCloudEntities();
    }
  }, [activeTab, loadCloudEntities]);

  const handleSpawnCloudEntity = (char: CharacterRecord) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const tokenId = `token_cloud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const d = (char.data || {}) as any;

    const hp = Number(d.hp || d.vida || 20);
    const maxHp = Number(d.maxHp || d.max_hp || hp);
    const defense = Number(d.defesa || d.defense || d.ca || 10);
    const attack = Number(d.ataque || d.attack || 2);
    const imageUrl = char.avatar_url || (char.type === 'monster' ? '/enemy_monster.png' : '/enemy_bandit.png');

    state.tokens.set(tokenId, {
      id: tokenId,
      x: cx + (Math.random() - 0.5) * 100,
      y: cy + (Math.random() - 0.5) * 100,
      name: char.name,
      hp: hp,
      maxHp: maxHp,
      defesa: defense,
      ataque: attack,
      imageUrl: imageUrl,
      tokenShape: 'circle',
      sizeScale: 1,
      borderColor: char.type === 'monster' ? '#ef4444' : '#f59e0b',
      showName: true,
      hpBarMode: 'always',
      status: 'npc',
      ativo: true,
      armas: d.armas || [{ nome: 'Ataque Básico', dano: '1d6+2', equipado: true }],
      poderes: d.poderes || []
    });

    pushChatMessage(`🐉 <b>Criatura Invocada:</b> "${char.name}" foi colocada no campo de batalha!`, true, false);
    toast.success(`"${char.name}" invocado no tabuleiro!`);
  };

  const handleCreateCreature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.warn('Digite um nome para a criatura.');
      return;
    }

    setIsSaving(true);
    try {
      await saveCharacter({
        name: newName.trim(),
        type: newType,
        avatar_url: newAvatar.trim() || (newType === 'monster' ? '/enemy_monster.png' : '/enemy_bandit.png'),
        campaign_id: currentRoom,
        data: {
          hp: newHp,
          maxHp: newHp,
          defesa: newDefense,
          ataque: newAttack,
          armas: [{ nome: 'Ataque Corporal', dano: `1d8+${Math.max(1, Math.floor(newAttack/2))}`, equipado: true }]
        }
      }, user?.id);

      toast.success(`Criatura "${newName}" salva no Compêndio Cloud!`);
      setNewName('');
      setNewAvatar('');
      setActiveTab('cloud');
      loadCloudEntities();
    } catch (err) {
      toast.error('Erro ao salvar criatura.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCloud = cloudEntities.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEntities = index.filter(e => {
    const tipo = String(e.metadata?.tipo || '').toLowerCase();
    const status = String(e.metadata?.status || '').toLowerCase();
    const path = e.path.toLowerCase();
    
    if (path.includes('_modelo')) return false;

    const isChar = ['pc', 'npc', 'monstro', 'personagem', 'jogador', 'inimigo'].includes(tipo) ||
                   ['jogador', 'npc', 'inimigo'].includes(status) ||
                   path.includes('/fichas/') ||
                   path.includes('/personagens/') ||
                   path.includes('fichas/') ||
                   path.includes('personagens/');

    if (!isChar) return false;

    const nome = String(e.metadata?.nome || e.metadata?.titulo || e.slug || '');
    return path.includes(searchTerm.toLowerCase()) || nome.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSpawnWiki = async (path: string) => {
    try {
      const rawMd = await loadMarkdownFile(path);
      if (!rawMd) return;
      const parts = rawMd.split('---');
      if (parts.length < 3) {
        toast.warn("O arquivo não tem formato Frontmatter válido.");
        return;
      }

      const frontmatterStr = parts[1];
      const data = yaml.load(frontmatterStr) as any;
      if (!data) return;

      const token = Tokens.create(createWikiTokenData(data, path, {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }));
      toast.success(`Token "${token.name}" evocado para o mapa!`);
    } catch (e: any) {
      toast.error(`Erro ao invocar token: ${e?.message || e}`);
    }
  };

  const bodyContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px', boxSizing: 'border-box', color: 'var(--text-primary)', gap: '10px' }}>
      
      {/* Abas */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
        <button
          onClick={() => setActiveTab('cloud')}
          style={{
            flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 'bold',
            background: activeTab === 'cloud' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'cloud' ? '#fff' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
          }}
        >
          <Cloud size={13} /> Bestiário Nuvem
        </button>
        <button
          onClick={() => setActiveTab('wiki')}
          style={{
            flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 'bold',
            background: activeTab === 'wiki' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'wiki' ? '#fff' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
          }}
        >
          <FileText size={13} /> Wiki Local
        </button>
        <button
          onClick={() => setActiveTab('create')}
          style={{
            flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 'bold',
            background: activeTab === 'create' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'create' ? '#fff' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
          }}
        >
          <Plus size={13} /> Criar
        </button>
      </div>

      {activeTab !== 'create' && (
        <div style={{ position: 'relative' }}>
          <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
          <input 
            type="text" 
            placeholder={activeTab === 'cloud' ? "Buscar monstro ou NPC na nuvem..." : "Buscar na Wiki local..."} 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {/* CONTEÚDO DAS ABAS */}
      {activeTab === 'cloud' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {loadingCloud ? (
            <LoadingState compact label="Carregando criaturas da nuvem…" />
          ) : filteredCloud.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--glass-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              Nenhum monstro/NPC cadastrado. Clique na aba "+ Criar" para forjar novas criaturas!
            </div>
          ) : (
            filteredCloud.map(char => {
              const d = (char.data || {}) as any;
              return (
                <div 
                  key={char.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                    <img 
                      src={char.avatar_url || (char.type === 'monster' ? '/enemy_monster.png' : '/enemy_bandit.png')} 
                      alt={char.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${char.type === 'monster' ? '#ef4444' : '#f59e0b'}` }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: '#fdfaf5' }}>
                        {char.name}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        HP {d.hp || 20} • CA {d.defesa || 10} • ATK +{d.ataque || 2}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleSpawnCloudEntity(char)}
                      title="Evocar para o mapa"
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(34,197,94,0.15)',
                        border: '1px solid #22c55e',
                        borderRadius: '6px',
                        color: '#4ade80',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Play size={10} /> Evocar
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Excluir "${char.name}" do Compêndio?`)) {
                          await deleteCharacter(char.id, user?.id);
                          loadCloudEntities();
                        }
                      }}
                      title="Excluir"
                      style={{
                        padding: '4px 6px',
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid #ef4444',
                        borderRadius: '6px',
                        color: '#f87171',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'wiki' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {isWikiLoading ? (
            <LoadingState compact label="Carregando compêndio Wiki…" />
          ) : filteredEntities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '12px' }}>Nenhuma ficha encontrada na Wiki local.</div>
          ) : (
            filteredEntities.map((e, idx) => {
              const nome = e.metadata?.nome || e.metadata?.titulo || e.slug;
              const tipo = e.metadata?.tipo || 'Entidade';
              return (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <FileText size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{nome}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tipo}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSpawnWiki(e.path)}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--accent-primary)',
                      color: '#000',
                      fontWeight: 'bold',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Evocar
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <form onSubmit={handleCreateCreature} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Nome da Criatura / NPC</label>
            <input 
              type="text" 
              placeholder="Ex: Dragão Vermelho Jovem" 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
              style={{ padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tipo</label>
              <select 
                value={newType} 
                onChange={e => setNewType(e.target.value as any)}
                style={{ padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
              >
                <option value="monster">Monstro / Inimigo</option>
                <option value="npc">NPC / Aliado</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pontos de Vida (HP)</label>
              <input 
                type="number" 
                value={newHp} 
                onChange={e => setNewHp(Number(e.target.value))}
                style={{ padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Classe de Armadura (CA)</label>
              <input 
                type="number" 
                value={newDefense} 
                onChange={e => setNewDefense(Number(e.target.value))}
                style={{ padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bônus de Ataque (+X)</label>
              <input 
                type="number" 
                value={newAttack} 
                onChange={e => setNewAttack(Number(e.target.value))}
                style={{ padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avatar / Imagem (Opcional URL)</label>
            <input 
              type="text" 
              placeholder="https://exemplo.com/monstro.png" 
              value={newAvatar} 
              onChange={e => setNewAvatar(e.target.value)}
              style={{ padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            style={{
              marginTop: 'auto',
              padding: '10px',
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
            Salvar no Bestiário Cloud
          </button>
        </form>
      )}

    </div>
  );

  if (embedded) {
    return bodyContent;
  }

  return (
    <DraggableWindow id="entity-forge" widgetKey="entityForge" title="Compêndio & Forja de Entidades" onClose={onClose} width={380} height={500} initialX={100} initialY={100}>
      {bodyContent}
    </DraggableWindow>
  );
};
