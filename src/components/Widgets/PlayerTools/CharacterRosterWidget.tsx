import React, { useState, useRef } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { usePersonagens } from '../../../hooks/usePersonagens';
import { useWiki } from '../../../hooks/useWiki';
import { state, updateTokenProps, getWikiConfig } from '../../../store';
import { syncTokenFieldToWiki } from '../../../services/wiki/syncWiki';
import { WikiIndexer } from '../../../services/wiki/WikiIndexer';
import { saveImageToCloud } from '../../../utils/githubApi';
import { resolveImageUrl, convertImageToWebP } from '../../../utils/imageUtils';
import { User, Skull, Cpu, Shield, Zap, Sword, Star, Eye, EyeOff } from 'lucide-react';

interface CharacterRosterWidgetProps {
  onClose: () => void;
}

export const CharacterRosterWidget: React.FC<CharacterRosterWidgetProps> = ({ onClose }) => {
  // Hook centralizado
  const { personagens, carregando } = usePersonagens(false);
  const { index } = useWiki();
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'inativos' | 'jogador' | 'npc' | 'inimigo'>('todos');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [localActiveOverrides, setLocalActiveOverrides] = useState<Record<string, boolean>>({});
  const [processandoLote, setProcessandoLote] = useState(false);
  const [uploadingPath, setUploadingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lista com estado otimista imediato (sem lag e sem tela piscando)
  const personagensResolvidos = personagens.map(p => ({
    ...p,
    ativo: localActiveOverrides[p.caminhoArquivo] !== undefined ? localActiveOverrides[p.caminhoArquivo] : p.ativo
  }));

  const personagensFiltrados = filtro === 'todos'
    ? personagensResolvidos
    : filtro === 'ativos'
    ? personagensResolvidos.filter(p => p.ativo)
    : filtro === 'inativos'
    ? personagensResolvidos.filter(p => !p.ativo)
    : personagensResolvidos.filter(p => p.status === filtro);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'jogador': return <User size={16} color="var(--success)" />;
      case 'npc': return <Cpu size={16} color="var(--mana)" />;
      case 'inimigo': return <Skull size={16} color="var(--danger)" />;
      default: return <User size={16} color="var(--text-primary)" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'jogador': return 'rgba(16, 185, 129, 0.15)';
      case 'npc': return 'rgba(59, 130, 246, 0.15)';
      case 'inimigo': return 'rgba(225, 29, 72, 0.15)';
      default: return 'transparent';
    }
  };

  const calcularPVPercentual = (pv: number, pvMax: number) => {
    if (pvMax <= 0) return 0;
    return Math.max(0, Math.min(100, (pv / pvMax) * 100));
  };

  const getPVColor = (percentual: number) => {
    if (percentual > 60) return 'var(--success)';
    if (percentual > 30) return 'var(--warning)';
    return 'var(--danger)';
  };

  const handleToggleActive = async (e: React.MouseEvent, caminhoArquivo: string, currentAtivo: boolean) => {
    e.stopPropagation(); // Evita abrir a ficha
    const nextVal = !currentAtivo;
    
    // Atualização otimista imediata na UI
    setLocalActiveOverrides(prev => ({ ...prev, [caminhoArquivo]: nextVal }));
    
    // Inverte o estado atual e salva na wiki
    const success = await syncTokenFieldToWiki(caminhoArquivo, 'ativo', nextVal);
    if (success) {
      WikiIndexer.clearCache(); // Força a re-indexação
      window.dispatchEvent(new Event('wiki-updated')); // Atualiza as UIs dependentes
    }
  };

  const handleToggleSelection = (e: React.MouseEvent, caminhoArquivo: string) => {
    e.stopPropagation();
    const next = new Set(selecionados);
    if (next.has(caminhoArquivo)) next.delete(caminhoArquivo);
    else next.add(caminhoArquivo);
    setSelecionados(next);
  };

  const handleBulkToggle = async (tornarAtivo: boolean) => {
    setProcessandoLote(true);
    const paths = Array.from(selecionados);
    
    // Atualização otimista imediata
    setLocalActiveOverrides(prev => {
      const updated = { ...prev };
      paths.forEach(p => { updated[p] = tornarAtivo; });
      return updated;
    });

    try {
      // Processa todos em paralelo
      await Promise.all(paths.map(path => syncTokenFieldToWiki(path, 'ativo', tornarAtivo)));
      setSelecionados(new Set()); // Limpa seleção
      WikiIndexer.clearCache();
      window.dispatchEvent(new Event('wiki-updated'));
    } finally {
      setProcessandoLote(false);
    }
  };

  const handleAvatarClick = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadingPath(path);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingPath) return;

    const { base64: webpDataUrl } = await convertImageToWebP(file, 0.7, 512);

    // Sobe para nuvem primeiro
    const entry = index.find(en => en.path === uploadingPath);
    const cleanName = (entry?.metadata?.nome || entry?.metadata?.titulo || 'avatar').replace(/[^a-zA-Z0-9]/g, '_');
    const cloudUrl = await saveImageToCloud(webpDataUrl, `${cleanName}_${Date.now()}.webp`);
    if (!cloudUrl) return;

    // Grava URL permanente no arquivo wiki
    const success = await syncTokenFieldToWiki(uploadingPath, 'imagem', cloudUrl);
    if (success) {
      const matchEntry = index.find(en => en.path === uploadingPath);
      if (matchEntry) {
        const entrySlug = matchEntry.slug;
        const entryName = (matchEntry.metadata?.nome || matchEntry.metadata?.titulo || '').trim().toLowerCase();
        // Yjs token recebe URL (nunca base64 — causaria bloat e tokens sumindo)
        Array.from(state.tokens.entries()).forEach(([tokId, tokData]: [string, any]) => {
          const matchesSlug = tokData.wikiSlug && tokData.wikiSlug === entrySlug;
          const matchesName = !tokData.wikiSlug && tokData.name && tokData.name.trim().toLowerCase() === entryName;
          if (matchesSlug || matchesName) updateTokenProps(tokId, { imageUrl: cloudUrl });
        });
      }
      WikiIndexer.clearCache();
      window.dispatchEvent(new Event('wiki-updated'));
    }
  };

  return (
    <DraggableWindow
      title="Lista de Personagens"
      id="character-roster-widget"
      onClose={onClose}
      width={800}
      height={600}
      initialX={window.innerWidth / 2 - 400}
      initialY={window.innerHeight / 2 - 300}
    >
      <div className="panel-neon-red" style={{ padding: '20px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Hidden File Input for Avatar Upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".png,.jpg,.jpeg,.webp,.gif,.svg" 
          onChange={handleImageUpload} 
        />

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexShrink: 0, overflowX: 'auto', paddingBottom: '4px' }}>
          {(['todos', 'ativos', 'inativos', 'jogador', 'npc', 'inimigo'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFiltro(status)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: filtro === status ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                background: filtro === status ? 'rgba(168,85,247,0.25)' : 'rgba(15,23,42,0.6)',
                color: filtro === status ? '#f0abfc' : '#cbd5e1',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: filtro === status ? 600 : 400,
                textTransform: 'capitalize',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {status === 'todos' ? 'Todos' :
               status === 'ativos' ? '👁 Ativos' :
               status === 'inativos' ? '👁‍🗨 Inativos' :
               status === 'jogador' ? 'Jogadores' :
               status === 'npc' ? 'NPCs' : 'Inimigos'}
            </button>
          ))}
        </div>

        {/* Barra de Ações em Massa */}
        {selecionados.size > 0 && (
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px',
            background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '8px 12px', borderRadius: '8px', flexShrink: 0
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--mana)', fontWeight: 'bold' }}>
              {selecionados.size} selecionado(s)
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => handleBulkToggle(true)}
              disabled={processandoLote}
              style={{
                padding: '4px 12px', borderRadius: '4px', border: '1px solid #10b981',
                background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', cursor: processandoLote ? 'wait' : 'pointer',
                fontSize: '0.75rem', fontWeight: 'bold'
              }}
            >Ativar Lote</button>
            <button
              onClick={() => handleBulkToggle(false)}
              disabled={processandoLote}
              style={{
                padding: '4px 12px', borderRadius: '4px', border: '1px solid #ef4444',
                background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', cursor: processandoLote ? 'wait' : 'pointer',
                fontSize: '0.75rem', fontWeight: 'bold'
              }}
            >Desativar Lote</button>
            <button
              onClick={() => setSelecionados(new Set())}
              disabled={processandoLote}
              style={{
                padding: '4px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', cursor: processandoLote ? 'wait' : 'pointer',
                fontSize: '0.75rem'
              }}
            >Limpar</button>
          </div>
        )}

        {/* Lista de Personagens */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '12px',
          flex: 1,
          overflowY: 'auto',
          paddingRight: '8px',
        }}>
          {carregando ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Carregando personagens...
            </div>
          ) : personagensFiltrados.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Nenhum personagem encontrado.
            </div>
          ) : (
            personagensFiltrados.map((p) => {
              const pvPercentual = calcularPVPercentual(p.pv, p.pv_max);
              return (
                <div key={p.caminhoArquivo} style={{
                  background: 'var(--bg-secondary)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${selecionados.has(p.caminhoArquivo) ? 'var(--accent-primary)' : p.ativo ? getStatusColor(p.status).replace('0.2', '0.4') : 'var(--glass-border)'}`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  position: 'relative',
                  cursor: 'pointer',
                  opacity: p.ativo ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                  boxShadow: selecionados.has(p.caminhoArquivo) ? '0 0 12px var(--accent-glow)' : 'var(--glass-shadow)',
                }}
                onClick={() => window.dispatchEvent(new CustomEvent('open-sheet-by-wiki', { detail: p.caminhoArquivo }))}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  if (!selecionados.has(p.caminhoArquivo)) {
                    e.currentTarget.style.boxShadow = `0 4px 12px ${getStatusColor(p.status)}`;
                    e.currentTarget.style.borderColor = getStatusColor(p.status).replace('0.2', '0.8');
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  if (!selecionados.has(p.caminhoArquivo)) {
                    e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
                    e.currentTarget.style.borderColor = p.ativo ? getStatusColor(p.status).replace('0.2', '0.4') : 'var(--glass-border)';
                  }
                }}
                title="Abrir Ficha do Personagem"
                >
                  {/* Left Side: Checkbox */}
                  <div 
                    style={{
                      padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onClick={(e) => handleToggleSelection(e, p.caminhoArquivo)}
                    title="Selecionar para ações em lote"
                  >
                    <input 
                      type="checkbox" 
                      checked={selecionados.has(p.caminhoArquivo)} 
                      readOnly 
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                    />
                  </div>

                  {/* Avatar */}
                  <div 
                    style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0, cursor: 'pointer' }}
                    onClick={(e) => handleAvatarClick(p.caminhoArquivo, e)}
                    title="Clique para alterar a imagem"
                  >
                    <div style={{ width: '64px', height: '64px', borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${getStatusColor(p.status).replace('0.2', '0.8')}` }}>
                      {getStatusIcon(p.status)}
                    </div>
                    {p.avatar && (
                      <img loading="lazy" decoding="async" 
                        src={resolveImageUrl(p.avatar)} 
                        alt={p.nome} 
                        style={{ position: 'absolute', top: 0, left: 0, width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: `2px solid ${getStatusColor(p.status).replace('0.2', '0.8')}` }} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    {/* Camera upload overlay on hover */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      background: 'rgba(0,0,0,0.6)', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.2s',
                      fontSize: '0.65rem', fontWeight: 'bold', color: '#fff',
                      textAlign: 'center', padding: '2px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                    >
                      Alterar Foto
                    </div>
                  </div>

                  {/* Middle Section: Name, Type and Level, and HP */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.nome}
                      </div>
                      
                      {/* Active Toggle */}
                      <div 
                        style={{
                          padding: '4px',
                          background: p.ativo ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          border: `1px solid ${p.ativo ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          borderRadius: '6px',
                          color: p.ativo ? 'var(--success)' : 'var(--danger)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={p.ativo ? "Desativar (Esconder da mesa)" : "Ativar (Mostrar na mesa)"}
                        onClick={(e) => handleToggleActive(e, p.caminhoArquivo, p.ativo)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.background = p.ativo ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.background = p.ativo ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                        }}
                      >
                        {p.ativo ? <Eye size={16} /> : <EyeOff size={16} />}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                      <span style={{ 
                        background: getStatusColor(p.status).replace('0.2', '0.1'),
                        color: p.status === 'jogador' ? 'var(--success)' : p.status === 'npc' ? 'var(--mana)' : 'var(--danger)',
                        padding: '1px 6px', borderRadius: '4px', border: `1px solid ${getStatusColor(p.status).replace('0.2', '0.4')}`,
                        textTransform: 'uppercase', fontWeight: 600, fontSize: '0.65rem'
                      }}>
                        {p.tipoFicha}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>Nv. {p.nivel}</span>
                    </div>
                    
                    {/* PV/HP bar */}
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        <span>HP/PV</span>
                        <span>{p.pv}/{p.pv_max}</span>
                      </div>
                      <div style={{ height: '5px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pvPercentual}%`,
                          height: '100%',
                          background: getPVColor(pvPercentual),
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Stats Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, minmax(75px, 1fr))', 
                    gap: '4px 8px', 
                    borderLeft: '1px solid var(--glass-border)', 
                    paddingLeft: '12px',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--danger)' }}>
                      <Sword size={11} /> <span style={{ color: 'var(--text-secondary)' }}>Atq:</span> <b>{p.ataque}</b>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--mana)' }}>
                      <Shield size={11} /> <span style={{ color: 'var(--text-secondary)' }}>Def:</span> <b>{p.defesa}</b>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--warning)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 'bold' }}>$</span> <span style={{ color: 'var(--text-secondary)' }}>Ouro:</span> <b>{p.ouro}</b>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent-primary)' }}>
                      <Star size={11} /> <span style={{ color: 'var(--text-secondary)' }}>XP:</span> <b>{p.xp}</b>
                    </div>
                    {p.mana_max > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--mana)', gridColumn: 'span 2' }}>
                        <Zap size={11} /> <span style={{ color: 'var(--text-secondary)' }}>Mana:</span> <b>{p.mana}/{p.mana_max}</b>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com total */}
        <div style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          flexShrink: 0
        }}>
          <span>Total: {personagensFiltrados.length} personagem(s)</span>
          <button
            onClick={() => {
              WikiIndexer.clearCache();
              window.dispatchEvent(new Event('wiki-updated'));
            }}
            disabled={carregando}
            style={{
              padding: '4px 12px',
              borderRadius: '4px',
              border: '1px solid var(--glass-border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: carregando ? 'not-allowed' : 'pointer',
              opacity: carregando ? 0.5 : 1,
              fontSize: '0.75rem',
            }}
          >
            {carregando ? 'Recarregando...' : 'Recarregar'}
          </button>
        </div>
      </div>
    </DraggableWindow>
  );
};
