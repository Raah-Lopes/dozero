// src/components/Theater/DirectorPanel.tsx
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Film, Users, Target, BookOpen, Trash2, 
  EyeOff, Swords, Shield, Sparkles, Upload, FolderArchive, ExternalLink
} from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { useCastData } from './hooks/useCastData';
import { CastPanel } from './CastPanel';
import { EnemyArsenal } from './EnemyArsenal';
import { ClockRail } from './ClockRail';
import { TacticalRadar } from './TacticalRadar';
import { NarrativeTrack } from './NarrativeTrack';
import { SessionDiary } from './SessionDiary';
import { CutsceneManager } from './CutsceneManager';
import { ScenePanel } from './ScenePanel';
import { PropsPanel } from './PropsPanel';
import { TheaterAssetVault } from './TheaterAssetVault';
import { importSceneFromMarkdown } from './sceneExport';
import { GlassAccordion } from '../UI/GlassAccordion';
import { Tooltip } from '../UI/Tooltip';
import { toast } from '../UI/Toast';

type DrawerTab = 'ambiente' | 'personagens' | 'acervo' | 'mecanicas' | 'narrativa';
type CastSubTab = 'jogadores' | 'ameacas' | 'npcs';

interface Props {
  onClose: () => void;
  activeBgIndex: number;
  onBgChange: (idx: number) => void;
  initialTab?: string;
  floatingPanels?: string[];
  onToggleFloat?: (tab: string) => void;
}

