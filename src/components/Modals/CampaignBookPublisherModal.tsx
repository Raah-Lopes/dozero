// src/components/Modals/CampaignBookPublisherModal.tsx
// Modal Arcanum Dark Fantasy para geracao, live preview e publicacao de Livros de Campanha em PDF e HTML

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Printer, Download, Eye, Layers, Palette, 
  Check, X, Sparkles, Image, Shield, Users, Map, FileText, Settings
} from 'lucide-react';
import { 
  BookTheme, 
  BookPublishOptions, 
  generateCampaignBookHtml, 
  printCampaignBook, 
  exportStandaloneBookHtml 
} from '../../services/campaignPublisherService';
import { state } from '../../store';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import { toast } from '../UI/Toast';

interface CampaignBookPublisherModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId?: string;
  campaignTitle?: string;
}

export const CampaignBookPublisherModal: React.FC<CampaignBookPublisherModalProps> = ({
  isOpen,
  onClose,
  campaignId = 'default-room',
  campaignTitle = 'Crônicas de Arcanum'
}) => {
  const [options, setOptions] = useState<BookPublishOptions>({
    title: campaignTitle,
    subtitle: 'Um Tomo de Aventuras, Lendas e Masmorras',
    author: 'Mestre da Mesa',
    system: 'DOZERO D20 / FATE Core',
    coverImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop',
    theme: 'parchment',
    twoColumns: true,
    includeCover: true,
    includeToc: true,
    includeOverview: true,
    includeScenes: true,
    includeBestiary: true,
    includeWikiNotes: true,
    includeLineages: false,
  });

  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Coleta dados da campanha da store local e da Wiki com proteções contra undefined
  const campaignData = useMemo(() => {
    let scenes: any[] = [];
    try {
      const theaterGlobal = state.theater?.get?.('global') as any;
      const theaterScenes = theaterGlobal?.scenes || [];
      const backgrounds = Array.from((state.backgrounds?.values?.() as Iterable<any>) || []);
      scenes = [
        ...theaterScenes,
        ...backgrounds.map((bg: any, i: number) => ({ id: `bg-${i}`, name: bg?.name || `Cena ${i + 1}`, backgroundUrl: bg?.url || bg?.imageUrl, gridSize: 70 }))
      ];
    } catch {}

    let characters: any[] = [];
    try {
      const sheets = Array.from((state.sheets?.values?.() as Iterable<any>) || []);
      const tokens = Array.from((state.tokens?.values?.() as Iterable<any>) || []).filter((t: any) => t?.isCharacter || t?.hp_max || t?.pv_max);
      characters = [
        ...sheets,
        ...tokens.map((t: any) => ({
          id: t.id,
          name: t.name,
          sheet_data: {
            name: t.name,
            class: t.characterClass || 'Guerreiro',
            level: t.level || 1,
            race: t.race || 'Humano',
            hp_current: t.hp ?? t.pv ?? 10,
            hp_max: t.hp_max ?? t.pv_max ?? 10,
            pm_current: t.pm ?? 0,
            pm_max: t.pm_max ?? 0,
            attributes: t.attributes || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            bio: t.notes || ''
          }
        }))
      ];
    } catch {}

    let wikiEntries: any[] = [];
    try {
      wikiEntries = WikiIndexer.getAllEntries() || [];
    } catch {}

    return { scenes, characters, wikiEntries };
  }, [isOpen]);

  // Atualiza Live Preview sempre que as opcoes mudarem
  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    const updatePreview = async () => {
      try {
        const html = await generateCampaignBookHtml(campaignId, options, campaignData);
        if (isCurrent) setPreviewHtml(html);
      } catch (err) {
        console.warn('[BookPublisher] Erro ao gerar preview:', err);
      }
    };

    updatePreview();
    return () => { isCurrent = false; };
  }, [isOpen, options, campaignData, campaignId]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
      await printCampaignBook(campaignId, options, campaignData);
      toast.success('Janela de impressão/PDF aberta com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao abrir impressão: ' + (err?.message || err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadHtml = async () => {
    setIsGenerating(true);
    try {
      const { blob, filename } = await exportStandaloneBookHtml(campaignId, options, campaignData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Tomo Web (.html) baixado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao exportar HTML: ' + (err?.message || err));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #18110c 0%, #0d0906 100%)',
        border: '1px solid #785a3c',
        boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 35px rgba(212,175,55,0.2)',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '1200px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f4ece1',
        fontFamily: 'inherit'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(120,90,60,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(30,20,12,0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #d4af37, #854d0e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(212,175,55,0.4)'
            }}>
              <BookOpen size={20} color="#18110c" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fef3c7', letterSpacing: '0.5px' }}>
                Publicador de Livros de Campanha (PDF & Web)
              </h2>
              <p style={{ fontSize: '0.72rem', margin: 0, color: '#a89a8c' }}>
                Gere tomos, manuais e compêndios em alta resolução para impressão ou compartilhamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#a89a8c', cursor: 'pointer', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (Duas Colunas: Configuracoes na esquerda, Live Preview na direita) */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr', overflow: 'hidden' }}>
          
          {/* Painel Esquerdo: Configuracoes */}
          <div style={{
            padding: '20px',
            borderRight: '1px solid rgba(120,90,60,0.3)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: 'rgba(20,14,8,0.5)'
          }}>
            
            {/* Metadados do Livro */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Metadados do Livro
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: '#a89a8c' }}>Título Principal</label>
                <input
                  type="text"
                  value={options.title}
                  onChange={(e) => setOptions({ ...options, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#120d09',
                    border: '1px solid #5a422e',
                    borderRadius: '6px',
                    color: '#fef3c7',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: '#a89a8c' }}>Subtítulo / Arco</label>
                <input
                  type="text"
                  value={options.subtitle}
                  onChange={(e) => setOptions({ ...options, subtitle: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#120d09',
                    border: '1px solid #5a422e',
                    borderRadius: '6px',
                    color: '#fef3c7',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#a89a8c' }}>Autor / Mestre</label>
                  <input
                    type="text"
                    value={options.author}
                    onChange={(e) => setOptions({ ...options, author: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#120d09',
                      border: '1px solid #5a422e',
                      borderRadius: '6px',
                      color: '#fef3c7',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#a89a8c' }}>Sistema de Regras</label>
                  <input
                    type="text"
                    value={options.system}
                    onChange={(e) => setOptions({ ...options, system: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#120d09',
                      border: '1px solid #5a422e',
                      borderRadius: '6px',
                      color: '#fef3c7',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: '#a89a8c' }}>URL da Imagem de Capa</label>
                <input
                  type="text"
                  value={options.coverImageUrl}
                  onChange={(e) => setOptions({ ...options, coverImageUrl: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#120d09',
                    border: '1px solid #5a422e',
                    borderRadius: '6px',
                    color: '#fef3c7',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>

            {/* Tema Visual */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Estilo & Tema Visual
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[
                  { id: 'parchment', name: '📜 Pergaminho', desc: 'Clássico D&D' },
                  { id: 'grimoire', name: '🌙 Grimório', desc: 'Dark Fantasy' },
                  { id: 'clean', name: '📄 Clean', desc: 'Econômico' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setOptions({ ...options, theme: t.id as BookTheme })}
                    style={{
                      padding: '10px 6px',
                      background: options.theme === t.id ? 'rgba(212,175,55,0.2)' : '#120d09',
                      border: `1px solid ${options.theme === t.id ? '#d4af37' : '#4a3424'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      color: options.theme === t.id ? '#fef3c7' : '#a89a8c'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: '0.62rem', marginTop: '2px', opacity: 0.8 }}>{t.desc}</div>
                  </button>
                ))}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', cursor: 'pointer', marginTop: '6px', color: '#e2d9cd' }}>
                <span>Layout em 2 Colunas (Estilo Livro de RPG)</span>
                <input
                  type="checkbox"
                  checked={options.twoColumns}
                  onChange={(e) => setOptions({ ...options, twoColumns: e.target.checked })}
                  style={{ accentColor: '#d4af37', width: '16px', height: '16px' }}
                />
              </label>
            </div>

            {/* Seleção de Capítulos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Capítulos a Incluir
              </div>

              {[
                { key: 'includeCover', label: 'Capa Ilustrada', icon: Image },
                { key: 'includeToc', label: 'Sumário Geral', icon: Layers },
                { key: 'includeOverview', label: 'Cap. I: Visão Geral do Mundo', icon: Sparkles },
                { key: 'includeScenes', label: 'Cap. II: Atlas de Cenas & Masmorras', icon: Map },
                { key: 'includeBestiary', label: 'Cap. III: Fichas & Bestiário', icon: Users },
                { key: 'includeWikiNotes', label: 'Cap. IV: Códice & Lores da Wiki', icon: FileText },
              ].map((chap) => (
                <label
                  key={chap.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: '#120d09',
                    border: '1px solid #3a271c',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    color: '#e2d9cd'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <chap.icon size={14} color="#d4af37" /> {chap.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={(options as any)[chap.key]}
                    onChange={(e) => setOptions({ ...options, [chap.key]: e.target.checked })}
                    style={{ accentColor: '#d4af37', width: '15px', height: '15px' }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Painel Direito: Live Preview (Iframe) */}
          <div style={{ padding: '16px', background: '#0a0705', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#d4af37',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Eye size={14} /> Pré-Visualização em Tempo Real (Live Preview)
            </div>

            <div style={{
              flex: 1,
              background: '#1a130e',
              border: '1px solid #4a3424',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
            }}>
              <iframe
                srcDoc={previewHtml}
                title="Pré-visualização do Livro"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: '#fff'
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(120,90,60,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(20,14,8,0.9)'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #5a422e',
              borderRadius: '6px',
              color: '#a89a8c',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Fechar
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleDownloadHtml}
              disabled={isGenerating}
              style={{
                padding: '8px 16px',
                background: 'rgba(212,175,55,0.15)',
                border: '1px solid #d4af37',
                borderRadius: '6px',
                color: '#fef3c7',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={15} /> Baixar Tomo Web (.html)
            </button>

            <button
              onClick={handlePrint}
              disabled={isGenerating}
              style={{
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #d4af37, #854d0e)',
                border: '1px solid #fef3c7',
                borderRadius: '6px',
                color: '#18110c',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 16px rgba(212,175,55,0.4)'
              }}
            >
              <Printer size={16} /> Imprimir / Salvar como PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
