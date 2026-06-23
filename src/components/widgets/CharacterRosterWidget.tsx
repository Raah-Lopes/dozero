// src/components/HUD/CharacterRosterWidget.tsx
import React, { useState, useEffect, useRef } from 'react';
import { DraggableWindow } from '../HUD/DraggableWindow';
import { useWiki } from '../../hooks/useWiki';
import { state, updateTokenProps } from '../../store';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import { User, Skull, Cpu,  Shield, Zap, Sword, Star } from 'lucide-react';

interface FichaPersonagem {
  nome: string;
  pv: number;
  pv_max: number;
  xp: number;
  nivel: number;
  mana: number;
  mana_max: number;
  armadura: number;
  defesa: number;
  velocidade: number;
  ataque: number;
  status: 'jogador' | 'npc' | 'inimigo';
  avatar?: string;
  caminhoArquivo: string;
  ativo: boolean;
  ouro: number;
  tipoFicha: string;
}

interface CharacterRosterWidgetProps {
  onClose: () => void;
}

export const CharacterRosterWidget: React.FC<CharacterRosterWidgetProps> = ({ onClose }) => {
  const { index, isLoading: carregando } = useWiki();
  const [personagens, setPersonagens] = useState<FichaPersonagem[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'jogador' | 'npc' | 'inimigo'>('todos');
  const [uploadingPath, setUploadingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!index || index.length === 0) return;

    const entidades = index.filter(e => {
      const tipo = String(e.metadata?.tipo || '').toLowerCase();
      const status = String(e.metadata?.status || '').toLowerCase();
      const path = e.path.toLowerCase();
      
      if (path.includes('_modelo')) return false;
      
      return ['pc', 'npc', 'monstro', 'personagem', 'jogador', 'inimigo'].includes(tipo) ||
             ['jogador', 'npc', 'inimigo'].includes(status) ||
             path.includes('/fichas/') ||
             path.includes('/personagens/') ||
             path.includes('fichas/') ||
             path.includes('personagens/');
    });

    const carregadas: FichaPersonagem[] = entidades.map(e => {
      const tipo = e.metadata?.tipo;
      let status: 'jogador' | 'npc' | 'inimigo' = 'npc';
      if (tipo === 'PC' || tipo === 'Personagem' || e.metadata?.status === 'jogador') status = 'jogador';
      else if (tipo === 'Monstro' || e.metadata?.status === 'inimigo' || e.metadata?.status === 'Hostil') status = 'inimigo';

      return {
        nome: e.metadata?.nome || e.metadata?.titulo || e.slug || 'Sem nome',
        pv: Number(e.metadata?.pv) || Number(e.metadata?.HP) || 0,
        pv_max: Number(e.metadata?.pv_max) || Number(e.metadata?.HP_max) || Number(e.metadata?.pv) || Number(e.metadata?.HP) || 0,
        xp: Number(e.metadata?.xp) || Number(e.metadata?.XP) || Number(e.metadata?.XP_recompensa) || 0,
        nivel: Number(e.metadata?.nivel) || Number(e.metadata?.Nivel) || 1,
        mana: Number(e.metadata?.mana) || Number(e.metadata?.PM) || 0,
        mana_max: Number(e.metadata?.mana_max) || Number(e.metadata?.PM_max) || Number(e.metadata?.mana) || Number(e.metadata?.PM) || 0,
        armadura: Number(e.metadata?.armadura) || Number(e.metadata?.Armadura) || Number(e.metadata?.CA) || Number(e.metadata?.A) || 0,
        defesa: Number(e.metadata?.defesa) || Number(e.metadata?.Defesa) || Number(e.metadata?.CA) || 0,
        velocidade: parseInt(String(e.metadata?.velocidade || e.metadata?.Velocidade || e.metadata?.Deslocamento || '0')) || 0,
        ataque: Number(e.metadata?.ataque) || Number(e.metadata?.Ataque) || Number(e.metadata?.F) || Number(e.metadata?.PdF) || 0,
        status,
        avatar: e.metadata?.imageUrl || e.metadata?.avatar || e.metadata?.imagem,
        caminhoArquivo: e.path,
        ativo: e.metadata?.ativo !== false,
        ouro: Number(e.metadata?.ouro) || Number(e.metadata?.Ouro) || 0,
        tipoFicha: String(e.metadata?.tipo || (status === 'jogador' ? 'Personagem' : status === 'inimigo' ? 'Monstro' : 'NPC'))
      };
    });

    setPersonagens(carregadas);
  }, [index]);

  const personagensFiltrados = filtro === 'todos'
    ? personagens
    : personagens.filter(p => p.status === filtro);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'jogador': return <User size={16} color="#6ee7b7" />;
      case 'npc': return <Cpu size={16} color="#93c5fd" />;
      case 'inimigo': return <Skull size={16} color="#fda4af" />;
      default: return <User size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'jogador': return 'rgba(16, 185, 129, 0.2)';
      case 'npc': return 'rgba(59, 130, 246, 0.2)';
      case 'inimigo': return 'rgba(225, 29, 72, 0.2)';
      default: return 'transparent';
    }
  };

  const calcularPVPercentual = (pv: number, pvMax: number) => {
    if (pvMax <= 0) return 0;
    return Math.max(0, Math.min(100, (pv / pvMax) * 100));
  };

  const getPVColor = (percentual: number) => {
    if (percentual > 60) return '#10b981';
    if (percentual > 30) return '#f59e0b';
    return '#ef4444';
  };

  const handleAvatarClick = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadingPath(path);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingPath) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

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

        const webpDataUrl = canvas.toDataURL('image/webp', 0.8);

        const success = await syncTokenFieldToWiki(uploadingPath, 'imageUrl', webpDataUrl);
        if (success) {
          const entry = index.find(en => en.path === uploadingPath);
          if (entry) {
            const entrySlug = entry.slug;
            const entryName = (entry.metadata?.nome || entry.metadata?.titulo || '').trim().toLowerCase();
            
            Array.from(state.tokens.entries()).forEach(([tokId, tokData]: [string, any]) => {
              const matchesSlug = tokData.wikiSlug && tokData.wikiSlug === entrySlug;
              const matchesName = !tokData.wikiSlug && tokData.name && tokData.name.trim().toLowerCase() === entryName;
              if (matchesSlug || matchesName) {
                updateTokenProps(tokId, { imageUrl: webpDataUrl });
              }
            });
          }

          WikiIndexer.clearCache();
          window.dispatchEvent(new Event('wiki-updated'));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
      <div style={{ padding: '20px', color: '#f1f5f9', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Hidden File Input for Avatar Upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleImageUpload} 
        />

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexShrink: 0 }}>
          {(['todos', 'jogador', 'npc', 'inimigo'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFiltro(status)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: filtro === status ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                background: filtro === status ? 'rgba(168,85,247,0.2)' : 'rgba(15,23,42,0.6)',
                color: filtro === status ? '#f0abfc' : '#cbd5e1',
                cursor: 'pointer',
                fontSize: '0.85rem',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
              }}
            >
              {status}
            </button>
          ))}
        </div>

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
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Carregando personagens...
            </div>
          ) : personagensFiltrados.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>
              Nenhum personagem encontrado.
            </div>
          ) : (
            personagensFiltrados.map((p) => {
              const pvPercentual = calcularPVPercentual(p.pv, p.pv_max);
              return (
                <div key={p.caminhoArquivo} style={{
                  background: 'rgba(15, 23, 42, 0.4)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${p.ativo ? getStatusColor(p.status).replace('0.2', '0.4') : 'rgba(255, 255, 255, 0.05)'}`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  position: 'relative',
                  cursor: 'pointer',
                  opacity: p.ativo ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                onClick={() => window.dispatchEvent(new CustomEvent('open-sheet-by-wiki', { detail: p.caminhoArquivo }))}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${getStatusColor(p.status)}`;
                  e.currentTarget.style.borderColor = getStatusColor(p.status).replace('0.2', '0.8');
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = p.ativo ? getStatusColor(p.status).replace('0.2', '0.4') : 'rgba(255, 255, 255, 0.05)';
                }}
                title="Abrir Ficha do Personagem"
                >
                  {/* Left Side: Avatar */}
                  <div 
                    style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0, cursor: 'pointer' }}
                    onClick={(e) => handleAvatarClick(p.caminhoArquivo, e)}
                    title="Clique para alterar a imagem"
                  >
                    {p.avatar ? (
                      <img 
                        src={p.avatar} 
                        alt={p.nome} 
                        style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: `2px solid ${getStatusColor(p.status).replace('0.2', '0.8')}` }} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${getStatusColor(p.status).replace('0.2', '0.8')}` }}>
                        {getStatusIcon(p.status)}
                      </div>
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

                  {/* Middle Section: Name, Type and Level */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.nome}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                      <span style={{ 
                        background: getStatusColor(p.status).replace('0.2', '0.1'),
                        color: p.status === 'jogador' ? '#6ee7b7' : p.status === 'npc' ? '#93c5fd' : '#fda4af',
                        padding: '1px 6px', borderRadius: '4px', border: `1px solid ${getStatusColor(p.status).replace('0.2', '0.4')}`,
                        textTransform: 'uppercase', fontWeight: 600, fontSize: '0.65rem'
                      }}>
                        {p.tipoFicha}
                      </span>
                      <span style={{ color: '#94a3b8' }}>Nv. {p.nivel}</span>
                    </div>
                    
                    {/* PV/HP bar */}
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '2px' }}>
                        <span>HP/PV</span>
                        <span>{p.pv}/{p.pv_max}</span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
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
                    borderLeft: '1px solid rgba(255,255,255,0.08)', 
                    paddingLeft: '12px',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#fda4af' }}>
                      <Sword size={11} /> <span style={{ color: '#cbd5e1' }}>Atq:</span> <b>{p.ataque}</b>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#93c5fd' }}>
                      <Shield size={11} /> <span style={{ color: '#cbd5e1' }}>Def:</span> <b>{p.defesa}</b>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#fcd34d' }}>
                      <span style={{ fontSize: '0.7rem', color: '#fcd34d', fontWeight: 'bold' }}>$</span> <span style={{ color: '#cbd5e1' }}>Ouro:</span> <b>{p.ouro}</b>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#f0abfc' }}>
                      <Star size={11} /> <span style={{ color: '#cbd5e1' }}>XP:</span> <b>{p.xp}</b>
                    </div>
                    {p.mana_max > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#38bdf8', gridColumn: 'span 2' }}>
                        <Zap size={11} /> <span style={{ color: '#cbd5e1' }}>Mana:</span> <b>{p.mana}/{p.mana_max}</b>
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
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: '#94a3b8',
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
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#cbd5e1',
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
