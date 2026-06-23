import React, { useState } from 'react';
import { Target, Plus, Edit3, Trash2, Award, BookOpen, FileText, ExternalLink, Link2, Image, Users } from 'lucide-react';
import * as yaml from 'js-yaml';
import { useStore } from '../../../store';
import type { CampaignTabProps } from '../types';
import { WikiLinkedTextarea } from '../WikiLinkedTextarea';
import { saveMarkdownContent, loadMarkdownFile, ensureWikiFolder } from '../../../utils/githubApi';
import { slugify, questTemplate } from '../CampaignManagerWidget';
import type { CampaignQuest, QuestLootItem } from '../../../store';

const STATUS_CONFIG = {
  quest: {
    active: { label: 'Ativa', color: '#38bdf8', border: 'rgba(56,189,248,0.3)', bg: 'rgba(12,74,110,0.4)' },
    completed: { label: 'Concluída', color: '#22c55e', border: 'rgba(34,197,94,0.3)', bg: 'rgba(20,83,45,0.4)' },
    failed: { label: 'Fracassada', color: '#ef4444', border: 'rgba(239,68,68,0.3)', bg: 'rgba(127,29,29,0.4)' },
    abandoned: { label: 'Abandonada', color: '#94a3b8', border: 'rgba(148,163,184,0.3)', bg: 'rgba(15,23,42,0.6)' }
  }
};



const EmptyState = ({ icon, message, sub }: any) => (
  <div style={{
    padding: '30px 20px', textAlign: 'center', background: 'rgba(15,23,42,0.4)',
    borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)'
  }}>
    <div style={{ color: 'rgba(148,163,184,0.3)', marginBottom: '12px' }}>{icon}</div>
    <p style={{ margin: 0, fontWeight: 600, color: '#94a3b8', fontSize: '0.9rem' }}>{message}</p>
    {sub && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(148,163,184,0.5)' }}>{sub}</p>}
  </div>
);

interface QuestsTabProps extends CampaignTabProps {
  wikiIndex: any[];
  openInWiki: (path: string) => void;
  linkingId: string | null;
  setLinkingId: (id: string | null) => void;
}

