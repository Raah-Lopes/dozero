--- src/components/HUD/AutomatedDiceWidget.tsx (原始)


+++ src/components/HUD/AutomatedDiceWidget.tsx (修改后)
// src/components/HUD/AutomatedDiceWidget.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { state, pushChatMessage, getWikiConfig } from '../../store';
import { saveMarkdownContent, loadMarkdownFile } from '../../utils/githubApi';
import { Dices, Swords, Zap, Shield, Target } from 'lucide-react';

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

interface AutomatedDiceWidgetProps {
  onClose: () => void;
}

const PASTA_PERSONAGENS = 'Personagens';

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

function gerarMarkdownFicha(ficha: FichaPersonagem): string {
  const linhas = [
    '---',
    `nome: ${ficha.nome}`,
    `pv: ${ficha.pv}`,
    `pv_max: ${ficha.pv_max}`,
    `xp: ${ficha.xp}`,
    `nivel: ${ficha.nivel}`,
    `mana: ${ficha.mana}`,
    `mana_max: ${ficha.mana_max}`,
    `armadura: ${ficha.armadura}`,
    `defesa: ${ficha.defesa}`,
    `velocidade: ${ficha.velocidade}`,
    `ataque: ${ficha.ataque}`,
    `status: ${ficha.status}`,
  ];
  if (ficha.avatar) linhas.push(`avatar: ${ficha.avatar}`);
  linhas.push('---\n');
  return linhas.join('\n');
}

function usePersonagens() {
  const [personagens, setPersonagens] = useState<FichaPersonagem[]>([]);
  const [carregando, setCarregando] = useState(true);

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

  return { personagens, carregando, recarregar: carregar };
}

