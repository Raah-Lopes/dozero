import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import {
  state,
  
  updateCampaign,
  deleteCampaign,
  updateTokenProps,
  pushChatMessage,
} from '../../../store';
import type { CampaignData, CampaignArc, CampaignSession, CampaignQuest, QuestLootItem } from '../../../store';
import {
  saveMarkdownContent,
  loadMarkdownFile,
  ensureWikiFolder,
} from '../../../utils/githubApi';
import { getWikiConfig } from '../../../store';
import {
  BookOpen, Plus, Target, Calendar, Trash2,
  Play, CheckCircle, PauseCircle, ChevronRight,
  Scroll, Sparkles, Clock, Edit3, Save, Flag,
  Circle, Layers, ExternalLink, Link2, AlertTriangle,
  FileText, Award, Users, Image,  
   MinusCircle
} from 'lucide-react';
import { useWiki } from '../../../hooks/useWiki';
import * as yaml from 'js-yaml';
import { OverviewTab } from './CampaignManager/OverviewTab';
import { ArcsTab } from './CampaignManager/ArcsTab';
import { SessionsTab } from './CampaignManager/SessionsTab';
import { QuestsTab } from './CampaignManager/QuestsTab';

import { LegacyBadge, WikiLinkedTextarea } from './CampaignManager/Shared';
interface CampaignManagerWidgetProps {
  onClose: () => void;
}

type TabId = 'overview' | 'arcs' | 'sessions' | 'quests';

// ─── Utilities ────────────────────────────────────────────────────────────────

export function slugify(name: string): string {
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

export const questTemplate = (name: string, type: 'main' | 'side') => `---
tipo: "missao"
status: "ativa"
categoria: "${type === 'main' ? 'Principal' : 'Secundaria'}"
nome: "${name}"
tags:
  - missao
  - ${type === 'main' ? 'principal' : 'secundaria'}
---

# ${name}

## 🎯 Objetivos
- [ ] Objetivo inicial...

## 💡 Informações e Pistas
- 

## 🗺️ Locais Importantes
- 

## 👥 NPCs e Inimigos Envolvidos
- 

## 🎁 Recompensas Planejadas
- 

## 📝 Diário / Log
- **[Data]**: Missão iniciada.
`;

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

// ─── Main Component ───────────────────────────────────────────────────────────

export const CampaignManagerWidget: React.FC<CampaignManagerWidgetProps> = ({ onClose }) => {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [editingArcId, setEditingArcId] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null); // tracks which item is being linked
  const contentRef = useRef<HTMLDivElement>(null);

  const { index: wikiIndex } = useWiki();

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
                    { icon: <Circle size={12} />, label: 'Realizadas', value: (selectedCampaign.sessions || []).filter(s => s.status === 'completed').length, color: '#22c55e' },
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
                  <OverviewTab
                    campaign={selectedCampaign}
                    updateCampaign={updateCampaign}
                    linkingId={linkingId}
                    openInWiki={openInWiki}
                    linkCampaignToWiki={linkCampaignToWiki}
                    setLinkingId={setLinkingId}
                    
                  />
                )}

                {/* ── ARCS TAB ── */}
                {activeTab === 'arcs' && (
                  <ArcsTab
                    campaign={selectedCampaign}
                    updateCampaign={updateCampaign}
                    linkingId={linkingId}
                    setLinkingId={setLinkingId}
                    
                    editingArcId={editingArcId}
                    setEditingArcId={setEditingArcId}
                    openInWiki={openInWiki}
                    linkArcToWiki={linkArcToWiki}
                    addArc={addArc}
                    updateArc={updateArc}
                    deleteArc={deleteArc}
                  />
                )}

                {/* ── SESSIONS TAB ── */}
                {activeTab === 'sessions' && (
                  <SessionsTab
                    campaign={selectedCampaign}
                    updateCampaign={updateCampaign}
                    linkingId={linkingId}
                    setLinkingId={setLinkingId}
                    
                    expandedSession={expandedSession}
                    setExpandedSession={setExpandedSession}
                    openInWiki={openInWiki}
                    linkSessionToWiki={linkSessionToWiki}
                    addSession={addSession}
                    updateSession={updateSession}
                    deleteSession={deleteSession}
                  />
                )}

                {/* ── QUESTS TAB ── */}
                {activeTab === 'quests' && (
                  <QuestsTab
                    campaign={selectedCampaign}
                    updateCampaign={updateCampaign}
                    wikiIndex={wikiIndex}
                    openInWiki={openInWiki}
                    linkingId={linkingId}
                    setLinkingId={setLinkingId}
                  />
                )}
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