export const QuestsTab: React.FC<QuestsTabProps> = ({
  campaign: selectedCampaign,
  updateCampaign,
  wikiIndex,
  openInWiki,
  linkingId,
  setLinkingId
}) => {
  const store = useStore();
  const pushChatMessage = store.pushChatMessage;
  const state = store.state as any; // zustand state proxy
  const updateTokenProps = store.updateTokenProps;

  const upd = (changes: any) => updateCampaign(selectedCampaign.id, changes);

  // States
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [questStatusFilter, setQuestStatusFilter] = useState<'all' | 'active' | 'completed' | 'failed' | 'abandoned'>('all');
  const [questTypeFilter, setQuestTypeFilter] = useState<'all' | 'main' | 'side'>('all');

  // Form states for adding new loot item
  const [newLootName, setNewLootName] = useState('');
  const [newLootType, setNewLootType] = useState<'arma' | 'poder' | 'pocao' | 'maldicao' | 'objeto_campanha'>('pocao');
  const [newLootDescription, setNewLootDescription] = useState('');
  const [newLootQuantity, setNewLootQuantity] = useState(1);
  const [newLootEfeito, setNewLootEfeito] = useState('');

  // Distribution state
  const [isDistributing, setIsDistributing] = useState(false);
  const [selectedDistributeTargets, setSelectedDistributeTargets] = useState<string[]>([]);
const addQuest = async (type: 'main' | 'side') => {
    if (!selectedCampaign) return;
    const name = type === 'main' ? 'Nova Missão Principal' : 'Nova Missão Secundária';
    
    const filePath = selectedCampaign.folderPath
      ? `${selectedCampaign.folderPath}/Missoes/${slugify(name)}_${Date.now()}.md`
      : undefined;

    const newQuest: CampaignQuest = {
      id: `quest_${Date.now()}`,
      name,
      description: '',
      status: 'active',
      type,
      loot: [],
      wikiLinks: [],
      filePath
    };

    const currentQuests = selectedCampaign.quests || [];
    upd({ quests: [...currentQuests, newQuest] });
    setEditingQuestId(newQuest.id);

    if (filePath) {
      try {
        await ensureWikiFolder(`${selectedCampaign.folderPath}/Missoes`);
        await saveMarkdownContent(filePath, questTemplate(name, type));
      } catch (e) {
        console.warn('[Quest] Não foi possível criar arquivo wiki:', e);
      }
    }
  };

  const updateQuest = (questId: string, changes: Partial<CampaignQuest>) => {
    if (!selectedCampaign) return;
    const quests = selectedCampaign.quests || [];
    upd({ quests: quests.map(q => q.id === questId ? { ...q, ...changes } : q) });
  };

  const deleteQuest = (questId: string) => {
    if (!selectedCampaign || !confirm('Excluir esta missão permanentemente?')) return;
    const quests = selectedCampaign.quests || [];
    upd({ quests: quests.filter(q => q.id !== questId) });
  };

  const linkQuestToWiki = async (quest: CampaignQuest) => {
    if (!selectedCampaign || linkingId) return;
    setLinkingId(quest.id);
    try {
      await ensureWikiFolder(`${selectedCampaign.folderPath}/Missoes`);
      const filePath = `${selectedCampaign.folderPath}/Missoes/${slugify(quest.name)}_${Date.now()}.md`;
      const existing = await loadMarkdownFile(filePath);
      if (!existing) {
        await saveMarkdownContent(filePath, questTemplate(quest.name, quest.type));
      }
      updateQuest(quest.id, { filePath });
    } finally {
      setLinkingId(null);
    }
  };

  const handleAddLootItem = (questId: string) => {
    if (!selectedCampaign || !newLootName.trim()) return;
    const quests = selectedCampaign.quests || [];
    const updatedQuests = quests.map(q => {
      if (q.id === questId) {
        const newItem: QuestLootItem = {
          id: `loot_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: newLootName.trim(),
          type: newLootType,
          description: newLootDescription.trim(),
          quantidade: newLootQuantity || 1,
          efeito: newLootEfeito.trim() || undefined
        };
        return {
          ...q,
          loot: [...(q.loot || []), newItem]
        };
      }
      return q;
    });
    upd({ quests: updatedQuests });

    // Reset inputs
    setNewLootName('');
    setNewLootDescription('');
    setNewLootQuantity(1);
    setNewLootEfeito('');
  };

  const handleRemoveLootItem = (questId: string, lootId: string) => {
    if (!selectedCampaign) return;
    const quests = selectedCampaign.quests || [];
    const updatedQuests = quests.map(q => {
      if (q.id === questId) {
        return {
          ...q,
          loot: (q.loot || []).filter(l => l.id !== lootId)
        };
      }
      return q;
    });
    upd({ quests: updatedQuests });
  };

  const handleLinkWikiToQuest = (questId: string, path: string) => {
    if (!selectedCampaign || !path) return;
    const quests = selectedCampaign.quests || [];
    const updatedQuests = quests.map(q => {
      if (q.id === questId) {
        const links = q.wikiLinks || [];
        if (links.includes(path)) return q;
        return {
          ...q,
          wikiLinks: [...links, path]
        };
      }
      return q;
    });
    upd({ quests: updatedQuests });
  };

  const handleUnlinkWikiFromQuest = (questId: string, path: string) => {
    if (!selectedCampaign) return;
    const quests = selectedCampaign.quests || [];
    const updatedQuests = quests.map(q => {
      if (q.id === questId) {
        return {
          ...q,
          wikiLinks: (q.wikiLinks || []).filter(l => l !== path)
        };
      }
      return q;
    });
    upd({ quests: updatedQuests });
  };

  const getPCCharacters = () => {
    if (!wikiIndex) return [];
    return wikiIndex.filter(e => {
      const tipo = String(e.metadata?.tipo || '').toLowerCase();
      const status = String(e.metadata?.status || '').toLowerCase();
      const path = e.path.toLowerCase();
      if (path.includes('_modelo')) return false;

      const isPlayer = ['pc', 'personagem', 'jogador'].includes(tipo) || 
                       status === 'jogador' || 
                       path.includes('/jogadores/') ||
                       path.includes('/personagens/');
      return isPlayer;
    }).map(e => ({
      name: e.metadata?.nome || e.metadata?.titulo || e.slug || 'Sem nome',
      path: e.path,
      avatar: e.metadata?.avatar || e.metadata?.imagem || e.metadata?.imageUrl || '/vite.svg'
    }));
  };

  const handleDistributeLoot = async (questId: string) => {
    if (!selectedCampaign || selectedDistributeTargets.length === 0) {
      alert("Selecione pelo menos um personagem para receber o loot!");
      return;
    }
    const quest = (selectedCampaign.quests || []).find(q => q.id === questId);
    if (!quest || !quest.loot || quest.loot.length === 0) {
      alert("Não há itens no loot dessa missão para distribuir!");
      return;
    }

    setIsDistributing(true);
    let successCount = 0;

    for (const charPath of selectedDistributeTargets) {
      try {
        const originalMd = await loadMarkdownFile(charPath);
        if (!originalMd) continue;
        const textParts = originalMd.split('---');
        if (textParts.length < 3) continue;

        const frontmatterStr = textParts[1];
        const body = textParts.slice(2).join('---');
        const data = yaml.load(frontmatterStr) as any || {};

        for (const item of quest.loot) {
          const qty = item.quantidade || 1;
          
          if (item.type === 'arma') {
            const arr = Array.isArray(data.armas) ? data.armas : [];
            arr.push({
              nome: item.name,
              tipo: 'equipamento',
              efeito: item.efeito || '',
              descricao: item.description,
              equipado: false
            });
            data.armas = arr;
          } else if (item.type === 'poder') {
            const arr = Array.isArray(data.poderes) ? data.poderes : [];
            arr.push({
              nome: item.name,
              tipo: 'poder',
              efeito: item.efeito || '',
              descricao: item.description
            });
            data.poderes = arr;
          } else if (item.type === 'pocao') {
            const arr = Array.isArray(data.pocoes) ? data.pocoes : [];
            arr.push({
              nome: item.name,
              tipo: 'consumivel',
              efeito: item.efeito || '',
              quantidade: qty,
              descricao: item.description
            });
            data.pocoes = arr;
          } else if (item.type === 'maldicao') {
            const arr = Array.isArray(data.maldicoes) ? data.maldicoes : [];
            arr.push({
              nome: item.name,
              tipo: 'maldicao',
              efeito: item.efeito || '',
              descricao: item.description
            });
            data.maldicoes = arr;
          } else if (item.type === 'objeto_campanha') {
            const arr = Array.isArray(data.objetos_campanha) ? data.objetos_campanha : [];
            arr.push({
              nome: item.name,
              tipo: 'objeto_campanha',
              efeito: item.efeito || '',
              descricao: item.description
            });
            data.objetos_campanha = arr;
          }

          const inv = Array.isArray(data.inventario) ? data.inventario : [];
          inv.push({
            nome: item.name,
            tipo: item.type === 'pocao' ? 'consumivel' : item.type === 'arma' ? 'equipamento' : item.type,
            efeito: item.efeito || '',
            quantidade: qty,
            descricao: item.description,
            equipado: false
          });
          data.inventario = inv;
        }

        const newFront = '---\n' + yaml.dump(data) + '---\n';
        await saveMarkdownContent(charPath, newFront + body);

        const entry = wikiIndex.find(e => e.path === charPath);
        if (entry) {
          const entrySlug = entry.slug;
          const entryName = (entry.metadata?.nome || entry.metadata?.titulo || '').trim().toLowerCase();

          Array.from(state.tokens.entries()).forEach(([tokId, tokData]: [string, any]) => {
            const matchesSlug = tokData.wikiSlug && tokData.wikiSlug === entrySlug;
            const matchesName = !tokData.wikiSlug && tokData.name && tokData.name.trim().toLowerCase() === entryName;
            if (matchesSlug || matchesName) {
              updateTokenProps(tokId, {
                armas: data.armas,
                poderes: data.poderes,
                pocoes: data.pocoes,
                maldicoes: data.maldicoes,
                objetos_campanha: data.objetos_campanha,
                inventario: data.inventario
              });
            }
          });
        }

        successCount++;
      } catch (err) {
        console.error("Erro ao distribuir loot para personagem:", err);
      }
    }

    if (successCount > 0) {
      const itemsList = quest.loot.map(i => `<b>${i.name}</b> (x${i.quantidade || 1})`).join(', ');
      pushChatMessage(`🎁 <b>Loot de Missão Concedido!</b> O mestre distribuiu as recompensas da missão <i>"${quest.name}"</i> (${itemsList}) para os personagens participantes.`, false, false);
      
      const quests = selectedCampaign.quests || [];
      const updatedQuests = quests.map(q => {
        if (q.id === questId) {
          return {
            ...q,
            status: 'completed' as const,
            loot: [] // clear loot pool after distribution!
          };
        }
        return q;
      });
      upd({ quests: updatedQuests });

      alert(`Loot distribuído com sucesso para ${successCount} personagem(ns)! A missão foi marcada como Concluída.`);
      setSelectedDistributeTargets([]);
      setEditingQuestId(null);
    } else {
      alert("Nenhum personagem pôde receber o loot. Tente novamente.");
    }
    setIsDistributing(false);
  };

  const PRESET_GRADIENTS = [
    { name: 'Pôr do Sol', css: 'linear-gradient(135deg, #f53b57, #3c40c6)' },
    { name: 'Roxo Mágico', css: 'linear-gradient(135deg, #a855f7, #6366f1)' },
    { name: 'Verde Neon', css: 'linear-gradient(135deg, #10b981, #059669)' },
    { name: 'Oceano Profundo', css: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
    { name: 'Dragão de Fogo', css: 'linear-gradient(135deg, #f97316, #ef4444)' },
    { name: 'Portão Dourado', css: 'linear-gradient(135deg, #eab308, #d97706)' },
    { name: 'Crepúsculo', css: 'linear-gradient(135deg, #64748b, #334155)' }
  ];

    // Render body
    if (!selectedCampaign) return null;

    const quests = selectedCampaign.quests || [];
    const filteredQuests = quests.filter(q => {
      const statusMatch = questStatusFilter === 'all' || q.status === questStatusFilter;
      const typeMatch = questTypeFilter === 'all' || q.type === questTypeFilter;
      return statusMatch && typeMatch;
    });

    const activeQuest = quests.find(q => q.id === editingQuestId);

    const categorizedWiki = (() => {
      if (!wikiIndex) return {};
      const groups: { [key: string]: { name: string; path: string }[] } = {};
      wikiIndex.forEach(item => {
        if (item.path.includes('_modelo')) return;
        const parts = item.path.split('/');
        let category = 'Geral';
        if (parts.length > 2) {
          category = parts[parts.length - 2];
        } else if (parts.length > 1) {
          category = parts[0];
        }
        if (!groups[category]) groups[category] = [];
        groups[category].push({
          name: item.metadata?.nome || item.metadata?.titulo || item.slug || 'Sem nome',
          path: item.path
        });
      });
      return groups;
    })();

    const pcCharacters = getPCCharacters();

    return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', animation: 'fadeIn 0.25s ease-out' }}>
        
        {/* Top Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(15,23,42,0.4)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['all', 'active', 'completed', 'failed', 'abandoned'] as const).map(st => {
                const label = st === 'all' ? 'Todas' : st === 'active' ? 'Ativas' : st === 'completed' ? 'Concluídas' : st === 'failed' ? 'Fracassadas' : 'Abandonadas';
                const count = st === 'all' ? quests.length : quests.filter(q => q.status === st).length;
                const isActive = questStatusFilter === st;
                return (
                  <button
                    key={st}
                    onClick={() => setQuestStatusFilter(st)}
                    style={{
                      padding: '4px 10px', border: 'none', background: isActive ? 'rgba(168,85,247,0.15)' : 'transparent',
                      color: isActive ? '#c084fc' : 'rgba(148,163,184,0.6)', borderRadius: '6px', fontSize: '0.7rem',
                      fontWeight: 700, fontFamily: 'var(--font-display)', cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '4px', background: 'rgba(15,23,42,0.4)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['all', 'main', 'side'] as const).map(t => {
                const label = t === 'all' ? 'Todos Tipos' : t === 'main' ? 'Principais' : 'Secundárias';
                const isActive = questTypeFilter === t;
                return (
                  <button
                    key={t}
                    onClick={() => setQuestTypeFilter(t)}
                    style={{
                      padding: '4px 10px', border: 'none', background: isActive ? 'rgba(56,189,248,0.15)' : 'transparent',
                      color: isActive ? '#7dd3fc' : 'rgba(148,163,184,0.6)', borderRadius: '6px', fontSize: '0.7rem',
                      fontWeight: 700, fontFamily: 'var(--font-display)', cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="cm-action-btn" onClick={() => addQuest('main')}>
              <Plus size={12} /> Principal
            </button>
            <button className="cm-action-btn" style={{ background: 'rgba(56,189,248,0.15)', color: '#7dd3fc', borderColor: 'rgba(56,189,248,0.3)' }} onClick={() => addQuest('side')}>
              <Plus size={12} /> Secundária
            </button>
          </div>
        </div>

        {/* Core Layout */}
        <div style={{ display: 'flex', gap: '14px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          
          {/* LEFT SIDEBAR / FULL GRID */}
          <div style={{
            flex: activeQuest ? '0 0 280px' : '1 1 auto',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            paddingRight: '4px'
          }}>
            {activeQuest && (
              <button
                className="cm-action-btn"
                style={{
                  width: '100%', justifyContent: 'center', marginBottom: '4px',
                  background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', borderColor: 'rgba(255,255,255,0.1)'
                }}
                onClick={() => setEditingQuestId(null)}
              >
                Voltar para Galeria
              </button>
            )}

            {filteredQuests.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: activeQuest ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '12px'
              }}>
                {filteredQuests.map(q => {
                  const isSelected = activeQuest?.id === q.id;
                  const statusConf = STATUS_CONFIG.quest[q.status] || STATUS_CONFIG.quest.active;
                  
                  const coverStyle: React.CSSProperties = {
                    height: '80px',
                    position: 'relative',
                    borderRadius: '10px 10px 0 0',
                    overflow: 'hidden',
                  };
                  if (q.coverUrl && q.coverUrl.startsWith('linear-gradient')) {
                    coverStyle.background = q.coverUrl;
                  } else if (q.coverUrl) {
                    coverStyle.backgroundImage = `url(${q.coverUrl})`;
                    coverStyle.backgroundSize = 'cover';
                    coverStyle.backgroundPosition = 'center';
                  } else {
                    coverStyle.background = 'linear-gradient(135deg, #1e293b, #0f172a)';
                  }

                  return (
                    <div
                      key={q.id}
                      className={`cm-quest-card ${isSelected ? 'selected' : ''}`}
                      style={{
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer'
                      }}
                      onClick={() => setEditingQuestId(q.id)}
                    >
                      <div style={coverStyle}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} />
                        <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '4px' }}>
                          <span style={{
                            fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
                            padding: '2px 6px', borderRadius: '4px',
                            background: q.type === 'main' ? 'rgba(234,179,8,0.85)' : 'rgba(56,189,248,0.85)',
                            color: '#000', fontFamily: 'var(--font-display)'
                          }}>
                            {q.type === 'main' ? 'Principal' : 'Secundária'}
                          </span>
                        </div>
                        <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                          <span style={{
                            fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
                            padding: '2px 6px', borderRadius: '4px',
                            background: statusConf.bg, border: `1px solid ${statusConf.border}`,
                            color: statusConf.color, fontFamily: 'var(--font-display)'
                          }}>
                            {statusConf.label}
                          </span>
                        </div>
                      </div>

                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {q.name}
                          </h4>
                          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                            <button
                              className="cm-action-btn"
                              style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                              onClick={e => { e.stopPropagation(); setEditingQuestId(q.id); }}
                            >
                              <Edit3 size={11} /> Editar
                            </button>
                            <button
                              className="cm-danger-btn"
                              style={{ padding: '2px' }}
                              onClick={e => { e.stopPropagation(); deleteQuest(q.id); if (isSelected) setEditingQuestId(null); }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                        
                        <p style={{
                          margin: 0, fontSize: '0.72rem', color: 'rgba(148,163,184,0.6)',
                          minHeight: '2.4em', overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.2em'
                        }}>
                          {q.description || 'Nenhuma descrição inserida ainda.'}
                        </p>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', fontSize: '0.65rem', color: 'rgba(148,163,184,0.5)' }}>
                          {q.loot && q.loot.length > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#fbbf24' }}>
                              <Award size={10} /> {q.loot.length} Loot
                            </span>
                          )}
                          {q.wikiLinks && q.wikiLinks.length > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#38bdf8' }}>
                              <BookOpen size={10} /> {q.wikiLinks.length} Links
                            </span>
                          )}
                          {q.filePath && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10b981', marginLeft: 'auto' }}>
                              <FileText size={10} /> Wiki
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<Target size={36} />}
                message="Nenhuma missão encontrada."
                sub="Use os botões no topo para registrar uma missão principal ou secundária."
              />
            )}
          </div>

          {/* RIGHT COLUMN */}
          {activeQuest && (
            <div style={{
              flex: 1,
              background: 'rgba(15,23,42,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: activeQuest.type === 'main' ? '#facc15' : '#38bdf8', fontFamily: 'var(--font-display)' }}>
                  Editar Missão {activeQuest.type === 'main' ? 'Principal' : 'Secundária'}
                </span>
                <input
                  className="cm-input"
                  style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: '4px' }}
                  value={activeQuest.name}
                  onChange={e => updateQuest(activeQuest.id, { name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Status da Missão
                  </label>
                  <select
                    className="cm-select"
                    style={{ width: '100%', padding: '8px' }}
                    value={activeQuest.status}
                    onChange={e => updateQuest(activeQuest.id, { status: e.target.value as CampaignQuest['status'] })}
                  >
                    <option value="active">Ativa</option>
                    <option value="completed">Concluída</option>
                    <option value="failed">Fracassada</option>
                    <option value="abandoned">Abandonada</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Tipo de Missão
                  </label>
                  <select
                    className="cm-select"
                    style={{ width: '100%', padding: '8px' }}
                    value={activeQuest.type}
                    onChange={e => updateQuest(activeQuest.id, { type: e.target.value as CampaignQuest['type'] })}
                  >
                    <option value="main">Principal</option>
                    <option value="side">Secundária</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Arquivo Físico na Wiki (.md)
                </label>
                {activeQuest.filePath ? (
                  <div className="cm-wiki-file-bar">
                    <FileText size={12} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                      {activeQuest.filePath}
                    </span>
                    <button className="cm-wiki-btn" onClick={() => openInWiki(activeQuest.filePath!)}>
                      <ExternalLink size={10} /> Abrir Wiki
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.15)', fontSize: '0.72rem', color: '#f59e0b'
                  }}>
                    <span>Sem arquivo markdown criado.</span>
                    <button
                      className="cm-link-btn"
                      disabled={linkingId === activeQuest.id}
                      onClick={() => linkQuestToWiki(activeQuest)}
                    >
                      <Link2 size={10} /> {linkingId === activeQuest.id ? 'Criando...' : 'Criar e Vincular'}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Capa / Organização Visual (URL ou Preset Gradiente)
                </label>
                <div
                  style={{
                    position: 'relative',
                    border: '1px dashed rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    padding: '8px',
                    marginBottom: '8px',
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new window.Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let { width, height } = img;
                        const maxSize = 800;
                        if (width > height && width > maxSize) {
                          height *= maxSize / width;
                          width = maxSize;
                        } else if (height > maxSize) {
                          width *= maxSize / height;
                          height = maxSize;
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);
                        updateQuest(activeQuest.id, { coverUrl: canvas.toDataURL('image/webp', 0.8) });
                      };
                      img.src = event.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                  }}
                >
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.7rem' }}>
                    <Image size={12} /> Imagem
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const img = new window.Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let { width, height } = img;
                            const maxSize = 800;
                            if (width > height && width > maxSize) {
                              height *= maxSize / width;
                              width = maxSize;
                            } else if (height > maxSize) {
                              width *= maxSize / height;
                              height = maxSize;
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            updateQuest(activeQuest.id, { coverUrl: canvas.toDataURL('image/webp', 0.8) });
                          };
                          img.src = event.target?.result as string;
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <input
                    className="cm-input"
                    placeholder="Ou insira URL da imagem..."
                    value={activeQuest.coverUrl && !activeQuest.coverUrl.startsWith('linear-gradient') && !activeQuest.coverUrl.startsWith('data:') ? activeQuest.coverUrl : ''}
                    onChange={e => updateQuest(activeQuest.id, { coverUrl: e.target.value })}
                    style={{ flex: 1, margin: 0, border: 'none', background: 'transparent', padding: '4px' }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.5)', marginRight: '4px' }}>Presets:</span>
                  {PRESET_GRADIENTS.map(grad => {
                    const isSelected = activeQuest.coverUrl === grad.css;
                    return (
                      <button
                        key={grad.name}
                        className="cm-quest-preset-btn"
                        style={{
                          background: grad.css,
                          border: isSelected ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.2)',
                          boxShadow: isSelected ? '0 0 6px #a855f7' : 'none'
                        }}
                        title={grad.name}
                        onClick={() => updateQuest(activeQuest.id, { coverUrl: grad.css })}
                      />
                    );
                  })}
                  <button
                    className="cm-action-btn"
                    style={{ fontSize: '0.62rem', padding: '2px 8px', height: '24px', background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}
                    onClick={() => updateQuest(activeQuest.id, { coverUrl: undefined })}
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Descrição / Detalhes da Missão
                </label>
                <WikiLinkedTextarea
                  key={`quest-desc-${activeQuest.id}-${activeQuest.filePath}`}
                  filePath={activeQuest.filePath}
                  fallbackValue={activeQuest.description}
                  onFallbackChange={val => updateQuest(activeQuest.id, { description: val })}
                  placeholder="Escreva a descrição geral da missão, ganchos e objetivos..."
                  minHeight="120px"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase' }}>
                    Entidades Vinculadas (Locais, NPCs, Pistas)
                  </label>
                </div>
                
                <select
                  className="cm-select"
                  style={{ width: '100%', fontSize: '0.78rem' }}
                  value=""
                  onChange={e => {
                    if (e.target.value) {
                      handleLinkWikiToQuest(activeQuest.id, e.target.value);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">-- Vincular Entidade da Wiki --</option>
                  {Object.entries(categorizedWiki).map(([category, items]) => (
                    <optgroup key={category} label={category}>
                      {items.map(item => (
                        <option key={item.path} value={item.path}>{item.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {(activeQuest.wikiLinks || []).length > 0 ? (
                    (activeQuest.wikiLinks || []).map(path => {
                      const entry = wikiIndex?.find(e => e.path === path);
                      const name = entry?.metadata?.nome || entry?.metadata?.titulo || entry?.slug || path.split('/').pop()?.replace('.md', '') || 'Link';
                      return (
                        <div key={path} style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '4px 8px', borderRadius: '6px', background: 'rgba(56,189,248,0.06)',
                          border: '1px solid rgba(56,189,248,0.15)', fontSize: '0.72rem'
                        }}>
                          <span
                            style={{ color: '#7dd3fc', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => openInWiki(path)}
                          >
                            <BookOpen size={10} /> {name}
                          </span>
                          <button
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                            onClick={() => handleUnlinkWikiFromQuest(activeQuest.id, path)}
                            title="Desvincular"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.4)', fontStyle: 'italic' }}>Nenhuma entidade wiki vinculada.</span>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={14} color="#fbbf24" />
                  <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
                    Pool de Loot / Recompensas
                  </h4>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.15)', borderRadius: '999px', padding: '1px 6px' }}>
                    {activeQuest.loot?.length || 0}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeQuest.loot && activeQuest.loot.length > 0 ? (
                    activeQuest.loot.map(item => {
                      const colors = {
                        arma: { text: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', label: 'Arma/Equip.' },
                        poder: { text: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)', label: 'Poder' },
                        pocao: { text: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label: 'Poção/Consum.' },
                        maldicao: { text: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'Maldição' },
                        objeto_campanha: { text: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', label: 'Campanha' }
                      }[item.type] || { text: '#cbd5e1', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', label: 'Item' };

                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: '8px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`,
                            background: colors.bg, display: 'flex', flexDirection: 'column', gap: '3px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>
                                {item.name} {item.quantidade && item.quantidade > 1 ? `(x${item.quantidade})` : ''}
                              </span>
                              <span style={{
                                fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', padding: '1px 5px', borderRadius: '4px',
                                border: `1px solid ${colors.border}`, color: colors.text, background: 'rgba(0,0,0,0.15)', fontFamily: 'var(--font-display)'
                              }}>
                                {colors.label}
                              </span>
                            </div>
                            <button
                              className="cm-danger-btn"
                              style={{ padding: '2px' }}
                              onClick={() => handleRemoveLootItem(activeQuest.id, item.id)}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                          
                          {item.efeito && (
                            <div style={{ fontSize: '0.68rem', color: colors.text, fontWeight: 600 }}>
                              Efeito: {item.efeito}
                            </div>
                          )}
                          {item.description && (
                            <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.6)' }}>
                              {item.description}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{
                      padding: '16px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px',
                      textAlign: 'center', fontSize: '0.72rem', color: 'rgba(148,163,184,0.4)', fontStyle: 'italic'
                    }}>
                      Nenhum item adicionado ao loot desta missão.
                    </div>
                  )}
                </div>

                <div style={{
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                    Adicionar Item ao Loot
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px' }}>
                    <input
                      className="cm-input"
                      style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                      placeholder="Nome do item..."
                      value={newLootName}
                      onChange={e => setNewLootName(e.target.value)}
                    />
                    <select
                      className="cm-select"
                      style={{ fontSize: '0.72rem', padding: '4px' }}
                      value={newLootType}
                      onChange={e => setNewLootType(e.target.value as any)}
                    >
                      <option value="pocao">Poção/Consumível</option>
                      <option value="arma">Arma/Equipamento</option>
                      <option value="poder">Poder/Habilidade</option>
                      <option value="maldicao">Maldição</option>
                      <option value="objeto_campanha">Item de Campanha</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.7)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', padding: '0 6px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'rgba(148,163,184,0.4)', fontWeight: 'bold' }}>Qtd:</span>
                      <input
                        type="number"
                        min={1}
                        style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.75rem', outline: 'none', width: '100%', padding: '4px 0' }}
                        value={newLootQuantity}
                        onChange={e => setNewLootQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <input
                      className="cm-input"
                      style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                      placeholder="Efeito (Ex: +2 DEF, 1d8 fogo)..."
                      value={newLootEfeito}
                      onChange={e => setNewLootEfeito(e.target.value)}
                    />
                  </div>

                  <input
                    className="cm-input"
                    style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                    placeholder="Descrição do item (Opcional)..."
                    value={newLootDescription}
                    onChange={e => setNewLootDescription(e.target.value)}
                  />

                  <button
                    className="cm-action-btn"
                    style={{
                      width: '100%', justifyContent: 'center', fontSize: '0.72rem', padding: '6px',
                      background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)'
                    }}
                    onClick={() => handleAddLootItem(activeQuest.id)}
                  >
                    Adicionar Item
                  </button>
                </div>

                {activeQuest.loot && activeQuest.loot.length > 0 && (
                  <div style={{
                    borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '12px',
                    display: 'flex', flexDirection: 'column', gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} color="#a855f7" />
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f1f5f9', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
                        Distribuir Loot entre Jogadores (PCs)
                      </span>
                    </div>

                    {pcCharacters.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="cm-action-btn"
                            style={{ fontSize: '0.62rem', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}
                            onClick={() => setSelectedDistributeTargets(pcCharacters.map(p => p.path))}
                          >
                            Selecionar Todos
                          </button>
                          <button
                            className="cm-action-btn"
                            style={{ fontSize: '0.62rem', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}
                            onClick={() => setSelectedDistributeTargets([])}
                          >
                            Limpar Seleção
                          </button>
                        </div>

                        <div style={{
                          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                          gap: '6px', maxHeight: '150px', overflowY: 'auto',
                          background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '6px',
                          border: '1px solid rgba(255,255,255,0.04)'
                        }}>
                          {pcCharacters.map(pc => {
                            const isChecked = selectedDistributeTargets.includes(pc.path);
                            const togglePC = () => {
                              if (isChecked) {
                                setSelectedDistributeTargets(selectedDistributeTargets.filter(p => p !== pc.path));
                              } else {
                                setSelectedDistributeTargets([...selectedDistributeTargets, pc.path]);
                              }
                            };

                            return (
                              <div
                                key={pc.path}
                                onClick={togglePC}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px',
                                  borderRadius: '6px', background: isChecked ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
                                  border: `1px solid ${isChecked ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.04)'}`,
                                  cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                <div style={{
                                  width: '12px', height: '12px', borderRadius: '3px',
                                  border: `1px solid ${isChecked ? '#a855f7' : 'rgba(255,255,255,0.3)'}`,
                                  background: isChecked ? '#a855f7' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                  {isChecked && <span style={{ color: '#000', fontSize: '8px', fontWeight: 'bold' }}>✓</span>}
                                </div>

                                <img
                                  src={pc.avatar}
                                  alt={pc.name}
                                  style={{
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    objectFit: 'cover', background: 'rgba(255,255,255,0.1)'
                                  }}
                                  onError={e => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                                />

                                <span style={{
                                  fontSize: '0.68rem', fontWeight: 600, color: isChecked ? '#c084fc' : 'rgba(148,163,184,0.7)',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                  {pc.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          className="cm-action-btn"
                          disabled={isDistributing || selectedDistributeTargets.length === 0}
                          style={{
                            width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.78rem',
                            background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)'
                          }}
                          onClick={() => handleDistributeLoot(activeQuest.id)}
                        >
                          <Award size={13} /> {isDistributing ? 'Distribuindo...' : 'Confirmar & Distribuir Recompensas'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.4)', fontStyle: 'italic' }}>
                        Nenhum personagem jogador (PC) encontrado na wiki para distribuir.
                      </span>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    );
  
};
