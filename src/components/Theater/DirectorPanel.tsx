// src/components/Theater/DirectorPanel.tsx
//
// Drawer lateral do Mestre: troca de cenas, galeria de fundos, retratos de NPCs,
// anotações da cena, e acesso às ferramentas existentes (cast, inimigos, relógios, zonas).
//
import React, { useState } from 'react';
import { X, Plus, Film, Users, Clock, Target, BookOpen, Map, Trash2 } from 'lucide-react';
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
import { importSceneFromMarkdown } from './sceneExport';
import { GlassAccordion } from '../UI/GlassAccordion';

type DrawerTab = 'ambiente' | 'personagens' | 'mecanicas' | 'narrativa';

interface Props {
  onClose: () => void;
  activeBgIndex: number;
  onBgChange: (idx: number) => void;
  initialTab?: string;
  floatingPanels: string[];
  onToggleFloat: (tab: string) => void;
}

export const DirectorPanel: React.FC<Props> = ({ onClose, activeBgIndex, onBgChange, initialTab = 'ambiente', floatingPanels, onToggleFloat }) => {
  const { scenes, currentScene, setCurrentScene, createScene, patchCurrentScene, deleteScene } = useSceneState();
  const { npcs } = useCastData();
  const [tab, setTab] = useState<DrawerTab>((initialTab as DrawerTab) ?? 'ambiente');
  const [notes, setNotes] = useState(currentScene?.description ?? '');

  // Sync tab when drawer is opened to a specific tab from outside
  React.useEffect(() => {
    if (initialTab) setTab(initialTab as DrawerTab);
  }, [initialTab]);

  // Keep notes in sync when scene changes
  React.useEffect(() => {
    setNotes(currentScene?.description ?? '');
  }, [currentScene?.id]);

  const handleNotesBlur = () => {
    if (currentScene) patchCurrentScene({ description: notes });
  };

  const handleShowNpc = (name: string, imageUrl?: string) => {
    window.dispatchEvent(new CustomEvent('theater-show-npc', { detail: { name, imageUrl } }));
    onClose();
  };

  const handleHideNpc = () => {
    window.dispatchEvent(new CustomEvent('theater-show-npc', { detail: null }));
  };

  // Background images for the current scene: main imageUrl + location assets
  const locAssets = currentScene?.assets?.filter(a => a.type === 'location') || [];
  const bgItems = [
    ...(currentScene?.imageUrl ? [{ isMain: true, url: currentScene.imageUrl, label: 'Principal', id: 'main' }] : []),
    ...locAssets.map(a => ({ isMain: false, url: a.url, label: a.title, id: a.id }))
  ];

  const handleUpdateBgs = (newBgItems: typeof bgItems) => {
    if (!currentScene) return;
    const newImageUrl = newBgItems.length > 0 ? newBgItems[0].url : '';
    const newLocAssets = newBgItems.slice(1).map((item, idx) => ({
      id: item.isMain ? `bg_${Date.now()}_${idx}` : item.id,
      title: item.isMain ? 'Fundo' : item.label,
      url: item.url,
      type: 'location' as const
    }));
    const nonLocAssets = currentScene.assets?.filter(a => a.type !== 'location') || [];
    patchCurrentScene({
      imageUrl: newImageUrl,
      assets: [...nonLocAssets, ...newLocAssets]
    });
  };

  const TABS: { id: DrawerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'ambiente',    label: 'Ambiente',     icon: <Map size={12} /> },
    { id: 'personagens', label: 'Personagens',  icon: <Users size={12} /> },
    { id: 'mecanicas',   label: 'Mecânicas',    icon: <Target size={12} /> },
    { id: 'narrativa',   label: 'Narrativa',    icon: <BookOpen size={12} /> },
  ];

  return (
    <>
      {/* Header */}
      <div className="theater-drawer-header">
        <h3>🎬 Diretor de Cenas</h3>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="theater-drawer-tabs" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`theater-drawer-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            title={t.label}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onToggleFloat(tab)}
          style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', borderRadius: '4px', padding: '4px 8px', fontSize: '0.65rem', cursor: 'pointer' }}
        >
          {floatingPanels.includes(tab) ? 'Restaurar ao Painel' : '↗ Destacar Janela'}
        </button>
      </div>

      {/* Body */}
      <div className="theater-drawer-body">
        {floatingPanels.includes(tab) ? (
          <div style={{ textAlign: 'center', color: '#64748b', marginTop: '20px', fontSize: '0.8rem' }}>
            Este painel está flutuante.
          </div>
        ) : (
          <>
            {/* ── AMBIENTE ── */}
            {tab === 'ambiente' && (
              <div className="theater-drawer-section">
                <GlassAccordion title="Troca Rápida de Cena">
                  <div className="theater-scene-list" style={{ marginBottom: 12 }}>
                    {scenes.map(s => (
                      <div
                        key={s.id}
                        className={`theater-scene-row ${s.id === currentScene?.id ? 'active' : ''}`}
                        onClick={() => setCurrentScene(s.id)}
                      >
                        <Film size={13} style={{ color: '#475569', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="theater-scene-row-title">{s.title}</div>
                          {s.subtitle && <div className="theater-scene-row-sub">{s.subtitle}</div>}
                        </div>
                        <button
                          title="Excluir cena"
                          onClick={e => {
                            e.stopPropagation();
                            if (!confirm(`Excluir "${s.title}"? Esta ação não pode ser desfeita.`)) return;
                            deleteScene(s.id);
                          }}
                          style={{
                            background: 'none', border: 'none', color: '#475569',
                            cursor: 'pointer', padding: '2px 4px', display: 'flex',
                            alignItems: 'center', borderRadius: 4, flexShrink: 0,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="theater-scene-row"
                        style={{ flex: 1, borderStyle: 'dashed', color: '#334155', justifyContent: 'center' }}
                        onClick={() => createScene()}
                      >
                        <Plus size={13} /> Nova
                      </button>
                      <button
                        className="theater-scene-row"
                        style={{ flex: 1, borderStyle: 'dashed', color: '#6366f1', justifyContent: 'center' }}
                        onClick={() => document.getElementById('theater-scene-import-input')?.click()}
                        title="Carregar arquivo .md de cena exportada"
                      >
                        <BookOpen size={13} /> Importar
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
                          } catch (err: any) {
                            alert(err.message);
                          }
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                </GlassAccordion>

                <GlassAccordion title="Detalhes da Cena" defaultOpen={true}>
                  <ScenePanel />
                </GlassAccordion>

                <GlassAccordion title="Elementos Visuais (Cenário)" defaultOpen={false}>
                  <PropsPanel />
                </GlassAccordion>

                <GlassAccordion title="Galeria de Fundos" defaultOpen={false}>
                  {bgItems.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: '#334155', textAlign: 'center', padding: '12px 0' }}>
                      Nenhum fundo definido.<br />
                      Adicione uma URL de imagem no painel de Cenas.
                    </p>
                  ) : (
                    <div className="theater-bg-gallery">
                      {bgItems.map((bg, idx) => (
                        <div
                          key={bg.id}
                          className={`theater-bg-thumb ${activeBgIndex === idx ? 'active' : ''} asset-card-hover`}
                          onClick={() => onBgChange(idx)}
                          title={bg.label}
                          style={{ position: 'relative' }}
                        >
                          <img src={bg.url} alt={bg.label} />
                          
                          {/* Botões de ação em overlay (só aparecem no hover) */}
                          <div
                            className="asset-actions"
                            style={{
                              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                              opacity: 0, transition: 'opacity 0.2s', padding: '4px'
                            }}
                          >
                            {idx > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newBgs = [...bgItems];
                                  [newBgs[idx - 1], newBgs[idx]] = [newBgs[idx], newBgs[idx - 1]];
                                  handleUpdateBgs(newBgs);
                                  if (activeBgIndex === idx) onBgChange(idx - 1);
                                  else if (activeBgIndex === idx - 1) onBgChange(idx);
                                }}
                                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer', padding: '4px' }}
                                title="Mover para esquerda"
                              >
                                ⬅️
                              </button>
                            )}
                            {idx < bgItems.length - 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newBgs = [...bgItems];
                                  [newBgs[idx + 1], newBgs[idx]] = [newBgs[idx], newBgs[idx + 1]];
                                  handleUpdateBgs(newBgs);
                                  if (activeBgIndex === idx) onBgChange(idx + 1);
                                  else if (activeBgIndex === idx + 1) onBgChange(idx);
                                }}
                                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer', padding: '4px' }}
                                title="Mover para direita"
                              >
                                ➡️
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!confirm(`Excluir o fundo "${bg.label}"?`)) return;
                                const newBgs = bgItems.filter((_, i) => i !== idx);
                                handleUpdateBgs(newBgs);
                                if (activeBgIndex === idx) onBgChange(Math.max(0, idx - 1));
                                else if (activeBgIndex > idx) onBgChange(activeBgIndex - 1);
                              }}
                              style={{ background: 'rgba(239,68,68,0.4)', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer', padding: '4px' }}
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                      <div
                        className="theater-bg-thumb-add"
                        title="Adicionar fundo via arquivo local"
                        onClick={() => {
                          document.getElementById('theater-bg-upload-input')?.click();
                        }}
                        style={{ fontSize: '1rem' }}
                      >
                        📂
                      </div>
                      <div
                        className="theater-bg-thumb-add"
                        title="Adicionar fundo via URL"
                        onClick={() => {
                          const url = prompt('URL da imagem de fundo:');
                          if (!url || !currentScene) return;
                          const newAsset = { id: `bg_${Date.now()}`, title: 'Fundo', url, type: 'location' as const };
                          patchCurrentScene({ assets: [...(currentScene.assets ?? []), newAsset] });
                        }}
                        style={{ fontSize: '1rem' }}
                      >
                        🌐
                      </div>
                      <input
                        id="theater-bg-upload-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file || !currentScene) return;
                          
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              let width = img.width;
                              let height = img.height;
                              const MAX_SIZE = 1920; 
                              if (width > height) {
                                if (width > MAX_SIZE) {
                                  height *= MAX_SIZE / width;
                                  width = MAX_SIZE;
                                }
                              } else {
                                if (height > MAX_SIZE) {
                                  width *= MAX_SIZE / height;
                                  height = MAX_SIZE;
                                }
                              }
                              canvas.width = width;
                              canvas.height = height;
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.drawImage(img, 0, 0, width, height);
                                const webpDataUrl = canvas.toDataURL('image/webp', 0.85); 
                                const newAsset = { id: `bg_${Date.now()}`, title: 'Fundo Local', url: webpDataUrl, type: 'location' as const };
                                patchCurrentScene({ assets: [...(currentScene.assets ?? []), newAsset] });
                              }
                            };
                            img.src = ev.target?.result as string;
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  )}
                </GlassAccordion>
              </div>
            )}

            {/* ── PERSONAGENS ── */}
            {tab === 'personagens' && (
              <div className="theater-drawer-section">
                <GlassAccordion title="Heróis (Jogadores)" defaultOpen={true}>
                  <CastPanel type="jogador" />
                </GlassAccordion>
                <GlassAccordion title="Ameaças (Inimigos)" defaultOpen={true}>
                  <EnemyArsenal />
                </GlassAccordion>
                <GlassAccordion title="NPCs (Suporte/Figurantes)" defaultOpen={false}>
                  {/* Scene NPCs from assets */}
                  {currentScene?.assets?.filter(a => a.type === 'npc').map(npc => (
                    <div 
                      key={npc.id} 
                      className="theater-npc-row" 
                      onClick={() => handleShowNpc(npc.title, npc.url)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'prop', url: npc.url, title: npc.title }));
                      }}
                      title="Arraste para o palco ou clique para mostrar"
                    >
                      <div className="theater-npc-avatar">
                        {npc.url ? <img src={npc.url} alt={npc.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🧙'}
                      </div>
                      <div className="theater-npc-info">
                        <div className="theater-npc-name">{npc.title}</div>
                        <div className="theater-npc-type">NPC desta cena</div>
                      </div>
                    </div>
                  ))}
                  {/* Wiki NPCs */}
                  {npcs.slice(0, 12).map(npc => (
                    <div 
                      key={npc.caminhoArquivo} 
                      className="theater-npc-row" 
                      onClick={() => handleShowNpc(npc.nome, npc.avatar)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'prop', url: npc.avatar, title: npc.nome }));
                      }}
                      title="Arraste para o palco ou clique para mostrar"
                    >
                      <div className="theater-npc-avatar">
                        {npc.avatar ? <img src={npc.avatar} alt={npc.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🧙'}
                      </div>
                      <div className="theater-npc-info">
                        <div className="theater-npc-name">{npc.nome}</div>
                        <div className="theater-npc-type">Wiki</div>
                      </div>
                    </div>
                  ))}
                  <button
                    className="theater-npc-row"
                    style={{ justifyContent: 'center', color: '#475569', borderStyle: 'dashed', marginTop: 8 }}
                    onClick={handleHideNpc}
                  >
                    <X size={13} /> Esconder retrato
                  </button>
                  <CastPanel type="npc" />
                </GlassAccordion>
              </div>
            )}

            {/* ── MECÂNICAS ── */}
            {tab === 'mecanicas' && (
              <div className="theater-drawer-section">
                <GlassAccordion title="Relógios Táticos" defaultOpen={true}>
                  <ClockRail />
                </GlassAccordion>
                <GlassAccordion title="Zonas de Distância" defaultOpen={true}>
                  <TacticalRadar />
                </GlassAccordion>
              </div>
            )}

            {/* ── NARRATIVA ── */}
            {tab === 'narrativa' && (
              <div className="theater-drawer-section">
                <GlassAccordion title="Diário da Sessão" defaultOpen={true}>
                  <NarrativeTrack />
                  <SessionDiary />
                </GlassAccordion>
                <GlassAccordion title="Cutscenes (Cinemáticas)" defaultOpen={false}>
                  <CutsceneManager />
                </GlassAccordion>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
