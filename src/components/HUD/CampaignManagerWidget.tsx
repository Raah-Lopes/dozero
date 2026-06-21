import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';
import {
  state,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  updateTokenProps,
  pushChatMessage,
} from '../../store';
import type { CampaignData, CampaignArc, CampaignSession, CampaignQuest, QuestLootItem } from '../../store';
import {
  saveMarkdownContent,
  loadMarkdownFile,
  ensureWikiFolder,
} from '../../utils/githubApi';
import { getWikiConfig } from '../../store';
import {
  BookOpen, Plus, Target, Calendar, Trash2,
  Play, CheckCircle, PauseCircle, ChevronRight,
  Scroll, Sparkles, Clock, Edit3, Save, Flag,
  Circle, Layers, ExternalLink, Link2, AlertTriangle,
  FileText, Award, Users, Image, Search, CheckSquare,
  PlusCircle, MinusCircle
} from 'lucide-react';
import { useWiki } from '../../hooks/useWiki';
import * as yaml from 'js-yaml';

interface CampaignManagerWidgetProps {
  onClose: () => void;
}

type TabId = 'overview' | 'arcs' | 'sessions' | 'quests';

// ─── Utilities ────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function getCampaignFolderPath(campaignName: string): string {
  return `Campanhas/${slugify(campaignName)}`;
}

function getOverviewFilePath(campaignName: string): string {
  return `${getCampaignFolderPath(campaignName)}/_campanha.md`;
}

function getArcFilePath(campaignName: string, arcName: string): string {
  return `${getCampaignFolderPath(campaignName)}/Arcos/${slugify(arcName)}.md`;
}

function getSessionFilePath(campaignName: string, sessionDate: string, sessionNumber: number): string {
  const num = String(sessionNumber).padStart(2, '0');
  return `${getCampaignFolderPath(campaignName)}/Sessoes/${sessionDate}_Sessao-${num}.md`;
}

function openInWiki(filePath: string) {
  window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { filePath } }));
}

// ─── Markdown Templates ───────────────────────────────────────────────────────

function overviewTemplate(name: string): string {
  return `# ${name}\n\n## Sinopse\nEscreva a premissa e o tom da campanha aqui.\n\n## Objetivos\n- \n\n## NPCs Principais\n- \n\n## Notas do Mestre\n`;
}

function arcTemplate(name: string): string {
  return `# ${name}\n\n## Objetivos do Arco\n- \n\n## NPCs Chave\n- \n\n## Fios Narrativos\n- \n\n## Notas\n`;
}

function sessionTemplate(date: string, num: number): string {
  const d = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
  return `# Sessão ${String(num).padStart(2, '0')} — ${d}\n\n## O que Aconteceu\nResumo dos eventos principais.\n\n## Decisões dos Jogadores\n- \n\n## Consequências & Ganchos\n- \n\n## Notas do Mestre\n`;
}

function questTemplate(name: string, type: 'main' | 'side'): string {
  return `# 📜 Missão ${type === 'main' ? 'Principal' : 'Secundária'}: ${name}\n\n## Descrição da Missão\nEscreva os detalhes e objetivos da missão aqui.\n\n## Objetivos\n- [ ] Objetivo 1\n- [ ] Objetivo 2\n\n## Recompensas / Loot planejado\n- \n\n## Personagens & Locais Relevantes\n- \n\n## Notas de Progresso\n`;
}

// ─── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  campaign: {
    active:    { label: 'Ativa',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  icon: Play },
    hiatus:    { label: 'Em Hiato',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: PauseCircle },
    completed: { label: 'Concluída', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', icon: CheckCircle },
  },
  arc: {
    planned:   { label: 'Planejado', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)' },
    active:    { label: 'Ativo',     color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)'  },
    completed: { label: 'Concluído', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)' },
  },
  session: {
    upcoming:  { label: 'Agendada',  color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.3)' },
    completed: { label: 'Realizada', color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.3)'  },
  },
  quest: {
    active:    { label: 'Ativa',     color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)', icon: Play },
    completed: { label: 'Concluída', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  icon: CheckCircle },
    failed:    { label: 'Fracassada', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  icon: AlertTriangle },
    abandoned: { label: 'Abandonada', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', icon: PauseCircle },
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge: React.FC<{ label: string; color: string; bg: string; border: string }> = ({ label, color, bg, border }) => (
  <span style={{
    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    color, background: bg, border: `1px solid ${border}`, borderRadius: '999px',
    padding: '2px 10px', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)',
  }}>
    {label}
  </span>
);

const LegacyBadge: React.FC = () => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
    color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: '999px', padding: '2px 8px', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)',
  }}>
    <AlertTriangle size={9} />
    Sem arquivo
  </span>
);

const EmptyState: React.FC<{ icon: React.ReactNode; message: string; sub?: string }> = ({ icon, message, sub }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '0.75rem', padding: '3rem 1rem', color: 'rgba(148,163,184,0.5)',
    border: '1px dashed rgba(148,163,184,0.2)', borderRadius: '12px', textAlign: 'center'
  }}>
    <div style={{ opacity: 0.4, transform: 'scale(1.4)' }}>{icon}</div>
    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(148,163,184,0.7)', margin: 0 }}>{message}</p>
    {sub && <p style={{ fontSize: '0.75rem', margin: 0 }}>{sub}</p>}
  </div>
);

