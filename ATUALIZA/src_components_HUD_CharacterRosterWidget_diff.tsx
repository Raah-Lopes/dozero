--- src/components/HUD/CharacterRosterWidget.tsx (原始)


+++ src/components/HUD/CharacterRosterWidget.tsx (修改后)
// src/components/HUD/CharacterRosterWidget.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { state, getWikiConfig } from '../../store';
import { loadMarkdownFile } from '../../utils/githubApi';
import { User, Skull, Cpu, Heart, Shield, Zap, Sword, Star } from 'lucide-react';

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
}

function parseFicha(md: string, caminho: string): FichaPersonagem | null {
  try {
    const linhas = md.split('\n');
    if (linhas[0]?.trim() !== '---') return null;
    const fim = linhas.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (fim === -1) return null;
    const dados: Record<string, string> = {};
    for (let i = 1; i < fim; i++) {
      const linha = linhas[i];
      const idx = linha.indexOf(':');
      if (idx > -1) {
        const chave = linha.slice(0, idx).trim().toLowerCase();
        const valor = linha.slice(idx + 1).trim();
        dados[chave] = valor;
      }
    }
    return {
      nome: dados.nome || 'Sem nome',
      pv: Number(dados.pv) || 0,
      pv_max: Number(dados.pv_max) || 0,
      xp: Number(dados.xp) || 0,
      nivel: Number(dados.nivel) || 1,
      mana: Number(dados.mana) || 0,
      mana_max: Number(dados.mana_max) || 0,
      armadura: Number(dados.armadura) || 0,
      defesa: Number(dados.defesa) || 0,
      velocidade: Number(dados.velocidade) || 0,
      ataque: Number(dados.ataque) || 0,
      status: (dados.status as FichaPersonagem['status']) || 'jogador',
      avatar: dados.avatar,
      caminhoArquivo: caminho,
    };
  } catch {
    return null;
  }
}

interface CharacterRosterWidgetProps {
  onClose: () => void;
}

const PASTA_PERSONAGENS = 'Personagens';

export const CharacterRosterWidget: React.FC<CharacterRosterWidgetProps> = ({ onClose }) => {
  const [personagens, setPersonagens] = useState<FichaPersonagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'jogador' | 'npc' | 'inimigo'>('todos');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl;
      if (!repoPath) return;
      const resposta = await fetch(`/api/wiki/tree?repoPath=${encodeURIComponent(repoPath)}`);
      if (!resposta.ok) return;
      const arvore = await resposta.json();
      const arquivos: string[] = arvore?.files || [];
      const fichasArquivos = arquivos
        .filter((f) => f.startsWith(`${PASTA_PERSONAGENS}/`) && f.endsWith('.md'))
        .map((f) => f.replace(/\\/g, '/'));

      const carregadas: FichaPersonagem[] = [];
      for (const fp of fichasArquivos) {
        const md = await loadMarkdownFile(fp);
        if (md) {
          const ficha = parseFicha(md, fp);
          if (ficha) carregadas.push(ficha);
        }
      }
      setPersonagens(carregadas);
    } catch (erro) {
      console.error('Erro ao carregar personagens:', erro);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

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
      <div style={{ padding: '20px', color: '#f1f5f9', fontFamily: 'var(--font-body)' }}>
        {/* Filtros */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '12px',
          maxHeight: '450px',
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
                <div
                  key={p.caminhoArquivo}
                  style={{
                    background: getStatusColor(p.status),
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* Cabeçalho */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getStatusIcon(p.status)}
                      <span style={{ fontWeight: 600, fontSize: '1rem', color: '#f1f5f9' }}>{p.nome}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                      Nv.{p.nivel}
                    </span>
                  </div>

                  {/* Barra de PV */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px', color: '#cbd5e1' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Heart size={12} color={getPVColor(pvPercentual)} /> PV
                      </span>
                      <span>{p.pv}/{p.pv_max}</span>
                    </div>
                    <div style={{
                      height: '8px',
                      background: 'rgba(0,0,0,0.4)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${pvPercentual}%`,
                        height: '100%',
                        background: getPVColor(pvPercentual),
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fda4af' }}>
                      <Sword size={12} /> {p.ataque}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#93c5fd' }}>
                      <Shield size={12} /> {p.defesa}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fcd34d' }}>
                      <Zap size={12} /> {p.velocidade}
                    </div>
                  </div>

                  {/* Stats secundários */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <div>Armadura: {p.armadura}</div>
                    <div>XP: {p.xp}</div>
                    {p.mana_max > 0 && (
                      <>
                        <div>Mana: {p.mana}/{p.mana_max}</div>
                      </>
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
          fontSize: '0.85rem',
          color: '#94a3b8'
        }}>
          <span>Total: {personagensFiltrados.length} personagem(s)</span>
          <button
            onClick={carregar}
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