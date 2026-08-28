// src/components/Modals/AdventureBundleModal.tsx
// Modal Arcanum Dark Fantasy para Exportacao, Auditoria e Importacao de Pacotes de Aventura (.dozero)

import React, { useState, useRef, useEffect } from 'react';
import { 
  Package, Upload, Download, CheckCircle2, AlertTriangle, 
  Map, Skull, Users, Layers, Loader2, X, FileCheck, Shield, Sparkles, RefreshCw
} from 'lucide-react';
import { 
  exportAdventureBundle, 
  validateAdventureBundle, 
  importAdventureBundle, 
  BundleManifest, 
  AdventureBundle,
  AssetAuditReport
} from '../../services/adventureBundleService';
import { toast } from '../UI/Toast';

interface AdventureBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName?: string;
  userId?: string | null;
  mode?: 'export' | 'import';
  onImportComplete?: () => void;
}

export const AdventureBundleModal: React.FC<AdventureBundleModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  campaignName = 'Minha Campanha',
  userId,
  mode = 'export',
  onImportComplete
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(mode);

  // Estados de Exportacao
  const [exportName, setExportName] = useState(campaignName || 'Nova Aventura');
  const [exportAuthor, setExportAuthor] = useState('Mestre DOZERO');
  const [exportSystem, setExportSystem] = useState('DOZERO / Pathfinder 2e / D&D 5e');
  const [exportDescription, setExportDescription] = useState('');
  const [optScenes, setOptScenes] = useState(true);
  const [optChars, setOptChars] = useState(true);
  const [optEncounters, setOptEncounters] = useState(true);
  const [optLineage, setOptLineage] = useState(true);
  const [optCompress, setOptCompress] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Estados de Importacao
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    bundle: AdventureBundle | null;
    manifest: BundleManifest | null;
    error?: string;
  } | null>(null);

  const [importScenes, setImportScenes] = useState(true);
  const [importChars, setImportChars] = useState(true);
  const [importEncounters, setImportEncounters] = useState(true);
  const [importLineage, setImportLineage] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(mode);
      setExportName(campaignName || 'Nova Aventura');
      setSelectedFile(null);
      setValidationResult(null);
      setImportProgress(0);
    }
  }, [isOpen, mode, campaignName]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!campaignId) {
      toast.error('Nenhuma campanha ativa selecionada.');
      return;
    }
    setIsExporting(true);
    try {
      await exportAdventureBundle(
        campaignId,
        exportName,
        {
          bundleName: exportName,
          author: exportAuthor,
          system: exportSystem,
          description: exportDescription,
          exportScenes: optScenes,
          exportCharacters: optChars,
          exportEncounters: optEncounters,
          exportLineage: optLineage,
          compress: optCompress,
        },
        userId
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await validateAdventureBundle(file);
      setValidationResult(res);
      if (!res.valid) {
        toast.error(res.error || 'Arquivo invalido');
      }
    } catch (err: any) {
      setValidationResult({ valid: false, bundle: null, manifest: null, error: err?.message });
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !validationResult?.valid) return;
    setIsImporting(true);
    setImportProgress(0);
    try {
      await importAdventureBundle(
        selectedFile,
        campaignId,
        {
          importScenes,
          importCharacters: importChars,
          importEncounters,
          importLineage,
          overwriteExisting,
        },
        userId,
        setImportProgress
      );
      onImportComplete?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao importar');
    } finally {
      setIsImporting(false);
    }
  };

  const manifest = validationResult?.manifest;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #18110c 0%, #0d0906 100%)',
        border: '1px solid #785a3c',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(217,119,6,0.15)',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '620px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f4ece1',
        fontFamily: 'inherit'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(120,90,60,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(30,20,12,0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #d97706, #b45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(217,119,6,0.4)'
            }}>
              <Package size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '0.5px', color: '#fef3c7' }}>
                Pacote de Aventura (.dozero)
              </h2>
              <p style={{ fontSize: '0.7rem', margin: 0, color: '#a89a8c' }}>
                Empacotamento completo, auditoria de assets e portabilidade
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a89a8c',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(120,90,60,0.3)',
          background: 'rgba(15,10,6,0.5)'
        }}>
          <button
            onClick={() => setActiveTab('export')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'export' ? 'rgba(217,119,6,0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'export' ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === 'export' ? '#fef3c7' : '#8c7e70',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Download size={15} /> Exportar Aventura
          </button>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'import' ? 'rgba(217,119,6,0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'import' ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === 'import' ? '#fef3c7' : '#8c7e70',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Upload size={15} /> Importar Pacote
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'export' ? (
            /* TAB EXPORT */
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                    Nome do Pacote
                  </label>
                  <input
                    type="text"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    placeholder="Ex: A Maldicao de Strahd - Ato I"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#100b07',
                      border: '1px solid #5a422e',
                      borderRadius: '6px',
                      color: '#fef3c7',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                      Autor / Criador
                    </label>
                    <input
                      type="text"
                      value={exportAuthor}
                      onChange={(e) => setExportAuthor(e.target.value)}
                      placeholder="Ex: Mestre DOZERO"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#100b07',
                        border: '1px solid #5a422e',
                        borderRadius: '6px',
                        color: '#fef3c7',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                      Sistema
                    </label>
                    <input
                      type="text"
                      value={exportSystem}
                      onChange={(e) => setExportSystem(e.target.value)}
                      placeholder="Ex: D&D 5e / Tormenta20"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#100b07',
                        border: '1px solid #5a422e',
                        borderRadius: '6px',
                        color: '#fef3c7',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                    Descricao / Notas da Aventura
                  </label>
                  <textarea
                    rows={2}
                    value={exportDescription}
                    onChange={(e) => setExportDescription(e.target.value)}
                    placeholder="Sinopse breve, nivel recomendado e avisos..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#100b07',
                      border: '1px solid #5a422e',
                      borderRadius: '6px',
                      color: '#fef3c7',
                      fontSize: '0.82rem',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Opcoes de inclusao */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  Camadas a Empacotar
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(30,20,12,0.5)', border: '1px solid #4a3424', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}>
                    <input type="checkbox" checked={optScenes} onChange={(e) => setOptScenes(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                    <Map size={14} color="#60a5fa" /> Cenas e Mapas
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(30,20,12,0.5)', border: '1px solid #4a3424', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}>
                    <input type="checkbox" checked={optChars} onChange={(e) => setOptChars(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                    <Skull size={14} color="#f87171" /> Criaturas e NPCs
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(30,20,12,0.5)', border: '1px solid #4a3424', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}>
                    <input type="checkbox" checked={optEncounters} onChange={(e) => setOptEncounters(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                    <Users size={14} color="#fbbf24" /> Encontros de Combate
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(30,20,12,0.5)', border: '1px solid #4a3424', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}>
                    <input type="checkbox" checked={optLineage} onChange={(e) => setOptLineage(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                    <Layers size={14} color="#c084fc" /> Atlas de Linhagem
                  </label>
                </div>
              </div>

              {/* Compactacao Gzip */}
              <div style={{ padding: '10px 14px', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#fbbf24" />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fef3c7' }}>Compressao Gzip Nativa</div>
                    <div style={{ fontSize: '0.65rem', color: '#a89a8c' }}>Reduz em ate 90% o tamanho do arquivo .dozero</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={optCompress}
                  onChange={(e) => setOptCompress(e.target.checked)}
                  style={{ accentColor: '#f59e0b', width: '16px', height: '16px' }}
                />
              </div>
            </>
          ) : (
            /* TAB IMPORT */
            <>
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                }}
                style={{
                  border: '2px dashed #785a3c',
                  borderRadius: '10px',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(20,14,8,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".dozero,.json,application/gzip,application/json"
                  style={{ display: 'none' }}
                  onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                />
                {isValidating ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={28} className="spin" color="#f59e0b" />
                    <span style={{ fontSize: '0.8rem', color: '#fef3c7' }}>Analisando e auditando manifesto...</span>
                  </div>
                ) : selectedFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <FileCheck size={28} color="#34d399" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fef3c7' }}>{selectedFile.name}</span>
                    <span style={{ fontSize: '0.68rem', color: '#a89a8c' }}>({(selectedFile.size / 1024).toFixed(1)} KB) — Clique para trocar</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Upload size={28} color="#d97706" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fef3c7' }}>
                      Arraste o arquivo .dozero ou clique para selecionar
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#a89a8c' }}>
                      Suporta pacotes compactados (.dozero) e exportacoes legadas (.json)
                    </span>
                  </div>
                )}
              </div>

              {/* Preview do Manifesto Validado */}
              {manifest && validationResult?.valid && (
                <div style={{
                  padding: '14px',
                  background: 'rgba(30,20,12,0.7)',
                  border: '1px solid #785a3c',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fef3c7' }}>
                        {manifest.bundleName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#a89a8c' }}>
                        Por {manifest.author || 'Anonimo'} • Sistema: {manifest.system} • v{manifest.version}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(52,211,153,0.15)',
                      border: '1px solid #34d399',
                      color: '#34d399'
                    }}>
                      Manifesto Valido
                    </span>
                  </div>

                  {manifest.description && (
                    <div style={{ fontSize: '0.74rem', color: '#e2d9cd', fontStyle: 'italic' }}>
                      "{manifest.description}"
                    </div>
                  )}

                  {/* Resumo de Entidades */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    <div style={{ padding: '6px', background: '#120b07', borderRadius: '6px', textAlign: 'center', border: '1px solid #4a3424' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#60a5fa' }}>{manifest.counts.scenes}</div>
                      <div style={{ fontSize: '0.6rem', color: '#a89a8c' }}>Cenas</div>
                    </div>
                    <div style={{ padding: '6px', background: '#120b07', borderRadius: '6px', textAlign: 'center', border: '1px solid #4a3424' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f87171' }}>{manifest.counts.characters}</div>
                      <div style={{ fontSize: '0.6rem', color: '#a89a8c' }}>Criaturas</div>
                    </div>
                    <div style={{ padding: '6px', background: '#120b07', borderRadius: '6px', textAlign: 'center', border: '1px solid #4a3424' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24' }}>{manifest.counts.encounters}</div>
                      <div style={{ fontSize: '0.6rem', color: '#a89a8c' }}>Encontros</div>
                    </div>
                    <div style={{ padding: '6px', background: '#120b07', borderRadius: '6px', textAlign: 'center', border: '1px solid #4a3424' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#c084fc' }}>{manifest.counts.hasLineage ? 'Sim' : 'Nao'}</div>
                      <div style={{ fontSize: '0.6rem', color: '#a89a8c' }}>Linhagem</div>
                    </div>
                  </div>

                  {/* Auditoria de Midias */}
                  {manifest.assetStats && (
                    <div style={{ fontSize: '0.68rem', color: '#a89a8c', display: 'flex', gap: '12px' }}>
                      <span>🖼️ {manifest.assetStats.imageCount} imagens</span>
                      <span>🎵 {manifest.assetStats.audioCount} audios</span>
                    </div>
                  )}

                  {/* Selecao de Camadas na Importacao */}
                  <div style={{ borderTop: '1px solid rgba(120,90,60,0.3)', paddingTop: '8px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#d4af37', marginBottom: '6px' }}>
                      O que importar para esta campanha?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={importScenes} onChange={(e) => setImportScenes(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                        Cenas ({manifest.counts.scenes})
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={importChars} onChange={(e) => setImportChars(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                        Criaturas ({manifest.counts.characters})
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={importEncounters} onChange={(e) => setImportEncounters(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                        Encontros ({manifest.counts.encounters})
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={importLineage} onChange={(e) => setImportLineage(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                        Linhagem
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Barra de Progresso */}
              {isImporting && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px', color: '#fef3c7' }}>
                    <span>Importando aventura...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${importProgress}%`, height: '100%', background: 'linear-gradient(90deg, #d97706, #fbbf24)', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(120,90,60,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
          background: 'rgba(20,14,8,0.8)'
        }}>
          <button
            onClick={onClose}
            disabled={isExporting || isImporting}
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
            Cancelar
          </button>

          {activeTab === 'export' ? (
            <button
              onClick={handleExport}
              disabled={isExporting}
              style={{
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 15px rgba(217,119,6,0.3)'
              }}
            >
              {isExporting ? <><Loader2 size={15} className="spin" /> Empacotando...</> : <><Download size={15} /> Exportar .dozero</>}
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={isImporting || !validationResult?.valid}
              style={{
                padding: '8px 20px',
                background: validationResult?.valid ? 'linear-gradient(135deg, #059669, #047857)' : 'rgba(74,52,36,0.5)',
                border: `1px solid ${validationResult?.valid ? '#10b981' : '#5a422e'}`,
                borderRadius: '6px',
                color: validationResult?.valid ? '#fff' : '#8c7e70',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: (isImporting || !validationResult?.valid) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: validationResult?.valid ? '0 0 15px rgba(16,185,129,0.3)' : 'none'
              }}
            >
              {isImporting ? <><Loader2 size={15} className="spin" /> Importando...</> : <><Upload size={15} /> Importar para esta Mesa</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
