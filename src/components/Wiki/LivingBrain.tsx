import React, { useCallback, useEffect, useState } from 'react';
import ArcanumGraph from './Graph/ArcanumGraph';
import { getWikiConfig } from '../../store';
import { resolveMediaUrl } from '../../services/wiki/mediaResolver';
import { DEFAULT_TYPES, type NodeShape, type WEdge, type WNode } from './Graph/core';
import { Layouts } from './Graph/world';
import { TYPE_ORDER } from './Graph/seed';
import { formatWikiConnection, type WikiConnectionDraft } from '../../utils/wikiConnections';
import { useWindowManager } from '../../hooks/useWindowManager';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import type { WikiGraphLinkSource, WikiGraphNodeSource } from '../../services/wiki/wikiGraphData';
import { saveMarkdownContent } from '../../utils/githubApi';

const bundledWikiModules = import.meta.glob('../../../wikidozero/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const bundledWikiFiles = Object.fromEntries(
  Object.entries(bundledWikiModules).map(([path, content]) => [
    path.replace('../../../wikidozero/', '').replace(/^\.\//, ''),
    content,
  ]),
);

/**
 * LivingBrain — O Cérebro do Mundo (Arcanum)
 * Integração completa e nativa do Arcanum Cérebro-Grafo com o DOZERO.
 */
export const LivingBrain: React.FC = () => {
  const { setViewMode } = useWindowManager();
  const [wikiNodes, setWikiNodes] = useState<WNode[]>([]);
  const [wikiEdges, setWikiEdges] = useState<WEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphVersion, setGraphVersion] = useState(0);

  const fetchGraphData = useCallback(async () => {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      setIsLoading(true);
      setError(null);

      const json = await WikiIndexer.buildGraph(bundledWikiFiles);
      if (json.nodes.length === 0) throw new Error('Nenhuma entidade foi encontrada na Wiki desta campanha.');

      const mappedNodes: WNode[] = json.nodes.map((n: WikiGraphNodeSource) => {
        const pathLower = String(n.path || '').toLowerCase();
        const rawGroup = String(n.group || '').toLowerCase();
        const rawEntity = String(n.entityType || '').toLowerCase();

        // Inferência inteligente de camada por metadados e caminho da pasta
        let detectedType = rawEntity || rawGroup;
        if (!detectedType || detectedType === 'conceito') {
          if (pathLower.includes('personag') || pathLower.includes('npc') || pathLower.includes('jogador')) {
            detectedType = 'personagem';
          } else if (pathLower.includes('criatur') || pathLower.includes('monstro') || pathLower.includes('bestiar')) {
            detectedType = 'criatura';
          } else if (pathLower.includes('loca') || pathLower.includes('cidade') || pathLower.includes('reino') || pathLower.includes('lugar')) {
            detectedType = 'local';
          } else if (pathLower.includes('item') || pathLower.includes('artefato') || pathLower.includes('equip')) {
            detectedType = 'item';
          } else if (pathLower.includes('facc') || pathLower.includes('organiza') || pathLower.includes('guild')) {
            detectedType = 'organizacao';
          } else if (pathLower.includes('divin') || pathLower.includes('deus') || pathLower.includes('panta')) {
            detectedType = 'divindade';
          } else if (pathLower.includes('evento') || pathLower.includes('histor') || pathLower.includes('cronolog')) {
            detectedType = 'evento';
          } else if (pathLower.includes('sessa') || pathLower.includes('sessao') || pathLower.includes('resumo') || pathLower.includes('diario')) {
            detectedType = 'resumo';
          } else if (pathLower.includes('rota') || pathLower.includes('viagem') || pathLower.includes('mapa')) {
            detectedType = 'rota';
          } else if (pathLower.includes('raca') || pathLower.includes('povo') || pathLower.includes('especie')) {
            detectedType = 'racas';
          }
        }

        const matchedType = DEFAULT_TYPES.find((t) => t.id === detectedType) || DEFAULT_TYPES[0];

        let imageUrl: string | undefined = undefined;
        if (n.avatar) {
          imageUrl = resolveMediaUrl(n.avatar, repoPath);
        }

        const shape: NodeShape = n.shape || matchedType.shape || 'circle';

        return {
          id: n.id || n.name,
          type: "world",
          position: { x: 0, y: 0 },
          data: {
            label: n.name || n.id,
            typeId: matchedType.id,
            summary: n.description || '',
            icon: matchedType.icon,
            image: imageUrl,
            shape,
            tags: n.tags || [],
            ficha: {
              status: n.status || "Ativo",
              level: n.level || n.nd,
              gmNotes: n.gmNotes || '',
              inventory: n.inventory || '',
            },
            wikiPath: n.path || '',
          },
        };
      });

      const clusteredNodes = Layouts.clusterByType(mappedNodes, TYPE_ORDER);
      const validNodeIds = new Set(clusteredNodes.map((cn) => cn.id));
      const nameToId = new Map(clusteredNodes.map((cn) => [cn.data.label.toLowerCase(), cn.id]));

      const mappedEdges: WEdge[] = (json.links || [])
        .map((l: WikiGraphLinkSource, i: number) => {
          const src = l.source;
          const tgt = l.target;

          const resolvedTarget = validNodeIds.has(tgt) ? tgt : nameToId.get(String(tgt).toLowerCase());
          if (validNodeIds.has(src) && resolvedTarget) {
            return {
              id: l.id || `e_${src}_${resolvedTarget}_${i}`,
              source: src,
              target: resolvedTarget,
              type: "world",
              data: {
                label: l.label || '',
                color: l.color || '#d8b45a',
                wikiSourcePath: l.sourcePath || src,
              },
            };
          }
          return null;
        })
        .filter(Boolean) as WEdge[];

      setWikiNodes(clusteredNodes);
      setWikiEdges(mappedEdges);
      setGraphVersion((version) => version + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao carregar o Grafo.';
      console.error('[LivingBrain] Não foi possível carregar a Wiki:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void fetchGraphData(), 0);
    const refresh = () => void fetchGraphData();
    window.addEventListener('wiki-updated', refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener('wiki-updated', refresh);
    };
  }, [fetchGraphData]);

  // Criação de conexão direta no markdown da Wiki
  const handleCreateWikiRelation = async (sourcePath: string, targetName: string, label: string) => {
    try {
      if (!sourcePath.toLowerCase().endsWith('.md')) throw new Error('A origem da relação não é um artigo da Wiki.');
      const content = await WikiIndexer.loadRawFileContent(sourcePath);
      if (content == null) throw new Error('Não foi possível ler o artigo de origem.');

      const draft: WikiConnectionDraft = { type: label || 'Relacionado a', description: '' };
      const linkText = formatWikiConnection(targetName, draft);
      const newContent = content.includes(linkText) ? content : `${content.trimEnd()}\n${linkText}\n`;
      await saveMarkdownContent(sourcePath, newContent);
    } catch (error) {
      console.error('[LivingBrain] Erro ao registrar relação:', error);
      throw error;
    }
  };

  if (isLoading && wikiNodes.length === 0) {
    return (
      <div className="h-full w-full grid place-items-center bg-[#080b12] text-[#ece5d3]" role="status" aria-live="polite">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#2a3854] border-t-[#d8b45a]" />
          <strong className="font-serif text-lg text-[#d8b45a]">Abrindo o Cérebro do Mundo…</strong>
          <p className="mt-2 text-sm text-[#8b93a7]">Lendo entidades e relações da Wiki da campanha.</p>
        </div>
      </div>
    );
  }

  if (error && wikiNodes.length === 0) {
    return (
      <div className="h-full w-full grid place-items-center bg-[#080b12] px-6 text-[#ece5d3]" role="alert">
        <div className="max-w-md rounded-2xl border border-[#5b2e35] bg-[#12101a] p-6 text-center">
          <strong className="text-lg text-[#e0705f]">O Grafo não conseguiu ler a Wiki</strong>
          <p className="mt-2 text-sm text-[#b3ad9c]">{error}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" onClick={() => void fetchGraphData()} className="rounded-lg bg-[#d8b45a] px-4 py-2 font-bold text-[#080b12]">Tentar novamente</button>
            <button type="button" onClick={() => setViewMode('canvas')} className="rounded-lg border border-[#2a3854] px-4 py-2 text-[#b3ad9c]">Voltar à mesa</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ArcanumGraph
        key={graphVersion}
        initialNodes={wikiNodes}
        initialEdges={wikiEdges}
        onClose={() => setViewMode('canvas')}
        onCreateWikiRelation={handleCreateWikiRelation}
      />
    </div>
  );
};