export const AutomatedDiceWidget: React.FC<AutomatedDiceWidgetProps> = ({ onClose }) => {
  const { personagens, carregando, recarregar } = usePersonagens();
  const [atacante, setAtacante] = useState<FichaPersonagem | null>(null);
  const [defensor, setDefensor] = useState<FichaPersonagem | null>(null);
  const [resultados, setResultados] = useState<string[]>([]);
  const [cd, setCd] = useState(15);

  const adicionarLog = (msg: string) => setResultados((prev) => [...prev.slice(-50), msg]);

  const salvarFicha = async (ficha: FichaPersonagem) => {
    try {
      const md = gerarMarkdownFicha(ficha);
      await saveMarkdownContent(ficha.caminhoArquivo, md);
    } catch (e) {
      console.error('Falha ao salvar ficha:', e);
    }
  };

  const executarAtaque = async () => {
    if (!atacante || !defensor) return;
    const atk = { ...atacante };
    const def = { ...defensor };

    const danoBruto = Math.max(0, atk.ataque - def.defesa);
    let absorvido = 0;
    let armaduraQuebrada = false;
    if (def.armadura > 0) {
      absorvido = Math.min(def.armadura, danoBruto);
      def.armadura -= absorvido;
      if (def.armadura <= 0) {
        armaduraQuebrada = true;
        def.armadura = 0;
      }
    }
    const danoFinal = danoBruto - absorvido;
    def.pv = Math.max(0, def.pv - danoFinal);

    // Ganho de XP
    atk.xp += defensor.nivel * 10;

    const partesLog = [
      `⚔️ ${atk.nome} atacou ${def.nome}!`,
      `Dano base: ${danoBruto}, absorvido pela armadura: ${absorvido}`,
      armaduraQuebrada ? '💥 Armadura destruída!' : '',
      `Dano final: ${danoFinal}. PV de ${def.nome}: ${def.pv}/${def.pv_max}`,
      def.pv <= 0 ? `☠️ ${def.nome} foi derrotado!` : '',
      `✨ ${atk.nome} ganhou ${defensor.nivel * 10} XP (total: ${atk.xp})`,
    ].filter(Boolean);

    adicionarLog(partesLog.join(' | '));
    pushChatMessage(partesLog[0] + ' - ' + partesLog.slice(1).join(' '), false, false);

    await salvarFicha(atk);
    await salvarFicha(def);
    setAtacante(atk);
    setDefensor(def);
    recarregar();
  };

  const executarTestePericia = async () => {
    if (!atacante) return;
    const dado = Math.floor(Math.random() * 20) + 1;
    const modificador = Math.floor(atacante.nivel / 2);
    const total = dado + modificador;
    const sucesso = total >= cd;
    const msg = `🎲 Teste de perícia de ${atacante.nome}: ${dado}+${modificador} = ${total} vs CD ${cd} → ${sucesso ? '✅ Sucesso' : '❌ Falha'}`;
    adicionarLog(msg);
    pushChatMessage(msg, sucesso, !sucesso);
  };

  const executarTesteVelocidade = () => {
    if (!atacante || !defensor) return;
    const vencedor = atacante.velocidade > defensor.velocidade ? atacante : defensor.velocidade > atacante.velocidade ? defensor : null;
    const msg = vencedor
      ? `🏃‍♂️ Teste de velocidade: ${vencedor.nome} é mais rápido!`
      : `🏃‍♂️ Teste de velocidade: Empate!`;
    adicionarLog(msg);
    pushChatMessage(msg);
  };

  const estiloSelect = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15,23,42,0.9)',
    color: '#f1f5f9',
    fontFamily: 'var(--font-body)',
    marginBottom: '8px',
  };

  return (
    <DraggableWindow
      title="Dados Automáticos"
      id="automated-dice-widget"
      onClose={onClose}
      width={750}
      height={620}
      initialX={window.innerWidth / 2 - 375}
      initialY={window.innerHeight / 2 - 310}
    >
      <div style={{ padding: '20px', color: '#f1f5f9', fontFamily: 'var(--font-body)' }}>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
          {/* Seleção de atacante */}
          <div style={{ flex: 1 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', color: '#a855f7', margin: '0 0 8px' }}>
              <Swords size={14} style={{ marginRight: 6 }} /> Atacante
            </h4>
            <select
              style={estiloSelect}
              value={atacante?.caminhoArquivo || ''}
              onChange={(e) => {
                const encontrado = personagens.find((p) => p.caminhoArquivo === e.target.value);
                setAtacante(encontrado || null);
              }}
              disabled={carregando}
            >
              <option value="">-- Escolha --</option>
              {personagens.map((p) => (
                <option key={p.caminhoArquivo} value={p.caminhoArquivo}>
                  {p.nome} (Nv.{p.nivel})
                </option>
              ))}
            </select>
          </div>
          {/* Seleção de defensor */}
          <div style={{ flex: 1 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', color: '#38bdf8', margin: '0 0 8px' }}>
              <Shield size={14} style={{ marginRight: 6 }} /> Defensor
            </h4>
            <select
              style={estiloSelect}
              value={defensor?.caminhoArquivo || ''}
              onChange={(e) => {
                const encontrado = personagens.find((p) => p.caminhoArquivo === e.target.value);
                setDefensor(encontrado || null);
              }}
              disabled={carregando}
            >
              <option value="">-- Escolha --</option>
              {personagens.map((p) => (
                <option key={p.caminhoArquivo} value={p.caminhoArquivo}>
                  {p.nome} (Nv.{p.nivel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botões de ação */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={executarAtaque}
            disabled={!atacante || !defensor}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '8px',
              background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
              color: '#f1f5f9', fontFamily: 'var(--font-display)', cursor: 'pointer', opacity: (!atacante || !defensor) ? 0.5 : 1,
            }}
          >
            <Swords size={16} /> Ataque Básico
          </button>
          <button
            onClick={executarTestePericia}
            disabled={!atacante}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '8px',
              background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)',
              color: '#f1f5f9', fontFamily: 'var(--font-display)', cursor: 'pointer', opacity: !atacante ? 0.5 : 1,
            }}
          >
            <Target size={16} /> Teste de Perícia
          </button>
          <button
            onClick={executarTesteVelocidade}
            disabled={!atacante || !defensor}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '8px',
              background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
              color: '#f1f5f9', fontFamily: 'var(--font-display)', cursor: 'pointer', opacity: (!atacante || !defensor) ? 0.5 : 1,
            }}
          >
            <Zap size={16} /> Teste de Velocidade
          </button>
        </div>

        {/* Entrada da CD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontFamily: 'var(--font-body)', color: '#cbd5e1' }}>CD:</span>
          <input
            type="number"
            value={cd}
            onChange={(e) => setCd(Number(e.target.value))}
            style={{ width: '70px', padding: '6px', borderRadius: '6px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}
          />
        </div>

        {/* Log de resultados */}
        <div style={{
          background: 'rgba(2,6,23,0.8)', borderRadius: '10px', padding: '12px',
          minHeight: '200px', maxHeight: '300px', overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.06)',
          fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.5,
        }}>
          {resultados.length === 0 ? (
            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhum resultado ainda...</div>
          ) : (
            resultados.map((linha, i) => (
              <div key={i} style={{ marginBottom: '4px', color: '#cbd5e1' }}>
                {linha}
              </div>
            ))
          )}
        </div>
      </div>
    </DraggableWindow>
  );
};