export const DirectorPanel: React.FC<Props> = ({ 
  onClose, 
  initialTab = 'ambiente',
  floatingPanels = [],
  onToggleFloat
}) => {
  const { scenes, currentScene, setCurrentScene, createScene, deleteScene } = useSceneState();
  const { npcs } = useCastData();
  const [tab, setTab] = useState<DrawerTab>((initialTab as DrawerTab) ?? 'ambiente');
  const [castSubTab, setCastSubTab] = useState<CastSubTab>('jogadores');

  // Sync tab when drawer is opened to a specific tab from outside
  useEffect(() => {
    if (initialTab) setTab(initialTab as DrawerTab);
  }, [initialTab]);

  const handleShowNpc = (name: string, imageUrl?: string) => {
    window.dispatchEvent(new CustomEvent('theater-show-npc', { detail: { name, imageUrl } }));
    toast.info(`Retrato de ${name} projetado no palco!`);
  };

  const handleHideNpc = () => {
    window.dispatchEvent(new CustomEvent('theater-show-npc', { detail: null }));
    toast.info('Retrato de NPC ocultado');
  };

  const TABS: { id: DrawerTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'ambiente',    label: 'Cenas',     icon: <Film size={13} />,          color: '#c084fc' },
    { id: 'personagens', label: 'Elenco',    icon: <Users size={13} />,         color: '#34d399' },
    { id: 'acervo',      label: 'Acervo',    icon: <FolderArchive size={13} />, color: '#f43f5e' },
    { id: 'mecanicas',   label: 'Mecânicas', icon: <Target size={13} />,        color: '#f59e0b' },
    { id: 'narrativa',   label: 'Crônica',   icon: <BookOpen size={13} />,      color: '#60a5fa' },
  ];

  return (
    <div className="theater-director-panel">
      {/* Header */}
      <div className="theater-drawer-header">
        <div className="theater-drawer-header-title">
          <div className="theater-drawer-header-icon">🎬</div>
          <div>
            <h3>Diretor de Cenas</h3>
            <span className="theater-drawer-header-sub">
              {currentScene ? currentScene.title : 'Nenhuma cena ativa'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onToggleFloat && tab !== 'acervo' && (
            <Tooltip label={floatingPanels.includes(tab) ? 'Fechar janela destacada' : 'Destacar esta aba em janela flutuante'}>
              <button
                onClick={() => onToggleFloat(tab)}
                className={`theater-drawer-close-btn ${floatingPanels.includes(tab) ? 'active' : ''}`}
                style={floatingPanels.includes(tab) ? { background: 'rgba(168,85,247,0.2)', color: '#c084fc', borderColor: 'rgba(168,85,247,0.5)' } : {}}
                aria-label="Destacar Janela"
              >
                <ExternalLink size={14} />
              </button>
            </Tooltip>
          )}
          <Tooltip label="Fechar Painel (ESC)">
            <button
              onClick={onClose}
              className="theater-drawer-close-btn"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Main Category Tabs */}
      <div className="theater-drawer-tabs">
        {TABS.map(t => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              className={`theater-drawer-tab ${isActive ? 'active' : ''}`}
              style={isActive ? { color: t.color, borderBottomColor: t.color } : {}}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Drawer Body */}
      <div className="theater-drawer-body">
        {/* ── 1. CENAS & AMBIENTE ── */}
        {tab === 'ambiente' && (
          <div className="theater-drawer-section">
            {/* Quick Scene Selector Accordion */}
            <GlassAccordion title={`Rolo de Cenas (${scenes.length})`} defaultOpen={true}>
              <div className="theater-scene-list">
                {scenes.map((s, idx) => {
                  const isCurrent = s.id === currentScene?.id;
                  return (
                    <div
                      key={s.id}
                      className={`theater-scene-row ${isCurrent ? 'active' : ''}`}
                      onClick={() => setCurrentScene(s.id)}
                    >
                      <span className="theater-scene-number">#{idx + 1}</span>
                      <div className="theater-scene-row-info">
                        <div className="theater-scene-row-title">{s.title || 'Sem título'}</div>
                        {s.subtitle && <div className="theater-scene-row-sub">{s.subtitle}</div>}
                      </div>

                      {scenes.length > 1 && (
                        <Tooltip label="Excluir cena">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (!confirm(`Excluir "${s.title}"? Esta ação não pode ser desfeita.`)) return;
                              deleteScene(s.id);
                            }}
                            className="theater-scene-delete-btn"
                          >
                            <Trash2 size={12} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}

                {/* Action Buttons: New & Import */}
                <div className="theater-scene-actions-row">
                  <button
                    className="theater-scene-action-btn new"
                    onClick={() => createScene()}
                  >
                    <Plus size={13} />
                    <span>Nova Cena</span>
                  </button>

                  <button
                    className="theater-scene-action-btn import"
                    onClick={() => document.getElementById('theater-scene-import-input')?.click()}
                  >
                    <Upload size={13} />
                    <span>Importar .md</span>
                  </button>
                  <input
                    id="theater-scene-import-input"
                    type="file"
                    accept=".md"
                    style={{ display: 'none' }}
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const scene = await importSceneFromMarkdown(file);
                        createScene(scene);
                        toast.success('Cena importada com sucesso!');
                      } catch (err: any) {
                        toast.error(err.message || 'Erro ao importar cena');
                      }
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </GlassAccordion>

            {/* Scene details editor */}
            <GlassAccordion title="Detalhes & Configuração da Cena" defaultOpen={true}>
              <ScenePanel />
            </GlassAccordion>

            {/* Props & Visual Elements */}
            <GlassAccordion title="Objetos no Palco (Stage Props)" defaultOpen={false}>
              <PropsPanel />
            </GlassAccordion>
          </div>
        )}

        {/* ── 2. ELENCO & AMEAÇAS ── */}
        {tab === 'personagens' && (
          <div className="theater-drawer-section">
            {/* Sub-selector pills */}
            <div className="theater-cast-subtabs">
              <button
                className={`theater-cast-subtab ${castSubTab === 'jogadores' ? 'active' : ''}`}
                onClick={() => setCastSubTab('jogadores')}
              >
                <Shield size={12} />
                <span>Heróis</span>
              </button>
              <button
                className={`theater-cast-subtab ${castSubTab === 'ameacas' ? 'active' : ''}`}
                onClick={() => setCastSubTab('ameacas')}
              >
                <Swords size={12} />
                <span>Ameaças</span>
              </button>
              <button
                className={`theater-cast-subtab ${castSubTab === 'npcs' ? 'active' : ''}`}
                onClick={() => setCastSubTab('npcs')}
              >
                <Users size={12} />
                <span>NPCs</span>
              </button>
            </div>

            {/* Content for selected subtab */}
            {castSubTab === 'jogadores' && (
              <div className="theater-subtab-content">
                <CastPanel type="jogador" />
              </div>
            )}

            {castSubTab === 'ameacas' && (
              <div className="theater-subtab-content">
                <EnemyArsenal />
              </div>
            )}

            {castSubTab === 'npcs' && (
              <div className="theater-subtab-content">
                {/* NPC Quick Projector List */}
                <div className="theater-npc-projector-header">
                  <span className="theater-section-mini-title">Retratos Rápidos (Clique para Projetar)</span>
                  <button
                    className="theater-hide-npc-btn"
                    onClick={handleHideNpc}
                    title="Remover retrato ativo do palco"
                  >
                    <EyeOff size={12} />
                    <span>Ocultar Retrato</span>
                  </button>
                </div>

                <div className="theater-npc-grid">
                  {/* Scene NPCs from assets */}
                  {currentScene?.assets?.filter(a => a.type === 'npc').map(npc => (
                    <Tooltip key={npc.id} label={`Clique para projetar ou arraste: ${npc.title}`}>
                      <div 
                        className="theater-npc-card"
                        onClick={() => handleShowNpc(npc.title, npc.url)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'prop', url: npc.url, title: npc.title }));
                        }}
                      >
                        <div className="theater-npc-card-avatar">
                          {npc.url ? (
                            <img loading="lazy" decoding="async" src={npc.url} alt={npc.title} />
                          ) : (
                            <span>👤</span>
                          )}
                        </div>
                        <div className="theater-npc-card-name">{npc.title}</div>
                        <span className="theater-npc-card-tag">Cena</span>
                      </div>
                    </Tooltip>
                  ))}

                  {/* Wiki NPCs */}
                  {npcs.slice(0, 12).map(npc => (
                    <Tooltip key={npc.caminhoArquivo} label={`Clique para projetar ou arraste: ${npc.nome}`}>
                      <div 
                        className="theater-npc-card"
                        onClick={() => handleShowNpc(npc.nome, npc.avatar)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'prop', url: npc.avatar, title: npc.nome }));
                        }}
                      >
                        <div className="theater-npc-card-avatar">
                          {npc.avatar ? (
                            <img loading="lazy" decoding="async" src={npc.avatar} alt={npc.nome} />
                          ) : (
                            <span>👤</span>
                          )}
                        </div>
                        <div className="theater-npc-card-name">{npc.nome}</div>
                        <span className="theater-npc-card-tag wiki">Wiki</span>
                      </div>
                    </Tooltip>
                  ))}
                </div>

                <div style={{ marginTop: '16px' }}>
                  <CastPanel type="npc" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3. ACERVO & BANCO DE ELEMENTOS ── */}
        {tab === 'acervo' && (
          <div className="theater-drawer-section">
            <TheaterAssetVault />
          </div>
        )}

        {/* ── 4. MECÂNICAS & TÁTICA ── */}
        {tab === 'mecanicas' && (
          <div className="theater-drawer-section">
            <GlassAccordion title="Relógios Táticos de Tensão" defaultOpen={true}>
              <ClockRail />
            </GlassAccordion>
            <GlassAccordion title="Radar de Zonas & Distâncias" defaultOpen={true}>
              <TacticalRadar />
            </GlassAccordion>
          </div>
        )}

        {/* ── 4. CRÔNICA & CUTSCENES ── */}
        {tab === 'narrativa' && (
          <div className="theater-drawer-section">
            <GlassAccordion title="Diário da Sessão" defaultOpen={true}>
              <SessionDiary />
            </GlassAccordion>
            <GlassAccordion title="Trilha de Marcos Narrativos" defaultOpen={false}>
              <NarrativeTrack />
            </GlassAccordion>
            <GlassAccordion title="Gerenciador de Cutscenes" defaultOpen={true}>
              <CutsceneManager />
            </GlassAccordion>
          </div>
        )}
      </div>
    </div>
  );
};