// ─── WikiLinkedTextarea ────────────────────────────────────────────────────────
// A textarea that loads content from a .md file (filePath) and auto-saves back to it.
// If filePath is null/undefined, falls back to simple controlled value/onChange.

interface WikiLinkedTextareaProps {
  filePath?: string;
  fallbackValue?: string;
  onFallbackChange?: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
  autoFocus?: boolean;
}

const WikiLinkedTextarea: React.FC<WikiLinkedTextareaProps> = ({
  filePath, fallbackValue, onFallbackChange, placeholder, minHeight = '100px', autoFocus = false,
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Load from file when filePath becomes available
  useEffect(() => {
    mountedRef.current = true;
    if (!filePath) {
      setContent(fallbackValue ?? '');
      return;
    }
    setLoading(true);
    loadMarkdownFile(filePath)
      .then(text => {
        if (mountedRef.current) setContent(text ?? '');
      })
      .catch(() => { if (mountedRef.current) setContent(''); })
      .finally(() => { if (mountedRef.current) setLoading(false); });
    return () => { mountedRef.current = false; };
  }, [filePath]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    if (filePath) {
      // Auto-save to .md file
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        setSaving(true);
        try {
          await saveMarkdownContent(filePath, val);
        } finally {
          setSaving(false);
        }
      }, 1000);
    } else {
      // Fallback: update parent directly
      onFallbackChange?.(val);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight, borderRadius: '10px', background: 'rgba(15,23,42,0.4)',
        border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '8px', color: 'rgba(148,163,184,0.5)', fontSize: '0.8rem',
      }}>
        <FileText size={14} style={{ opacity: 0.4 }} /> Carregando...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        className="cm-textarea"
        style={{ minHeight }}
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {saving && (
        <span style={{
          position: 'absolute', bottom: '8px', right: '10px',
          fontSize: '0.65rem', color: 'rgba(148,163,184,0.5)',
          fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
        }}>
          salvando...
        </span>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const CampaignManagerWidget: React.FC<CampaignManagerWidgetProps> = ({ onClose }) => {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [editingArcId, setEditingArcId] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null); // tracks which item is being linked
  const contentRef = useRef<HTMLDivElement>(null);

  // useWiki index for linking files and resolving PC characters
  const { index: wikiIndex } = useWiki();

  // Quests States
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

  useEffect(() => {
    const sync = () => {
      const list = Array.from(state.campaigns.values()) as CampaignData[];
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCampaigns(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
      else if (list.length === 0) setSelectedId(null);
    };
    sync();
    state.campaigns.observe(sync);
    return () => state.campaigns.unobserve(sync);
  }, [selectedId]);

  // Scroll to top when switching tabs
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeTab, selectedId]);

  const selectedCampaign = campaigns.find(c => c.id === selectedId);

  // ── Campaign creation ────────────────────────────────────────────────────────

  const handleAddCampaign = async () => {
    const name = 'Nova Campanha';
    const folderPath = getCampaignFolderPath(name);
    const overviewPath = getOverviewFilePath(name);

    // Create in Yjs first to get the ID
    const id = `campaign_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    state.campaigns.set(id, {
      id, name, description: '', status: 'active', arcs: [], sessions: [],
      folderPath, overviewPath,
    });

    // Then create files on disk in the background
    try {
      const config = getWikiConfig();
      if (config.repoUrl) {
        await ensureWikiFolder(folderPath);
        await ensureWikiFolder(`${folderPath}/Arcos`);
        await ensureWikiFolder(`${folderPath}/Sessoes`);
        await saveMarkdownContent(overviewPath, overviewTemplate(name));
      }
    } catch (e) {
      console.warn('[Campaign] Não foi possível criar arquivos wiki:', e);
    }
  };

  const upd = (updates: Partial<CampaignData>) => {
    if (selectedId) updateCampaign(selectedId, updates);
  };

  // ── Link legacy campaign to wiki ─────────────────────────────────────────────

  const linkCampaignToWiki = async (campaign: CampaignData) => {
    if (linkingId) return;
    setLinkingId(campaign.id);
    try {
      const folderPath = getCampaignFolderPath(campaign.name);
      const overviewPath = getOverviewFilePath(campaign.name);
      const config = getWikiConfig();
      if (config.repoUrl) {
        await ensureWikiFolder(folderPath);
        await ensureWikiFolder(`${folderPath}/Arcos`);
        await ensureWikiFolder(`${folderPath}/Sessoes`);
        // Only create overview if it doesn't exist
        const existing = await loadMarkdownFile(overviewPath);
        if (!existing) {
          await saveMarkdownContent(overviewPath, overviewTemplate(campaign.name));
        }
      }
      updateCampaign(campaign.id, { folderPath, overviewPath });
    } finally {
      setLinkingId(null);
    }
  };

  // ── Arcs ─────────────────────────────────────────────────────────────────────

  const addArc = async () => {
    if (!selectedCampaign) return;
    const name = 'Novo Arco';
    const filePath = selectedCampaign.folderPath
      ? getArcFilePath(selectedCampaign.name, name)
      : undefined;

    const newArc: CampaignArc = {
      id: `arc_${Date.now()}`,
      name,
      description: '',
      status: 'planned',
      filePath,
    };
    upd({ arcs: [...selectedCampaign.arcs, newArc] });
    setEditingArcId(newArc.id);

    if (filePath) {
      try {
        await saveMarkdownContent(filePath, arcTemplate(name));
      } catch (e) {
        console.warn('[Arc] Não foi possível criar arquivo wiki:', e);
      }
    }
  };

  const updateArc = (arcId: string, changes: Partial<CampaignArc>) => {
    if (!selectedCampaign) return;
    upd({ arcs: selectedCampaign.arcs.map(a => a.id === arcId ? { ...a, ...changes } : a) });
  };

  const deleteArc = (arcId: string) => {
    if (!selectedCampaign || !confirm('Remover este arco narrativo?')) return;
    upd({ arcs: selectedCampaign.arcs.filter(a => a.id !== arcId) });
  };

  const linkArcToWiki = async (arc: CampaignArc) => {
    if (!selectedCampaign || linkingId) return;
    setLinkingId(arc.id);
    try {
      const filePath = getArcFilePath(selectedCampaign.name, arc.name);
      const existing = await loadMarkdownFile(filePath);
      if (!existing) {
        await saveMarkdownContent(filePath, arcTemplate(arc.name));
      }
      updateArc(arc.id, { filePath });
    } finally {
      setLinkingId(null);
    }
  };

  // ── Sessions ──────────────────────────────────────────────────────────────────

  const addSession = async () => {
    if (!selectedCampaign) return;
    const date = new Date().toISOString().split('T')[0];
    const sessNum = (selectedCampaign.sessions?.length ?? 0) + 1;
    const filePath = selectedCampaign.folderPath
      ? getSessionFilePath(selectedCampaign.name, date, sessNum)
      : undefined;

    const newSess: CampaignSession = {
      id: `sess_${Date.now()}`,
      date,
      summary: '',
      status: 'upcoming',
      filePath,
    };
    upd({ sessions: [newSess, ...selectedCampaign.sessions] });
    setExpandedSession(newSess.id);

    if (filePath) {
      try {
        await saveMarkdownContent(filePath, sessionTemplate(date, sessNum));
      } catch (e) {
        console.warn('[Session] Não foi possível criar arquivo wiki:', e);
      }
    }
  };

  const updateSession = (sessId: string, changes: Partial<CampaignSession>) => {
    if (!selectedCampaign) return;
    upd({ sessions: selectedCampaign.sessions.map(s => s.id === sessId ? { ...s, ...changes } : s) });
  };

  const deleteSession = (sessId: string) => {
    if (!selectedCampaign || !confirm('Remover esta sessão?')) return;
    upd({ sessions: selectedCampaign.sessions.filter(s => s.id !== sessId) });
  };

  const linkSessionToWiki = async (sess: CampaignSession, sessNum: number) => {
    if (!selectedCampaign || linkingId) return;
    setLinkingId(sess.id);
    try {
      const filePath = getSessionFilePath(selectedCampaign.name, sess.date, sessNum);
      const existing = await loadMarkdownFile(filePath);
      if (!existing) {
        await saveMarkdownContent(filePath, sessionTemplate(sess.date, sessNum));
      }
      updateSession(sess.id, { filePath });
    } finally {
      setLinkingId(null);
    }
  };

  const sortedSessions = selectedCampaign
    ? [...selectedCampaign.sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  // ── Quests Helpers ──────────────────────────────────────────────────────────

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

  const renderQuestsTab = () => {
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

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const css = `
    .cm-tab-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border: none; background: transparent;
      cursor: pointer; font-family: var(--font-display); font-size: 0.78rem;
      font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
      color: rgba(148,163,184,0.7); border-bottom: 2px solid transparent;
      transition: all 0.2s; white-space: nowrap;
    }
    .cm-tab-btn:hover { color: #e2e8f0; }
    .cm-tab-btn.active { color: #a855f7; border-bottom-color: #a855f7; }

    .cm-campaign-card {
      padding: 10px 12px; border-radius: 10px; cursor: pointer;
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.03);
      transition: all 0.2s; position: relative; overflow: hidden;
    }
    .cm-campaign-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(168,85,247,0.25); }
    .cm-campaign-card.selected { background: rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.5); }

    .cm-add-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      width: 100%; padding: 10px; border-radius: 10px;
      background: rgba(168,85,247,0.12); border: 1px dashed rgba(168,85,247,0.35);
      color: #a855f7; cursor: pointer; font-weight: 700; font-size: 0.8rem;
      font-family: var(--font-display); transition: all 0.2s;
    }
    .cm-add-btn:hover { background: rgba(168,85,247,0.22); border-color: rgba(168,85,247,0.6); transform: translateY(-1px); }

    .cm-action-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer;
      font-family: var(--font-display); font-size: 0.75rem; font-weight: 700;
      background: rgba(168,85,247,0.15); color: #c084fc;
      border: 1px solid rgba(168,85,247,0.3); transition: all 0.2s;
    }
    .cm-action-btn:hover { background: rgba(168,85,247,0.28); transform: translateY(-1px); }

    .cm-wiki-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 6px; border: none; cursor: pointer;
      font-family: var(--font-display); font-size: 0.68rem; font-weight: 700;
      background: rgba(56,189,248,0.1); color: #7dd3fc;
      border: 1px solid rgba(56,189,248,0.25); transition: all 0.2s;
    }
    .cm-wiki-btn:hover { background: rgba(56,189,248,0.2); border-color: rgba(56,189,248,0.5); }

    .cm-link-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 6px; border: none; cursor: pointer;
      font-family: var(--font-display); font-size: 0.68rem; font-weight: 700;
      background: rgba(245,158,11,0.1); color: #fbbf24;
      border: 1px solid rgba(245,158,11,0.25); transition: all 0.2s;
    }
    .cm-link-btn:hover { background: rgba(245,158,11,0.2); border-color: rgba(245,158,11,0.5); }
    .cm-link-btn:disabled { opacity: 0.5; cursor: default; }

    .cm-danger-btn {
      background: transparent; border: none; color: rgba(148,163,184,0.3);
      cursor: pointer; padding: 4px; border-radius: 6px; transition: all 0.2s;
      display: flex; align-items: center;
    }
    .cm-danger-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

    .cm-input {
      background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08);
      color: #f1f5f9; border-radius: 8px; padding: 8px 12px; font-size: 0.85rem;
      font-family: var(--font-body); outline: none; transition: border-color 0.2s;
      width: 100%;
    }
    .cm-input:focus { border-color: rgba(168,85,247,0.6); }

    .cm-textarea {
      background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.07);
      color: #cbd5e1; border-radius: 10px; padding: 12px; font-size: 0.85rem;
      font-family: var(--font-body); outline: none; resize: none; line-height: 1.65;
      transition: border-color 0.2s; width: 100%; box-sizing: border-box;
    }
    .cm-textarea:focus { border-color: rgba(168,85,247,0.5); }

    .cm-arc-card {
      background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px; padding: 14px 16px; transition: border-color 0.2s;
      position: relative;
    }
    .cm-arc-card:hover { border-color: rgba(168,85,247,0.25); }

    .cm-arc-step-dot {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 800; font-family: var(--font-display);
      border: 2px solid; transition: all 0.2s;
    }

    .cm-session-card {
      border-radius: 12px; border: 1px solid rgba(255,255,255,0.07);
      background: rgba(15,23,42,0.55); overflow: hidden; transition: all 0.2s;
    }
    .cm-session-card:hover { border-color: rgba(168,85,247,0.2); }

    .cm-session-header {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      cursor: pointer; transition: background 0.15s;
    }
    .cm-session-header:hover { background: rgba(255,255,255,0.03); }

    .cm-select {
      background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1);
      color: #f1f5f9; border-radius: 8px; padding: 6px 10px;
      font-family: var(--font-display); font-size: 0.78rem; font-weight: 700;
      outline: none; cursor: pointer;
    }

    .cm-wiki-file-bar {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px; border-radius: 8px; margin-bottom: 8px;
      background: rgba(56,189,248,0.06); border: 1px solid rgba(56,189,248,0.15);
      font-size: 0.72rem; color: rgba(125,211,252,0.8); font-family: var(--font-body);
    }

    .cm-quest-card {
      transition: all 0.2s; position: relative; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(15,23,42,0.4);
    }
    .cm-quest-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.5);
      border-color: rgba(168,85,247,0.3) !important;
      background: rgba(15,23,42,0.55);
    }
    .cm-quest-card.selected {
      border-color: rgba(168,85,247,0.6) !important;
      background: rgba(168,85,247,0.07) !important;
      box-shadow: 0 0 12px rgba(168,85,247,0.15);
    }

    .cm-loot-item-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 6px; border-radius: 4px; font-size: 0.65rem;
      background: rgba(255,255,255,0.05); color: #cbd5e1;
    }
    
    .cm-quest-preset-btn {
      width: 24px; height: 24px; border-radius: 4px; cursor: pointer; border: 1px solid rgba(255,255,255,0.2);
    }
    .cm-quest-preset-btn:hover {
      transform: scale(1.1);
    }
  `;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <DraggableWindow
      title="Gestor de Campanhas"
      id="campaign-manager-widget"
      onClose={onClose}
      width={980}
      height={640}
      initialX={Math.max(20, window.innerWidth / 2 - 490)}
      initialY={Math.max(20, window.innerHeight / 2 - 320)}
    >
      <style>{css}</style>

      <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px',
          padding: '12px', borderRight: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(2,6,23,0.5)', overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 2px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px' }}>
            <BookOpen size={14} color="#a855f7" />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.8)' }}>
              Campanhas
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, color: '#a855f7', background: 'rgba(168,85,247,0.15)', borderRadius: '999px', padding: '1px 7px' }}>
              {campaigns.length}
            </span>
          </div>

          {/* Campaign list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            {campaigns.map(c => {
              const stConf = STATUS_CONFIG.campaign[c.status] || STATUS_CONFIG.campaign.active;
              const Icon = stConf.icon;
              return (
                <div
                  key={c.id}
                  className={`cm-campaign-card${selectedId === c.id ? ' selected' : ''}`}
                  onClick={() => { setSelectedId(c.id); setActiveTab('overview'); }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                      background: `${stConf.bg}`, border: `1px solid ${stConf.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={14} color={stConf.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.82rem', fontWeight: 700, color: selectedId === c.id ? '#e2e8f0' : '#cbd5e1',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        fontFamily: 'var(--font-display)', margin: 0
                      }}>{c.name || 'Sem nome'}</p>
                      <p style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.6)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{c.arcs?.length || 0} arco{(c.arcs?.length || 0) !== 1 ? 's' : ''}</span>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span>{c.sessions?.length || 0} sessão/ões</span>
                      </p>
                      {!c.folderPath && (
                        <div style={{ marginTop: '4px' }}><LegacyBadge /></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {campaigns.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(148,163,184,0.4)', fontSize: '0.78rem', padding: '2rem 0.5rem' }}>
                <BookOpen size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                <p>Nenhuma campanha ainda.</p>
              </div>
            )}
          </div>

          {/* Add button */}
          <button className="cm-add-btn" onClick={handleAddCampaign}>
            <Plus size={14} /> Nova Campanha
          </button>
        </div>

        {/* ── Main Area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(2,6,23,0.3)' }}>

          {selectedCampaign ? (
            <>
              {/* ── Campaign Header ── */}
              <div style={{
                padding: '16px 20px 0',
                background: 'linear-gradient(180deg, rgba(168,85,247,0.07) 0%, transparent 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.06)'
              }}>
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Sparkles size={18} color="#a855f7" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      className="cm-input"
                      style={{
                        background: 'transparent', border: 'none', borderBottom: '1px solid transparent',
                        borderRadius: 0, padding: '0 0 2px',
                        fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)',
                        color: '#f8fafc', letterSpacing: '-0.02em', width: '100%',
                      }}
                      value={selectedCampaign.name}
                      onChange={e => upd({ name: e.target.value })}
                      placeholder="Nome da Campanha"
                      onFocus={e => (e.target.style.borderBottomColor = 'rgba(168,85,247,0.5)')}
                      onBlur={e => (e.target.style.borderBottomColor = 'transparent')}
                    />
                  </div>

                  {/* Status selector */}
                  <select
                    className="cm-select"
                    value={selectedCampaign.status}
                    onChange={e => upd({ status: e.target.value as CampaignData['status'] })}
                    style={{
                      color: STATUS_CONFIG.campaign[selectedCampaign.status]?.color || '#94a3b8',
                      borderColor: STATUS_CONFIG.campaign[selectedCampaign.status]?.border || 'rgba(255,255,255,0.1)',
                      background: STATUS_CONFIG.campaign[selectedCampaign.status]?.bg || 'rgba(15,23,42,0.8)',
                    }}
                  >
                    <option value="active">▶ Ativa</option>
                    <option value="hiatus">⏸ Em Hiato</option>
                    <option value="completed">✓ Concluída</option>
                  </select>

                  {/* Delete */}
                  <button
                    className="cm-danger-btn"
                    onClick={() => { if (confirm(`Excluir "${selectedCampaign.name}"?`)) deleteCampaign(selectedCampaign.id); }}
                    title="Excluir campanha"
                    style={{ marginLeft: '4px' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Stats strip */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  {[
                    { icon: <Layers size={12} />, label: 'Arcos', value: selectedCampaign.arcs?.length || 0 },
                    { icon: <Target size={12} />, label: 'Ativos', value: (selectedCampaign.arcs || []).filter(a => a.status === 'active').length, color: '#38bdf8' },
                    { icon: <Calendar size={12} />, label: 'Sessões', value: selectedCampaign.sessions?.length || 0 },
                    { icon: <CheckCircle size={12} />, label: 'Realizadas', value: (selectedCampaign.sessions || []).filter(s => s.status === 'completed').length, color: '#22c55e' },
                  ].map((stat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: stat.color || 'rgba(148,163,184,0.6)', fontSize: '0.72rem' }}>
                      {stat.icon}
                      <span style={{ color: stat.color || 'rgba(148,163,184,0.5)' }}>{stat.label}:</span>
                      <span style={{ fontWeight: 700, color: stat.color || '#94a3b8', fontFamily: 'var(--font-display)' }}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '-1px' }}>
                  {([
                    { id: 'overview' as TabId, label: 'Visão Geral', icon: <BookOpen size={12} /> },
                    { id: 'arcs'     as TabId, label: 'Arcos',        icon: <Layers size={12} /> },
                    { id: 'sessions' as TabId, label: 'Sessões',      icon: <Calendar size={12} /> },
                    { id: 'quests'   as TabId, label: 'Missões',      icon: <Scroll size={12} /> },
                  ]).map(tab => (
                    <button
                      key={tab.id}
                      className={`cm-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.icon}{tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Tab Content ── */}
              <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

                {/* ── OVERVIEW TAB ── */}
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease-out' }}>

                    {/* Legacy / link banner */}
                    {!selectedCampaign.folderPath && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: '10px',
                        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
                      }}>
                        <AlertTriangle size={14} color="#f59e0b" />
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(245,158,11,0.9)', flex: 1 }}>
                          Esta campanha não tem arquivos na wiki ainda.
                        </p>
                        <button
                          className="cm-link-btn"
                          disabled={linkingId === selectedCampaign.id}
                          onClick={() => linkCampaignToWiki(selectedCampaign)}
                        >
                          <Link2 size={10} />
                          {linkingId === selectedCampaign.id ? 'Vinculando...' : 'Vincular à Wiki'}
                        </button>
                      </div>
                    )}

                    {/* Wiki file indicator */}
                    {selectedCampaign.overviewPath && (
                      <div className="cm-wiki-file-bar">
                        <FileText size={12} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedCampaign.overviewPath}
                        </span>
                        <button
                          className="cm-wiki-btn"
                          onClick={() => openInWiki(selectedCampaign.overviewPath!)}
                          title="Abrir na Wiki com editor rico"
                        >
                          <ExternalLink size={10} /> Abrir na Wiki
                        </button>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.6)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                        Sinopse & Background
                      </label>
                      <WikiLinkedTextarea
                        key={`overview-${selectedCampaign.id}-${selectedCampaign.overviewPath}`}
                        filePath={selectedCampaign.overviewPath}
                        fallbackValue={selectedCampaign.description}
                        onFallbackChange={val => upd({ description: val })}
                        placeholder="Escreva o resumo, premissa, tom e metas desta campanha..."
                        minHeight="220px"
                      />
                    </div>

                    {/* Quick summary cards */}
                    {selectedCampaign.arcs && selectedCampaign.arcs.length > 0 && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.6)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                          Arcos em Andamento
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {selectedCampaign.arcs.filter(a => a.status === 'active').map(arc => (
                            <div key={arc.id} style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '8px 12px', background: 'rgba(56,189,248,0.07)',
                              border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px'
                            }}>
                              <Flag size={12} color="#38bdf8" />
                              <span style={{ fontSize: '0.82rem', color: '#7dd3fc', fontWeight: 600, flex: 1 }}>{arc.name}</span>
                              {arc.filePath && (
                                <button className="cm-wiki-btn" onClick={() => openInWiki(arc.filePath!)}>
                                  <ExternalLink size={10} /> Wiki
                                </button>
                              )}
                            </div>
                          ))}
                          {selectedCampaign.arcs.filter(a => a.status === 'active').length === 0 && (
                            <p style={{ fontSize: '0.78rem', color: 'rgba(148,163,184,0.4)', fontStyle: 'italic' }}>Nenhum arco ativo no momento.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Next session */}
                    {selectedCampaign.sessions && selectedCampaign.sessions.length > 0 && (() => {
                      const next = [...selectedCampaign.sessions]
                        .filter(s => s.status === 'upcoming')
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
                      return next ? (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.6)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                            Próxima Sessão
                          </label>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                            background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
                            borderRadius: '10px'
                          }}>
                            <Clock size={18} color="#f59e0b" />
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontWeight: 700, color: '#fcd34d', fontSize: '0.9rem' }}>
                                {new Date(next.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                              </p>
                              {next.summary && <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'rgba(148,163,184,0.7)' }}>{next.summary.substring(0, 120)}{next.summary.length > 120 ? '…' : ''}</p>}
                            </div>
                            {next.filePath && (
                              <button className="cm-wiki-btn" onClick={() => openInWiki(next.filePath!)}>
                                <ExternalLink size={10} /> Wiki
                              </button>
                            )}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* ── ARCS TAB ── */}
                {activeTab === 'arcs' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.25s ease-out' }}>
                    {/* Arc kanban header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {(['planned', 'active', 'completed'] as const).map(st => {
                          const conf = STATUS_CONFIG.arc[st];
                          const count = (selectedCampaign.arcs || []).filter(a => a.status === st).length;
                          return (
                            <Badge key={st} label={`${conf.label} (${count})`} color={conf.color} bg={conf.bg} border={conf.border} />
                          );
                        })}
                      </div>
                      <button className="cm-action-btn" onClick={addArc}>
                        <Plus size={12} /> Novo Arco
                      </button>
                    </div>

                    {/* Timeline */}
                    {(selectedCampaign.arcs || []).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                        {(selectedCampaign.arcs || []).map((arc, i) => {
                          const conf = STATUS_CONFIG.arc[arc.status];
                          const isEditing = editingArcId === arc.id;
                          const isLast = i === (selectedCampaign.arcs || []).length - 1;

                          return (
                            <div key={arc.id} style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                              {/* Timeline column */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30px', flexShrink: 0 }}>
                                <div
                                  className="cm-arc-step-dot"
                                  style={{ color: conf.color, borderColor: conf.border, background: conf.bg }}
                                >
                                  {arc.status === 'completed' ? <CheckCircle size={13} /> : arc.status === 'active' ? <Play size={11} /> : <Circle size={11} />}
                                </div>
                                {!isLast && <div style={{ flex: 1, width: '2px', background: 'rgba(255,255,255,0.06)', minHeight: '8px' }} />}
                              </div>

                              {/* Arc card */}
                              <div className="cm-arc-card" style={{ flex: 1, marginBottom: isLast ? 0 : '4px' }}>
                                {/* Header row */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                                  {isEditing ? (
                                    <input
                                      className="cm-input"
                                      style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-display)', padding: '4px 8px' }}
                                      autoFocus
                                      value={arc.name}
                                      onChange={e => updateArc(arc.id, { name: e.target.value })}
                                    />
                                  ) : (
                                    <h4 style={{
                                      flex: 1, margin: 0, fontSize: '0.9rem', fontWeight: 700,
                                      color: '#e2e8f0', fontFamily: 'var(--font-display)',
                                      cursor: 'text'
                                    }}
                                      onClick={() => setEditingArcId(arc.id)}
                                    >{arc.name}</h4>
                                  )}

                                  <select
                                    className="cm-select"
                                    value={arc.status}
                                    onChange={e => updateArc(arc.id, { status: e.target.value as CampaignArc['status'] })}
                                    style={{
                                      fontSize: '0.7rem', padding: '3px 8px',
                                      color: conf.color, borderColor: conf.border, background: conf.bg,
                                    }}
                                  >
                                    <option value="planned">Planejado</option>
                                    <option value="active">Ativo</option>
                                    <option value="completed">Concluído</option>
                                  </select>

                                  {isEditing ? (
                                    <button
                                      className="cm-action-btn"
                                      style={{ padding: '3px 10px' }}
                                      onClick={() => setEditingArcId(null)}
                                    ><Save size={12} /> Salvar</button>
                                  ) : (
                                    <button className="cm-danger-btn" onClick={() => setEditingArcId(arc.id)} title="Editar">
                                      <Edit3 size={13} />
                                    </button>
                                  )}
                                  <button className="cm-danger-btn" onClick={() => deleteArc(arc.id)} title="Remover">
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                {/* Wiki file bar */}
                                {arc.filePath ? (
                                  <div className="cm-wiki-file-bar" style={{ marginBottom: '8px' }}>
                                    <FileText size={11} style={{ flexShrink: 0 }} />
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.68rem' }}>
                                      {arc.filePath}
                                    </span>
                                    <button className="cm-wiki-btn" onClick={() => openInWiki(arc.filePath!)}>
                                      <ExternalLink size={10} /> Abrir na Wiki
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <LegacyBadge />
                                    <button
                                      className="cm-link-btn"
                                      disabled={linkingId === arc.id}
                                      onClick={() => linkArcToWiki(arc)}
                                    >
                                      <Link2 size={9} />
                                      {linkingId === arc.id ? 'Vinculando...' : 'Vincular à Wiki'}
                                    </button>
                                  </div>
                                )}

                                {/* Description textarea linked to .md */}
                                <WikiLinkedTextarea
                                  key={`arc-${arc.id}-${arc.filePath}`}
                                  filePath={arc.filePath}
                                  fallbackValue={arc.description}
                                  onFallbackChange={val => updateArc(arc.id, { description: val })}
                                  placeholder="Objetivos, NPCs chave, fios narrativos deste arco..."
                                  minHeight="80px"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<Target size={36} />}
                        message="Nenhum arco narrativo planejado."
                        sub="Adicione arcos para organizar os atos da campanha."
                      />
                    )}
                  </div>
                )}

                {/* ── SESSIONS TAB ── */}
                {activeTab === 'sessions' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.25s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {(['upcoming', 'completed'] as const).map(st => {
                          const conf = STATUS_CONFIG.session[st];
                          const count = (selectedCampaign.sessions || []).filter(s => s.status === st).length;
                          return <Badge key={st} label={`${conf.label} (${count})`} color={conf.color} bg={conf.bg} border={conf.border} />;
                        })}
                      </div>
                      <button className="cm-action-btn" onClick={addSession}>
                        <Plus size={12} /> Registrar Sessão
                      </button>
                    </div>

                    {sortedSessions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {sortedSessions.map((sess, idx) => {
                          const conf = STATUS_CONFIG.session[sess.status];
                          const isExpanded = expandedSession === sess.id;
                          const sessNum = sortedSessions.length - idx;

                          return (
                            <div key={sess.id} className="cm-session-card">
                              {/* Session header row */}
                              <div
                                className="cm-session-header"
                                onClick={() => setExpandedSession(isExpanded ? null : sess.id)}
                              >
                                {/* Number badge */}
                                <div style={{
                                  width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                                  background: conf.bg, border: `1px solid ${conf.border}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.68rem', fontWeight: 800, fontFamily: 'var(--font-display)',
                                  color: conf.color
                                }}>
                                  {sessNum}
                                </div>

                                <div style={{ flex: 1 }}>
                                  <input
                                    className="cm-input"
                                    style={{
                                      background: 'transparent', border: 'none', padding: '0',
                                      borderRadius: 0, fontSize: '0.82rem', fontWeight: 700,
                                      fontFamily: 'var(--font-display)', color: '#e2e8f0'
                                    }}
                                    type="date"
                                    value={sess.date}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => updateSession(sess.id, { date: e.target.value })}
                                  />
                                </div>

                                <Badge label={conf.label} color={conf.color} bg={conf.bg} border={conf.border} />

                                {/* Wiki button (if linked) */}
                                {sess.filePath && (
                                  <button
                                    className="cm-wiki-btn"
                                    onClick={e => { e.stopPropagation(); openInWiki(sess.filePath!); }}
                                    title="Abrir na Wiki"
                                  >
                                    <ExternalLink size={10} /> Wiki
                                  </button>
                                )}

                                {/* Link button (if legacy) */}
                                {!sess.filePath && (
                                  <button
                                    className="cm-link-btn"
                                    disabled={linkingId === sess.id}
                                    onClick={e => { e.stopPropagation(); linkSessionToWiki(sess, sessNum); }}
                                    title="Vincular à Wiki"
                                  >
                                    <Link2 size={9} />
                                    {linkingId === sess.id ? '...' : 'Vincular'}
                                  </button>
                                )}

                                <select
                                  className="cm-select"
                                  value={sess.status}
                                  style={{ fontSize: '0.7rem', padding: '2px 8px', color: conf.color, borderColor: conf.border, background: conf.bg }}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => updateSession(sess.id, { status: e.target.value as CampaignSession['status'] })}
                                >
                                  <option value="upcoming">Agendada</option>
                                  <option value="completed">Realizada</option>
                                </select>

                                <button
                                  className="cm-danger-btn"
                                  onClick={e => { e.stopPropagation(); deleteSession(sess.id); }}
                                >
                                  <Trash2 size={13} />
                                </button>

                                <ChevronRight
                                  size={14}
                                  style={{
                                    color: 'rgba(148,163,184,0.4)',
                                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                                    transition: 'transform 0.2s',
                                    flexShrink: 0
                                  }}
                                />
                              </div>

                              {/* Expanded content */}
                              {isExpanded && (
                                <div style={{ padding: '0 14px 14px' }}>
                                  {/* File path bar inside expanded */}
                                  {sess.filePath && (
                                    <div className="cm-wiki-file-bar" style={{ marginBottom: '10px' }}>
                                      <FileText size={11} style={{ flexShrink: 0 }} />
                                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.68rem' }}>
                                        {sess.filePath}
                                      </span>
                                      <button className="cm-wiki-btn" onClick={() => openInWiki(sess.filePath!)}>
                                        <ExternalLink size={10} /> Abrir na Wiki
                                      </button>
                                    </div>
                                  )}

                                  <WikiLinkedTextarea
                                    key={`session-${sess.id}-${sess.filePath}`}
                                    filePath={sess.filePath}
                                    fallbackValue={sess.summary}
                                    onFallbackChange={val => updateSession(sess.id, { summary: val })}
                                    placeholder={
                                      sess.status === 'upcoming'
                                        ? 'Pautas, objetivos e planos para esta sessão...'
                                        : 'O que aconteceu? Decisões dos jogadores, reviravoltas, consequências...'
                                    }
                                    minHeight="120px"
                                    autoFocus
                                  />
                                </div>
                              )}

                              {/* Collapsed preview */}
                              {!isExpanded && sess.summary && (
                                <p style={{
                                  margin: '0 14px 10px',
                                  fontSize: '0.75rem', color: 'rgba(148,163,184,0.6)',
                                  overflow: 'hidden', display: '-webkit-box',
                                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                                }}>
                                  {sess.summary}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<Calendar size={36} />}
                        message="Nenhuma sessão registrada."
                        sub="Agende sessões futuras ou documente sessões passadas."
                      />
                    )}
                  </div>
                )}

                {/* ── QUESTS TAB ── */}
                {activeTab === 'quests' && renderQuestsTab()}
              </div>
            </>
          ) : (
            /* Empty state - no campaign selected */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '16px', color: 'rgba(148,163,184,0.4)'
            }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '20px',
                background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <BookOpen size={36} color="rgba(168,85,247,0.4)" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'rgba(148,163,184,0.6)', fontSize: '0.95rem' }}>
                  Nenhuma campanha selecionada
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>
                  Crie uma nova campanha na barra lateral para começar.
                </p>
              </div>
              <button className="cm-action-btn" style={{ padding: '10px 20px' }} onClick={handleAddCampaign}>
                <Plus size={14} /> Criar Primeira Campanha
              </button>
            </div>
          )}
        </div>
      </div>
    </DraggableWindow>
  );
};
